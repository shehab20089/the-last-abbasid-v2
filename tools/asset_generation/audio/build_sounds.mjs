// Synthesizes every sound of the game: sword, shield and body sounds, enemy and boss cues, the
// interface, the city's ambiences (fire and wind, the river), and the score: a plucked oud over a
// drone with a frame drum, in a maqam for each place (Hijaz for the market, Saba for the burning
// streets, Bayati with a ney for the scholars, Hijaz Kar for the last gate and its captain).
// Quarter tones are fractional semitones. Deterministic: rerunning rewrites the same files.
// Usage: node tools/asset_generation/audio/build_sounds.mjs [--only name,name]
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TAU, adsr, biquad, brownNoise, buffer, drive, expDecay, fadeEdges, gain, makeLoop, mixInto,
  normalize, oscillator, partials, percussive, pinkNoise, pluck, render, reverb, whiteNoise, writeWav,
} from "./dsp.mjs";
import { rng } from "../lib/noise.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SFX = join(ROOT, "assets", "audio", "sfx");
const MUSIC = join(ROOT, "assets", "audio", "music");
const SR = 32000;
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

// --- Blades ----------------------------------------------------------------------------------------

sfx("sword_swing", () => whoosh(0.24, 700, 2800, 11));
sfx("sword_thrust", () => whoosh(0.16, 1300, 3400, 12, { q: 2.2, attack: 0.02 }));
sfx("sword_heavy", () => {
  const b = whoosh(0.38, 320, 1700, 13, { q: 1.1, attack: 0.08 });
  return mixInto(b, noiseBurst(0.38, 14, { type: "brown", lp: 300, env: (t) => percussive(t, 0.08, 0.12) }), 0, 0.8);
});
sfx("enemy_swing", () => whoosh(0.26, 520, 2200, 21, { q: 1.4 }));
sfx("enemy_swing_heavy", () => {
  const b = whoosh(0.42, 260, 1500, 22, { q: 1.0, attack: 0.1 });
  return mixInto(b, noiseBurst(0.42, 23, { type: "brown", lp: 260, env: (t) => percussive(t, 0.1, 0.14) }), 0, 0.9);
});
sfx("spear_thrust", () => {
  const b = whoosh(0.22, 900, 2600, 24, { q: 2.0, attack: 0.03 });
  return mixInto(b, rattle(0.18, 4, 25, { freq: 1600 }), 0.02, 0.5);
});

sfx("sword_hit", () => {
  const out = buffer(0.3, SR);
  mixInto(out, thump(0.2, 140, 55, 0.07), 0, 1.0);
  mixInto(out, noiseBurst(0.12, 31, { lp: 2400, env: (t) => percussive(t, 0.001, 0.025) }), 0, 0.9);
  mixInto(out, noiseBurst(0.1, 32, { bp: 900, q: 1.2, env: (t) => percussive(t, 0.002, 0.03) }), 0.003, 0.7);
  mixInto(out, partials(0.2, SR, [[2140, 1, 0.05], [3420, 0.6, 0.04], [5100, 0.3, 0.03]]), 0, 0.18);
  return out;
});
sfx("sword_hit_heavy", () => {
  const out = buffer(0.5, SR);
  mixInto(out, thump(0.4, 110, 40, 0.13), 0, 1.0);
  mixInto(out, drive(noiseBurst(0.2, 33, { lp: 3000, env: (t) => percussive(t, 0.001, 0.05) }), 4), 0, 0.8);
  mixInto(out, noiseBurst(0.3, 34, { type: "brown", lp: 400, env: (t) => percussive(t, 0.005, 0.12) }), 0, 0.8);
  mixInto(out, rattle(0.3, 6, 35, { freq: 3800 }), 0.01, 0.4);
  return out;
});

// --- Shields and guards ---------------------------------------------------------------------------

