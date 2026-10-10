// Props that dress the streets of every level. Painted here: what lies flat (scattered pages, spilt
// ink), the foreground's post and cloth, and with relief and lit as the streets are (relief.mjs):
// the lamp niche where the hero rests, and each level's exit gate. Each prop is drawn standing on its bottom edge. The rest is modelled in 3D and rendered
// like the characters: the set pieces soldiers handle (props3d.mjs: the pyre, the chest, the dead),
// the streets' clutter (clutter3d.mjs: jars, sacks, a cart, rubble, a charred beam, books, a fallen
// banner, stone shot, a brazier, a well, the foreground's heap) and their furnishings
// (furnishings3d.mjs: the market's stalls, under timber roofs that are one-way platforms; the post
// captives are tied to; the college's lecterns, scroll racks, a fallen bookcase, fountain, cypresses
// and armillary sphere; the siege's horse-tail standards and broken ladder).
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Canvas, P, archway, awning, bayer, beam, brickWall, fbm, fillShape, glow, hash2, hex, inPointedArch, mix, pick,
} from "./env_lib.mjs";
import { archRelief, coping, crenels, crescent, levelGrade, muqarnasHood, toPalette } from "./backdrop.mjs";
import { FIRELIGHT, LAMPLIGHT, Relief, SKYLIGHT, lightRelief } from "./relief.mjs";
import { LEVEL as MARKET } from "../../levels/fallen_market.mjs";
import { LEVEL as STREETS } from "../../levels/streets_of_ash.mjs";
import { LEVEL as SCHOLARS } from "../../levels/scholars_quarter.mjs";
import { LEVEL as GATE } from "../../levels/last_gate.mjs";
import { rng } from "../lib/noise.mjs";
import { strip } from "../lib/canvas.mjs";
import { props3d } from "./props3d.mjs";
import { clutter3d } from "./clutter3d.mjs";
import { furnishings3d } from "./furnishings3d.mjs";
import { writeSpriteFramesRegions } from "../lib/godot_resources.mjs";

const OUTLINE = P.outline;

/** Adds a dark 1-px outline around opaque pixels (props sit on the play layer like characters). */
export function outline(c, color = OUTLINE) {
  const marks = [];
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      if (c.alpha(x, y) > 0) continue;
      if (c.alpha(x + 1, y) > 0 || c.alpha(x - 1, y) > 0 || c.alpha(x, y + 1) > 0 || c.alpha(x, y - 1) > 0) {
        marks.push([x, y]);
      }
    }
  }
  for (const [x, y] of marks) c.set(x, y, color);
  return c;
}

// --- Stalls ----------------------------------------------------------------------------------------

// --- Small props --------------------------------------------------------------------------------

function pages() {
  const c = new Canvas(64, 6);
  for (let i = 0; i < 9; i++) {
    const x = Math.floor(hash2(i, 0, 9) * 56);
    const y = 1 + Math.floor(hash2(i, 1, 9) * 3);
    for (let px = x; px < x + 7; px++) {
      c.set(px, y, P.parchment[2]);
      c.set(px, y + 1, P.parchment[1]);
      if (px % 2 === 0 && px > x && px < x + 6) c.set(px, y + 1, P.night[1]);
    }
  }
  return c;
}

// --- The streets, the college and the siege -------------------------------------------------------

/** Spilt ink: a black pool with a broken inkwell and a reed pen. */
function inkSpill() {
  const c = new Canvas(48, 6);
  for (let x = 4; x < 44; x++) {
    const h = Math.round(1 + Math.sin(((x - 4) / 40) * Math.PI) * 2 + (fbm(x * 0.3, 0, { seed: 2 }) - 0.5));
    for (let y = 6 - h; y < 6; y++) c.set(x, y, y === 6 - h && x % 5 === 0 ? hex("#2a2a3a") : hex("#07070b"));
  }
  fillShape(c, 6, 1, 10, 5, () => true, (x, y) => (y === 1 ? P.tile[4] : P.tile[2]));
  for (let x = 30; x < 42; x++) c.set(x, 2, P.ochre[3]);
  return c;
}

