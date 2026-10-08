// Builds the effect sprites: sparks, flashes, dust, flecks, the telegraph glint, fire and smoke,
// embers and ash, blood (sprays, the gush of a severed limb, pools, splats, drops) and the arrow. Every effect is a strip of frames in the master palette.
// Usage: node tools/asset_generation/build_effects.mjs
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas, hex, mix, strip } from "./lib/canvas.mjs";
import { P } from "./lib/palette.mjs";
import { fbm, hash2, rng } from "./lib/noise.mjs";
import { reviewSheet } from "./lib/character_sheet.mjs";
import { writeSpriteFrames } from "./lib/godot_resources.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "assets", "effects");
const meta = {};
const review = [];

function save(name, frames, fps, loop) {
  strip(frames).save(join(OUT, `${name}.png`));
  meta[name] = { file: `${name}.png`, frames: frames.length, width: frames[0].width,
    height: frames[0].height, fps, loop };
  review.push(...frames);
}

const WHITE = hex("#fff6dc");
const GOLD = P.fire[5];
const SPARK = [P.fire[3], P.fire[4], P.fire[5], P.fire[6]];

/** Draws a line of pixels with a colour per position along it (t in 0..1). */
function ray(c, x0, y0, angle, from, to, color) {
  const steps = Math.ceil(to - from) * 2;
  for (let i = 0; i <= steps; i++) {
    const r = from + ((to - from) * i) / steps;
    c.set(Math.round(x0 + Math.cos(angle) * r), Math.round(y0 + Math.sin(angle) * r),
      typeof color === "function" ? color(i / steps) : color);
  }
}

// --- Sword contact flash: a white star that bursts and thins out. ----------------------------------
{
  const frames = [];
  for (let f = 0; f < 5; f++) {
    const c = new Canvas(32, 32);
    const t = f / 4;
    const len = [5, 9, 12, 13, 12][f];
    const inner = [0, 1, 3, 6, 9][f];
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2 + 0.2;
      const long = k % 2 === 0 ? len : len * 0.55;
      ray(c, 16, 16, angle, inner, long, (s) => (s < 0.5 && f < 3 ? WHITE : f < 2 ? GOLD : P.fire[4]));
    }
    if (f < 2) c.ellipse(16, 16, 3 - f, 3 - f, WHITE);
    if (f === 0) c.ellipse(16, 16, 4, 4, WHITE);
    frames.push(c);
    void t;
  }
  save("hit_spark", frames, 24, false);
}

// --- Shield block: a spray of orange sparks thrown forward (to the right). -------------------------
{
  const frames = [];
  const r = rng(11);
  const sparks = Array.from({ length: 14 }, () => ({
    a: -0.9 + r() * 1.8, v: 6 + r() * 9, len: 2 + r() * 3,
  }));
  for (let f = 0; f < 6; f++) {
    const c = new Canvas(40, 32);
    if (f < 2) {
      c.ellipse(10, 16, 4 - f * 1.5, 6 - f * 2, f === 0 ? WHITE : GOLD);
    }
    for (const s of sparks) {
      const d = s.v * (f + 1) * 0.55;
      const x = 10 + Math.cos(s.a) * d;
      const y = 16 + Math.sin(s.a) * d + f * f * 0.35;
      if (f > 4 && s.v < 9) continue;
      ray(c, x, y, s.a + Math.PI, 0, s.len * (1 - f / 7), SPARK[Math.max(0, 3 - Math.floor(f / 1.6))]);
    }
    frames.push(c);
  }
  save("block_spark", frames, 22, false);
}