sfx("shield_block", () => {
  const out = buffer(0.6, SR);
  mixInto(out, thump(0.3, 210, 150, 0.09), 0, 0.9);
  mixInto(out, noiseBurst(0.1, 41, { lp: 1800, env: (t) => percussive(t, 0.001, 0.02) }), 0, 0.8);
  mixInto(out, partials(0.6, SR, [[523, 0.8, 0.18], [1271, 0.6, 0.12], [2214, 0.45, 0.09], [3117, 0.3, 0.06]]), 0, 0.35);
  return out;
});
sfx("parry", () => {
  const ring = partials(1.4, SR, [[880, 0.8, 0.5], [1347, 0.9, 0.42], [2210, 0.7, 0.32], [2914, 0.6, 0.26],
    [3870, 0.45, 0.2], [5100, 0.3, 0.14], [6620, 0.2, 0.09]]);
  const out = buffer(1.4, SR);
  mixInto(out, ring, 0, 0.75);
  mixInto(out, noiseBurst(0.06, 51, { hp: 3200, env: (t) => percussive(t, 0.0005, 0.012) }), 0, 1.0);
  mixInto(out, whoosh(0.3, 2500, 6500, 52, { q: 3 }), 0.01, 0.25);
  mixInto(out, thump(0.2, 260, 180, 0.05), 0, 0.5);
  return reverb(out, { room: 0.78, wet: 0.22, tail: 0.6 });
});
sfx("guard_break", () => {
  const out = buffer(0.8, SR);
  mixInto(out, drive(noiseBurst(0.25, 61, { lp: 4000, env: (t) => percussive(t, 0.0005, 0.05) }), 6), 0, 0.9);
  mixInto(out, thump(0.5, 120, 45, 0.16), 0, 1.0);
  mixInto(out, partials(0.8, SR, [[420, 0.8, 0.25], [987, 0.6, 0.18], [1620, 0.4, 0.12]]), 0.01, 0.45);
  mixInto(out, rattle(0.5, 8, 62, { freq: 2600 }), 0.05, 0.4);
  return out;
});

// --- The body ----------------------------------------------------------------------------------------

