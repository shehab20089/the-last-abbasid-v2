// Draws the candidates for one sound of the kit side by side, from the events slice_sources.mjs found: those of
// one pack whose recording's name matches a pattern, longer and shorter than limits, one attack only if asked, each
// numbered as in the pack's slices.json, with its length, level, flatness and sine share listed. A help for choosing
// takes by eye; it changes nothing but the sheet (captures/audio/pick/<name>.png).
// Usage: node tools/asset_generation/audio/pick_sheet.mjs <name> <pack> <file-regex> [--single] [--min s] [--max s]
//        [--from n] [--to n] [--limit n]
import { mkdirSync, readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas } from "../lib/canvas.mjs";
import { analyse, decode, label, panel } from "./analysis.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const [name, pack, pattern, ...rest] = process.argv.slice(2);
const option = (key, fallback) => {
  const i = rest.indexOf(key);
  return i >= 0 ? Number(rest[i + 1]) : fallback;
};
const single = rest.includes("--single");
const min = option("--min", 0);
const max = option("--max", 99);
const from = option("--from", 0);
const to = option("--to", 1e9);
const limit = option("--limit", 48);
const index = JSON.parse(readFileSync(join(ROOT, "sources", "audio", pack, "slices.json"), "utf8"));
const re = new RegExp(pattern, "i");
const chosen = index.filter((e) => re.test(e.file) && e.seconds >= min && e.seconds <= max && e.n >= from && e.n <= to
  && (!single || e.attacks === 1)).slice(0, limit);
const decoded = new Map();
const cols = 6;
const out = new Canvas(cols * 210, Math.max(1, Math.ceil(chosen.length / cols)) * 112);
out.fillRect(0, 0, out.width, out.height, [30, 30, 34, 255]);
chosen.forEach((e, i) => {
  const path = join(ROOT, "sources", "audio", pack, "x", e.file);
  if (!decoded.has(path)) decoded.set(path, decode(path, 44100));
  const sound = decoded.get(path);
  const clip = { rate: 44100, data: sound.data.slice(Math.floor(e.start * 44100), Math.floor(e.end * 44100)) };
  const a = analyse(clip);
  const x = (i % cols) * 210 + 4;
  const y = Math.floor(i / cols) * 112 + 14;
  out.blit(panel(clip, a, { width: 200, height: 94, normalize: true }), x, y);
  label(out, e.n, x, y - 12, [230, 200, 120, 255]);
  label(out, e.seconds.toFixed(2), x + 120, y - 12, [150, 160, 170, 255]);
  console.log(`${String(e.n).padStart(4)} ${e.file.padEnd(48)} ${e.seconds.toFixed(2)}s  ${String(e.short_db).padStart(6)} dB  flat ${e.flatness.toFixed(2)}  sine ${e.sine.toFixed(2)}  x${e.attacks}`);
});
mkdirSync(join(ROOT, "captures", "audio", "pick"), { recursive: true });
out.save(join(ROOT, "captures", "audio", "pick", `${name}.png`));
console.log(`PICK ${name}: ${chosen.length} drawn`);