// --- Parry: a ringing flash, a hard white burst with a gold ring and long rays. --------------------
{
  const frames = [];
  for (let f = 0; f < 7; f++) {
    const c = new Canvas(64, 64);
    const ring = [4, 9, 14, 18, 21, 23, 24][f];
    if (f < 6) {
      for (let a = 0; a < 64; a++) {
        const angle = (a / 64) * Math.PI * 2;
        if (f > 3 && a % 2 === 0) continue;
        c.set(Math.round(32 + Math.cos(angle) * ring), Math.round(32 + Math.sin(angle) * ring * 0.8),
          f < 3 ? WHITE : GOLD);
      }
    }
    const rays = [10, 18, 26, 30, 30, 26, 18][f];
    for (let k = 0; k < 4; k++) {
      const angle = (k / 4) * Math.PI * 2 + Math.PI / 4;
      ray(c, 32, 32, angle, f > 2 ? (f - 2) * 5 : 0, rays * 0.6, f < 4 ? WHITE : GOLD);
    }
    for (let k = 0; k < 2; k++) {
      ray(c, 32, 32, k * Math.PI, 0, rays, (s) => (s < 0.6 ? WHITE : GOLD));
    }
    if (f < 3) c.ellipse(32, 32, 6 - f * 2, 6 - f * 2, WHITE);
    frames.push(c);
  }
  save("parry_flash", frames, 20, false);
}

// --- Impact flecks: dark drops thrown back from a cut (restrained, not gore). ---------------------
{
  const frames = [];
  const r = rng(23);
  const drops = Array.from({ length: 9 }, () => ({ a: -0.7 + r() * 1.4, v: 4 + r() * 6, s: r() < 0.4 ? 2 : 1 }));
  for (let f = 0; f < 6; f++) {
    const c = new Canvas(32, 32);
    for (const d of drops) {
      const x = 8 + Math.cos(d.a) * d.v * (f + 1) * 0.6;
      const y = 16 + Math.sin(d.a) * d.v * (f + 1) * 0.6 + f * f * 0.5;
      const color = f < 3 ? P.blood[3] : P.blood[2];
      c.set(Math.round(x), Math.round(y), color);
      if (d.s === 2 && f < 4) c.set(Math.round(x) - 1, Math.round(y), P.blood[1]);
    }
    frames.push(c);
  }
  save("hit_flecks", frames, 20, false);
}

// --- A cut landing: a bright crescent streak across the target along the blade's path, white at
// its heart through gold to a dark red edge, breaking up as it fades. Drawn for a blow to the right.
function crescent(c, cx, cy, radius, from, to, thick, colors, dither = 0) {
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const a = Math.atan2(dy, dx);
      if (a < from || a > to) continue;
      const t = (a - from) / (to - from);
      const half = thick * Math.sin(Math.PI * Math.min(1, t * 1.15));
      const off = Math.hypot(dx, dy) - radius;
      if (Math.abs(off) > half) continue;
      if (dither && (x + y) % dither === 0) continue;
      const k = Math.abs(off) / Math.max(0.5, half);
      c.set(x, y, k < 0.35 ? colors[0] : k < 0.75 ? colors[1] : colors[2]);
    }
  }
}

{
  const frames = [];
  const r = rng(31);
  const sparks = Array.from({ length: 10 }, () => ({ a: -0.6 + r() * 1.5, v: 5 + r() * 7, len: 2 + r() * 3 }));
  const STAGES = [
    { thick: 1.0, colors: [WHITE, WHITE, GOLD], dither: 0, span: 0.55 },
    { thick: 2.6, colors: [WHITE, GOLD, P.fire[4]], dither: 0, span: 1 },
    { thick: 3.4, colors: [WHITE, GOLD, P.fire[3]], dither: 0, span: 1 },
    { thick: 2.6, colors: [GOLD, P.fire[4], P.fire[2]], dither: 5, span: 1 },
    { thick: 1.8, colors: [P.fire[4], P.fire[3], P.blood[2]], dither: 3, span: 1 },
    { thick: 1.0, colors: [P.fire[3], P.blood[3], P.blood[2]], dither: 2, span: 1 },
  ];
  STAGES.forEach((stage, f) => {
    const c = new Canvas(64, 48);
    // An arc through the frame's centre, falling from the upper left: a downward cut.
    const from = -1.85;
    const to = from + 1.55 * stage.span;
    crescent(c, 14, 58, 38.5, from, to, stage.thick, stage.colors, stage.dither);
    if (f < 2) c.ellipse(32, 24, 3 - f, 3 - f, WHITE);
    if (f > 0) {
      for (const s of sparks) {
        const d = s.v * f * 0.8;
        const x = 32 + Math.cos(s.a) * d;
        const y = 24 + Math.sin(s.a) * d + f * f * 0.4;
        if (f > 3 && s.v < 8) continue;
        ray(c, x, y, s.a + Math.PI, 0, s.len * (1 - f / 7), SPARK[Math.max(0, 3 - Math.floor(f / 1.5))]);
      }
    }
    frames.push(c);
  });
  save("hit_slash", frames, 24, false);
  // A rising cut throws its streak the other way: the same arc, mirrored top to bottom.
  save("hit_slash_rise", frames.map((frame) => {
    const up = new Canvas(frame.width, frame.height);
    for (let y = 0; y < frame.height; y++) {
      for (let x = 0; x < frame.width; x++) {
        const c = frame.get(x, y);
        if (c[3] > 0) up.set(x, frame.height - 1 - y, c);
      }
    }
    return up;
  }), 24, false);
}

