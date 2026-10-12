// Builds every sound of the game. The physical ones (blades, shields, bodies, steps, armour, cloth, arrows, voices)
// are layered from recorded takes (the kit: kit.mjs, build_kit.mjs, CC0 libraries credited in
// assets/audio/kit/CREDITS.md); the rest is synthesized: the warnings, the Arts, breath and the heart, the interface,
// the city's ambiences (fire and wind, the river) and the score: a plucked oud over a drone with a frame drum, in a
// maqam for each place (Hijaz for the market, Saba for the burning streets, Bayati with a ney for the scholars, Hijaz
// Kar for the last gate and its captain). Quarter tones are fractional semitones. Deterministic: rerunning rewrites
// the same files.
// Usage: node tools/asset_generation/audio/build_sounds.mjs [--only name,name]
import { existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TAU, adsr, biquad, brownNoise, buffer, drive, expDecay, fadeEdges, gain, makeLoop, mixInto,
  normalize, oscillator, partials, percussive, pinkNoise, pluck, render, reverb, whiteNoise, writeWav,
} from "./dsp.mjs";
import { rng } from "../lib/noise.mjs";
import { excerpt, highpass, layer, level, lowpass, peak, reach, room, speed, take } from "./recorded.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SFX = join(ROOT, "assets", "audio", "sfx");
const MUSIC = join(ROOT, "assets", "audio", "music");
const SR = 44100;
const MR = 24000;
const args = process.argv.slice(2);
const onlyIndex = args.indexOf("--only");
const only = onlyIndex >= 0 ? args[onlyIndex + 1].split(",") : null;
const built = [];

function sfx(name, make) {
  if (only && !only.includes(name)) return;
  const b = make();
  writeWav(join(SFX, `${name}.wav`), fadeEdges(normalize(b, 0.85)));
  built.push(name);
}

function noiseBurst(seconds, seed, { type = "white", hp = 0, lp = 0, bp = 0, q = 1, env }) {
  const source = type === "pink" ? pinkNoise(seed) : type === "brown" ? brownNoise(seed) : whiteNoise(seed);
  let b = render(seconds, SR, (t) => source() * env(t));
  if (hp) b = biquad(b, "highpass", hp, 0.7);
  if (lp) b = biquad(b, "lowpass", lp, 0.7);
  if (bp) b = biquad(b, "bandpass", bp, q);
  return b;
}

/** A blade cutting air: band-passed noise whose centre sweeps up as the edge speeds past. */
function whoosh(seconds, from, to, seed, { q = 1.6, attack = 0.035 } = {}) {
  const source = whiteNoise(seed);
  const b = render(seconds, SR, (t) => source() * percussive(t, attack, seconds * 0.32));
  return biquad(b, "bandpass", (t) => from * Math.pow(to / from, Math.min(1, t / (seconds * 0.7))), q);
}

function thump(seconds, f0, f1, tau) {
  const osc = oscillator((t) => f1 + (f0 - f1) * Math.exp(-t / 0.03));
  return render(seconds, SR, (t) => osc(t, SR) * percussive(t, 0.002, tau));
}

/** Small plates of armour knocking together: a scatter of short bright clicks. */
function rattle(seconds, count, seed, { freq = 4200 } = {}) {
  const r = rng(seed);
  const out = buffer(seconds, SR);
  for (let i = 0; i < count; i++) {
    const at = r() * seconds * 0.7;
    const click = partials(0.05, SR, [[freq * (0.8 + r() * 0.5), 1, 0.012], [freq * 1.7 * (0.9 + r() * 0.2), 0.5, 0.008]]);
    mixInto(out, click, at, 0.3 + r() * 0.5);
  }
  return out;
}

// --- Recorded ----------------------------------------------------------------------------------------
// The physical sounds (blades, shields, bodies, steps, armour, cloth, arrows, voices) are layered from the kit's
// recorded takes (kit.mjs, cut by build_kit.mjs): several takes a cue, each brought to the cue's loudness (its
// loudest 50 ms, in dBFS, as the code-made cue it replaced, so the mix keeps its balance; the parry and the heavy
// blows a little louder) with its peaks limited. The game plays one at random, never the same twice running, its
// pitch spread by `pitch` and its level by `volume` dB (variation.json, read by tools/write_main_scene.mjs). A code
// layer is kept only where the thing is not a recording's to give: a fire's rush, a drum under a cry, the weight
// of a stone striking a wall far off, a reward's chime.

const variation = {};

/**
 * A cue of `takes` takes (name__1.wav ...; one take is name.wav), each `make(i)` brought to `loud` dBFS (a number,
 * or one per take where some are meant quieter). Where a take cannot reach it without crushing its transient (a
 * sword's clash is nearly all peak), every take of the cue is brought down together, so they still match, and the
 * build says so: the cue then sits that much lower in the mix than asked. A clash of steel is nearly all its first
 * milliseconds: its takes may be held down further there (`most` dB) and let go at once (`release` s), which
 * rounds the click of the strike and keeps its ring.
 */
function recorded(name, { takes = 1, loud, pitch = 1.05, volume = 1, most = 4, release = 0.04 }, make) {
  if (only && !only.includes(name)) return;
  // Takes this build no longer makes go, with their import files; a take rewritten keeps its import (Godot
  // imports it again on the next editor scan).
  const files = new Set(Array.from({ length: takes }, (_, i) => (takes === 1 ? `${name}.wav` : `${name}__${i + 1}.wav`)));
  for (const file of readdirSync(SFX)) {
    const wav = file.replace(/\.import$/, "");
    const mine = wav === `${name}.wav` || new RegExp(`^${name}__\\d+\\.wav$`).test(wav);
    if (mine && !files.has(wav)) rmSync(join(SFX, file));
  }
  const sounds = Array.from({ length: takes }, (_, i) => make(i));
  const wanted = sounds.map((_, i) => (typeof loud === "function" ? loud(i) : loud));
  const short = Math.min(0, ...sounds.map((b, i) => reach(b, { most, release }) - wanted[i]));
  if (short < -0.5) console.log(`  ${name}: ${(wanted[0] + short).toFixed(1)} dBFS, ${(-short).toFixed(1)} dB under the ${wanted[0]} asked`);
  sounds.forEach((b, i) => {
    const file = takes === 1 ? `${name}.wav` : `${name}__${i + 1}.wav`;
    writeWav(join(SFX, file), fadeEdges(level(b, wanted[i] + short, { most, release }), 0.0005, 0.008));
  });
  variation[name] = { takes, pitch, volume, ...(typeof loud === "function" ? { uneven: true } : {}) };
  built.push(name);
}

/** Where a sound is loudest (its 5 ms RMS), in seconds. */
function peakTime(b) {
  const w = Math.max(1, Math.round(b.rate * 0.005));
  let sum = 0;
  let best = 0;
  let at = 0;
  for (let i = 0; i < b.data.length; i++) {
    sum += b.data[i] * b.data[i];
    if (i >= w) sum -= b.data[i - w] * b.data[i - w];
    if (sum > best) {
      best = sum;
      at = i - w / 2;
    }
  }
  return Math.max(0, at) / b.rate;
}

/**
 * A blade through the air: a take with its loudest moment `lead` seconds in, since the cue plays as the blade
 * sweeps (the blow's first live frame), swelling in to it.
 */
function swish(family, n, { lead = 0.03, rate = 1, hp = 0 } = {}) {
  const w = speed(take(family, n), rate);
  const p = peakTime(w);
  const from = Math.max(0, p - lead);
  const out = excerpt(w, from, w.data.length / w.rate, 0.04);
  const swell = Math.round((p - from) * out.rate);
  for (let i = 0; i < swell; i++) out.data[i] *= (i / swell) ** 1.5;
  return hp ? highpass(out, hp) : out;
}

/** The first `seconds` of a take, high-passed (cloth, mail and plates under a heavier sound). */
const rustle = (family, n, seconds, hp) => highpass(excerpt(take(family, n), 0, seconds, seconds * 0.4), hp);

/** Lays [at, sound, db] layers into one buffer long enough for them all. */
function mix(rate, ...layers) {
  const out = room(rate, ...layers.map(([at, b]) => [at, b]));
  for (const [at, b, db = 0] of layers) layer(out, b, at, db);
  return out;
}

// Blades through the air: Yusuf's cuts whistle (a sabre's and a katana's edge), his thrust is a dagger's quick
// swish, his cleave an axe's whomp under a slowed whistle; the soldiers' sabres a long knife's cut slowed, their
// maces and axes the axe's whomp slower still, the spear its own.
recorded("sword_swing", { takes: 8, loud: -12, pitch: 1.06 }, (i) =>
  peak(swish("swing_light", [1, 2, 4, 6, 8, 11, 13, 16][i], { hp: 260 }), 3200, 0.9, 3));
