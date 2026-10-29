#!/usr/bin/env node
/**
 * Render pipeline v2:
 * scenes.yaml → edge-tts + Playwright video (HTML animado) → FFmpeg (mux + fades) → vertical-9x16.mp4
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { chromium } from "playwright";
import { resolveEdgeTts } from "./find-edge-tts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const WIDTH = 1080;
const HEIGHT = 1920;
const FADE = 0.35;

function usage() {
  console.error("Uso: npm run render -- <slug>");
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...opts,
  });
  if (result.status !== 0) {
    const err = (result.stderr || result.stdout || "").trim();
    throw new Error(`${cmd} ${args.join(" ")} falhou:\n${err}`);
  }
  return result;
}

function ensureFfmpeg() {
  const r = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error("ffmpeg não está no PATH. Instale com: brew install ffmpeg");
  }
}

function ffprobeDuration(file) {
  const r = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    file,
  ]);
  const n = Number.parseFloat(r.stdout.trim());
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error(`Duração inválida para ${file}: ${r.stdout}`);
  }
  return n;
}

function formatSrtTime(seconds) {
  const msTotal = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(msTotal / 3_600_000);
  const m = Math.floor((msTotal % 3_600_000) / 60_000);
  const s = Math.floor((msTotal % 60_000) / 1000);
  const ms = msTotal % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function findExternalAudio(contentDir, sceneId) {
  const dir = join(contentDir, "audio", "external");
  if (!existsSync(dir)) return null;
  const candidates = [
    `${sceneId}.mp3`,
    `${sceneId}.m4a`,
    `${sceneId}.wav`,
    `${sceneId}.aac`,
    `${sceneId}.opus`,
    `${sceneId}.ogg`,
    "narration.mp3",
    "narration.m4a",
    "narration.wav",
    "narration.opus",
  ];
  for (const name of candidates) {
    const p = join(dir, name);
    if (existsSync(p)) return p;
  }
  return null;
}

function sceneAudioPath(contentDir, sceneId) {
  const external = findExternalAudio(contentDir, sceneId);
  if (external) return external;
  return join(contentDir, "audio", `${sceneId}.mp3`);
}

function synthesizeAudio(contentDir, scenes, voice, edge, rate = "+10%") {
  const audioDir = join(contentDir, "audio");
  mkdirSync(audioDir, { recursive: true });
  mkdirSync(join(audioDir, "external"), { recursive: true });

  for (const scene of scenes) {
    const external = findExternalAudio(contentDir, scene.id);
    if (external) {
      const out = join(audioDir, `${scene.id}.mp3`);
      // Normaliza para mp3 interno (pipeline espera .mp3 no path gerado; external pode ser m4a).
      if (external.endsWith(".mp3") && external !== out) {
        copyFileSync(external, out);
      } else if (!external.endsWith(".mp3")) {
        run("ffmpeg", ["-y", "-i", external, "-ar", "44100", "-ac", "2", out]);
      }
      console.log(`audio ${scene.id} → EXTERNAL ${external}`);
      continue;
    }

    const out = join(audioDir, `${scene.id}.mp3`);
    const text = String(scene.narration || "").trim();
    if (!text) {
      throw new Error(`Narração vazia em ${scene.id}`);
    }

    const args = [
      "--voice",
      voice,
      "--rate",
      rate,
      "--text",
      text,
      "--write-media",
      out,
    ];

    if (edge.mode === "bin") {
      run(edge.bin, args);
    } else {
      run(edge.python, ["-m", "edge_tts", ...args]);
    }
    console.log(`audio ${scene.id} → ${out} (${voice}, rate ${rate}) [fallback edge-tts]`);
  }
}

/**
 * Grava a cena HTML com animações CSS rodando (não é screenshot estático).
 */
