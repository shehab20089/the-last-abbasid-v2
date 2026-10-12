// Cuts the kit (kit.mjs) out of the raw sound libraries (sources/audio/<pack>/x/, downloaded and git-ignored): each
// take from 15 ms before its event to its end, with up to `tail` seconds of its natural decay as long as no new event
// begins, high-passed at its family's `hp` (twice, so rumble and the microphone's breath go), trimmed to its onset
// and to where it falls 60 dB under its peak, faded at both ends, levelled to -1 dBFS peak, and written as 44.1 kHz
// 16-bit mono to assets/audio/kit/<family>_<n>.wav (a folder Godot ignores: build_sounds.mjs reads it), with the
// credits in assets/audio/kit/CREDITS.md. The kit is generated: change kit.mjs and rebuild.
// Usage: node tools/asset_generation/audio/build_kit.mjs
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { decode } from "./analysis.mjs";
import { biquad, writeWav } from "./dsp.mjs";
import { KIT, PACKS } from "./kit.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCES = join(ROOT, "sources", "audio");
const OUT = join(ROOT, "assets", "audio", "kit");
const RATE = 44100;
const HOP = Math.round(RATE * 0.005);

const rms = (data, from, to) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / Math.max(1, to - from));
};

/** Where a take's natural decay ends: the level is followed past the event's end until it rises again (a new event). */
function decayEnd(data, end, tail) {
  const limit = Math.min(data.length, end + Math.round(tail * RATE));
  let lowest = rms(data, Math.max(0, end - HOP), end);
  for (let i = end; i + HOP <= limit; i += HOP) {
    const level = rms(data, i, i + HOP);
    if (level > lowest * 2 && level > 1e-4) return i;
    lowest = Math.min(lowest, level);
  }
  return limit;
}

/** A take cut, cleaned and levelled. */
function cut(data, start, end, { hp, tail }) {
  const from = Math.max(0, Math.floor((start - 0.015) * RATE));
  const to = decayEnd(data, Math.min(data.length, Math.floor(end * RATE)), tail);
  let clip = { rate: RATE, data: data.slice(from, to) };
  clip = biquad(biquad(clip, "highpass", hp, 0.7), "highpass", hp, 0.7);
  const d = clip.data;
  let peak = 0;
  for (const v of d) peak = Math.max(peak, Math.abs(v));
  // Trim to the onset (2 ms before the first sample within 36 dB of the peak) and to where it has fallen 60 dB under.
  const onsetLevel = peak * 10 ** (-36 / 20);
  let onset = 0;
  while (onset < d.length && Math.abs(d[onset]) < onsetLevel) onset++;
  onset = Math.max(0, onset - Math.round(0.002 * RATE));
  const window = Math.round(0.01 * RATE);
  let last = d.length;
  while (last - window > onset && rms(d, last - window, last) < peak * 10 ** (-60 / 20)) last -= window;
  const out = d.slice(onset, Math.min(d.length, last + Math.round(0.005 * RATE)));
  const fadeIn = Math.min(out.length, Math.round(0.0015 * RATE));
  for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn;
  const fadeOut = Math.min(Math.round(0.03 * RATE), Math.floor(out.length * 0.2));
  for (let i = 0; i < fadeOut; i++) out[out.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fadeOut);
  let top = 0;
  for (const v of out) top = Math.max(top, Math.abs(v));
  if (top > 0) for (let i = 0; i < out.length; i++) out[i] *= 0.891 / top;
  return { rate: RATE, data: out };
}

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(OUT)) if (file.endsWith(".wav")) rmSync(join(OUT, file));
writeFileSync(join(OUT, ".gdignore"), "");
const decoded = new Map();
const credits = [];
let count = 0;
for (const [family, spec] of Object.entries(KIT)) {
  spec.takes.forEach(([file, start, end], k) => {
    const path = join(SOURCES, spec.pack, "x", file);
    if (!existsSync(path)) throw new Error(`${family}: ${spec.pack}/${file} is missing; download the pack first (see CREDITS.md)`);
    if (!decoded.has(path)) decoded.set(path, decode(path, RATE).data);
    const take = cut(decoded.get(path), start, end, spec);
    writeWav(join(OUT, `${family}_${k + 1}.wav`), take);
    credits.push(`| ${family}_${k + 1} | ${PACKS[spec.pack].title} | ${file} | ${start.toFixed(3)}–${end.toFixed(3)} s |`);
    count++;
  });
}
const packs = Object.entries(PACKS).map(([key, p]) => `- **${p.title}** by ${p.author} (CC0 1.0), \`sources/audio/${key}/\`: ${p.url}`);
writeFileSync(join(OUT, "CREDITS.md"), `# The recorded kit: credits

Every physical sound in the game (blades, shields, bodies, steps, armour, cloth, arrows, voices) is layered from
these recordings by \`tools/asset_generation/audio/build_sounds.mjs\`. All are dedicated to the public domain (CC0
1.0): no attribution is required, but it is given gladly. Music, ambience, the interface and the Arts' sounds are
made in code.

${packs.join("\n")}

The raw libraries are not kept in the repository (\`sources/\` is git-ignored); \`build_kit.mjs\` cuts this kit from
them. Each take below names its recording and the seconds it spans there.

| Take | Pack | Recording | Span |
| --- | --- | --- | --- |
${credits.join("\n")}
`);
console.log(`KIT ${count} takes in ${Object.keys(KIT).length} families written to ${OUT}`);
