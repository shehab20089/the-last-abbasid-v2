// Facades painted over a level's solid blocks, so a wall of brick tiles reads as a building: towers at the ends of a
// street, a house whose flat roof is a way over, a burnt-out block of rubble, and a stretch of the city wall's walk.
// Each matches its block's footprint exactly; its top row is the walkable surface, so nothing painted there may look
// like an obstacle. They are built from the backdrop's parts and painted with relief (relief.mjs), then lit as the
// backdrop is, where the block stands: by the hour and by the street's fires and lamps.
import { join } from "node:path";
import { Canvas, P, archway, beam, brickWall, fbm, fillShape, hash2, mix, pick, plasterWall } from "./env_lib.mjs";
import {
  archRelief, balcony, banner, coping, crenels, door, hazeAt, levelGrade, scarWall, sill, soot, streetLights, tileBand,
  toPalette,
} from "./backdrop.mjs";
import { Relief, lightRelief } from "./relief.mjs";

/** A stone plinth along a building's foot, a little proud of its wall. */
function plinth(c, w, h, seed, relief) {
  brickWall(c, 0, h - 12, w, 12, { ramp: P.stone, base: 3, seed: seed + 1, brickW: 14, brickH: 6, relief, depth: 1.5,
    damage: 0.08 });
  fillShape(c, 0, h - 13, w - 1, h - 13, () => true, pick(P.stone, 4));
  relief.rect(0, h - 13, w - 1, h - 13, 2);
}

/** The flat-roofed house blocking the street: a barred gate below, timber bays above, its roof a way over. */
function house(w, h, seed, ctx) {
  const c = new Canvas(w, h);
  const relief = ctx.relief;
  const burnt = ctx.burning(w / 2);
  plasterWall(c, 0, 0, w, h - 70, { base: 3, seed: 501, stain: 0.7, relief, fallen: burnt ? 0.3 : 0.18 });
  brickWall(c, 0, h - 70, w, 70, { base: 3, seed: 502, light: 1, soot: 0.5, sootFrom: "bottom", relief });
  plinth(c, w, h, seed, relief);
  // The roof's lip: the walkable top, a coping standing out, its underside in shadow; the joists' ends under it.
  coping(c, 0, w - 1, 2, P.plaster, 3, relief, 0);
  for (let x = 6; x < w - 4; x += 16) {
    fillShape(c, x, 5, x + 3, 8, () => true, (px, py) => pick(P.wood, py === 5 ? 3 : 2));
    relief.rect(x, 5, x + 3, 8, 4);
  }
  // The upper storey: two timber bays on their brackets, one lit from inside.
  const bay = Math.min(34, Math.floor(w * 0.18));
  balcony(c, 22, 18, bay, 24, true, ctx);
  balcony(c, w - 22 - bay, 18, bay, 24, false, ctx);
  // A cornice between the storeys, the joists' ends under it.
  fillShape(c, 0, h - 74, w - 1, h - 72, () => true, pick(P.brick, 5));
  fillShape(c, 0, h - 71, w - 1, h - 71, () => true, P.brick[1]);
  relief.rect(0, h - 74, w - 1, h - 72, 2.5);
  // The gate: heavy leaves in a pointed arch, barred by a beam across them on iron brackets.
  door(c, w / 2, h - 12, 52, 54, seed, ctx, "shut");
  beam(c, w / 2 - 36, h - 40, 72, 5, { tone: 4, seed: 504 });
  relief.rect(w / 2 - 36, h - 40, w / 2 + 35, h - 36, 4);
  for (const bx of [w / 2 - 36, w / 2 + 31]) {
    fillShape(c, bx, h - 44, bx + 4, h - 34, () => true, P.iron[2]);
    relief.rect(bx, h - 44, bx + 4, h - 34, 5);
  }
  // Barred windows beside the gate, deep in the wall, on stone sills; soot climbs from them where the fire has been.
  for (const wx of [18, w - 30]) {
    fillShape(c, wx, h - 58, wx + 12, h - 44, () => true, P.night[0]);
    relief.rect(wx, h - 58, wx + 12, h - 44, -5);
    for (let b = 1; b < 13; b += 3) {
      fillShape(c, wx + b, h - 58, wx + b, h - 44, () => true, P.iron[3]);
      relief.rect(wx + b, h - 58, wx + b, h - 44, -2);
    }
    sill(c, wx - 2, wx + 14, h - 43, relief, 0);
    if (burnt) soot(c, wx - 3, wx + 15, h - 59, 34, seed + wx);
  }
  return c;
}