// --- A thrust landing: a level streak that punches through, a burst at its point. ----------------
{
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const c = new Canvas(64, 32);
    const len = [26, 40, 46, 44, 38, 30][f];
    const start = [6, 4, 10, 18, 26, 32][f];
    const colors = f < 2 ? [WHITE, GOLD] : f < 4 ? [GOLD, P.fire[4]] : [P.fire[4], P.fire[2]];
    for (let x = start; x < Math.min(63, start + len); x++) {
      const t = (x - start) / len;
      const half = (f < 3 ? 1.6 : 1.1) * Math.sin(Math.PI * Math.min(1, t * 1.1 + 0.08));
      for (let y = Math.floor(16 - half); y <= Math.ceil(16 + half - 1); y++) {
        if (f > 3 && (x + y) % 2 === 0) continue;
        c.set(x, y, Math.abs(y + 0.5 - 16) < half * 0.5 ? colors[0] : colors[1]);
      }
    }
    if (f < 3) {
      const cx = 38 + f * 2;
      ray(c, cx, 16, -Math.PI / 2, 0, 6 - f, f < 2 ? WHITE : GOLD);
      ray(c, cx, 16, Math.PI / 2, 0, 6 - f, f < 2 ? WHITE : GOLD);
      ray(c, cx, 16, -0.6, 0, 7 - f, GOLD);
      ray(c, cx, 16, 0.6, 0, 7 - f, GOLD);
      c.ellipse(cx, 16, 2.5 - f * 0.7, 2.5 - f * 0.7, WHITE);
    }
    frames.push(c);
  }
  save("hit_pierce", frames, 24, false);
}

// --- Blood thrown from a wound: dark drops and a few streaks flung away from the blow, falling. ----
{
  const frames = [];
  const r = rng(47);
  const drops = Array.from({ length: 18 }, () => ({
    a: -0.95 + r() * 1.35, v: 3 + r() * 7.5, size: r() < 0.35 ? 2 : 1, streak: r() < 0.3,
  }));
  for (let f = 0; f < 8; f++) {
    const c = new Canvas(56, 48);
    for (const d of drops) {
      const t = f + 1;
      const x = 10 + Math.cos(d.a) * d.v * t * 0.62;
      const y = 22 + Math.sin(d.a) * d.v * t * 0.62 + t * t * 0.42;
      if (y > 47) continue;
      const color = f < 2 ? P.blood[4] : f < 5 ? P.blood[3] : P.blood[2];
      if (d.streak && f < 5) ray(c, x, y, d.a + Math.PI - t * 0.08, 0, 2 + d.v * 0.25, P.blood[2]);
      c.set(Math.round(x), Math.round(y), color);
      if (d.size === 2 && f < 6) {
        c.set(Math.round(x) + 1, Math.round(y), color);
        c.set(Math.round(x), Math.round(y) + 1, P.blood[1]);
      }
    }
    frames.push(c);
  }
  save("blood_spray", frames, 20, false);
}

