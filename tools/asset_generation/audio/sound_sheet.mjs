// Draws every sound so it can be looked at: for each, its waveform over a spectrogram (log frequency, 60 Hz to
// 16 kHz), numbered, and beside it in the report what the eye cannot judge alone: its length, its loudness (RMS and
// the loudest 50 ms), how noisy or tonal it is (spectral flatness: a step or a whoosh is noise; a bell, or a blade's
// ring, is tone) and how much of it a clean line runs through. A sheet (or several, 64 sounds a sheet) and a report
// per folder in captures/audio/; the kit's takes are drawn against their own peak. What it flags: a physical cue
// still made in code (not built from recordings: not in variation.json), a sound that starts late (more than 10 ms of
// silence before it: it would lag what it stands for), one that clips, one that ends without fading (a click), and
// a cue whose takes differ in loudness by more than 4 dB. It decides nothing: a human does the final ear check.
// Usage: node tools/asset_generation/audio/sound_sheet.mjs [--folders sfx,music,kit] [name-prefix...]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas } from "../lib/canvas.mjs";
import { analyse, db, label, panel, readWav } from "./analysis.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const OUT = join(ROOT, "captures", "audio");
// The cues that stand for something physical: they should be noise and transient, not a clean tone.
const PHYSICAL = /hit|swing|thrust|step|land|drop|roll|jump|block|bash|kick|crack|thunk|whirl|sever|burst|impact|glance|pommel|arrow|bow|spear|gate|body|parry|hurt|death|release/;
const PER_SHEET = 64;
const args = process.argv.slice(2);
const foldersAt = args.indexOf("--folders");
const folders = foldersAt >= 0 ? args[foldersAt + 1].split(",") : ["sfx", "music"];
const only = args.filter((a, i) => a !== "--folders" && i !== foldersAt + 1);

/** Where a sound begins (the first sample within 40 dB of its peak) and how loud its last half millisecond is against its peak. */
function edges(sound, peak) {
  let onset = 0;
  while (onset < sound.data.length && Math.abs(sound.data[onset]) < peak * 0.01) onset++;
  const w = Math.max(1, Math.round(sound.rate * 0.0005));
  let sum = 0;
  for (let i = Math.max(0, sound.data.length - w); i < sound.data.length; i++) sum += sound.data[i] ** 2;
  return { start: onset / sound.rate, end: db(Math.sqrt(sum / w)) - db(peak) };
}

function sheet(folder) {
  const dir = join(ROOT, "assets", "audio", folder);
  const variationFile = join(dir, "variation.json");
  const recorded = existsSync(variationFile) ? JSON.parse(readFileSync(variationFile, "utf8")) : {};
  const files = readdirSync(dir).filter((f) => f.endsWith(".wav") && (only.length === 0 || only.some((o) => f.startsWith(o))));
  const cols = 4;
  const cellW = 270;
  const cellH = 128;
  const report = [];
  mkdirSync(OUT, { recursive: true });
  for (let page = 0; page * PER_SHEET < files.length; page++) {
    const part = files.slice(page * PER_SHEET, (page + 1) * PER_SHEET);
    const out = new Canvas(cols * cellW, Math.ceil(part.length / cols) * cellH);
    out.fillRect(0, 0, out.width, out.height, [30, 30, 34, 255]);
    part.forEach((file, j) => {
      const i = page * PER_SHEET + j;
      const name = file.replace(/\.wav$/, "");
      const sound = readWav(join(dir, file));
      const a = analyse(sound);
      const x = (j % cols) * cellW + 5;
      const y = Math.floor(j / cols) * cellH + 14;
      out.blit(panel(sound, a, { normalize: folder === "kit" }), x, y);
      label(out, i + 1, x, y - 12, [230, 200, 120, 255]);
      const cue = name.replace(/__\d+$/, "");
      const flags = [];
      if (folder === "sfx" && PHYSICAL.test(cue) && !recorded[cue]) flags.push("a physical sound made in code");
      const { start, end } = edges(sound, a.peak);
      // A swing swells in to its peak by design, and an Art's moment draws breath first; a blow must not lag.
      if (recorded[cue] && !/swing|heavy|thrust|whirl|release|roar|cry/.test(cue) && start > 0.01) flags.push(`starts ${Math.round(start * 1000)} ms late`);
      if (a.peak >= 0.999) flags.push("clips");
      if (folder !== "music" && end > -40) flags.push("ends without fading");
      report.push({ n: i + 1, name, cue, seconds: +(sound.data.length / sound.rate).toFixed(2), rate: sound.rate,
        rms_db: +db(a.rms).toFixed(1), short_db: +db(a.short).toFixed(1), peak_db: +db(a.peak).toFixed(1),
        start_ms: Math.round(start * 1000), flatness: +a.flatness.toFixed(3), sine_frames: +a.lineShare.toFixed(2), flags });
    });
    const suffix = files.length > PER_SHEET ? `_${page + 1}` : "";
    out.save(join(OUT, `${folder}_sheet${suffix}.png`));
  }
  // A cue's takes should match in loudness (a few are meant quieter: a soldier struck without a grunt).
  const byCue = Map.groupBy(report, (r) => r.cue);
  for (const [cue, takes] of byCue) {
    if (takes.length < 2 || recorded[cue]?.uneven) continue;
    const levels = takes.map((t) => t.short_db);
    const spread = Math.max(...levels) - Math.min(...levels);
    if (spread > 4) takes[0].flags.push(`${cue}'s takes differ by ${spread.toFixed(1)} dB`);
  }
  writeFileSync(join(OUT, `${folder}_report.json`), JSON.stringify(report, null, 1));
  return report;
}

for (const folder of folders) {
  const report = sheet(folder);
  const flagged = report.filter((r) => r.flags.length);
  console.log(`${folder}: ${report.length} sounds drawn, ${flagged.length} flagged`);
  for (const r of flagged) {
    console.log(`  ${String(r.n).padStart(3)} ${r.name.padEnd(24)} ${r.flags.join("; ")}`);
  }
}
console.log(`SOUND_SHEET written to ${OUT}`);
