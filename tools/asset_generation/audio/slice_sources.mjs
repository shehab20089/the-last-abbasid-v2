// Finds the separate events in the raw sound libraries (sources/audio/<pack>/x/, downloaded and git-ignored): a long
// take of sabre swings or of blades clashing holds a dozen events with silence between. Each event is measured (its
// level, how noisy or tonal it is, whether a second attack lies inside it) and drawn, numbered, on sheets in
// captures/audio/sources/, so the kit (kit.mjs) can be chosen by looking: no clip with two events in it, no steady
// noise, no click inside a whoosh, no clean sine line on a physical sound. The index of every event is written to
// sources/audio/<pack>/slices.json. It cuts nothing: build_kit.mjs does, from what kit.mjs names.
// Usage: node tools/asset_generation/audio/slice_sources.mjs [pack...]
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas } from "../lib/canvas.mjs";
import { analyse, db, decode, label, panel } from "./analysis.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCES = join(ROOT, "sources", "audio");
const SHEETS = join(ROOT, "captures", "audio", "sources");
const RATE = 44100;
const HOP = Math.round(RATE * 0.005);
const wanted = process.argv.slice(2);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    // An archive made on a Mac carries resource forks (__MACOSX/, ._name): not sounds.
    if (name === "__MACOSX" || name.startsWith("._")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(wav|ogg|flac)$/i.test(name) && !/^preview/i.test(name)) out.push(path);
  }
  return out;
}

/** The events of a take: where its level rises out of the quiet and falls back, with a little before and after. */
function events(data) {
  const env = [];
  for (let s = 0; s < data.length; s += HOP) {
    let sum = 0;
    const end = Math.min(data.length, s + HOP);
    for (let i = s; i < end; i++) sum += data[i] * data[i];
    env.push(Math.sqrt(sum / Math.max(1, end - s)));
  }
  let top = 0;
  for (const v of env) top = Math.max(top, v);
  const floor = top * 10 ** (-42 / 20);
  const strong = top * 10 ** (-26 / 20);
  const merged = [];
  for (let h = 0; h < env.length; h++) {
    if (env[h] <= floor) continue;
    const last = merged[merged.length - 1];
    if (last && h - last.to <= 16) last.to = h;
    else merged.push({ from: h, to: h });
  }
  // A long region may be several events run together (swings in quick succession over a noisy room): it is split
  // at its deepest valley while that valley lies well below the loudness on both sides of it.
  const smooth = env.map((_, h) => {
    let sum = 0;
    for (let k = -2; k <= 2; k++) sum += env[Math.min(env.length - 1, Math.max(0, h + k))];
    return sum / 5;
  });
  const regions = [];
  const split = (r) => {
    if (r.to - r.from < 90) return regions.push(r);
    let best = -1;
    let depth = 0;
    let left = 0;
    const right = new Float64Array(r.to - r.from + 2);
    for (let h = r.to; h >= r.from; h--) right[h - r.from] = Math.max(right[h - r.from + 1] ?? 0, smooth[h]);
    for (let h = r.from + 20; h <= r.to - 20; h++) {
      left = Math.max(left, smooth[h - 20]);
      const prominence = Math.min(left, right[h + 20 - r.from]) / Math.max(1e-9, smooth[h]);
      if (prominence > depth) {
        depth = prominence;
        best = h;
      }
    }
    if (best < 0 || depth < 10 ** (10 / 20)) return regions.push(r);
    split({ from: r.from, to: best });
    split({ from: best + 1, to: r.to });
  };
  for (const r of merged) split(r);
  const out = [];
  for (let k = 0; k < regions.length; k++) {
    const r = regions[k];
    let loud = 0;
    for (let h = r.from; h <= r.to; h++) loud = Math.max(loud, env[h]);
    if (loud < strong) continue;
    const next = regions[k + 1]?.from ?? env.length;
    const start = Math.max(0, r.from - 2) * HOP;
    const end = Math.min(next, r.to + 6, r.from + 800) * HOP;
    // A second attack inside it: the level dips well below its peak, then climbs back near it.
    let attacks = 1;
    let running = 0;
    let dipped = false;
    for (let h = r.from; h <= r.to; h++) {
      if (env[h] > running) running = env[h];
      if (env[h] < running * 10 ** (-10 / 20)) dipped = true;
      if (dipped && env[h] > loud * 10 ** (-8 / 20) && env[h] > env[h - 1] * 1.5) {
        attacks++;
        dipped = false;
        running = env[h];
      }
    }
    out.push({ start: start / RATE, end: Math.min(data.length, end) / RATE, attacks, peak: loud / top });
  }
  return out;
}

for (const pack of readdirSync(SOURCES)) {
  if (wanted.length && !wanted.includes(pack)) continue;
  const root = join(SOURCES, pack, "x");
  let files = [];
  try {
    files = walk(root).sort();
  } catch {
    continue;
  }
  const index = [];
  const cells = [];
  for (const file of files) {
    let sound;
    try {
      sound = decode(file, RATE);
    } catch {
      console.log(`  unreadable, left out: ${relative(root, file)}`);
      continue;
    }
    for (const e of events(sound.data)) {
      const clip = { rate: RATE, data: sound.data.slice(Math.floor(e.start * RATE), Math.floor(e.end * RATE)) };
      const a = analyse(clip);
      const entry = { n: index.length + 1, file: relative(root, file).replace(/\\/g, "/"), start: +e.start.toFixed(3),
        end: +e.end.toFixed(3), seconds: +(e.end - e.start).toFixed(3), short_db: +db(a.short).toFixed(1),
        flatness: +a.flatness.toFixed(3), sine: +a.lineShare.toFixed(2), attacks: e.attacks };
      index.push(entry);
      cells.push({ clip, a, n: entry.n });
    }
  }
  writeFileSync(join(SOURCES, pack, "slices.json"), JSON.stringify(index, null, 1));
  mkdirSync(SHEETS, { recursive: true });
  const cols = 6;
  const per = 60;
  for (let page = 0; page * per < cells.length; page++) {
    const part = cells.slice(page * per, (page + 1) * per);
    const out = new Canvas(cols * 210, Math.ceil(part.length / cols) * 112);
    out.fillRect(0, 0, out.width, out.height, [30, 30, 34, 255]);
    part.forEach(({ clip, a, n }, i) => {
      const x = (i % cols) * 210 + 4;
      const y = Math.floor(i / cols) * 112 + 14;
      out.blit(panel(clip, a, { width: 200, height: 94, normalize: true }), x, y);
      label(out, n, x, y - 12, [230, 200, 120, 255]);
    });
    out.save(join(SHEETS, `${pack}_${page + 1}.png`));
  }
  console.log(`${pack}: ${files.length} takes, ${index.length} events, ${Math.ceil(cells.length / per)} sheet(s)`);
}