// --- A gush where a limb or a head is cut away: a heavy arc of blood thrown up and out, falling. ---
{
  const frames = [];
  const r = rng(53);
  const drops = Array.from({ length: 34 }, () => ({
    a: -1.45 + r() * 1.25, v: 2.5 + r() * 6.5, size: r() < 0.45 ? 2 : 1, streak: r() < 0.4,
  }));
  for (let f = 0; f < 11; f++) {
    const c = new Canvas(72, 72);
    for (const d of drops) {
      const t = f + 1;
      const x = 14 + Math.cos(d.a) * d.v * t * 0.7;
      const y = 40 + Math.sin(d.a) * d.v * t * 0.7 + t * t * 0.38;
      if (y > 71 || x > 71) continue;
      const color = f < 3 ? P.blood[4] : f < 7 ? P.blood[3] : P.blood[2];
      if (d.streak && f < 7) ray(c, x, y, d.a + Math.PI - t * 0.06, 0, 2.5 + d.v * 0.35, P.blood[2]);
      c.set(Math.round(x), Math.round(y), color);
      if (d.size === 2 && f < 8) {
        c.set(Math.round(x) + 1, Math.round(y), color);
        c.set(Math.round(x), Math.round(y) + 1, P.blood[1]);
        c.set(Math.round(x) + 1, Math.round(y) + 1, P.blood[1]);
      }
    }
    frames.push(c);
  }
  save("blood_gush", frames, 22, false);
}

// --- Pools: blood spreading on the street under the dead, seen almost edge on. Grow, then hold. ----
for (const [name, width, seed] of [["blood_pool_a", 44, 3], ["blood_pool_b", 56, 9], ["blood_pool_c", 34, 17]]) {
  const frames = [];
  const h = 5;
  for (let f = 0; f < 12; f++) {
    const c = new Canvas(width, h);
    const grow = Math.min(1, (f + 1) / 11) ** 0.7;
    const half = (width / 2 - 2) * grow;
    for (let x = 0; x < width; x++) {
      const d = Math.abs(x - width / 2 + 0.5) / Math.max(half, 0.5);
      if (d > 1) continue;
      // An uneven rim: lobes where it ran further.
      const lobe = fbm(x * 0.21, seed, { seed }) * 0.9 + 0.35;
      if (d > lobe) continue;
      const thick = d < 0.45 ? 3 : d < 0.8 ? 2 : 1;
      for (let k = 0; k < thick; k++) {
        const y = h - 1 - k;
        const shine = k === thick - 1 && d < 0.6 && (x + seed) % 7 === 0;
        c.set(x, y, shine ? P.blood[3] : k === 0 ? P.blood[0] : P.blood[1]);
      }
    }
    frames.push(c);
  }
  save(name, frames, 7, false);
}

// --- Gibs: chunks of flesh thrown from a cut, turning as they fly (eight turns each). ----------
for (const [name, radii, bone, seed] of [
  ["gib_a", [2.6, 2.0, 2.8, 1.8, 2.4, 1.6], false, 5],
  ["gib_b", [2.0, 1.5, 2.2, 1.7, 1.4], true, 11],
  ["gib_c", [3.2, 2.2, 1.8, 2.8, 2.0, 2.6, 1.6], false, 23],
]) {
  const frames = [];
  for (let f = 0; f < 8; f++) {
    const c = new Canvas(11, 11);
    const turn = (f / 8) * Math.PI * 2;
    const n = radii.length;
    for (let y = 0; y < 11; y++) {
      for (let x = 0; x < 11; x++) {
        const dx = x - 5;
        const dy = y - 5;
        const a = Math.atan2(dy, dx) - turn;
        const k = ((a / (Math.PI * 2)) * n + n * 4) % n;
        const i = Math.floor(k);
        const r = radii[i] + (radii[(i + 1) % n] - radii[i]) * (k - i);
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        // Lit from above left, wet: a highlight, the body, a dark underside.
        const lit = (-dx - dy) / (r * 1.6) + 0.5;
        const color = lit > 0.85 ? P.blood[4] : lit > 0.45 ? P.blood[3] : lit > 0.15 ? P.blood[2] : P.blood[1];
        c.set(x, y, color);
      }
    }
    if (bone) {
      const bx = Math.round(5 + Math.cos(turn) * 1.2);
      const by = Math.round(5 + Math.sin(turn) * 1.2);
      c.set(bx, by, P.parchment[3]);
    }
    frames.push(c);
  }
  save(name, frames, 12, true);
}