// --- The lamp niche (checkpoint) ----------------------------------------------------------------

/**
 * A wall fragment with a prayer niche and an oil lamp on its shelf: frames 0-1 unlit, an ember breathing on the wick
 * so it reads as a lamp waiting for its flame; 2-5 alight, the flame flickering. Painted with relief (the niche sunk
 * in the wall under a muqarnas hood, its ring a little proud, the shelf standing out from its back) and lit by the
 * night sky and by its own lamp, which casts the shelf's shadow down the niche. The checkpoint's own light adds the
 * flare as it is lit, and lights the street about it.
 */
function lampNiche() {
  const frames = [];
  const [cx, base, width, height] = [20, 57, 20, 42];
  const half = width / 2;
  const rise = half * 0.9;
  const spring = base - height + rise;
  for (let f = 0; f < 6; f++) {
    const c = new Canvas(40, 64);
    const relief = new Relief(40, 64);
    const lit = f > 1;
    brickWall(c, 0, 6, 40, 58, { base: 3, seed: 61, light: 1, relief });
    coping(c, 0, 39, 4, P.plaster, 3, relief, 0);
    archway(c, cx, base, width, height, { ring: 2, ringTone: 5, interior: () => P.plaster[3] });
    archRelief(relief, cx, base, width, height, { ring: 2, ringOut: 1, recess: -7 });
    muqarnasHood(c, cx, spring, half, rise, { ramp: P.plaster, tone: 4, rows: 4, relief, depth: -7 });
    // The shelf, standing out from the niche's back, and the bronze lamp on it, its spout to the right.
    fillShape(c, 11, 50, 29, 52, () => true, (x, y) => pick(P.stone, y === 50 ? 5 : 3));
    relief.rect(11, 50, 29, 52, -3);
    fillShape(c, 14, 47, 24, 49, () => true, (x, y) => (y === 47 ? P.bronze[4] : x < 17 ? P.bronze[3] : P.bronze[2]));
    relief.rect(14, 47, 24, 49, -2);
    fillShape(c, 24, 46, 27, 47, () => true, P.bronze[3]);
    relief.rect(24, 46, 27, 47, -2);
    if (lit) {
      const lick = [0, 1, -1, 1][f - 2];
      const flame = [[26, 45], [27, 45], [26, 44], [27, 44], [26 + (lick > 0 ? 1 : 0), 43], [26, 42 + Math.max(0, lick)]];
      flame.forEach(([x, y], i) => c.set(x, y, i < 2 ? P.fire[5] : i < 4 ? P.fire[6] : P.fire[4]));
    } else {
      c.set(26, 45, f === 0 ? P.fire[3] : P.fire[2]);
    }
    lightRelief(c, relief, {
      ambient: { color: SKYLIGHT, strength: 1.6 },
      lights: lit ? [{ x: 26.5, y: 43, z: -1, radius: 52, color: LAMPLIGHT, strength: [2.4, 2.7, 2.2, 2.55][f - 2] }]
        : [{ x: 26.5, y: 45, z: -4, radius: 13, color: FIRELIGHT, strength: f === 0 ? 1.0 : 0.6 }],
      haze: { tint: P.night[1], veil: () => 0.06 },
    });
    frames.push(c);
  }
  return frames;
}

// --- The exits ------------------------------------------------------------------------------------

/** Each exit's level: its hour lights the gate, its painting's colours paint it. */
const EXIT_LEVELS = { river_gate: MARKET, quarter_gate: STREETS, garden_door: SCHOLARS, last_gate: GATE };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/** Inside a pointed arch drawn by archway(). */
const archInside = (cx, base, width, height) => {
  const half = width / 2;
  const rise = half * 0.9;
  return (x, y) => inPointedArch(x + 0.5, y + 0.5, cx, base - height + rise, half, rise, base);
};