recorded("sword_thrust", { takes: 6, loud: -13, pitch: 1.06 }, (i) =>
  peak(swish("swing_quick", [1, 2, 4, 5, 1, 2][i], { lead: 0.02, rate: i < 4 ? 1.1 : 1.2, hp: 320 }), 3500, 1, 2));
recorded("sword_heavy", { takes: 6, loud: -11, pitch: 1.05, most: 6 }, (i) => mix(SR,
  [0, swish("swing_heavy", i + 1, { lead: 0.05, hp: 70 })],
  [0, swish("swing_light", 9 + i, { lead: 0.05, rate: 0.85, hp: 300 }), -5]));
recorded("enemy_swing", { takes: 8, loud: -12, pitch: 1.06 }, (i) =>
  swish("swing_seax", [1, 2, 3, 5, 6, 7, 8, 9][i], { rate: 0.93, hp: 200 }));
recorded("enemy_swing_heavy", { takes: 6, loud: -11, pitch: 1.05, most: 6 }, (i) => mix(SR,
  [0, swish("swing_heavy", 6 - i, { lead: 0.06, rate: 0.88, hp: 55 })],
  [0.01, swish("swing_spear", 1 + (i % 5), { lead: 0.05, rate: 0.9, hp: 180 }), -7]));
recorded("spear_thrust", { takes: 5, loud: -12, pitch: 1.05 }, (i) =>
  swish("swing_spear", i + 1, { lead: 0.04, hp: 180 }));
recorded("whirl", { takes: 4, loud: -11, pitch: 1.05 }, (i) => mix(SR,
  [0, swish("swing_light", 2 + i * 3, { hp: 260 }), -2],
  [0.17, swish("swing_light", 3 + i * 3, { rate: 1.08, hp: 260 })]));
recorded("charge_release", { takes: 4, loud: -10, pitch: 1.04, most: 6 }, (i) => mix(SR,
  [0, swish("swing_heavy", [6, 5, 2, 1][i], { lead: 0.05, rate: 0.82, hp: 45 })],
  [0, swish("swing_light", 12 + i, { lead: 0.05, rate: 0.8, hp: 280 }), -4]));

// Steel on steel and on the shields: a parry is a sword struck on a sword, ringing (two strikes a breath apart, so
// the ring is full), with a slide of steel and a little air about it; a block a blade on a round shield's board (wood, a bronze rim); a broken guard a mace's blow
// on steel, the board cracking and the plates crashing; a glance a light ring and a skid off the rim.
recorded("parry", { takes: 8, loud: -12, pitch: 1.04, most: 9, release: 0.006 }, (i) => reverb(mix(SR,
  [0, peak(take("clash_ring", [6, 5, 13, 12, 14, 7, 2, 8][i]), 4000, 0.8, 2)],
  [0.007, speed(take("clash_ring", [12, 14, 6, 5, 13, 2, 7, 1][i]), 1.05), -5],
  [0.012, highpass(excerpt(take("scrape", 1 + (i % 2)), 0.05 + 0.04 * i, 0.2 + 0.04 * i, 0.06), 1500), -16]),
  { room: 0.62, damp: 0.5, wet: 0.08, tail: 0.5 }));
recorded("shield_block", { takes: 8, loud: -12, pitch: 1.05, most: 8, release: 0.008 }, (i) => mix(SR,
  [0, take("clash_wood", [10, 7, 2, 13, 9, 14, 12, 5][i])],
  [0.002, lowpass(speed(take("plank", 1 + (i % 5)), 0.85), 2500), -5]));
recorded("guard_break", { takes: 6, loud: -11, pitch: 1.04, most: 8, release: 0.008 }, (i) => mix(SR,
  [0, take("clash_heavy", [9, 5, 10, 13, 7, 2][i])],
  [0.008, take("wood_crack", 1 + (i % 4)), -3],
  [0.004, lowpass(take("plate_medium", 1 + (i % 5)), 5000), -10]));
recorded("glance", { takes: 6, loud: -15, pitch: 1.06, most: 9, release: 0.006 }, (i) => mix(SR,
  [0, excerpt(speed(take("clash_ring", [1, 9, 16, 3, 4, 10][i]), 1.12), 0, 0.3, 0.12), -1],
  [0.005, highpass(excerpt(take("scrape", 1 + (i % 2)), 0.1 + i * 0.05, 0.24 + i * 0.05, 0.05), 1200), -6]));

// Blows landing on men in cloth and lamellar: the edge through cloth, the blow's weight in the body, the little
// plates knocking; a heavy blow chops in under a crash of plates; the pommel a hard knock of wood and bone; the
// kick and the shield's boss deep blows with the mail shaken; a blade cutting a man apart a chop and a wet slice.
recorded("sword_hit", { takes: 8, loud: -9, pitch: 1.05, volume: 1.5 }, (i) => mix(SR,
  [0, highpass(excerpt(take("slice", 1 + (i % 2)), 0, 0.16, 0.06), 900), -4],
  [0.004, i % 2 ? take("punch_medium", 1 + ((i >> 1) % 5)) : take("hit_body", [2, 3, 5, 9][i >> 1])],
  [0.01, highpass(take("metal_small", 1 + (i % 3)), 1500), -13]));
recorded("sword_hit_heavy", { takes: 8, loud: -8.5, pitch: 1.05, volume: 1.5, most: 6 }, (i) => mix(SR,
  [0.004, take("punch_heavy", 1 + (i % 5))],
  [0, speed(take("chop", 1), 0.9 + (i % 4) * 0.05), -3],
  [0, highpass(excerpt(take("slice", 1 + (i % 2)), 0.02, 0.2, 0.06), 900), -6],
  [0.008, lowpass(take("plate_light", 1 + (i % 5)), 6000), -12]));
recorded("pommel_crack", { takes: 4, loud: -9, pitch: 1.05 }, (i) => mix(SR,
  [0, speed(take("wood_light", 1 + i), 0.9), -2],
  [0.003, take("hit_body", [4, 6, 8, 11][i]), -1],
  [0.012, highpass(take("metal_small", 1 + (i % 3)), 1500), -14]));
recorded("kick_hit", { takes: 5, loud: -8, pitch: 1.05 }, (i) => mix(SR,
  [0, take("punch_heavy", 5 - i)],
  [0, take("thud_light", 1 + i), -4],
  [0.02, rustle("chainmail", 1 + (i % 2), 0.3, 900), -12]));
recorded("shield_bash", { takes: 5, loud: -9, pitch: 1.05, most: 6 }, (i) => mix(SR,
  [0, take("wood_heavy", 1 + i)],
  [0.004, take("punch_heavy", 1 + ((i + 2) % 5)), -3],
  [0.006, lowpass(take("plate_medium", 1 + i), 5000), -11],
  [0.02, rustle("chainmail", 1 + (i % 2), 0.3, 900), -13]));
recorded("sever", { takes: 6, loud: -11, pitch: 1.05, most: 6 }, (i) => {
  const out = mix(SR,
    [0, speed(take("chop", 1), 0.88 + i * 0.04)],
    [0, highpass(excerpt(take("slice", 1 + (i % 2)), 0, 0.25, 0.08), 700), -5],
    [0.01, take("hit_body", [1, 7, 8, 10, 11, 12][i]), -4]);
  // The spatter after: a few wet drops on the stones.
  const r = rng(95 + i);
  for (let k = 0; k < 4; k++) {
    layer(out, noiseBurst(0.05, 97 + i * 5 + k, { bp: 2000 + r() * 900, q: 3, env: (t) => percussive(t, 0.001, 0.012) }),
      0.18 + k * 0.08 + r() * 0.03, -14 - k * 2);
  }
  return out;
});

// Steps and the body: a foot on stone (on boards, footstep_wood), the spring of a jump in cloth, a landing on both
// feet with the mail shaken, a roll over the shoulder, a body (or a piece of one) meeting the street.
recorded("footstep", { takes: 8, loud: -16, pitch: 1.08, volume: 2 }, (i) => mix(SR,
  [0, speed(take("step_stone", 1 + (i % 5)), i < 5 ? 1 : 0.9)],
  [0, take("thud_light", 1 + (i % 5)), -12]));
recorded("footstep_wood", { takes: 6, loud: -16, pitch: 1.08, volume: 2 }, (i) =>
  speed(take("step_wood", 1 + (i % 5)), i < 5 ? 1 : 0.92));