// A wide pool, for the cut in two and the heavy dead.
{
  const frames = [];
  const width = 74;
  const h = 6;
  for (let f = 0; f < 14; f++) {
    const c = new Canvas(width, h);
    const grow = Math.min(1, (f + 1) / 13) ** 0.7;
    const half = (width / 2 - 2) * grow;
    for (let x = 0; x < width; x++) {
      const d = Math.abs(x - width / 2 + 0.5) / Math.max(half, 0.5);
      if (d > 1) continue;
      const lobe = fbm(x * 0.17, 29, { seed: 29 }) * 0.9 + 0.35;
      if (d > lobe) continue;
      const thick = d < 0.4 ? 4 : d < 0.65 ? 3 : d < 0.85 ? 2 : 1;
      for (let k = 0; k < thick; k++) {
        const y = h - 1 - k;
        const shine = k === thick - 1 && d < 0.6 && (x + 29) % 6 === 0;
        c.set(x, y, shine ? P.blood[3] : k === 0 ? P.blood[0] : P.blood[1]);
      }
    }
    frames.push(c);
  }
  save("blood_pool_d", frames, 7, false);
}

// --- Splats: what drops leave on the ground. Each frame is a different mark. -------------------
{
  const frames = [];
  const r = rng(61);
  for (let i = 0; i < 6; i++) {
    const c = new Canvas(9, 3);
    const w = 3 + Math.floor(r() * 6);
    const x0 = Math.floor((9 - w) / 2);
    for (let x = x0; x < x0 + w; x++) {
      c.set(x, 2, P.blood[1]);
      if (x > x0 && x < x0 + w - 1 && r() < 0.6) c.set(x, 1, P.blood[2]);
    }
    if (r() < 0.5) c.set(x0 + w + 1 < 9 ? x0 + w + 1 : 0, 2, P.blood[1]);
    frames.push(c);
  }
  save("blood_splat", frames, 1, false);
}

// --- Dust: a low puff that billows outward and thins (landings, rolls, skids). --------------------
{
  const frames = [];
  const tones = [P.plaster[4], P.plaster[3], P.plaster[2]];
  for (let f = 0; f < 6; f++) {
    const c = new Canvas(48, 24);
    const spread = 4 + f * 3.2;
    const puffs = [[-1, 0.9], [-0.6, 1.1], [0, 1.25], [0.6, 1.1], [1, 0.9]];
    for (const [px, size] of puffs) {
      const cx = 24 + px * spread;
      const cy = 19 - f * 0.9 - size * 2;
      const radius = (2.8 + size * 1.6) * (1 - f / 9);
      for (let y = Math.floor(cy - radius); y <= cy + radius; y++) {
        for (let x = Math.floor(cx - radius); x <= cx + radius; x++) {
          const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.2) / radius;
          if (d > 1) continue;
          if (f >= 3 && (x + y + f) % 2 === 0) continue;
          const tone = d < 0.45 && f < 3 ? tones[0] : d < 0.8 ? tones[1] : tones[2];
          if (y < 22) c.set(x, y, tone);
        }
      }
    }
    frames.push(c);
  }
  save("dust", frames, 16, false);
}

// --- Telegraph glint: a four-point star that flares on a raised blade. --------------------------
{
  const frames = [];
  for (let f = 0; f < 6; f++) {
    const c = new Canvas(20, 20);
    const len = [2, 5, 8, 7, 4, 2][f];
    const color = f < 4 ? WHITE : P.fire[5];
    for (let k = 0; k < 4; k++) {
      const angle = (k / 4) * Math.PI * 2;
      ray(c, 10, 10, angle, 0, len, (s) => (s < 0.4 ? color : P.fire[f < 3 ? 5 : 4]));
    }
    if (f > 0 && f < 4) {
      for (let k = 0; k < 4; k++) {
        const angle = (k / 4) * Math.PI * 2 + Math.PI / 4;
        ray(c, 10, 10, angle, 0, len * 0.35, P.fire[4]);
      }
    }
    c.set(10, 10, WHITE);
    frames.push(c);
  }
  save("glint", frames, 18, false);
}

