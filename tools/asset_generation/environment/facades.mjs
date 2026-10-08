// Facades painted over a level's solid blocks, so a wall of brick tiles reads as a building: towers
// at the ends of a street, a house whose flat roof is a way over, a burnt-out block of rubble, and
// a stretch of the city wall's walk. Each matches its block's footprint exactly; its top row is the
// walkable surface, so nothing painted there may look like an obstacle.
import { join } from "node:path";
import {
  Canvas, P, archway, beam, brickWall, fbm, fillShape, glow, hash2, hex, lattice, mix, pick, plasterWall,
} from "./env_lib.mjs";

const DARK_GRADE = (c, top = 0.35, bottom = 0.18) => {
  for (let y = 0; y < c.height; y++) {
    const t = y / c.height;
    for (let x = 0; x < c.width; x++) {
      if (c.alpha(x, y) === 0) continue;
      c.set(x, y, mix(c.get(x, y), P.night[1], top + (bottom - top) * t));
    }
  }
};

/** The flat-roofed house blocking the street: a barred gate below, lattice windows above. */
function house(w, h) {
  const c = new Canvas(w, h);
  plasterWall(c, 0, 0, w, h - 70, { base: 3, seed: 501, stain: 0.7 });
  brickWall(c, 0, h - 70, w, 70, { base: 3, seed: 502, light: 1, soot: 0.5, sootFrom: "bottom" });
  // The roof's lip: the walkable top, a clean lit edge with a shadow under it.
  fillShape(c, 0, 0, w - 1, 1, () => true, P.plaster[5]);
  fillShape(c, 0, 2, w - 1, 3, () => true, P.plaster[4]);
  fillShape(c, 0, 4, w - 1, 4, () => true, P.plaster[1]);
  // Joist ends under the roof.
  for (let x = 6; x < w - 4; x += 16) fillShape(c, x, 5, x + 3, 8, () => true, P.wood[2]);
  // Upper storey: two lattice windows, one lit from inside.
  lattice(c, 26, 22, 30, 26, { tone: 3, glow: (x, y) => (hash2(x, y, 4) > 0.5 ? P.fire[3] : P.fire[2]) });
  beam(c, 22, 48, 38, 3, { tone: 3 });
  lattice(c, w - 58, 22, 30, 26, { tone: 3 });
  beam(c, w - 62, 48, 38, 3, { tone: 3 });
  // A cornice between the storeys.
  fillShape(c, 0, h - 74, w - 1, h - 72, () => true, P.brick[5]);
  fillShape(c, 0, h - 71, w - 1, h - 71, () => true, P.brick[1]);
  // The gate: heavy planks in a pointed arch, barred by a beam.
  archway(c, w / 2, h - 2, 58, 64, { ring: 4, ringTone: 5, interior: (x, y) => {
    if (Math.abs(x + 0.5 - w / 2) < 0.8) return P.wood[0];
    if ((y - (h - 66)) % 13 === 0) return P.iron[2];
    if (Math.floor(x) % 7 === 0) return P.wood[1];
    return pick(P.wood, 2 + (fbm(x * 0.3, y * 1.4, { seed: 503 }) > 0.6 ? 1 : 0));
  } });
  beam(c, w / 2 - 36, h - 34, 72, 5, { tone: 4, seed: 504 });
  for (const bx of [w / 2 - 36, w / 2 + 31]) fillShape(c, bx, h - 38, bx + 4, h - 28, () => true, P.iron[2]);
  // Barred windows beside the gate.
  for (const wx of [18, w - 30]) {
    fillShape(c, wx, h - 54, wx + 12, h - 40, () => true, P.night[0]);
    for (let b = 1; b < 13; b += 3) fillShape(c, wx + b, h - 54, wx + b, h - 40, () => true, P.iron[3]);
  }
  // Soot from the fires climbing the wall.
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (fbm(x * 0.04, y * 0.02, { seed: 505 }) > 0.62 && y > 10) c.set(x, y, mix(c.get(x, y), P.night[0], 0.4));
    }
  }
  DARK_GRADE(c, 0.3, 0.12);
  glow(c, 40, 34, 26, P.fire[3], 0.35);
  return c;
}