recorded("jump", { takes: 6, loud: -15, pitch: 1.06 }, (i) => mix(SR,
  [0, rustle(i % 2 ? "cloth" : "cloth_heavy", 1 + (i >> 1), 0.22, 200)],
  [0, take("step_stone", 1 + (i % 5)), -6]));
recorded("land", { takes: 6, loud: -10, pitch: 1.05 }, (i) => mix(SR,
  [0, take("step_stone", 1 + (i % 5)), -2],
  [0.018, take("step_stone", 1 + ((i + 2) % 5)), -4],
  [0, take("thud_light", 1 + (i % 5)), -2],
  [0, rustle("cloth", 1 + (i % 4), 0.18, 200), -10],
  [0.01, rustle("chainmail", 1 + (i % 2), 0.2, 900), -18]));
recorded("roll", { takes: 4, loud: -12, pitch: 1.05 }, (i) => mix(SR,
  [0, rustle("cloth_heavy", 1 + (i % 2), 0.3, 150)],
  [0.12, rustle("cloth", 1 + i, 0.3, 200), -3],
  [0.05, take("thud_light", 1 + i), -5],
  [0.3, take("thud_light", 2 + i), -8],
  [0.08, rustle("chainmail", 1 + (i % 2), 0.35, 900), -14]));
recorded("body_drop", { takes: 6, loud: -8, pitch: 1.06 }, (i) => mix(SR,
  [0, take("thud_heavy", 1 + (i % 5))],
  [0.01, take("leather_drop", 1), -6],
  [0.02, rustle("chainmail", 1 + (i % 2), 0.35, 900), -12],
  [0.03, lowpass(take("plate_light", 1 + (i % 5)), 4000), -16]));

// Voices: the soldiers grunt when struck (not every time: some takes are only their plates), cry out as they fall,
// shout as they draw on seeing him; Yusuf has his own voice for his wounds, his death and the Second Wind's cry;
// the Captain's roar is a man's lowered and rung through his helm.
recorded("enemy_hurt", { takes: 8, loud: (i) => (i < 5 ? -11.5 : -17), pitch: 1.03 }, (i) => i < 5
  ? mix(SR, [0.02, take("voice_soldier_grunt", [1, 2, 3, 5, 7][i])], [0, rustle("armour_light", 1, 0.3, 600), -10])
  : mix(SR, [0, [rustle("armour_light", 1, 0.3, 600), rustle("chainmail", 1, 0.3, 900), rustle("metal_small", 2, 0.25, 900)][i - 5]]));
recorded("enemy_death", { takes: 7, loud: -9, pitch: 1.03 }, (i) => mix(SR,
  [0, take("voice_soldier_death", i + 1)],
  [0.32, take("thud_heavy", 1 + (i % 5)), -4],
  [0.34, rustle("chainmail", 1 + (i % 2), 0.4, 900), -11]));
recorded("hero_hurt", { takes: 6, loud: -9, pitch: 1.03 }, (i) => mix(SR,
  [0.004, take("voice_hero_grunt", i + 1)],
  [0, rustle("chainmail", 1 + (i % 2), 0.3, 900), -11]));
recorded("hero_death", { takes: 2, loud: -8, pitch: 1.0, volume: 0 }, (i) => mix(SR,
  [0, take("voice_hero_death", i + 1)],
  [0.45, take("thud_heavy", 2 + i), -3],
  [0.47, rustle("chainmail", 1 + i, 0.4, 900), -9],
  [0.5, lowpass(take("plate_light", 2 + i), 4000), -14]));
recorded("enemy_alert", { takes: 6, loud: (i) => (i < 4 ? -12 : -14), pitch: 1.03 }, (i) => i < 4
  ? mix(SR, [0, take("voice_soldier_shout", i + 1)], [0.12, highpass(take("sabre_draw", i + 1), 400), -6])
  : highpass(take("sabre_draw", i + 1), 400));
recorded("war_cry", { takes: 2, loud: -8, pitch: 1.0, volume: 0 }, (i) => reverb(mix(SR,
  [0, take("voice_hero_cry", [1, 3][i])],
  [0.1, thump(0.6, 80, 36, 0.2), -10]), { room: 0.8, wet: 0.22, tail: 0.6 }));
recorded("boss_roar", { takes: 3, loud: -9, pitch: 1.0, volume: 0 }, (i) => reverb(
  peak(lowpass(speed(take("voice_captain", i + 1), 0.84), 6000), 700, 1.2, 3), { room: 0.82, wet: 0.2, tail: 0.6 }));
recorded("boss_fall", { takes: 1, loud: -7, pitch: 1.0, volume: 0 }, () => reverb(mix(SR,
  [0, speed(take("thud_heavy", 1), 0.85)],
  [0.01, take("plate_heavy", 1), -3],
  [0.05, take("metal_fall", 1), -5],
  [0.42, speed(take("thud_heavy", 3), 0.9), -4],
  [0.45, take("ring_metal", 1), -10]), { room: 0.85, wet: 0.2, tail: 0.8 }));

// Bows and arrows: the string's slap and the arrow's hiss leaving; an arrow into wood, and into a man.
recorded("bow_release", { takes: 5, loud: -16, pitch: 1.04, most: 8, release: 0.006 }, (i) => mix(SR,
  [0, take("bow_shoot", i + 1)],
  [0.04, highpass(take("arrow_pass", 1 + (i % 6)), 600), -9]));
recorded("arrow_thunk", { takes: 5, loud: -12, pitch: 1.05 }, (i) => mix(SR,
  [0, take("wood_light", 1 + i)],
  [0, speed(take("plank", 1 + i), 1.3), -4]));
recorded("arrow_hit", { takes: 5, loud: -10, pitch: 1.05 }, (i) => mix(SR,
  [0, take("punch_medium", 1 + i)],
  [0, speed(take("wood_light", 1 + ((i + 2) % 5)), 1.4), -7],
  [0.008, highpass(take("metal_small", 1 + (i % 3)), 1500), -15]));

// Fire pots and flasks shatter (the clay or the glass recorded, the fire's rush made); the great gate's timbers on
// their hinges; a trebuchet's stone striking a wall far off (rock breaking, slowed, and rubble, over the boom's
// weight, dulled by the distance); a remedy unstopped and drunk, a lamp's latch, a page turned.
function whoomph(seconds, seed, from = 2400, fall = 1800, rise = 14, decay = 3.2) {
  const rush = whiteNoise(seed);
  const b = render(seconds, SR, (t) => rush() * Math.min(1, t * rise) * Math.exp(-t * decay));
  return biquad(b, "lowpass", (t) => from - t * fall, 0.7);
}
recorded("pot_burst", { takes: 3, loud: -11, pitch: 1.04 }, (i) => reverb(mix(SR,
  [0, take("shatter", i + 1)],
  [0.03, whoomph(0.8, 227 + i), -3],
  [0, thump(0.4, 90, 40, 0.2), -10]), { room: 0.6, wet: 0.2, tail: 0.5 }));
recorded("naft_burst", { takes: 2, loud: -10, pitch: 1.03 }, (i) => {
  const out = mix(SR,
    [0, take("glass_shatter", i + 1)],
    [0.02, whoomph(1.4, 552 + i, 3000, 2000, 10, 2.2), -1],
    [0, thump(0.8, 70, 30, 0.3), -6]);
  const r = rng(553 + i);
  for (let k = 0; k < 26; k++) {
    layer(out, noiseBurst(0.02, 560 + k, { hp: 3000, env: (t) => percussive(t, 0.0005, 0.004) }), 0.2 + r() * 1.3,
      -14 + r() * 4);
  }
  return reverb(out, { room: 0.7, wet: 0.25, tail: 0.6 });
});
recorded("gate_open", { takes: 1, loud: -9, pitch: 1.0, volume: 0 }, () => {
  const door = speed(take("door_open", 2), 0.62);
  const opened = door.data.length / SR;
  return reverb(mix(SR,
    [0, door],
    [0.2, speed(take("creak", 1), 0.55), -5],
    [opened - 0.08, speed(take("wood_heavy", 2), 0.7), -1]), { room: 0.85, wet: 0.25, tail: 1.0 });
});
recorded("siege_impact", { takes: 2, loud: -8, pitch: 1.02, volume: 0 }, (i) => reverb(lowpass(mix(SR,
  [0, speed(take("rock_break", i + 1), 0.6)],
  [0.15, speed(take("rubble", 1 + i * 2), 0.7), -4],
  [0.4, speed(take("rubble", 2 + i * 2), 0.75), -7],
  [0.25, speed(take("debris", i + 1), 0.8), -6],
  [0, thump(1.2, 62, 26, 0.45), -2]), 2400), { room: 0.92, wet: 0.35, tail: 1.2 }));