// --- Fire: looping flames in three sizes. ---------------------------------------------------------
/**
 * A fire: several tongues of flame, each wavering and stretching on its own rhythm, shedding licks
 * that rise and burn out above them, white at the heart, through yellow and orange to a dark red
 * edge that softens into translucent glow; a bed of embers at the foot. Loops seamlessly.
 */
function fireFrames(w, h, count, seed, tongues) {
  const frames = [];
  const period = h * 0.8;
  const r = (k, salt) => hash2(k, salt, seed);
  const flames = [];
  for (let k = 0; k < tongues; k++) {
    const spread = tongues === 1 ? 0 : (k / (tongues - 1) - 0.5) * 0.62;
    flames.push({
      x: w / 2 + spread * w + (r(k, 1) - 0.5) * w * 0.08,
      width: w * (0.13 + r(k, 2) * 0.07) * (k === Math.floor(tongues / 2) ? 1.3 : 1),
      height: h * (0.62 + r(k, 3) * 0.3) * (k === Math.floor(tongues / 2) ? 1.12 : 0.9),
      phase: r(k, 4) * Math.PI * 2,
      rate: 1 + Math.floor(r(k, 5) * 2),
    });
  }
  const colour = (heat) => (heat > 1.42 ? P.fire[6] : heat > 1.18 ? P.fire[5] : heat > 0.94 ? P.fire[4]
    : heat > 0.7 ? P.fire[3] : heat > 0.48 ? P.fire[2] : P.fire[1]);
  for (let f = 0; f < count; f++) {
    const c = new Canvas(w, h);
    const t = f / count;
    const scroll = t * period;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // Noise rising through the flames, blended across the loop so it wraps.
        const n1 = fbm(x * 0.2, (y + scroll) * 0.16, { octaves: 3, seed });
        const n2 = fbm(x * 0.2, (y + scroll - period) * 0.16, { octaves: 3, seed });
        const n = n1 * (1 - t) + n2 * t;
        let heat = 0;
        for (const fl of flames) {
          const wave = Math.sin(t * Math.PI * 2 * fl.rate + fl.phase);
          const tall = fl.height * (0.86 + 0.14 * wave);
          const v = (h - 1 - y) / tall; // 0 at the foot, 1 at the tip
          if (v < -0.05 || v > 1.1) continue;
          const sway = Math.sin(v * 4.2 - t * Math.PI * 2 * fl.rate + fl.phase) * fl.width * 0.35 * v;
          const half = fl.width * Math.pow(Math.max(0, 1 - v), 0.6) * (1 + (1 - v) * 0.6);
          const u = Math.abs(x + 0.5 - (fl.x + sway)) / Math.max(0.5, half);
          if (u >= 1) continue;
          heat = Math.max(heat, (1 - u) * 1.25 + (1 - v) * 0.5);
        }
        // The rising noise shapes the flames from within (it adds no flame where there is none).
        heat *= 0.62 + n * 0.75;
        // Licks of flame torn loose above the tongues, rising and burning out.
        for (let k = 0; k < tongues; k++) {
          const life = (t * flames[k].rate + r(k, 6)) % 1;
          const ly = h - 1 - flames[k].height * (0.85 + life * 0.55);
          const lx = flames[k].x + Math.sin(life * 6 + k) * flames[k].width * 0.4;
          const d = Math.hypot((x + 0.5 - lx) / (flames[k].width * 0.35), (y + 0.5 - ly) / (flames[k].width * 0.6));
          if (d < 1) heat = Math.max(heat, (1 - d) * 1.1 * (1 - life));
        }
        // A bed of embers along the foot.
        if (y >= h - 3) {
          const bed = Math.abs(x + 0.5 - w / 2) / (w * 0.46);
          if (bed < 1) heat = Math.max(heat, 0.5 + (1 - bed) * 0.5 + (hash2(x, y + f, seed) - 0.5) * 0.5);
        }
        if (heat < 0.12) continue;
        if (heat < 0.24) {
          // The soft glowing edge: translucent dark red.
          const glowEdge = P.fire[1];
          c.set(x, y, [glowEdge[0], glowEdge[1], glowEdge[2], Math.round(70 + (heat - 0.12) * 900)]);
          continue;
        }
        c.set(x, y, colour(heat));
      }
    }
    frames.push(c);
  }
  return frames;
}
save("fire_small", fireFrames(20, 30, 12, 3, 2), 14, true);
save("fire_medium", fireFrames(34, 52, 12, 7, 3), 13, true);
save("fire_large", fireFrames(56, 96, 12, 13, 4), 12, true);

