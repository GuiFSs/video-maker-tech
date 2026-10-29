import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const candidates = [
  "edge-tts",
  join(homedir(), "Library/Python/3.9/bin/edge-tts"),
  join(homedir(), "Library/Python/3.10/bin/edge-tts"),
  join(homedir(), "Library/Python/3.11/bin/edge-tts"),
  join(homedir(), "Library/Python/3.12/bin/edge-tts"),
  join(homedir(), "Library/Python/3.13/bin/edge-tts"),
  join(homedir(), ".local/bin/edge-tts"),
];

/**
 * @returns {{ mode: "bin", bin: string } | { mode: "module", python: string }}
 */
export function resolveEdgeTts() {
  for (const bin of candidates) {
    if (bin === "edge-tts") {
      const which = spawnSync("which", ["edge-tts"], { encoding: "utf8" });
      if (which.status === 0 && which.stdout.trim()) {
        return { mode: "bin", bin: which.stdout.trim() };
      }
      continue;
    }
    if (existsSync(bin)) {
      return { mode: "bin", bin };
    }
  }

  for (const python of ["python3", "/usr/bin/python3", "/Applications/Xcode.app/Contents/Developer/usr/bin/python3"]) {
    const probe = spawnSync(python, ["-m", "edge_tts", "--help"], {
      encoding: "utf8",
    });
    if (probe.status === 0) {
      return { mode: "module", python };
    }
  }

  throw new Error(
    "edge-tts não encontrado. Instale com: python3 -m pip install --user edge-tts",
  );
}