/** A tall tower of fired brick: buttress lines, arrow slits, crenellations and a niche. */
function tower(w, h, seed, { gate = false } = {}) {
  const c = new Canvas(w, h);
  brickWall(c, 0, 8, w, h - 8, { base: 3, seed, light: 1, soot: 0.6, sootFrom: "bottom", brickW: 7 });
  for (let x = 0; x < w; x += 8) fillShape(c, x, 0, x + 4, 8, () => true, (px, py) => pick(P.brick, py < 2 ? 5 : 4));
  fillShape(c, 0, 8, w - 1, 9, () => true, P.brick[5]);
  // Corner shading for roundness.
  for (let y = 8; y < h; y++) {
    c.set(0, y, mix(c.get(0, y), P.night[0], 0.4));
    c.set(w - 1, y, mix(c.get(w - 1, y), P.night[0], 0.5));
    c.set(w - 2, y, mix(c.get(w - 2, y), P.night[0], 0.25));
  }
  // Arrow slits up the tower, a band of glazed tile, and a blind niche.
  for (let y = 40; y < h - 140; y += 64) fillShape(c, w / 2 - 1, y, w / 2, y + 14, () => true, P.night[0]);
  for (let x = 2; x < w - 2; x++) {
    for (let y = 96; y < 104; y++) c.set(x, y, (x + y) % 6 === 0 ? P.tile[4] : P.tile[1]);
  }
  archway(c, w / 2, h - 120, 18, 36, { ring: 2, ringTone: 5, interior: (x, y) => (y > h - 132 ? P.night[1] : P.night[0]) });
  if (gate) {
    // Black Abbasid banners hang from the gate tower.
    for (let x = 10; x < w - 10; x++) {
      const tear = Math.floor(fbm(x * 0.5, 0, { seed: seed + 7 }) * 18);
      for (let y = 120; y < 176 - tear; y++) c.set(x, y, x % 6 === 0 ? hex("#1d1a20") : hex("#0f0e11"));
      c.set(x, 120, P.gold[2]);
    }
    // The gold crescent on the banner.
    const [cx, cy, r] = [w / 2, 136, 6];
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const outer = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
        const inner = Math.hypot(x + 0.5 - (cx + r * 0.42), y + 0.5 - (cy - r * 0.3)) <= r * 0.8;
        if (outer && !inner) c.set(x, y, y < cy - 1 ? P.gold[4] : P.gold[3]);
      }
    }
  }
  DARK_GRADE(c, 0.42, 0.2);
  return c;
}

/** A burnt-out block: heaped masonry under a broken coping, charred joists jutting from it. */
function rubbleBlock(w, h, seed) {
  const c = new Canvas(w, h);
  brickWall(c, 0, 0, w, h, { base: 3, seed, light: 1, soot: 1.1, sootFrom: "bottom", damage: 0.16 });
  // Fallen courses: patches where the face has sheared away to the core.
  for (let y = 6; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (fbm(x * 0.05, y * 0.05, { seed: seed + 2 }) > 0.6) c.set(x, y, pick(P.brick, 1 + (hash2(x >> 1, y >> 1, seed) < 0.3 ? 1 : 0)));
    }
  }
  fillShape(c, 0, 0, w - 1, 1, () => true, P.stone[4]);
  fillShape(c, 0, 2, w - 1, 3, () => true, P.stone[2]);
  for (let jx = 10; jx < w - 10; jx += 26 + Math.floor(hash2(jx, 1, seed) * 14)) {
    beam(c, jx, 14 + Math.floor(hash2(jx, 2, seed) * 30), 18, 4, { ramp: P.wood, tone: 1, seed: jx });
  }
  DARK_GRADE(c, 0.38, 0.2);
  return c;
}

/** A stretch of the city wall seen from the town side: big courses, a blind arch, arrow loops,
 * and a dressed coping along the walk. */
function rampartBlock(w, h, seed) {
  const c = new Canvas(w, h);
  brickWall(c, 0, 0, w, h, { base: 3, seed, light: 1, brickW: 10, soot: 0.5, sootFrom: "bottom" });
  fillShape(c, 0, 0, w - 1, 1, () => true, P.stone[5]);
  fillShape(c, 0, 2, w - 1, 4, () => true, P.stone[3]);
  fillShape(c, 0, 5, w - 1, 5, () => true, P.stone[1]);
  for (let ax = 30; ax < w - 30; ax += 80) {
    archway(c, ax, h - 4, 40, Math.min(h - 30, 100), { ring: 3, ringTone: 4, interior: (x, y) =>
      pick(P.brick, 2 + ((y >> 2) % 2 === 0 && (x >> 3) % 2 === 0 ? 1 : 0)) });
  }
  for (let sx = 70; sx < w - 20; sx += 80) fillShape(c, sx, 24, sx + 1, 40, () => true, P.night[0]);
  DARK_GRADE(c, 0.34, 0.16);
  return c;
}

export function buildFacades(OUT, level) {
  const out = [];
  for (const facade of level.facades ?? []) {
    const block = level.terrain.find(([, c0, c1, r0]) => c0 === facade.col && r0 === facade.top);
    const cols = block ? block[2] - block[1] + 1 : facade.width;
    const rows = block ? block[4] - block[3] + 1 : 24;
    const w = cols * 16;
    const h = rows * 16;
    const seed = facade.col * 7 + 11;
    let c;
    if (facade.kind === "house") c = house(w, h);
    else if (facade.kind === "rubble") c = rubbleBlock(w, h, seed);
    else if (facade.kind === "rampart") c = rampartBlock(w, h, seed);
    else c = tower(w, h, seed, { gate: facade.kind === "gate" });
    c.save(join(OUT, "props", `facade_${facade.kind}_${facade.col}.png`));
    out.push(c);
  }
  return out;
}