// --- Drifting smoke: translucent bands that tile sideways, for slow-scrolling haze layers. -------
/**
 * A band of smoke `w` wide (tiling left to right) and `h` tall: billows thickest through the
 * middle, warm-lit underneath by the fires, fading softly to nothing above and below.
 */
function smokeBand(w, h, seed, { opacity = 0.5, scale = 1 } = {}) {
  const c = new Canvas(w, h);
  const field = (x, y) => fbm((x / 70) * scale, (y / 26) * scale, { octaves: 4, seed });
  for (let y = 0; y < h; y++) {
    const band = Math.sin((y / (h - 1)) * Math.PI);
    for (let x = 0; x < w; x++) {
      const t = x / w;
      // Blended with the noise one tile to the left, so the right edge meets the left.
      const n = field(x, y) * (1 - t) + field(x - w, y) * t;
      const density = Math.max(0, n * 1.8 - 0.62) * band;
      if (density <= 0.01) continue;
      const under = y / h;
      const color = mix(mix(P.smoke[1], P.smoke[3], Math.min(1, density * 1.5)), P.glow[2], under * 0.35);
      c.set(x, y, [color[0], color[1], color[2], Math.round(255 * Math.min(1, density) * opacity)]);
    }
  }
  return c;
}
smokeBand(512, 150, 61, { opacity: 0.7 }).save(join(OUT, "smoke_drift.png"));
smokeBand(512, 90, 67, { opacity: 0.22, scale: 1.4 }).save(join(OUT, "haze_drift.png"));

// --- Particles (single frames): smoke puffs, embers, ash flakes, a spark. ------------------------
function puff(size, tones, seed) {
  const c = new Canvas(size, size);
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - r, y + 0.5 - r) / r;
      const n = fbm(x * 0.4, y * 0.4, { octaves: 2, seed });
      const edge = d + (n - 0.5) * 0.45;
      if (edge > 0.95) continue;
      if (edge > 0.78 && (x + y) % 2 === 0) continue;
      const lightSide = (x - y) / size;
      const tone = edge < 0.45 ? (lightSide > 0.05 ? tones[2] : tones[1]) : edge < 0.78 ? tones[1] : tones[0];
      c.set(x, y, tone);
    }
  }
  return c;
}
for (const [name, size] of [["smoke_small", 12], ["smoke_medium", 20], ["smoke_large", 32]]) {
  const c = puff(size, [P.smoke[2], P.smoke[3], P.smoke[4]], size);
  c.save(join(OUT, `${name}.png`));
  review.push(c);
}
{
  const ember = new Canvas(3, 3);
  ember.set(1, 1, P.fire[6]);
  ember.set(0, 1, P.fire[4]); ember.set(2, 1, P.fire[4]); ember.set(1, 0, P.fire[4]); ember.set(1, 2, P.fire[4]);
  ember.save(join(OUT, "ember.png"));
  const ash = new Canvas(3, 2);
  ash.set(0, 0, P.ash[2]); ash.set(1, 0, P.ash[3]); ash.set(2, 1, P.ash[1]);
  ash.save(join(OUT, "ash.png"));
  const dot = new Canvas(2, 2);
  dot.fillRect(0, 0, 2, 2, hex("#ffffff"));
  dot.save(join(OUT, "pixel.png"));
  // A drop of blood for particles: a bright core going dark at its edge.
  const drop = new Canvas(2, 3);
  drop.set(0, 0, P.blood[4]); drop.set(1, 0, P.blood[3]);
  drop.set(0, 1, P.blood[3]); drop.set(1, 1, P.blood[2]);
  drop.set(0, 2, P.blood[1]);
  drop.save(join(OUT, "blood_drop.png"));
}