/**
 * Lights a gate painted with relief by the hour of its level, then lays the view through it when it stands open
 * (`beyond`: (x, y) -> a colour inside the arch, or null), which is its own light, and maps it all to the colours of
 * its level's painting.
 */
function lightGate(c, relief, name, beyond) {
  const level = EXIT_LEVELS[name];
  const grade = levelGrade(level);
  lightRelief(c, relief, {
    ambient: { color: grade.sky, strength: grade.ambient },
    key: grade.key ?? null,
    haze: { tint: grade.tint, veil: () => 0.06 },
  });
  if (beyond) {
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        const color = beyond(x, y);
        if (color) c.set(x, y, color);
      }
    }
  }
  const env = level.env.replace("res://", "");
  toPalette(c, JSON.parse(readFileSync(join(ROOT, env, "palette.json"), "utf8")));
  return c;
}

/** Water at night under the fires: dark, glints of their light lying on it in short streaks, more toward the near
 * bank. `top` its far edge, `bottom` its near one. */
function nightWater(x, y, top, bottom, seed) {
  const t = (y - top) / Math.max(1, bottom - top);
  if (y % 2 === 0 && hash2(x >> 2, y, seed) < 0.06 + t * 0.2) return hash2(x, y, seed + 1) < 0.4 ? P.glow[4] : P.glow[3];
  if (y % 3 === 1 && hash2(x >> 3, y, seed + 2) < 0.2) return P.indigo[3];
  return mix(P.indigo[1], P.indigo[2], t);
}

/** Bronze studs along the iron bands of a gate's leaves, a little proud of them. */
function studs(c, relief, xs, ys, depth) {
  for (const y of ys) {
    for (const x of xs) {
      c.set(x, y, P.bronze[3]);
      relief.set(x, y, depth);
    }
  }
}

/** The river gate: a postern in the river wall, merlons above; its leaves of planks bound with iron and studded
 * with bronze, deep in a pointed arch; open, the river at night beyond, the fires in it. */
function riverGate(open) {
  const c = new Canvas(80, 128);
  const relief = new Relief(80, 128);
  brickWall(c, 0, 8, 80, 120, { base: 3, seed: 71, light: 1, soot: 0.4, relief });
  crenels(c, 0, 79, 8, P.brick, 3, { size: 5, gap: 3, relief, front: 0 });
  const [cx, base, width, height] = [40, 124, 48, 96];
  archway(c, cx, base, width, height, { ring: 5, ringTone: 5, interior: (x, y) => {
    const plank = Math.floor((x - 16) / 6);
    if (Math.abs(x + 0.5 - 40) < 1) return P.wood[0];
    if ((y - 28) % 14 === 0) return P.iron[2];
    if ((x - 16) % 6 === 0) return P.wood[1];
    return pick(P.wood, 2 + (hash2(plank, 0, 7) > 0.6 ? 1 : 0));
  } });
  archRelief(relief, cx, base, width, height, { ring: 5, ringOut: 1.5, recess: open ? -40 : (x, y) =>
    (Math.abs(x + 0.5 - 40) < 1 ? -6.8 : (y - 28) % 14 === 0 ? -5.4 : (x - 16) % 6 === 0 ? -6.5 : -6) });
  if (!open) studs(c, relief, Array.from({ length: 12 }, (_, k) => 18 + k * 4), [41, 55, 69, 83, 97, 111], -5.1);
  fillShape(c, 12, 124, 67, 127, () => true, (x, y) => pick(P.stone, y === 124 ? 5 : 3));
  relief.rect(12, 124, 67, 127, 2);
  const inside = archInside(cx, base, width, height);
  return lightGate(c, relief, "river_gate", open ? (x, y) => {
    if (!inside(x, y) || y >= 124) return null;
    const bank = 78 - Math.floor(hash2(x >> 3, 1, 4) * 6) - ((x >> 1) % 5 === 0 ? 2 : 0);
    if (y < bank) return mix(P.night[1], P.night[3], (y - 28) / 50);
    if (y < 86) return hash2(x >> 1, y >> 1, 5) < 0.05 ? P.glow[3] : P.night[0];
    return nightWater(x, y, 86, 124, 7);
  } : null);
}