recorded("heal", { takes: 1, loud: -11, pitch: 1.0, volume: 0 }, () => {
  const out = mix(SR, [0, take("bottle", 1), -2]);
  const r = buffer(1.1, SR);
  mixInto(r, partials(0.5, SR, [[2093, 1, 0.12], [3320, 0.6, 0.09], [5010, 0.3, 0.06]]), 0, 0.4);
  const source = whiteNoise(111);
  const gurgle = biquad(render(0.7, SR, (t) => source() * (0.5 + 0.5 * Math.sin(TAU * 11 * t + Math.sin(TAU * 3 * t) * 2))
    * adsr(t, 0.05, 0.1, 0.8, 0.2, 0.5)), "bandpass", (t) => 500 + 300 * Math.sin(TAU * 7 * t), 4);
  mixInto(r, gurgle, 0.2, 0.9);
  return mix(SR, [0, out], [0.18, r, -3]);
});
recorded("lamp_light", { takes: 1, loud: -11, pitch: 1.0, volume: 0 }, () => {
  const out = buffer(2.0, SR);
  mixInto(out, noiseBurst(0.4, 121, { lp: 900, env: (t) => adsr(t, 0.12, 0.1, 0.4, 0.15, 0.2) }), 0, 0.8);
  mixInto(out, partials(1.8, SR, [[587.3, 0.8, 0.7], [880, 0.5, 0.55], [1174.7, 0.3, 0.4]], { attack: 0.01 }), 0.12, 0.5);
  return mix(SR, [0, take("latch", 2), -4], [0.1, reverb(out, { room: 0.84, wet: 0.3, tail: 1.0 })]);
});
recorded("manuscript", { takes: 1, loud: -12, pitch: 1.0, volume: 0 }, () => {
  const out = buffer(1.2, SR);
  mixInto(out, partials(1.0, SR, [[1318.5, 0.6, 0.35], [1975.5, 0.4, 0.28], [2637, 0.25, 0.2]], { attack: 0.005 }), 0, 0.5);
  return mix(SR, [0, highpass(take("book", 2), 300), -2], [0.2, reverb(out, { room: 0.8, wet: 0.25, tail: 0.8 }), -4]);
});

if (!only || Object.keys(variation).length) {
  const file = join(SFX, "variation.json");
  const kept = existsSync(file) && only ? JSON.parse(readFileSync(file, "utf8")) : {};
  writeFileSync(file, `${JSON.stringify({ ...kept, ...variation }, null, 1)}\n`);
}

// --- Made in code ------------------------------------------------------------------------------------
// What no recording gives: the held cleave's strain, the Arts' moments, the warnings (each its own colour and
// sound), breath, the heart, honour, the interface and the stings.



sfx("charge_hum", () => {
  // The blow held back: breath drawn through the teeth and a low tremor of strain that rises with it.
  const seconds = 1.4;
  const air = whiteNoise(67);
  const fade = (t) => Math.min(1, t * 3) * Math.max(0, 1 - t / seconds);
  let breath = render(seconds, SR, (t) => air() * fade(t) * 0.6);
  breath = biquad(breath, "bandpass", (t) => 300 + t * 500, 1.2);
  const strain = oscillator((t) => 98 + 60 * t);
  const tone = render(seconds, SR, (t) => strain(t, SR) * fade(t) * (0.65 + 0.35 * Math.sin(TAU * 9 * t)));
  const out = buffer(seconds, SR);
  mixInto(out, breath, 0, 0.8);
  mixInto(out, biquad(drive(tone, 2), "lowpass", () => 900, 0.7), 0, 0.45);
  return out;
});
sfx("charge_level", () => {
  // The blow grows a step: a bright ring of steel over a soft knock.
  const out = buffer(0.7, SR);
  mixInto(out, partials(0.7, SR, [[1318, 0.8, 0.26], [1975, 0.6, 0.2], [2637, 0.4, 0.14], [3951, 0.25, 0.08]],
    { attack: 0.004 }), 0, 0.7);
  mixInto(out, thump(0.2, 220, 140, 0.05), 0, 0.5);
  return reverb(out, { room: 0.6, wet: 0.2, tail: 0.35 });
});
sfx("art_sting", () => {
  // An Art let loose: a frame-drum stroke under a rising ring of steel, and the air torn after it.
  const out = buffer(1.0, SR);
  mixInto(out, thump(0.6, 120, 48, 0.2), 0, 1.0);
  const ring = partials(0.8, SR, [[880, 0.7, 0.32], [1318, 0.6, 0.26], [1760, 0.4, 0.2], [2637, 0.25, 0.12]], { attack: 0.03 });
  mixInto(out, ring, 0.02, 0.55);
  mixInto(out, whoosh(0.4, 500, 3600, 70, { q: 1.4, attack: 0.08 }), 0.06, 0.6);
  return reverb(out, { room: 0.7, wet: 0.3, tail: 0.6 });
});
sfx("second_wind", () => {
  // A long breath drawn in and let go, over a low warm hum.
  const seconds = 1.3;
  const air = whiteNoise(71);
  let breath = render(seconds, SR, (t) => air() * Math.sin(Math.PI * Math.min(1, t / seconds)) * 0.7);
  breath = biquad(breath, "bandpass", (t) => 500 + 700 * Math.sin(Math.PI * Math.min(1, t / seconds)), 0.9);
  const out = buffer(seconds, SR);
  mixInto(out, breath, 0, 0.9);
  mixInto(out, partials(seconds, SR, [[110, 0.6, 0.9], [165, 0.4, 0.8], [220, 0.25, 0.6]], { attack: 0.25 }), 0, 0.35);
  return reverb(out, { room: 0.6, wet: 0.25, tail: 0.5 });
});
sfx("honour", () => {
  // Honour earned: two soft bright notes, a small bell and its answer.
  const out = buffer(0.9, SR);
  mixInto(out, partials(0.7, SR, [[1174.7, 0.7, 0.3], [2349, 0.3, 0.18], [3524, 0.15, 0.1]], { attack: 0.004 }), 0, 0.55);
  mixInto(out, partials(0.7, SR, [[1568, 0.7, 0.32], [3136, 0.3, 0.2], [4704, 0.12, 0.1]], { attack: 0.004 }), 0.11, 0.5);
  return reverb(out, { room: 0.55, wet: 0.25, tail: 0.4 });
});
sfx("art_refused", () => {
  // Not yet: a dull, short knock.
  const out = buffer(0.25, SR);
  mixInto(out, thump(0.2, 140, 90, 0.04), 0, 0.8);
  mixInto(out, noiseBurst(0.06, 72, { lp: 900, env: (t) => percussive(t, 0.002, 0.015) }), 0, 0.4);
  return out;
});
sfx("breath_glint", () => {
  // Steel catching the light as a blow ends: a small, high, clean ting.
  const out = buffer(0.45, SR);
  mixInto(out, partials(0.42, SR, [[2637, 0.6, 0.16], [3951, 0.4, 0.11], [5274, 0.2, 0.07]], { attack: 0.002 }), 0, 0.5);
  return reverb(out, { room: 0.45, wet: 0.2, tail: 0.25 });
});
sfx("breath_in", () => {
  // Breath drawn sharp through the nose behind the shield, and the guard settling.
  const seconds = 0.42;
  const air = whiteNoise(81);
  let breath = render(seconds, SR, (t) => air() * Math.min(1, t / 0.12) * Math.max(0, 1 - t / seconds) * 0.8);
  breath = biquad(breath, "bandpass", (t) => 900 + 1400 * Math.min(1, t / seconds), 1.4);
  const out = buffer(seconds + 0.1, SR);
  mixInto(out, breath, 0, 0.9);
  mixInto(out, partials(0.3, SR, [[196, 0.5, 0.2], [294, 0.3, 0.15]], { attack: 0.03 }), 0.08, 0.25);
  return out;
});
sfx("breath_out", () => {
  // Winded: a rough gasp falling away.
  const seconds = 0.38;
  const air = whiteNoise(82);
  let gasp = render(seconds, SR, (t) => air() * percussive(t, 0.02, 0.16) * (0.75 + 0.25 * Math.sin(TAU * 31 * t)));
  gasp = biquad(gasp, "bandpass", (t) => 1500 - 900 * Math.min(1, t / seconds), 1.1);
  return gasp;
});
sfx("winded", () => {
  // His breath spent: two ragged gasps, the second weaker, and the shield arm sagging (a dull knock).
  const out = buffer(0.95, SR);
  for (const [at, g, seed, len] of [[0, 1.0, 421, 0.34], [0.4, 0.7, 422, 0.4]]) {
    const air = whiteNoise(seed);
    let gasp = render(len, SR, (t) => air() * percussive(t, 0.03, len * 0.42) * (0.7 + 0.3 * Math.sin(TAU * 27 * t)));
    gasp = biquad(gasp, "bandpass", (t) => 1300 - 700 * Math.min(1, t / len), 1.0);
    mixInto(out, gasp, at, g);
  }
  mixInto(out, thump(0.2, 150, 90, 0.05), 0.12, 0.35);
  return out;
});
sfx("close_call", () => {
  // A blade passing a finger's width away: a fast tearing sweep, then a soft bright ring as time slows.
  const out = buffer(0.9, SR);
  mixInto(out, whoosh(0.28, 900, 4200, 83, { q: 1.8, attack: 0.02 }), 0, 0.9);
  mixInto(out, partials(0.7, SR, [[1760, 0.5, 0.4], [2637, 0.35, 0.3], [3520, 0.2, 0.2]], { attack: 0.05 }), 0.08, 0.35);
  return reverb(out, { room: 0.7, wet: 0.35, tail: 0.5 });
});