// --- The arrow: a reed shaft, an iron head and grey fletching. ----------------------------------
{
  const c = new Canvas(18, 5);
  for (let x = 3; x < 15; x++) c.set(x, 2, x % 3 === 0 ? P.wood[3] : P.wood[4]);
  c.set(15, 1, P.iron[3]); c.set(15, 2, P.iron[5]); c.set(15, 3, P.iron[2]);
  c.set(16, 2, P.iron[4]); c.set(17, 2, P.iron[3]);
  for (const [x, y] of [[0, 0], [1, 1], [2, 1], [0, 4], [1, 3], [2, 3]]) c.set(x, y, P.linen[2]);
  c.set(1, 2, P.linen[3]); c.set(2, 2, P.wood[3]);
  c.save(join(OUT, "arrow.png"));
  review.push(c);
}

// --- A fire pot: a round clay pot, its wick alight. -------------------------------------------------
{
  const c = new Canvas(9, 11);
  const body = [[3, 4], [2, 5], [1, 6], [1, 7], [1, 8], [2, 9], [3, 10]];
  for (const [x0, y] of body) for (let x = x0; x <= 8 - x0; x++) c.set(x, y, x < 4 ? P.ochre[2] : x < 6 ? P.ochre[3] : P.ochre[1]);
  for (let x = 3; x <= 5; x++) c.set(x, 3, P.ochre[1]);
  c.set(4, 2, P.linen[2]);
  c.set(4, 1, P.fire[5]); c.set(3, 1, P.fire[3]); c.set(5, 0, P.fire[4]); c.set(4, 0, P.fire[6]);
  c.save(join(OUT, "fire_pot.png"));
  review.push(c);
}

// --- A throwing knife: a narrow iron blade, a cord-wound grip. --------------------------------------
{
  const c = new Canvas(12, 3);
  for (let x = 0; x < 4; x++) c.set(x, 1, x % 2 === 0 ? P.leather[2] : P.leather[3]);
  c.set(4, 0, P.iron[2]); c.set(4, 1, P.iron[3]); c.set(4, 2, P.iron[2]);
  for (let x = 5; x < 11; x++) c.set(x, 1, x > 8 ? P.iron[5] : P.iron[4]);
  for (let x = 5; x < 9; x++) c.set(x, 0, P.iron[2]);
  c.set(11, 1, P.iron[5]);
  c.save(join(OUT, "throwing_knife.png"));
  review.push(c);
}

// --- Light: a banded radial falloff, so lit areas step down in pixel-art bands. -----------------
{
  const size = 128;
  const c = new Canvas(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      if (d >= 1) continue;
      const falloff = (1 - d) ** 1.6;
      const band = Math.ceil(falloff * 12) / 12;
      c.set(x, y, [255, 255, 255, Math.round(band * 255)]);
    }
  }
  c.save(join(OUT, "light_soft.png"));
}

// --- A rescued manuscript: a small codex in a leather cover with a gilt clasp. --------------------
{
  const c = new Canvas(14, 10);
  for (let y = 2; y < 10; y++) for (let x = 1; x < 13; x++) c.set(x, y, y < 4 ? P.parchment[3] : P.leather[x < 3 ? 2 : 3]);
  for (let x = 2; x < 12; x++) c.set(x, 3, P.parchment[2]);
  c.set(12, 6, P.gold[3]); c.set(12, 7, P.gold[2]);
  for (let x = 1; x < 13; x++) c.set(x, 9, P.leather[1]);
  c.set(5, 0, P.parchment[4]); c.set(6, 1, P.parchment[3]); c.set(4, 1, P.parchment[3]);
  c.save(join(OUT, "manuscript.png"));
}

writeSpriteFrames(join(OUT, "effect_frames.tres"), "res://assets/effects", meta);
reviewSheet(review.slice(0, 40), { factor: 4, columns: 10 }).save(join(ROOT, "captures", "art_review", "effects.png"));
console.log(`effects: ${Object.keys(meta).join(", ")}`);