/** A tall tower of fired brick: its corners turning away from the light, arrow slits, a band of glazed tile, a blind
 * niche, merlons; the gate's tower hung with the black banner. */
function tower(w, h, seed, ctx, { gate = false } = {}) {
  const c = new Canvas(w, h);
  const relief = ctx.relief;
  brickWall(c, 0, 8, w, h - 8, { base: 3, seed, light: 1, soot: 0.6, sootFrom: "bottom", brickW: 7, relief });
  crenels(c, 0, w - 1, 8, P.brick, 3, { size: 6, gap: 4, relief, front: 0, broken: 0.15, seed });
  plinth(c, w, h, seed, relief);
  // The corners turn away from the street.
  for (let y = 0; y < h; y++) {
    for (const [x, d] of [[0, -1.6], [1, -0.6], [w - 1, -1.6], [w - 2, -0.6]]) {
      if (c.alpha(x, y) > 0) relief.set(x, y, relief.get(x, y) + d);
    }
  }
  for (let y = 40; y < h - 140; y += 64) {
    fillShape(c, w / 2 - 1, y, w / 2, y + 14, () => true, P.night[0]);
    relief.rect(w / 2 - 1, y, w / 2, y + 14, -6);
  }
  tileBand(c, 2, w - 3, 96, 8, { seed });
  relief.rect(2, 96, w - 3, 103, 1);
  archway(c, w / 2, h - 120, 18, 36, { ring: 2, ringTone: 5, interior: (x, y) => (y > h - 132 ? P.night[1] : P.night[0]) });
  archRelief(relief, w / 2, h - 120, 18, 36, { ring: 2, ringOut: 1, recess: -7 });
  if (gate) banner(c, 10, 120, w - 20, 58, seed + 7, ctx);
  return c;
}

/** A burnt-out block: brick sheared to its core, a broken stone coping (the way over it), charred joists jutting
 * from it, embers still glowing in its cracks near the fires. */
function rubbleBlock(w, h, seed, ctx) {
  const c = new Canvas(w, h);
  const relief = ctx.relief;
  brickWall(c, 0, 0, w, h, { base: 3, seed, light: 1, soot: 1.1, sootFrom: "bottom", damage: 0.16, relief });
  // Where the face has sheared away: the core of broken brick and mortar, sunk behind it.
  for (let y = 6; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm(x * 0.05, y * 0.05, { seed: seed + 2 });
      if (n <= 0.6) continue;
      const edge = n < 0.63;
      c.set(x, y, edge ? P.brick[1] : pick(P.brick, 1 + (hash2(x >> 1, y >> 1, seed) < 0.3 ? 1 : 0)));
      relief.set(x, y, edge ? -1 : -2.5 + (hash2(x >> 1, y >> 1, seed + 1) < 0.25 ? 0.8 : 0));
      if (!edge && ctx.burning(x) && hash2(x, y, seed + 3) < 0.012) c.set(x, y, P.fire[3]);
    }
  }
  plinth(c, w, h, seed, relief);
  // The coping, broken along its edge but whole enough to walk on.
  for (let x = 0; x < w; x++) {
    const chip = hash2(x >> 2, 1, seed) < 0.18 ? 1 : 0;
    fillShape(c, x, 0, x, 3 + chip, () => true, (px, py) => pick(P.stone, py === 0 ? 5 : py === 3 + chip ? 1 : 3));
    relief.rect(x, 0, x, 3 + chip, 2);
  }
  for (let jx = 10; jx < w - 10; jx += 26 + Math.floor(hash2(jx, 1, seed) * 14)) {
    const jy = 14 + Math.floor(hash2(jx, 2, seed) * 30);
    beam(c, jx, jy, 18, 4, { ramp: P.wood, tone: 1, seed: jx });
    relief.rect(jx, jy, jx + 17, jy + 3, 5);
    // Its end charred through, a glow in it near the fires.
    if (ctx.burning(jx)) c.set(jx + 17, jy + 1, P.fire[3]);
  }
  return c;
}

