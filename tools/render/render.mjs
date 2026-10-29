#!/usr/bin/env node
/**
 * Render pipeline: scenes.yaml → PNG + edge-tts → FFmpeg → vertical-9x16.mp4 + captions.srt
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
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

async function screenshotScenes(contentDir, scenes) {
  const framesDir = join(contentDir, "frames");
  mkdirSync(framesDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
  });

  for (const scene of scenes) {
    const htmlPath = resolve(contentDir, scene.html);
    if (!existsSync(htmlPath)) {
      throw new Error(`HTML ausente: ${htmlPath}`);
    }
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    const out = join(framesDir, `${scene.id}.png`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
    console.log(`frame ${scene.id} → ${out}`);
  }

  await browser.close();
}

function synthesizeAudio(contentDir, scenes, voice, edge) {
  const audioDir = join(contentDir, "audio");
  mkdirSync(audioDir, { recursive: true });

  for (const scene of scenes) {
    const out = join(audioDir, `${scene.id}.mp3`);
    const text = String(scene.narration || "").trim();
    if (!text) {
      throw new Error(`Narração vazia em ${scene.id}`);
    }

    if (edge.mode === "bin") {
      run(edge.bin, ["--voice", voice, "--text", text, "--write-media", out]);
    } else {
      run(edge.python, [
        "-m",
        "edge_tts",
        "--voice",
        voice,
        "--text",
        text,
        "--write-media",
        out,
      ]);
    }
    console.log(`audio ${scene.id} → ${out}`);
  }
}

function buildClips(contentDir, scenes) {
  const clipsDir = join(contentDir, "clips");
  mkdirSync(clipsDir, { recursive: true });
  const durations = [];

  for (const scene of scenes) {
    const png = join(contentDir, "frames", `${scene.id}.png`);
    const mp3 = join(contentDir, "audio", `${scene.id}.mp3`);
    const clip = join(clipsDir, `${scene.id}.mp4`);
    const duration = ffprobeDuration(mp3);
    durations.push({ id: scene.id, duration, caption: scene.caption || scene.narration });

    // Still image + audio; pad audio end slightly so last phoneme isn't cut.
    run("ffmpeg", [
      "-y",
      "-loop",
      "1",
      "-framerate",
      "30",
      "-i",
      png,
      "-i",
      mp3,
      "-c:v",
      "libx264",
      "-tune",
      "stillimage",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-ar",
      "44100",
      "-ac",
      "2",
      "-pix_fmt",
      "yuv420p",
      "-t",
      String(duration + 0.15),
      "-shortest",
      clip,
    ]);
    console.log(`clip ${scene.id} (${duration.toFixed(2)}s)`);
  }

  return durations;
}

function concatClips(contentDir, scenes) {
  const clipsDir = join(contentDir, "clips");
  const exportDir = join(contentDir, "export");
  mkdirSync(exportDir, { recursive: true });
  const listFile = join(clipsDir, "concat.txt");
  const lines = scenes.map((s) => `file '${join(clipsDir, `${s.id}.mp4`).replace(/'/g, "'\\''")}'`);
  writeFileSync(listFile, `${lines.join("\n")}\n`, "utf8");

  const out = join(exportDir, "vertical-9x16.mp4");
  run("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listFile,
    "-c",
    "copy",
    out,
  ]);
  console.log(`export → ${out}`);
  return out;
}

function writeSrt(contentDir, durations) {
  const exportDir = join(contentDir, "export");
  mkdirSync(exportDir, { recursive: true });
  let cursor = 0;
  const blocks = [];
  durations.forEach((d, i) => {
    const start = cursor;
    const end = cursor + d.duration;
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

function ffmpegHasSubtitlesFilter() {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" });
  return (r.stdout || "").includes(" subtitles ");
}

/**
 * Soft-subs (.srt) always. Burn-in only if ffmpeg was built with libass.
 * v1 already puts short captions on the HTML frames.
 */
function burnSubtitles(mp4Path, srtPath) {
  if (!ffmpegHasSubtitlesFilter()) {
    console.log(
      "aviso: filtro subtitles indisponível (ffmpeg sem libass). Mantendo captions.srt + texto nas cenas HTML.",
    );
    return;
  }
  const out = mp4Path.replace(/\.mp4$/, ".subtitled.mp4");
  const escaped = srtPath.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\\'");
  run("ffmpeg", [
    "-y",
    "-i",
    mp4Path,
    "-vf",
    `subtitles='${escaped}'`,
    "-c:a",
    "copy",
    out,
  ]);
  rmSync(mp4Path, { force: true });
  run("mv", [out, mp4Path]);
  console.log(`legendas burned-in → ${mp4Path}`);
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
  const scenes = doc.scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error("scenes.yaml sem cenas");
  }

  for (const key of ["audio", "frames", "clips", "export"]) {
    mkdirSync(join(contentDir, key), { recursive: true });
  }

  await screenshotScenes(contentDir, scenes);
  synthesizeAudio(contentDir, scenes, voice, edge);
  const durations = buildClips(contentDir, scenes);
  const mp4 = concatClips(contentDir, scenes);
  const srt = writeSrt(contentDir, durations);
  burnSubtitles(mp4, srt);

  const total = durations.reduce((a, d) => a + d.duration, 0);
  console.log(`\nOK ${slug}: ${total.toFixed(1)}s → ${mp4}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