// --- The body ----------------------------------------------------------------------------------------

sfx("finisher", () => {
  // The street holds its breath: a low boom, a drawn swell of steel, and silence.
  const out = buffer(1.2, SR);
  mixInto(out, thump(0.9, 70, 30, 0.35), 0, 1.0);
  const air = whiteNoise(103);
  let swell = render(0.7, SR, (t) => air() * Math.pow(t / 0.7, 2.2) * 0.8);
  swell = biquad(swell, "bandpass", (t) => 900 + t * 4200, 2.5);
  mixInto(out, swell, 0.05, 0.7);
  mixInto(out, partials(0.9, SR, [[220, 0.8, 0.5], [331, 0.5, 0.4], [495, 0.3, 0.3]], { attack: 0.3 }), 0.1, 0.35);
  return reverb(out, { room: 0.8, wet: 0.35, tail: 0.8 });
});
sfx("enemy_tell", () => {
  const b = partials(0.45, SR, [[3520, 0.7, 0.16], [5280, 0.5, 0.12], [7040, 0.3, 0.08]], { attack: 0.02 });
  return reverb(b, { room: 0.6, wet: 0.2, tail: 0.3 });
});
sfx("enemy_tell_dire", () => {
  // A blow no shield can answer: a lower, harsher ring over a drum hit, wavering.
  const out = buffer(0.8, SR);
  const ring = partials(0.7, SR, [[1244, 0.8, 0.3], [1866, 0.6, 0.24], [2637, 0.4, 0.16]], { attack: 0.015 });
  for (let i = 0; i < ring.data.length; i++) ring.data[i] *= 0.75 + 0.25 * Math.sin(TAU * 14 * (i / SR));
  mixInto(out, ring, 0, 0.8);
  mixInto(out, thump(0.4, 120, 55, 0.1), 0, 0.7);
  return reverb(out, { room: 0.7, wet: 0.25, tail: 0.4 });
});
sfx("enemy_tell_low", () => {
  // A low sweep coming (jump or roll): a ring that falls away under a scraping swish, down at the ground.
  const out = buffer(0.75, SR);
  const glide = oscillator((t) => 1180 * Math.pow(0.55, Math.min(1, t / 0.35)));
  mixInto(out, render(0.6, SR, (t) => glide(t, SR) * percussive(t, 0.01, 0.2)), 0, 0.6);
  mixInto(out, partials(0.5, SR, [[1760, 0.4, 0.12], [2640, 0.25, 0.08]], { attack: 0.01 }), 0, 0.45);
  mixInto(out, whoosh(0.38, 1900, 480, 361, { q: 1.2, attack: 0.06 }), 0.03, 0.7);
  return reverb(out, { room: 0.6, wet: 0.2, tail: 0.3 });
});
sfx("enemy_tell_break", () => {
  // A blow that breaks a guard (parry or roll): iron struck hard, a cracked, buzzing ring over a dull knock.
  const out = buffer(0.8, SR);
  const ring = partials(0.65, SR, [[740, 0.8, 0.28], [1103, 0.6, 0.2], [1627, 0.45, 0.15], [2311, 0.3, 0.1]],
    { attack: 0.004 });
  for (let i = 0; i < ring.data.length; i++) ring.data[i] *= 0.6 + 0.4 * Math.sign(Math.sin(TAU * 32 * (i / SR)));
  mixInto(out, drive(ring, 2.2), 0, 0.7);
  mixInto(out, noiseBurst(0.06, 371, { bp: 2600, q: 1.5, env: (t) => percussive(t, 0.0008, 0.015) }), 0, 0.8);
  mixInto(out, thump(0.3, 140, 70, 0.07), 0, 0.6);
  return reverb(out, { room: 0.65, wet: 0.22, tail: 0.35 });
});

// --- The Arts ---------------------------------------------------------------------------------------

sfx("art_moment", () => {
  // The world stops for an Art: a swell drawn in, a deep drum, and a long bright ring of steel.
  const out = buffer(1.7, SR);
  const air = whiteNoise(501);
  let swell = render(0.34, SR, (t) => air() * Math.pow(t / 0.34, 3));
  swell = biquad(swell, "bandpass", (t) => 600 + 3400 * (t / 0.34), 2.2);
  mixInto(out, swell, 0, 0.55);
  mixInto(out, thump(0.9, 62, 34, 0.32), 0.32, 1.0);
  mixInto(out, partials(1.2, SR, [[1318, 0.6, 0.7], [1976, 0.45, 0.55], [2637, 0.3, 0.4], [3951, 0.2, 0.3]],
    { attack: 0.003 }), 0.33, 0.45);
  return reverb(out, { room: 0.85, wet: 0.35, tail: 0.9 });
});
sfx("storm_wind", () => {
  // The Storm of Blades: the air torn round him in four rising sweeps over a low roar.
  const out = buffer(1.3, SR);
  for (const [at, seed] of [[0, 511], [0.2, 512], [0.4, 513], [0.6, 514]]) {
    mixInto(out, whoosh(0.34, 380, 2600, seed, { q: 1.3, attack: 0.05 }), at, 0.8);
  }
  mixInto(out, noiseBurst(1.0, 515, { type: "brown", lp: 220, env: (t) => adsr(t, 0.1, 0.2, 0.7, 0.3, 0.7) }), 0, 0.6);
  return out;
});
sfx("pierce_draw", () => {
  // The Piercing Line drawn: a long rising scrape of steel along the scabbard's mouth, a click.
  const source = whiteNoise(521);
  let scrape = render(0.45, SR, (t) => source() * adsr(t, 0.05, 0.1, 0.8, 0.12, 0.33));
  scrape = biquad(scrape, "bandpass", (t) => 1800 + t * 7000, 7);
  const out = buffer(0.6, SR);
  mixInto(out, scrape, 0, 0.8);
  mixInto(out, partials(0.3, SR, [[3729, 0.6, 0.12], [5590, 0.35, 0.08]]), 0.4, 0.4);
  return out;
});
sfx("pierce_dash", () => {
  // Across the street at once: a sharp tearing rush and a crack of air.
  const out = buffer(0.5, SR);
  mixInto(out, whoosh(0.22, 1600, 5200, 531, { q: 2.4, attack: 0.008 }), 0, 1.0);
  mixInto(out, drive(noiseBurst(0.05, 532, { hp: 2500, env: (t) => percussive(t, 0.0005, 0.01) }), 3), 0, 0.6);
  return out;
});
sfx("wounds_open", () => {
  // The Line's wounds opening together: three wet tearing slices and a heavy knock.
  const out = buffer(0.8, SR);
  for (const [at, seed, g] of [[0, 541, 1.0], [0.06, 542, 0.8], [0.13, 543, 0.7]]) {
    const wet = whiteNoise(seed);
    let tear = render(0.22, SR, (t) => wet() * percussive(t, 0.003, 0.07) * (0.7 + 0.3 * Math.sin(TAU * 40 * t)));
    tear = biquad(tear, "bandpass", (t) => 2200 - t * 3000, 1.3);
    mixInto(out, tear, at, g);
  }
  mixInto(out, thump(0.3, 100, 45, 0.08), 0.02, 0.7);
  return reverb(out, { room: 0.5, wet: 0.15, tail: 0.3 });
});
sfx("ignite", () => {
  // A man catching fire: a rushing whoosh of flame taking hold.
  const rush = whiteNoise(571);
  let b = render(0.6, SR, (t) => rush() * Math.min(1, t * 12) * Math.exp(-t * 4));
  return biquad(b, "bandpass", (t) => 900 + t * 1200, 0.9);
});
sfx("judgment_gong", () => {
  // Each judgment: a deep bronze gong.
  const out = buffer(2.3, SR);
  mixInto(out, partials(2.0, SR, [[98, 1, 1.4], [196, 0.7, 1.1], [263, 0.5, 0.9], [392, 0.4, 0.7], [523, 0.25, 0.5],
    [784, 0.15, 0.35]], { attack: 0.004 }), 0, 0.9);
  mixInto(out, thump(0.5, 90, 40, 0.15), 0, 0.6);
  return reverb(out, { room: 0.9, wet: 0.35, tail: 1.0 });
});