sfx("footstep", () => {
  const out = buffer(0.12, SR);
  mixInto(out, noiseBurst(0.1, 71, { lp: 520, env: (t) => percussive(t, 0.003, 0.025) }), 0, 1.0);
  mixInto(out, noiseBurst(0.06, 72, { hp: 2500, env: (t) => percussive(t, 0.001, 0.008) }), 0.004, 0.25);
  return out;
});
sfx("jump", () => gain(whoosh(0.2, 380, 900, 73, { q: 0.9, attack: 0.03 }), 0.8));
sfx("land", () => {
  const out = buffer(0.25, SR);
  mixInto(out, thump(0.2, 95, 45, 0.06), 0, 1.0);
  mixInto(out, noiseBurst(0.15, 74, { lp: 900, env: (t) => percussive(t, 0.002, 0.04) }), 0, 0.8);
  mixInto(out, noiseBurst(0.08, 75, { hp: 3000, env: (t) => percussive(t, 0.001, 0.01) }), 0.005, 0.2);
  return out;
});
sfx("roll", () => {
  const out = buffer(0.5, SR);
  mixInto(out, whoosh(0.25, 300, 700, 76, { q: 0.8, attack: 0.05 }), 0, 0.8);
  mixInto(out, whoosh(0.25, 260, 620, 77, { q: 0.8, attack: 0.05 }), 0.16, 0.6);
  mixInto(out, noiseBurst(0.12, 78, { lp: 600, env: (t) => percussive(t, 0.003, 0.03) }), 0.36, 0.7);
  mixInto(out, rattle(0.3, 5, 79, { freq: 5200 }), 0.08, 0.25);
  return out;
});
sfx("hero_hurt", () => {
  const out = buffer(0.4, SR);
  mixInto(out, thump(0.3, 120, 50, 0.08), 0, 1.0);
  mixInto(out, noiseBurst(0.15, 81, { bp: 700, q: 0.9, env: (t) => percussive(t, 0.002, 0.04) }), 0, 0.7);
  mixInto(out, rattle(0.35, 9, 82, { freq: 5600 }), 0.01, 0.45);
  return out;
});
sfx("hero_death", () => {
  const out = buffer(1.4, SR);
  mixInto(out, thump(0.5, 90, 38, 0.18), 0.35, 1.0);
  mixInto(out, noiseBurst(0.4, 83, { lp: 700, env: (t) => percussive(t, 0.01, 0.1) }), 0.35, 0.8);
  mixInto(out, rattle(0.6, 14, 84, { freq: 5000 }), 0.35, 0.5);
  for (const [at, g] of [[0.7, 0.6], [0.86, 0.35], [0.95, 0.2]]) {
    mixInto(out, partials(0.3, SR, [[1890, 1, 0.08], [2730, 0.7, 0.06], [4100, 0.4, 0.04]]), at, g);
  }
  return out;
});
sfx("enemy_hurt", () => {
  const out = buffer(0.35, SR);
  mixInto(out, thump(0.25, 110, 48, 0.07), 0, 1.0);
  mixInto(out, noiseBurst(0.12, 85, { bp: 600, q: 1, env: (t) => percussive(t, 0.002, 0.035) }), 0, 0.6);
  mixInto(out, rattle(0.25, 7, 86, { freq: 3300 }), 0.005, 0.5);
  return out;
});
sfx("enemy_death", () => {
  const out = buffer(1.2, SR);
  mixInto(out, thump(0.5, 85, 36, 0.16), 0.3, 1.0);
  mixInto(out, noiseBurst(0.35, 87, { lp: 650, env: (t) => percussive(t, 0.01, 0.09) }), 0.3, 0.7);
  mixInto(out, rattle(0.6, 16, 88, { freq: 3000 }), 0.3, 0.55);
  mixInto(out, partials(0.35, SR, [[1560, 1, 0.09], [2390, 0.6, 0.06]]), 0.62, 0.4);
  return out;
});
sfx("sever", () => {
  // A blade through flesh and bone: a wet tearing slice, a dull crack, the spatter after.
  const out = buffer(0.9, SR);
  const wet = whiteNoise(95);
  let tear = render(0.32, SR, (t) => wet() * percussive(t, 0.004, 0.09) * (0.7 + 0.3 * Math.sin(TAU * 38 * t)));
  tear = biquad(tear, "bandpass", (t) => 1900 - t * 2600, 1.4);
  mixInto(out, tear, 0, 1.0);
  mixInto(out, drive(noiseBurst(0.08, 96, { bp: 1300, q: 2.2, env: (t) => percussive(t, 0.0008, 0.018) }), 5), 0.035, 0.85);
  mixInto(out, thump(0.3, 95, 42, 0.09), 0.03, 0.9);
  for (const [at, g, seed] of [[0.2, 0.35, 97], [0.28, 0.25, 98], [0.4, 0.2, 99], [0.47, 0.14, 100]]) {
    mixInto(out, noiseBurst(0.05, seed, { bp: 2400, q: 3, env: (t) => percussive(t, 0.001, 0.012) }), at, g);
  }
  return out;
});
sfx("pot_burst", () => {
  // A clay pot shatters and the naphtha goes up: a crack, a scatter of shards, a rushing whoomph.
  const out = buffer(1.0, SR);
  const shard = whiteNoise(211);
  let crack = render(0.12, SR, (t) => shard() * Math.exp(-t * 40));
  crack = biquad(crack, "highpass", () => 1800, 0.8);
  mixInto(out, crack, 0, 0.8);
  const rush = whiteNoise(227);
  let whoomph = render(0.8, SR, (t) => rush() * Math.min(1, t * 14) * Math.exp(-t * 3.2));
  whoomph = biquad(whoomph, "lowpass", (t) => 2400 - t * 1800, 0.7);
  mixInto(out, whoomph, 0.03, 0.9);
  mixInto(out, thump(0.4, 90, 40, 0.2), 0, 0.6);
  return reverb(out, { room: 0.6, wet: 0.25, tail: 0.5 });
});
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
sfx("body_drop", () => {
  // A body or a piece of one hitting the street: a heavy soft thud and a clatter of mail.
  const out = buffer(0.5, SR);
  mixInto(out, thump(0.35, 70, 34, 0.12), 0, 1.0);
  mixInto(out, noiseBurst(0.18, 101, { lp: 500, env: (t) => percussive(t, 0.004, 0.05) }), 0, 0.8);
  mixInto(out, rattle(0.3, 9, 102, { freq: 3400 }), 0.01, 0.35);
  return out;
});
sfx("enemy_alert", () => {
  // A blade drawn from its scabbard: a rising metallic scrape ending in a click.
  const source = whiteNoise(91);
  let b = render(0.38, SR, (t) => source() * adsr(t, 0.04, 0.1, 0.7, 0.08, 0.3));
  b = biquad(b, "bandpass", (t) => 2600 + t * 9000, 6);
  mixInto(b, partials(0.12, SR, [[3200, 1, 0.03], [5300, 0.5, 0.02]]), 0.3, 0.5);
  return b;
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

// --- The captain ------------------------------------------------------------------------------------

sfx("boss_roar", () => {
  // A great shout through a masked helm: a low voice driven hard through two formants, with breath.
  const seconds = 1.6;
  const voice = oscillator((t) => 96 - 22 * Math.min(1, t / seconds) + 4 * Math.sin(TAU * 6 * t), "saw");
  const env = (t) => adsr(t, 0.12, 0.2, 0.85, 0.5, seconds - 0.5);
  let v = render(seconds, SR, (t) => voice(t, SR) * env(t));
  v = drive(v, 3);
  const out = buffer(seconds + 0.4, SR);
  mixInto(out, biquad(v, "bandpass", 620, 2.2), 0, 1.0);
  mixInto(out, biquad(v, "bandpass", 1150, 3), 0, 0.6);
  mixInto(out, biquad(v, "lowpass", 300, 0.8), 0, 0.7);
  mixInto(out, noiseBurst(seconds, 181, { type: "pink", bp: 900, q: 0.8, env }), 0, 0.35);
  return reverb(out, { room: 0.82, wet: 0.3, tail: 0.6 });
});
sfx("boss_fall", () => {
  // Armour and a big man meeting the stones: a heavy thud, a crash of plates, a shield ringing out.
  const out = buffer(2.2, SR);
  mixInto(out, thump(0.8, 70, 30, 0.28), 0, 1.0);
  mixInto(out, noiseBurst(0.6, 191, { type: "brown", lp: 500, env: (t) => percussive(t, 0.004, 0.2) }), 0, 0.9);
  mixInto(out, rattle(0.9, 24, 192, { freq: 3000 }), 0.02, 0.6);
  mixInto(out, partials(1.6, SR, [[392, 0.8, 0.6], [851, 0.6, 0.45], [1403, 0.4, 0.3], [2049, 0.3, 0.2]]), 0.45, 0.35);
  mixInto(out, thump(0.5, 90, 40, 0.15), 0.42, 0.6);
  return reverb(out, { room: 0.85, wet: 0.3, tail: 0.8 });
});

// --- Bows and arrows -----------------------------------------------------------------------------

sfx("bow_release", () => {
  const out = buffer(0.5, SR);
  mixInto(out, pluck(0.45, SR, 98, { seed: 101, brightness: 0.9, decay: 0.985, body: false }), 0, 0.9);
  mixInto(out, noiseBurst(0.03, 102, { hp: 2000, env: (t) => percussive(t, 0.0005, 0.006) }), 0, 0.8);
  mixInto(out, whoosh(0.2, 1500, 3500, 103, { q: 2 }), 0.02, 0.35);
  return out;
});
sfx("arrow_thunk", () => {
  const out = buffer(0.35, SR);
  mixInto(out, thump(0.2, 240, 170, 0.04), 0, 0.9);
  mixInto(out, pluck(0.3, SR, 330, { seed: 104, brightness: 0.4, decay: 0.97, body: false }), 0.005, 0.4);
  return out;
});
sfx("arrow_hit", () => {
  const out = buffer(0.2, SR);
  mixInto(out, thump(0.15, 160, 70, 0.04), 0, 1.0);
  mixInto(out, noiseBurst(0.08, 105, { bp: 1200, q: 1.4, env: (t) => percussive(t, 0.001, 0.02) }), 0, 0.6);
  return out;
});

// --- Remedies, lamps, pages, gates --------------------------------------------------------------

sfx("heal", () => {
  const out = buffer(1.1, SR);
  mixInto(out, partials(0.5, SR, [[2093, 1, 0.12], [3320, 0.6, 0.09], [5010, 0.3, 0.06]]), 0, 0.4);
  const source = whiteNoise(111);
  const gurgle = biquad(render(0.7, SR, (t) => source() * (0.5 + 0.5 * Math.sin(TAU * 11 * t + Math.sin(TAU * 3 * t) * 2))
    * adsr(t, 0.05, 0.1, 0.8, 0.2, 0.5)), "bandpass", (t) => 500 + 300 * Math.sin(TAU * 7 * t), 4);
  mixInto(out, gurgle, 0.2, 0.9);
  return out;
});
sfx("lamp_light", () => {
  const out = buffer(2.0, SR);
  mixInto(out, noiseBurst(0.4, 121, { lp: 900, env: (t) => adsr(t, 0.12, 0.1, 0.4, 0.15, 0.2) }), 0, 0.8);
  mixInto(out, partials(1.8, SR, [[587.3, 0.8, 0.7], [880, 0.5, 0.55], [1174.7, 0.3, 0.4]], { attack: 0.01 }), 0.12, 0.5);
  return reverb(out, { room: 0.84, wet: 0.3, tail: 1.0 });
});
sfx("checkpoint_rest", () => {
  const out = buffer(2.6, SR);
  [146.83, 174.61, 220, 293.66].forEach((f, i) => {
    mixInto(out, pluck(2.2, SR, f, { seed: 130 + i, brightness: 0.5, decay: 0.998 }), i * 0.12, 0.6);
  });
  return reverb(out, { room: 0.86, wet: 0.35, tail: 1.2 });
});
sfx("manuscript", () => {
  const out = buffer(1.4, SR);
  const r = rng(141);
  const rustle = render(0.4, SR, () => 0);
  const source = whiteNoise(142);
  for (let i = 0; i < rustle.data.length; i++) {
    const t = i / SR;
    rustle.data[i] = source() * (0.4 + 0.6 * Math.abs(Math.sin(TAU * 9 * t + r() * 0.2))) * adsr(t, 0.02, 0.1, 0.6, 0.1, 0.3);
  }
  mixInto(out, biquad(rustle, "highpass", 1800, 0.7), 0, 0.6);
  mixInto(out, partials(1.0, SR, [[1318.5, 0.6, 0.35], [1975.5, 0.4, 0.28], [2637, 0.25, 0.2]], { attack: 0.005 }), 0.15, 0.5);
  return reverb(out, { room: 0.8, wet: 0.25, tail: 0.8 });
});
sfx("gate_open", () => {
  // Heavy timber on iron hinges: a slow creak and a deep thud.
  const r = rng(151);
  const saw = oscillator((t) => 70 + 14 * Math.sin(TAU * 0.9 * t) + (r() - 0.5) * 9, "saw");
  let creak = render(1.4, SR, (t) => saw(t, SR) * adsr(t, 0.2, 0.3, 0.7, 0.3, 1.1));
  creak = biquad(creak, "bandpass", 900, 3);
  const out = buffer(2.0, SR);
  mixInto(out, creak, 0, 0.8);
  mixInto(out, thump(0.6, 80, 34, 0.2), 1.35, 1.0);
  return reverb(out, { room: 0.8, wet: 0.25, tail: 0.8 });
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