/** The gate of a quarter: heavy double doors deep under a brick arch, a crescent nailed above; open, the passage
 * beyond and the glow of the next street. */
function quarterGate(open) {
  const c = new Canvas(80, 128);
  const relief = new Relief(80, 128);
  const [cx, base, width, height] = [40, 126, 60, 112];
  archway(c, cx, base, width, height, { ring: 6, ringTone: 5, interior: (x, y) => {
    if (Math.abs(x + 0.5 - 40) < 1) return P.iron[1];
    if ((y - 20) % 18 === 0) return P.iron[3];
    if ((x - 12) % 8 === 0) return P.wood[1];
    return pick(P.wood, 2 + (fbm(x * 0.3, y * 1.1, { seed: 5 }) > 0.6 ? 1 : 0));
  } });
  archRelief(relief, cx, base, width, height, { ring: 6, ringOut: 1.5, recess: open ? -40 : (x, y) =>
    ((y - 20) % 18 === 0 ? -4.4 : (x - 12) % 8 === 0 ? -5.5 : -5) });
  if (!open) {
    studs(c, relief, Array.from({ length: 9 }, (_, k) => 14 + k * 6), [39, 57, 75, 93, 111], -4.1);
    crescent(c, 40, 26, 5);
    relief.rect(35, 21, 45, 31, -4);
  }
  const inside = archInside(cx, base, width, height);
  return lightGate(c, relief, "quarter_gate", open ? (x, y) => {
    if (!inside(x, y)) return null;
    const t = (y - 14) / 112;
    if (t > 0.78) return hash2(x >> 1, y, 3) < 0.35 ? P.glow[4] : P.glow[3];
    return t > 0.5 ? P.glow[1] : P.night[1];
  } : null);
}

/** The college's garden door: a small door of turned panels in a frame of glazed tile under a brick lintel; open,
 * the garden's palms against the paling sky. */
function gardenDoor(open) {
  const c = new Canvas(64, 112);
  const relief = new Relief(64, 112);
  fillShape(c, 4, 6, 59, 111, () => true, (x, y) => ((x + y) % 6 === 0 ? P.tile[4] : (x - y + 300) % 6 === 0 ? P.indigo[4] : P.indigo[1]));
  relief.rect(4, 6, 59, 111, 1);
  fillShape(c, 4, 6, 59, 9, () => true, (x, y) => pick(P.brick, y === 6 ? 6 : 5));
  relief.rect(4, 6, 59, 9, 2.5);
  const [cx, base, width, height] = [32, 110, 36, 88];
  archway(c, cx, base, width, height, { ring: 3, ringTone: 5, interior: (x, y) => {
    if (Math.abs(x + 0.5 - 32) < 0.8) return P.wood[0];
    if ((y - 24) % 14 === 0) return P.bronze[2];
    return pick(P.wood, 3 + (Math.floor(x) % 5 === 0 ? -1 : 0));
  } });
  archRelief(relief, cx, base, width, height, { ring: 3, front: 1, ringOut: 1, recess: open ? -40 : (x, y) =>
    ((y - 24) % 14 === 0 ? -3.4 : Math.floor(x) % 5 === 0 ? -4.4 : -4) });
  const inside = archInside(cx, base, width, height);
  return lightGate(c, relief, "garden_door", open ? (x, y) => {
    if (!inside(x, y)) return null;
    const t = (y - 22) / 88;
    // Two palms against the paling sky, their fronds falling from the crowns; the garden's dark below.
    const trunk = (cx, lean, top) => y > top && Math.abs(x + 0.5 - (cx + (y - top) * lean)) < 1.3;
    const fronds = (cx, cy) => {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > 13 || d < 1) return false;
      const a = Math.atan2(dy, dx);
      const droop = Math.abs(Math.sin(a * 3.5)) * (dy > -2 ? 1 : 0.6);
      return droop > 0.82 && dy > -6 + (d * d) / 40;
    };
    if (trunk(25, -0.12, 44) || trunk(43, 0.08, 52) || fronds(30, 45) || fronds(39, 53)) return hex("#0b0a14");
    if (t > 0.86) return hash2(x >> 1, y, 3) < 0.25 ? P.jade[1] : P.jade[0];
    if (t > 0.78) return hex("#141228");
    return mix(mix(hex("#241c3c"), hex("#6e3d55"), Math.min(1, t / 0.55)), hex("#b07a6c"), Math.max(0, (t - 0.55) / 0.23));
  } : null);
}