/** A stretch of the city wall seen from the town side, its walk the way over: big courses, a coping of dressed stone
 * along the walk, blind arches, arrow loops, the siege's marks on it as on the rampart behind. */
function rampartBlock(w, h, seed, ctx) {
  const c = new Canvas(w, h);
  const relief = ctx.relief;
  brickWall(c, 0, 0, w, h, { base: 3, seed, light: 1, brickW: 10, soot: 0.5, sootFrom: "bottom", relief, joint: 0.4,
    calm: true });
  scarWall(c, 0, w, 6, h, h - 6, seed, relief, ctx);
  for (let ax = 30; ax < w - 30; ax += 80) {
    archway(c, ax, h - 4, 40, Math.min(h - 30, 100), { ring: 3, ringTone: 4, interior: (x, y) =>
      pick(P.brick, 2 + ((y >> 2) % 2 === 0 && (x >> 3) % 2 === 0 ? 1 : 0)) });
    archRelief(relief, ax, h - 4, 40, Math.min(h - 30, 100), { ring: 3, ringOut: 1, recess: -6 });
  }
  for (let sx = 70; sx < w - 20; sx += 80) {
    fillShape(c, sx, 24, sx + 1, 40, () => true, P.night[0]);
    relief.rect(sx, 24, sx + 1, 40, -5);
  }
  // The walk's coping: dressed stone, lit along its top, a shadow under it.
  fillShape(c, 0, 0, w - 1, 5, () => true, (x, y) => pick(P.stone, y === 0 ? 5 : y === 5 ? 1 : 3 + (x % 24 === 0 ? -1 : 0)));
  relief.rect(0, 0, w - 1, 4, 3);
  return c;
}

/** Paints the level's facades with relief and lights them where they stand. */
export function buildFacades(OUT, level, { lamps = [], palette = null } = {}) {
  const out = [];
  const grade = levelGrade(level);
  const fires = level.fires.map(([col, row, size]) => ({ x: col * 16 + 8, y: row * 16, size }));
  for (const facade of level.facades ?? []) {
    const block = level.terrain.find(([, c0, c1, r0]) => c0 === facade.col && r0 === facade.top);
    const cols = block ? block[2] - block[1] + 1 : facade.width;
    const rows = block ? block[4] - block[3] + 1 : 24;
    const w = cols * 16;
    const h = rows * 16;
    const ox = facade.col * 16;
    const oy = facade.top * 16;
    const seed = facade.col * 7 + 11;
    const relief = new Relief(w, h);
    const own = [];
    const ctx = {
      relief,
      front: 0,
      lamp: (x, y, radius, strength) => own.push({ x: x + ox, y: y + oy, radius, strength }),
      burning: (x) => fires.some((f) => Math.abs(f.x - (x + ox)) < 90),
      soot: () => 0.5,
      scale: 1,
    };
    let c;
    if (facade.kind === "house") c = house(w, h, seed, ctx);
    else if (facade.kind === "rubble") c = rubbleBlock(w, h, seed, ctx);
    else if (facade.kind === "rampart") c = rampartBlock(w, h, seed, ctx);
    else c = tower(w, h, seed, ctx, { gate: facade.kind === "gate" });
    lightRelief(c, relief, {
      ambient: { color: grade.sky, strength: grade.ambient },
      lights: streetLights(level, [...lamps, ...own], grade, ox, oy),
      key: grade.key ?? null,
      // Nearer than the street behind it, so less veiled: it stands out from the backdrop of the same stone.
      haze: { tint: grade.tint, veil: (y) => hazeAt(grade, oy + y) * 0.55 },
    });
    // Its top, the way over, catching the sky.
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) {
        if (c.alpha(x, y) === 0) continue;
        c.set(x, y, mix(c.get(x, y), grade.edge, grade.edgeAmount));
        break;
      }
    }
    if (palette) toPalette(c, palette);
    c.save(join(OUT, "props", `facade_${facade.kind}_${facade.col}.png`));
    out.push(c);
  }
  return out;
}
