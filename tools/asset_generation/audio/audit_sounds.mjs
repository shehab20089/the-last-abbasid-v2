// Measures every generated sound: length, peak, RMS level and how much of it is silent, so a
// broken synthesis (silence, clipping, NaN) shows up without listening.
// Usage: node tools/asset_generation/audio/audit_sounds.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const rows = [];
let problems = 0;
for (const folder of ["sfx", "music"]) {
  const dir = join(ROOT, "assets", "audio", folder);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".wav"))) {
    const buf = readFileSync(join(dir, file));
    const rate = buf.readUInt32LE(24);
    const bytes = buf.readUInt32LE(40);
    const n = bytes / 2;
    let peak = 0;
    let sum = 0;
    let silent = 0;
    for (let i = 0; i < n; i++) {
      const v = buf.readInt16LE(44 + i * 2) / 32768;
      peak = Math.max(peak, Math.abs(v));
      sum += v * v;
      if (Math.abs(v) < 0.001) silent++;
    }
    const rms = Math.sqrt(sum / n);
    const loop = buf.includes(Buffer.from("smpl"));
    const flag = peak < 0.05 || rms < 0.004 || silent / n > 0.9 ? "CHECK" : "";
    if (flag) problems++;
    rows.push(`${folder}/${file}`.padEnd(32) + `${(n / rate).toFixed(2)}s`.padStart(8) + `peak ${peak.toFixed(2)}`.padStart(11)
      + `rms ${(20 * Math.log10(rms + 1e-9)).toFixed(1)} dB`.padStart(15) + `${loop ? " loop" : ""} ${flag}`);
  }
}
console.log(rows.join("\n"));
console.log(`AUDIT ${rows.length} files, ${problems} to check`);