/** The last gate: great iron-bound doors deep in the gatehouse arch, barred with a beam; open, first light and the
 * river road beyond. */
function lastGate(open) {
  const c = new Canvas(96, 184);
  const relief = new Relief(96, 184);
  const [cx, base, width, height] = [48, 182, 86, 172];
  archway(c, cx, base, width, height, { ring: 5, ringTone: 5, interior: (x, y) => {
    const lx = x - 5;
    if (Math.abs(x + 0.5 - 48) < 1.2) return P.iron[1];
    if ((y - 12) % 20 === 0 || (y - 12) % 20 === 1) return P.iron[2];
    if (lx % 10 === 5 && (y - 12) % 20 === 10) return P.iron[4];
    return pick(P.wood, 2 + (fbm(x * 0.22, y * 0.9, { seed: 8 }) > 0.62 ? 1 : 0) + (lx % 10 === 0 ? -1 : 0));
  } });
  archRelief(relief, cx, base, width, height, { ring: 5, ringOut: 1.5, recess: open ? -40 : (x, y) => {
    const lx = x - 5;
    if (Math.abs(x + 0.5 - 48) < 1.2) return -6.8;
    if ((y - 12) % 20 <= 1) return -5.3;
    if (lx % 10 === 5 && (y - 12) % 20 === 10) return -5.1;
    return lx % 10 === 0 ? -6.5 : -6;
  } });
  if (!open) {
    beam(c, 6, 92, 84, 8, { tone: 4, seed: 3 });
    relief.rect(6, 92, 89, 99, -3);
  }
  const inside = archInside(cx, base, width, height);
  return lightGate(c, relief, "last_gate", open ? (x, y) => {
    if (!inside(x, y)) return null;
    const t = (y - 10) / 172;
    // Dawn beyond the gate: the sky paling to gold at the horizon, the sun just risen, the far shore dark under it,
    // the river with the sun's path across it, and the road at the gate's foot.
    const sun = Math.hypot(x + 0.5 - 62, (y + 0.5 - 100) * 1.1);
    if (t < 0.53) {
      if (sun < 6) return sun < 4 ? hex("#fff0c8") : hex("#ffe0a0");
      const sky = t < 0.3 ? mix(hex("#9a7480"), hex("#d4a07e"), t / 0.3) : mix(hex("#d4a07e"), hex("#f4cc94"), (t - 0.3) / 0.23);
      return sun < 16 ? mix(sky, hex("#ffe6b0"), (1 - sun / 16) * 0.6) : sky;
    }
    const shore = 0.53 + (hash2(x >> 2, 2, 6) < 0.3 ? 0.035 : 0.015) + ((x >> 1) % 7 === 0 ? 0.03 : 0);
    if (t < Math.max(shore, 0.565)) return t < shore ? hex("#3a3241") : hex("#5a4a4c");
    if (t < 0.86) {
      const path = Math.abs(x + 0.5 - 62) < 8 - (t - 0.57) * 10;
      if (y % 2 === 0 && hash2(x >> 1, y, 8) < (path ? 0.55 : 0.08)) return path ? hex("#f0c890") : hex("#e8b878");
      return mix(hex("#5a6488"), hex("#3c4462"), (t - 0.57) / 0.29);
    }
    return t > 0.93 ? P.stone[3] : P.stone[2];
  } : null);
}