// --- The captain ------------------------------------------------------------------------------------



// --- Remedies, lamps, pages, gates --------------------------------------------------------------

sfx("checkpoint_rest", () => {
  const out = buffer(2.6, SR);
  [146.83, 174.61, 220, 293.66].forEach((f, i) => {
    mixInto(out, pluck(2.2, SR, f, { seed: 130 + i, brightness: 0.5, decay: 0.998 }), i * 0.12, 0.6);
  });
  return reverb(out, { room: 0.86, wet: 0.35, tail: 1.2 });
});
sfx("ambush_sting", () => {
  const out = buffer(2.4, SR);
  mixInto(out, thump(1.0, 70, 32, 0.35), 0, 1.0);
  mixInto(out, noiseBurst(0.5, 161, { lp: 300, env: (t) => percussive(t, 0.003, 0.18) }), 0, 0.8);
  const drone = oscillator(73.42, "saw");
  mixInto(out, biquad(render(2.4, SR, (t) => drone(t, SR) * adsr(t, 0.6, 0.4, 0.5, 0.8, 1.6)), "lowpass", 380, 0.8), 0, 0.35);
  return reverb(out, { room: 0.85, wet: 0.3, tail: 0.8 });
});

// --- Interface ---------------------------------------------------------------------------------------

sfx("ui_move", () => partials(0.08, SR, [[1180, 1, 0.012], [2360, 0.3, 0.008]]));
sfx("ui_select", () => {
  const out = buffer(0.7, SR);
  mixInto(out, pluck(0.6, SR, 293.66, { seed: 171, brightness: 0.55, decay: 0.994 }), 0, 0.8);
  mixInto(out, partials(0.06, SR, [[1500, 1, 0.01]]), 0, 0.3);
  return out;
});
sfx("ui_back", () => pluck(0.5, SR, 220, { seed: 172, brightness: 0.45, decay: 0.993 }));
sfx("lesson", () => {
  // A lesson comes onto the screen: a soft page turned and one low, warm note.
  const out = buffer(0.8, SR);
  mixInto(out, noiseBurst(0.12, 173, { hp: 2200, env: (t) => percussive(t, 0.01, 0.05) }), 0, 0.25);
  mixInto(out, pluck(0.7, SR, 392, { seed: 174, brightness: 0.4, decay: 0.995 }), 0.02, 0.45);
  return reverb(out, { room: 0.6, wet: 0.25, tail: 0.4 });
});
sfx("heartbeat", () => {
  // Wounded near to death: his heart in his ears, two low, muffled beats.
  const out = buffer(0.55, SR);
  mixInto(out, thump(0.16, 62, 38, 0.05), 0, 0.9);
  mixInto(out, thump(0.14, 56, 34, 0.045), 0.2, 0.65);
  return biquad(out, "lowpass", 220, 0.7);
});
sfx("objective", () => {
  // The way changes: two plucked notes rising, a fifth apart, and a breath of brass under them.
  const out = buffer(1.6, SR);
  mixInto(out, pluck(1.2, SR, 293.66, { seed: 175, brightness: 0.55, decay: 0.997 }), 0, 0.6);
  mixInto(out, pluck(1.2, SR, 440, { seed: 176, brightness: 0.55, decay: 0.997 }), 0.16, 0.55);
  mixInto(out, partials(1.2, SR, [[146.83, 0.5, 0.9], [220, 0.3, 0.7]], { attack: 0.2 }), 0.05, 0.22);
  return reverb(out, { room: 0.8, wet: 0.32, tail: 0.9 });
});

// --- Ambience ----------------------------------------------------------------------------------------

function ambience(name, seconds, { fire = true, seed = 200 } = {}) {
  if (only && !only.includes(name)) return;
  const total = seconds + 2;
  const out = buffer(total, MR);
  // Wind: brown noise through a lowpass that breathes, with slow gusts.
  const wind = brownNoise(seed);
  let w = render(total, MR, (t) => wind() * (0.55 + 0.35 * Math.sin(TAU * 0.07 * t) + 0.2 * Math.sin(TAU * 0.13 * t + 1)));
  w = biquad(w, "lowpass", (t) => 360 + 240 * Math.sin(TAU * 0.05 * t) + 120 * Math.sin(TAU * 0.11 * t), 0.9);
  mixInto(out, w, 0, 1.0);
  if (fire) {
    // Fire: a low roar and scattered crackles and pops.
    const roar = biquad(render(total, MR, pinkNoise(seed + 1)), "lowpass", 180, 0.7);
    mixInto(out, roar, 0, 0.6);
    const r = rng(seed + 2);
    for (let i = 0; i < total * 9; i++) {
      const at = r() * total;
      const pop = render(0.03, MR, (t) => (r() * 2 - 1) * Math.exp(-t / (0.002 + r() * 0.004)));
      mixInto(out, biquad(pop, "highpass", 1500 + r() * 2500, 0.7), at, 0.15 + r() * 0.35);
    }
    // Far off, now and then, the clash of the sack.
    for (let i = 0; i < 3; i++) {
      const clash = partials(0.6, MR, [[1240 + r() * 300, 0.6, 0.12], [2300 + r() * 400, 0.4, 0.08]]);
      mixInto(out, biquad(clash, "lowpass", 1800, 0.7), 3 + r() * (total - 6), 0.05);
    }
  }
  const looped = makeLoop(normalize(out, 0.55), 2);
  writeWav(join(MUSIC, `${name}.wav`), looped, { loop: true });
  built.push(name);
}

ambience("amb_fire_wind", 24, { fire: true, seed: 200 });
ambience("amb_wind", 20, { fire: false, seed: 300 });

if (!only || only.includes("amb_river")) {
  // The river by night: water lapping at the stones, a slow current, the fires far off.
  const total = 22;
  const out = buffer(total, MR);
  const current = biquad(render(total, MR, pinkNoise(321)), "lowpass", (t) => 520 + 140 * Math.sin(TAU * 0.04 * t), 0.8);
  mixInto(out, current, 0, 0.55);
  const r = rng(322);
  for (let i = 0; i < total * 1.6; i++) {
    const at = r() * total;
    const lap = render(0.5, MR, pinkNoise(400 + i));
    for (let k = 0; k < lap.data.length; k++) {
      const tt = k / MR;
      lap.data[k] *= adsr(tt, 0.06, 0.1, 0.5, 0.2, 0.25) * (0.6 + 0.4 * Math.sin(TAU * 18 * tt));
    }
    mixInto(out, biquad(lap, "bandpass", 350 + r() * 500, 1.4), at, 0.5 + r() * 0.4);
  }
  const roar = biquad(render(total, MR, pinkNoise(323)), "lowpass", 140, 0.7);
  mixInto(out, roar, 0, 0.25);
  writeWav(join(MUSIC, "amb_river.wav"), makeLoop(normalize(out, 0.5), 2), { loop: true });
  built.push("amb_river");
}

// --- Music -------------------------------------------------------------------------------------------

/** Maqam Hijaz on D: semitone steps from the tonic. */
const HIJAZ = { D: 0, Eb: 1, "F#": 4, G: 5, A: 7, Bb: 8, C: 10, "D'": 12, "C,": -2, "A,": -5, "Bb,": -4, "G,": -7 };
/** Maqam Saba on D (E half-flat is 1.5): grief. */
const SABA = { D: 0, "E-": 1.5, F: 3, Gb: 4, A: 7, Bb: 8, C: 10, "D'": 12, "C,": -2, "A,": -5, "G,": -7 };
/** Maqam Bayati on D: the teachers' quiet. */
const BAYATI = { D: 0, "E-": 1.5, F: 3, G: 5, A: 7, Bb: 8, C: 10, "D'": 12, "C,": -2, "A,": -5, "G,": -7 };
/** Maqam Hijaz Kar on D: the last stand. */
const HIJAZ_KAR = { D: 0, Eb: 1, "F#": 4, G: 5, A: 7, Bb: 8, "C#": 11, "D'": 12, "C#,": -1, "A,": -5, "G,": -7 };
const D3 = 146.83;
let SCALE = HIJAZ;
const freqOf = (note, octave = 0) => D3 * Math.pow(2, (SCALE[note] + octave * 12) / 12);