async function recordAnimatedScenes(contentDir, scenes, durationsById) {
  const rawDir = join(contentDir, "clips", "raw");
  mkdirSync(rawDir, { recursive: true });
  rmSync(rawDir, { recursive: true, force: true });
  mkdirSync(rawDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });

  for (const scene of scenes) {
    const htmlPath = resolve(contentDir, scene.html);
    if (!existsSync(htmlPath)) {
      throw new Error(`HTML ausente: ${htmlPath}`);
    }
    const duration = durationsById[scene.id];
    const recordMs = Math.ceil((duration + 0.25) * 1000);

    const context = await browser.newContext({
      viewport: { width: WIDTH, height: HEIGHT },
      deviceScaleFactor: 2,
      recordVideo: {
        dir: rawDir,
        size: { width: WIDTH, height: HEIGHT },
      },
    });
    const page = await context.newPage();
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await page.evaluate(() => {
      for (const anim of document.getAnimations()) {
        anim.cancel();
        anim.play();
      }
    });
    await page.waitForTimeout(recordMs);
    const video = page.video();
    await page.close();
    const recordedPath = video ? await video.path() : null;
    await context.close();

    if (!recordedPath || !existsSync(recordedPath)) {
      // fallback: pegar o único webm novo na pasta
      const files = readdirSync(rawDir).filter((f) => f.endsWith(".webm"));
      if (files.length === 0) {
        throw new Error(`Falha ao gravar vídeo da cena ${scene.id}`);
      }
      const fallback = join(rawDir, files.sort().at(-1));
      renameSync(fallback, join(rawDir, `${scene.id}.webm`));
    } else {
      const dest = join(rawDir, `${scene.id}.webm`);
      if (recordedPath !== dest) {
        copyFileSync(recordedPath, dest);
        rmSync(recordedPath, { force: true });
      }
    }
    console.log(`rec ${scene.id} (${duration.toFixed(2)}s)`);
  }

  await browser.close();
}

function buildClips(contentDir, scenes) {
  const clipsDir = join(contentDir, "clips");
  const rawDir = join(clipsDir, "raw");
  mkdirSync(clipsDir, { recursive: true });
  const durations = [];

  for (const scene of scenes) {
    const webm = join(rawDir, `${scene.id}.webm`);
    const mp3 = join(contentDir, "audio", `${scene.id}.mp3`);
    const clip = join(clipsDir, `${scene.id}.mp4`);
    const duration = ffprobeDuration(mp3);
    durations.push({
      id: scene.id,
      duration: duration + 0.12,
      caption: scene.caption || scene.narration,
    });

    const t = duration + 0.12;
    const fadeOutStart = Math.max(0, t - FADE);

    // Vídeo animado + áudio TTS; fades suaves nas pontas (menos “corte de slide”).
    run("ffmpeg", [
      "-y",
      "-i",
      webm,
      "-i",
      mp3,
      "-filter_complex",
      `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease,pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p,fade=t=in:st=0:d=${FADE},fade=t=out:st=${fadeOutStart}:d=${FADE}[v];[1:a]aformat=sample_rates=44100:channel_layouts=stereo,afade=t=in:st=0:d=0.08,afade=t=out:st=${Math.max(0, duration - 0.12)}:d=0.12[a]`,
      "-map",
      "[v]",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "17",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      String(t),
      "-shortest",
      clip,
    ]);
    console.log(`clip ${scene.id} (${t.toFixed(2)}s)`);
  }

  return durations;
}