// --- Foreground ----------------------------------------------------------------------------------

/** Dark silhouettes that pass in front of the play layer. */
function foregroundPost() {
  const c = new Canvas(40, 300);
  const dark = [hex("#060507"), hex("#0d0b0e"), hex("#16121a")];
  fillShape(c, 14, 0, 23, 299, () => true, (x) => dark[x > 20 ? 0 : 1]);
  for (let y = 40; y < 140; y++) {
    const sway = Math.sin(y * 0.05) * 3;
    for (let x = 0; x < 14; x++) if (x > 3 + sway) c.set(x + 24, y, dark[(y % 12 < 2) ? 2 : 1]);
  }
  return c;
}

function foregroundCloth() {
  const c = new Canvas(120, 90);
  const dark = [hex("#08070a"), hex("#110e13"), hex("#1b161e")];
  for (let x = 0; x < 120; x++) {
    const t = x / 120;
    const bottom = 30 + Math.sin(t * Math.PI) * 45 - Math.abs(Math.sin(x * 0.2)) * 4;
    for (let y = 0; y < bottom; y++) c.set(x, y, dark[(x % 14 < 2) ? 2 : y > bottom - 3 ? 0 : 1]);
  }
  return c;
}

export function buildProps(OUT, REVIEW) {
  const sheet = [];
  const save = (name, canvas) => {
    canvas.save(join(OUT, "props", `${name}.png`));
    sheet.push(canvas);
  };
  save("pages", pages());
  save("ink_spill", inkSpill());
  // Set pieces the soldiers handle, the streets' clutter and their furnishings, modelled in 3D and rendered like them
  // (props3d.mjs, clutter3d.mjs, furnishings3d.mjs).
  for (const [name, canvas] of props3d()) save(name, canvas);
  for (const [name, canvas] of clutter3d()) save(name, canvas);
  for (const [name, canvas] of furnishings3d()) save(name, canvas);
  const niche = lampNiche();
  strip(niche).save(join(OUT, "props", "lamp_niche.png"));
  const nicheTexture = "res://assets/environments/market/props/lamp_niche.png";
  writeSpriteFramesRegions(join(OUT, "props", "lamp_niche_frames.tres"), [
    { name: "dark", texture: nicheTexture, frames: [0, 1].map((i) => [i * 40, 0, 40, 64]), fps: 2, loop: true },
    { name: "lit", texture: nicheTexture, frames: [2, 3, 4, 5].map((i) => [i * 40, 0, 40, 64]), fps: 8, loop: true },
  ]);
  sheet.push(...niche);
  save("river_gate", riverGate(false));
  save("river_gate_open", riverGate(true));
  save("quarter_gate", quarterGate(false));
  save("quarter_gate_open", quarterGate(true));
  save("garden_door", gardenDoor(false));
  save("garden_door_open", gardenDoor(true));
  save("last_gate", lastGate(false));
  save("last_gate_open", lastGate(true));
  save("fg_post", foregroundPost());
  save("fg_cloth", foregroundCloth());
  // Review sheet: everything on a mid background.
  const width = sheet.reduce((s, c) => s + c.width + 4, 0);
  const review = new Canvas(Math.min(width, 1400), 640);
  review.clear(hex("#3b3437"));
  let x = 2;
  let y = 2;
  let rowH = 0;
  for (const c of sheet) {
    if (x + c.width > review.width) { x = 2; y += rowH + 4; rowH = 0; }
    review.blit(c, x, y);
    x += c.width + 4;
    rowH = Math.max(rowH, c.height);
  }
  review.scaled(2).save(join(REVIEW, "market_props.png"));
}