/** An oud phrase: [note, beats, options]; long notes are played with the plectrum's tremolo. */
function oudLine(out, at, beat, phrase, { octave = 0, seed = 1, level = 0.5, tremolo = 1.6 } = {}) {
  let t = at;
  let s = seed;
  for (const [note, beats, opt = {}] of phrase) {
    const dur = beats * beat;
    if (note !== "-") {
      const f = freqOf(note, octave + (opt.up ?? 0));
      if (opt.grace) {
        const g = freqOf(opt.grace, octave + (opt.up ?? 0));
        mixInto(out, pluck(0.25, out.rate, g, { seed: s++, brightness: 0.55, decay: 0.99 }), t - 0.07, level * 0.45);
      }
      if (beats >= tremolo) {
        // Risha tremolo: repeated strokes, softer as the note sustains.
        for (let k = 0, tt = 0; tt < dur - 0.05; k++, tt += 0.11) {
          const v = level * (k === 0 ? 1 : 0.42 * Math.exp(-tt / (dur * 0.8)));
          mixInto(out, pluck(Math.min(1.2, dur - tt + 0.4), out.rate, f, { seed: s++, brightness: k === 0 ? 0.65 : 0.4, decay: 0.993 }), t + tt, v);
        }
      } else {
        mixInto(out, pluck(dur + 0.9, out.rate, f, { seed: s++, brightness: 0.62, decay: 0.995 }), t, level);
      }
    }
    t += dur;
  }
  return t;
}

/** A ney: breathy, slow to speak, with a vibrato that grows on long notes. */
function neyLine(out, at, beat, phrase, { octave = 1, level = 0.35, seed = 7 } = {}) {
  let t = at;
  const breath = whiteNoise(seed);
  for (const [note, beats] of phrase) {
    const dur = beats * beat;
    if (note !== "-") {
      const f = freqOf(note, octave);
      const osc = oscillator((tt) => f * (1 + 0.012 * Math.min(1, tt / 0.8) * Math.sin(TAU * 5.2 * tt)));
      const tone = render(dur + 0.3, out.rate, (tt) => {
        const env = adsr(tt, 0.18, 0.2, 0.85, 0.3, dur);
        const v = osc(tt, out.rate);
        return (v * 0.8 + Math.sin(2 * Math.asin(Math.max(-1, Math.min(1, v)))) * 0.08) * env;
      });
      const air = biquad(render(dur + 0.3, out.rate, (tt) => breath() * adsr(tt, 0.1, 0.2, 0.5, 0.3, dur)), "bandpass", f * 2, 2);
      mixInto(out, tone, t, level);
      mixInto(out, air, t, level * 0.6);
    }
    t += dur;
  }
  return t;
}

function drone(out, level = 0.18, notes = [73.42, 110]) {
  const tone = render(length(out), out.rate, () => 0);
  notes.forEach((f, i) => {
    const a = oscillator(f * 1.002, "saw");
    const b = oscillator(f * 0.998, "saw");
    for (let k = 0; k < tone.data.length; k++) {
      const t = k / out.rate;
      tone.data[k] += (a(t, out.rate) + b(t, out.rate)) * 0.5 * (0.7 + 0.3 * Math.sin(TAU * (0.05 + i * 0.03) * t)) / notes.length;
    }
  });
  mixInto(out, biquad(tone, "lowpass", 420, 0.7), 0, level);
}
const length = (b) => b.data.length / b.rate;

/** Frame drum strokes: dum (low), tak (rim), with jingles. */
function daf(out, at, kind, level) {
  if (kind === "dum") {
    const osc = oscillator((t) => 58 + 40 * Math.exp(-t / 0.02));
    const skin = whiteNoise(Math.floor(at * 1000) + 3);
    mixInto(out, render(0.6, out.rate, (t) => osc(t, out.rate) * percussive(t, 0.002, 0.18)), at, level);
    mixInto(out, biquad(render(0.2, out.rate, (t) => skin() * percussive(t, 0.001, 0.03)), "lowpass", 600, 0.7), at, level * 0.3);
  } else {
    const n = whiteNoise(Math.floor(at * 1000) + 5);
    mixInto(out, biquad(render(0.12, out.rate, (t) => n() * percussive(t, 0.0005, 0.02)), "bandpass", 2400, 1.2), at, level * 0.7);
    mixInto(out, partials(0.1, out.rate, [[420, 1, 0.02]]), at, level * 0.3);
    mixInto(out, biquad(render(0.25, out.rate, (t) => n() * percussive(t, 0.002, 0.07)), "highpass", 6500, 0.7), at, level * 0.25);
  }
}

/** peak: the loudest sample; quieter for pieces whose sustained ney makes them sound louder. */
function writeMusic(name, b, { loop = true, wet = 0.32, peak = 0.6 } = {}) {
  const tail = loop ? 2.0 : 3.0;
  const verb = reverb(b, { room: 0.86, damp: 0.4, wet, tail });
  let finished = normalize(verb, peak);
  if (loop) finished = makeLoop(finished, 2.0);
  writeWav(join(MUSIC, `${name}.wav`), finished, { loop });
  built.push(name);
}

const PHRASE_A = [["D", 1], ["Eb", 0.5], ["F#", 1.5, { grace: "G" }], ["G", 1], ["F#", 0.5], ["Eb", 0.5], ["D", 2], ["-", 1]];
const PHRASE_B = [["A", 1], ["Bb", 1, { grace: "C" }], ["A", 0.5], ["G", 0.5], ["F#", 1], ["G", 0.5], ["F#", 0.5], ["Eb", 1], ["D", 2], ["-", 1]];
const PHRASE_C = [["D'", 1], ["C", 0.5], ["Bb", 0.5], ["A", 2, { grace: "Bb" }], ["Bb", 1], ["A", 0.5], ["G", 0.5], ["F#", 2], ["-", 1]];
const PHRASE_D = [["G", 1], ["F#", 0.5], ["Eb", 0.5], ["D", 1], ["Eb", 0.5], ["D", 0.5], ["C,", 1], ["D", 3]];

if (!only || only.includes("music_market")) {
  const beat = 0.95;
  const beats = 2 * (8 + 9 + 8 + 8) + 2;
  const out = buffer(beats * beat + 3, MR);
  drone(out, 0.16);
  let t = 0.5;
  t = oudLine(out, t, beat, PHRASE_A, { seed: 400 });
  t = oudLine(out, t, beat, PHRASE_B, { seed: 420 });
  t = oudLine(out, t, beat, PHRASE_C, { seed: 440 });
  t = oudLine(out, t, beat, PHRASE_D, { seed: 460 });
  t = oudLine(out, t, beat, PHRASE_A, { seed: 480, octave: 1, level: 0.42 });
  t = oudLine(out, t, beat, PHRASE_B, { seed: 500 });
  t = oudLine(out, t, beat, PHRASE_C, { seed: 520, level: 0.46 });
  oudLine(out, t, beat, PHRASE_D, { seed: 540 });
  for (let b = 0; b < beats; b += 4) {
    daf(out, 0.5 + b * beat, "dum", 0.45);
    daf(out, 0.5 + (b + 2) * beat, "tak", 0.3);
    daf(out, 0.5 + (b + 3.5) * beat, "tak", 0.18);
  }
  writeMusic("music_market", out);
}

if (!only || only.includes("music_title")) {
  const beat = 1.1;
  const out = buffer(40, MR);
  drone(out, 0.2);
  let t = 1.0;
  t = neyLine(out, t, beat, [["A", 3], ["Bb", 1], ["A", 2], ["G", 2], ["F#", 4], ["-", 1]]);
  t = neyLine(out, t, beat, [["G", 2], ["A", 2], ["Bb", 1], ["C", 1], ["Bb", 2], ["A", 4], ["-", 1]]);
  neyLine(out, t, beat, [["D'", 3], ["C", 1], ["Bb", 2], ["A", 2], ["G", 1], ["F#", 2], ["Eb", 1], ["D", 4]]);
  oudLine(out, 0.2, beat, [["D", 8], ["A,", 8], ["D", 8], ["G,", 4], ["D", 6]], { level: 0.25, seed: 600, tremolo: 99 });
  writeMusic("music_title", out, { wet: 0.4 });
}