function concatWithXfade(contentDir, scenes, durations) {
  const clipsDir = join(contentDir, "clips");
  const exportDir = join(contentDir, "export");
  mkdirSync(exportDir, { recursive: true });
  const out = join(exportDir, "vertical-9x16.mp4");

  if (scenes.length === 1) {
    copyFileSync(join(clipsDir, `${scenes[0].id}.mp4`), out);
    return { out, timeline: durations };
  }

  const inputs = [];
  for (const scene of scenes) {
    inputs.push("-i", join(clipsDir, `${scene.id}.mp4`));
  }

  const xfadeDur = 0.4;
  let filter = "";
  let lastLabel = "[0:v]";
  let lastAudio = "[0:a]";
  let offset = durations[0].duration - xfadeDur;
  const timeline = [{ ...durations[0] }];

  for (let i = 1; i < scenes.length; i++) {
    const vOut = i === scenes.length - 1 ? "[vout]" : `[v${i}]`;
    const aOut = i === scenes.length - 1 ? "[aout]" : `[a${i}]`;
    filter += `${lastLabel}[${i}:v]xfade=transition=fade:duration=${xfadeDur}:offset=${offset.toFixed(3)}${vOut};`;
    filter += `${lastAudio}[${i}:a]acrossfade=d=${xfadeDur}${aOut};`;
    lastLabel = vOut;
    lastAudio = aOut;
    // duração acumulada após xfade
    const acc = offset + durations[i].duration;
    timeline.push({
      ...durations[i],
      // para SRT usamos offsets aproximados no vídeo final
    });
    offset = acc - xfadeDur;
  }

  // Timeline de captions no master (com overlap de xfade)
  const captionTimeline = [];
  let cursor = 0;
  for (let i = 0; i < durations.length; i++) {
    const dur = durations[i].duration;
    const start = cursor;
    const end =
      i === durations.length - 1
        ? start + dur
        : start + dur - xfadeDur;
    captionTimeline.push({
      id: durations[i].id,
      duration: Math.max(0.2, end - start),
      caption: durations[i].caption,
      _start: start,
    });
    cursor = end;
  }

  run("ffmpeg", [
    "-y",
    ...inputs,
    "-filter_complex",
    filter.replace(/;$/, ""),
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "17",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    out,
  ]);
  console.log(`export → ${out}`);
  return { out, timeline: captionTimeline };
}

function writeSrt(contentDir, timeline) {
  const exportDir = join(contentDir, "export");
  mkdirSync(exportDir, { recursive: true });
  let cursor = 0;
  const blocks = [];
  timeline.forEach((d, i) => {
    const start = d._start != null ? d._start : cursor;
    const end = start + d.duration;
    cursor = end;
    const text = String(d.caption || "").trim() || d.id;
    blocks.push(
      `${i + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${text}\n`,
    );
  });
  const srtPath = join(exportDir, "captions.srt");
  writeFileSync(srtPath, `${blocks.join("\n")}\n`, "utf8");
  console.log(`srt → ${srtPath}`);
  return srtPath;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) usage();

  ensureFfmpeg();
  const edge = resolveEdgeTts();
  console.log("edge-tts:", edge);

  const contentDir = join(ROOT, "content", slug);
  const yamlPath = join(contentDir, "scenes.yaml");
  if (!existsSync(yamlPath)) {
    throw new Error(`Falta ${yamlPath}`);
  }

  const doc = parseYaml(readFileSync(yamlPath, "utf8"));
  const voice = doc.voice || "pt-BR-AntonioNeural";
  const rate = doc.rate || "+10%";
  const scenes = doc.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("scenes.yaml sem cenas");
  }

  for (const key of ["audio", "frames", "clips", "export"]) {
    mkdirSync(join(contentDir, key), { recursive: true });
  }

  console.log(`voice=${voice} rate=${rate}`);
  synthesizeAudio(contentDir, scenes, voice, edge, rate);

  const durationsById = {};
  for (const scene of scenes) {
    durationsById[scene.id] = ffprobeDuration(sceneAudioPath(contentDir, scene.id));
  }

  await recordAnimatedScenes(contentDir, scenes, durationsById);
  const durations = buildClips(contentDir, scenes);
  const { out: mp4, timeline } = concatWithXfade(contentDir, scenes, durations);
  writeSrt(contentDir, timeline);

  const total = timeline.reduce((a, d) => a + d.duration, 0);
  console.log(`\nOK ${slug}: ~${total.toFixed(1)}s → ${mp4}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