if (!only || only.includes("music_combat")) {
  const beat = 0.6;
  const bars = 8;
  const out = buffer(bars * 4 * beat + 2, MR);
  drone(out, 0.2, [73.42, 110, 146.83]);
  const riff = [["D", 0.5], ["Eb", 0.5], ["D", 0.5], ["F#", 0.5], ["G", 0.5], ["F#", 0.5], ["Eb", 0.5], ["D", 0.5]];
  const riffHigh = [["A", 0.5], ["Bb", 0.5], ["A", 0.5], ["G", 0.5], ["F#", 0.5], ["G", 0.5], ["Eb", 0.5], ["D", 0.5]];
  let t = 0.2;
  for (let b = 0; b < bars; b++) t = oudLine(out, t, beat, b % 4 === 3 ? riffHigh : riff, { seed: 700 + b * 9, level: 0.38, tremolo: 99 });
  // Maqsum: dum tak - tak dum - tak -
  for (let b = 0; b < bars; b++) {
    const s = 0.2 + b * 4 * beat;
    daf(out, s, "dum", 0.6);
    daf(out, s + 0.5 * beat, "tak", 0.35);
    daf(out, s + 1.5 * beat, "tak", 0.35);
    daf(out, s + 2 * beat, "dum", 0.55);
    daf(out, s + 3 * beat, "tak", 0.4);
  }
  writeMusic("music_combat", out, { wet: 0.22 });
}

// --- The later levels and the captain -----------------------------------------------------------

if (!only || only.includes("music_streets")) {
  // Saba: slow, falling phrases over a low drone; the drum only a heartbeat.
  SCALE = SABA;
  const beat = 1.05;
  const out = buffer(48, MR);
  drone(out, 0.17, [73.42, 110]);
  const a = [["F", 1], ["E-", 0.5], ["D", 1.5], ["-", 0.5], ["E-", 0.5], ["F", 1], ["Gb", 2, { grace: "A" }], ["F", 1], ["E-", 1], ["D", 2], ["-", 1]];
  const b = [["A", 1.5], ["Gb", 0.5], ["F", 1], ["Gb", 1], ["F", 0.5], ["E-", 0.5], ["D", 2], ["C,", 1], ["D", 3], ["-", 1]];
  let t = 0.6;
  t = oudLine(out, t, beat, a, { seed: 900, level: 0.5 });
  t = oudLine(out, t, beat, b, { seed: 930, level: 0.5 });
  t = oudLine(out, t, beat, a, { seed: 960, level: 0.42, octave: 1 });
  oudLine(out, t, beat, b, { seed: 990, level: 0.48 });
  for (let k = 0; k < 44; k += 4) daf(out, 0.6 + k * beat, "dum", 0.35);
  writeMusic("music_streets", out, { wet: 0.38 });
}

if (!only || only.includes("music_scholars")) {
  // Bayati: a ney over a sparse oud and a soft drum, unhurried.
  SCALE = BAYATI;
  const beat = 1.15;
  const out = buffer(46, MR);
  drone(out, 0.15, [73.42, 110]);
  let t = 1.0;
  t = neyLine(out, t, beat, [["D", 2], ["E-", 1], ["F", 2], ["G", 1], ["F", 1], ["E-", 3], ["-", 1]], { seed: 21 });
  t = neyLine(out, t, beat, [["A", 2], ["Bb", 1], ["A", 1], ["G", 2], ["F", 1], ["E-", 1], ["D", 4], ["-", 1]], { seed: 22 });
  neyLine(out, t, beat, [["G", 1], ["A", 2], ["C", 1], ["Bb", 2], ["A", 2], ["G", 1], ["F", 1], ["E-", 2], ["D", 3]], { seed: 23 });
  oudLine(out, 0.4, beat, [["D", 4], ["A,", 4], ["D", 4], ["C,", 4], ["D", 4], ["G,", 4], ["A,", 4], ["D", 8]],
    { level: 0.26, seed: 1100, tremolo: 99 });
  for (let k = 0; k < 38; k += 4) {
    daf(out, 0.4 + k * beat, "dum", 0.28);
    daf(out, 0.4 + (k + 2.5) * beat, "tak", 0.12);
  }
  writeMusic("music_scholars", out, { wet: 0.42, peak: 0.36 });
}

if (!only || only.includes("music_gate")) {
  // Hijaz Kar: a steady march toward the gate, the oud climbing, the drum insistent.
  SCALE = HIJAZ_KAR;
  const beat = 0.78;
  const bars = 12;
  const out = buffer(bars * 4 * beat + 2.5, MR);
  drone(out, 0.18, [73.42, 110, 146.83]);
  const a = [["D", 1], ["Eb", 0.5], ["F#", 0.5], ["G", 1], ["A", 1]];
  const b = [["Bb", 1], ["A", 0.5], ["G", 0.5], ["F#", 1], ["Eb", 1]];
  const c = [["A", 1], ["Bb", 0.5], ["C#", 0.5], ["D'", 1.5], ["-", 0.5]];
  const d = [["C#", 1], ["Bb", 0.5], ["A", 0.5], ["G", 0.5], ["F#", 0.5], ["D", 1]];
  let t = 0.3;
  for (let k = 0; k < bars; k++) t = oudLine(out, t, beat, [a, b, c, d][k % 4], { seed: 1200 + k * 11, level: 0.42, tremolo: 1.4 });
  for (let k = 0; k < bars; k++) {
    const s = 0.3 + k * 4 * beat;
    daf(out, s, "dum", 0.55);
    daf(out, s + beat, "tak", 0.3);
    daf(out, s + 1.5 * beat, "dum", 0.4);
    daf(out, s + 2 * beat, "dum", 0.5);
    daf(out, s + 3 * beat, "tak", 0.35);
  }
  writeMusic("music_gate", out, { wet: 0.28 });
}

if (!only || only.includes("music_boss")) {
  // Hijaz Kar at a gallop: tremolo riffs, a low horn swelling under them, doubled drums.
  SCALE = HIJAZ_KAR;
  const beat = 0.42;
  const bars = 16;
  const out = buffer(bars * 4 * beat + 2.5, MR);
  drone(out, 0.22, [73.42, 110]);
  const horn = oscillator((t) => 73.42 * (1 + 0.004 * Math.sin(TAU * 4 * t)), "saw");
  const hornEnv = (t) => 0.55 + 0.45 * Math.sin(TAU * t / (bars * beat));
  mixInto(out, biquad(render(bars * 4 * beat, MR, (t) => horn(t, MR) * hornEnv(t)), "lowpass", 260, 1.2), 0.3, 0.32);
  const riffs = [
    [["D", 0.5], ["Eb", 0.5], ["F#", 0.5], ["Eb", 0.5], ["D", 0.5], ["Eb", 0.5], ["F#", 0.5], ["G", 0.5]],
    [["A", 0.5], ["G", 0.5], ["F#", 0.5], ["G", 0.5], ["A", 0.5], ["Bb", 0.5], ["A", 1]],
    [["D'", 0.5], ["C#", 0.5], ["Bb", 0.5], ["A", 0.5], ["G", 0.5], ["F#", 0.5], ["Eb", 0.5], ["F#", 0.5]],
    [["G", 0.5], ["F#", 0.5], ["Eb", 0.5], ["D", 0.5], ["C#,", 0.5], ["D", 1.5]],
  ];
  let t = 0.3;
  for (let k = 0; k < bars; k++) t = oudLine(out, t, beat, riffs[k % 4], { seed: 1400 + k * 13, level: 0.4, tremolo: 99, octave: k >= 8 ? 1 : 0 });
  for (let k = 0; k < bars; k++) {
    const s = 0.3 + k * 4 * beat;
    for (const [at, kind, level] of [[0, "dum", 0.65], [0.5, "dum", 0.45], [1, "tak", 0.35], [2, "dum", 0.6], [2.5, "tak", 0.3], [3, "tak", 0.4], [3.5, "tak", 0.3]]) {
      daf(out, s + at * beat, kind, level);
    }
  }
  writeMusic("music_boss", out, { wet: 0.2 });
}

SCALE = HIJAZ;

if (!only || only.includes("music_ending")) {
  const beat = 1.25;
  const out = buffer(34, MR);
  drone(out, 0.12);
  let t = 1;
  t = oudLine(out, t, beat, PHRASE_A, { seed: 800, level: 0.5 });
  t = oudLine(out, t, beat, PHRASE_D, { seed: 820, level: 0.5 });
  oudLine(out, t, beat, [["D", 6]], { seed: 840, level: 0.45 });
  writeMusic("music_ending", out, { loop: false, wet: 0.45 });
}

console.log(`audio: ${built.length} files`);
