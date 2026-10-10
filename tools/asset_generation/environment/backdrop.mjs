// The street-side facades of a level, painted for its whole length and cut into chunks. The
// backdrop sits at the street's own depth (no parallax) right behind the play layer. Each stretch
// of street (a level section) is dressed by its theme: the market's shop arcades (pottery, spices,
// books), houses and their gutted ruins, a bathhouse, a mosque, a caravanserai, the college with
// its tiled portal, arcades and library, the river wall, the city's ramparts, a quarter gate, the
// great gatehouse and the Mongols' camp. Painted at mid values, then graded for the hour of the
// level and lit by its fires.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  Canvas, P, archway, awning, bayer, beam, brickWall, dome, fbm, fillShape, glow, hash2, hex, inPointedArch,
  lattice, mix, pick, plasterWall, smokeColumn,
} from "./env_lib.mjs";
import { rng } from "../lib/noise.mjs";
import { FIRELIGHT, LAMPLIGHT, Relief, SKYLIGHT, lightRelief } from "./relief.mjs";

/** Every level's street is the top of tile row 28. */
export const STREET_ROW = 28;
/** Height of the backdrop above the street, and the level y of its top. */
export const BACKDROP_HEIGHT = 360;
export const BACKDROP_TOP = STREET_ROW * 16 - BACKDROP_HEIGHT;
export const CHUNK = 600;
/** Ground-floor height: a storey a little taller than a man. */
const STOREY = 118;
const CLEAR = [0, 0, 0, 0];

/** How each hour lights the facades (relief.mjs): the sky's light on every face, how far the highest storeys sink
 * into the night's tint, the strength of the fires, and the light on the parapets. */
const GRADES = {
  night: { tint: P.night[1], sky: mix(SKYLIGHT, hex("#c0703c"), 0.3), ambient: 1.75, haze: 0.38, edge: hex("#8a87a6"),
    edgeAmount: 0.35, fire: 1 },
  smoke: { tint: hex("#170c12"), sky: mix(SKYLIGHT, hex("#c0603c"), 0.4), ambient: 1.65, haze: 0.42, edge: hex("#b0645a"),
    edgeAmount: 0.3, fire: 1.1 },
  predawn: { tint: hex("#121126"), sky: mix(SKYLIGHT, hex("#b4808c"), 0.3), ambient: 1.8, haze: 0.34, edge: hex("#b48a92"),
    edgeAmount: 0.35, fire: 0.85 },
  // Dawn has a sun: low in the east, raking along the street from the right, the towers' shadows long across the wall.
  dawn: { tint: hex("#1a1e2e"), sky: mix(SKYLIGHT, hex("#e2ae7c"), 0.35), ambient: 1.1, haze: 0.28, edge: hex("#e2ae7c"),
    edgeAmount: 0.45, fire: 0.7, key: { dir: [0.86, -0.3, 0.42], color: hex("#ffb27a"), strength: 1.7, steps: 80 } },
};

/** Themes that fill their whole section with one structure. */
const WHOLE = ["wall", "mosque", "darb", "portal", "rampart", "gatehouse", "river", "camp"];

/** Cobalt-and-white glaze for the college's tilework. */
const COBALT = [hex("#0b1230"), hex("#14215a"), hex("#203584"), hex("#3657a6"), hex("#7393c8"), hex("#cfd9ea")];

const GOODS = {
  potters: [P.brick, P.plaster, P.tile],
  spices: [P.saffron, P.madder, P.ochre, P.jade],
  books: [P.madder, P.indigo, P.saffron, P.leather, P.jade, P.wool],
  cloth: [P.madder, P.indigo, P.saffron, P.teal],
};

// --- Shop interiors --------------------------------------------------------------------------------

function shopInterior(c, cx, base, width, height, theme, seed, { burnt = false, shelves = null } = {}) {
  const half = width / 2;
  const rise = half * 0.9;
  const spring = base - height + rise;
  const inside = (px, py) => inPointedArch(px, py, cx, spring, half, rise, base);
  const x0 = Math.floor(cx - half);
  const top = base - height;
  fillShape(c, x0, top, cx + half, base, inside, (x, y) => {
    const t = (y - top) / height;
    if (burnt) return fbm(x * 0.2, y * 0.2, { seed }) > 0.74 ? P.fire[1] : P.night[0];
    return t < 0.35 ? P.night[0] : t < 0.7 ? P.night[1] : P.wood[1];
  });
  if (burnt) {
    for (let x = x0 + 2; x < cx + half - 2; x++) {
      if (hash2(x, 1, seed) < 0.35) c.set(x, base - 1, hash2(x, 2, seed) < 0.5 ? P.fire[3] : P.fire[2]);
      if (hash2(x, 3, seed) < 0.15) c.set(x, base - 2, P.fire[2]);
    }
    // Charred shelf stubs.
    for (const sy of [base - 30, base - 52]) {
      for (let x = x0 + 3; x < x0 + 3 + Math.floor(hash2(sy, 4, seed) * (width - 8)); x++) c.set(x, sy, P.wood[0]);
    }
    return;
  }
  const r = rng(seed);
  for (const sy of shelves ?? [base - 28, base - 50, base - 72]) {
    if (!inside(cx, sy - 8)) continue;
    for (let x = x0 + 2; x < cx + half - 2; x++) {
      if (!inside(x + 0.5, sy + 0.5)) continue;
      c.set(x, sy, P.wood[3]);
      c.set(x, sy + 1, P.wood[1]);
    }
    let x = x0 + 3;
    while (x < cx + half - 4) {
      if (theme === "books") {
        const ramp = GOODS.books[Math.floor(r() * GOODS.books.length)];
        const bh = 8 + Math.floor(r() * 5);
        const bw = 2 + (r() < 0.35 ? 1 : 0);
        if (r() < 0.1) { x += 3; continue; }
        if (r() < 0.12) {
          // A codex lying flat.
          fillShape(c, x, sy - 3, x + 7, sy - 1, (px, py) => inside(px, py), (px, py) => pick(ramp, py === sy - 3 ? 3 : 1));
          x += 8;
          continue;
        }
        fillShape(c, x, sy - bh, x + bw - 1, sy - 1, (px, py) => inside(px, py), (px, py) =>
          pick(ramp, (px === x ? 2 : 1) + (py === sy - bh ? 1 : 0) + ((py - sy) % 4 === 0 ? -1 : 0)));
        x += bw;
      } else if (theme === "potters") {
        const jh = 8 + Math.floor(r() * 7);
        const jw = 5 + Math.floor(r() * 4);
        const ramp = GOODS.potters[Math.floor(r() * GOODS.potters.length)];
        fillShape(c, x, sy - jh, x + jw, sy - 1, (px, py) => {
          if (!inside(px, py)) return false;
          const t = (sy - py) / jh;
          const belly = Math.sin(Math.min(1, t * 1.1) * Math.PI) * 0.5 + 0.3;
          return Math.abs(px - (x + jw / 2)) <= (jw / 2) * (t > 0.85 ? 0.35 : belly);
        }, (px) => pick(ramp, 2 + (px < x + jw / 2 ? 1 : 0)));
        x += jw + 2;
      } else if (theme === "spices") {
        const ramp = GOODS.spices[Math.floor(r() * GOODS.spices.length)];
        const sw = 9 + Math.floor(r() * 4);
        fillShape(c, x, sy - 8, x + sw, sy - 1, (px, py) => {
          if (!inside(px, py)) return false;
          return sy - py <= Math.sin(((px - x) / sw) * Math.PI) * 8 + 1;
        }, (px, py) => pick(ramp, 2 + (py < sy - 5 ? 1 : 0) + (bayer(px, py) < 0.15 ? -1 : 0)));
        x += sw + 1;
      } else {
        const ramp = GOODS.cloth[Math.floor(r() * GOODS.cloth.length)];
        fillShape(c, x, sy - 6, x + 4, sy - 1, (px, py) => inside(px, py), () => pick(ramp, 2));
        x += 6;
      }
    }
  }
  if (theme === "books") return;
  for (let k = 0; k < 2; k++) {
    const gx = x0 + 4 + Math.floor(r() * Math.max(1, width - 16));
    const ramp = (GOODS[theme] ?? GOODS.cloth)[Math.floor(r() * 3)];
    fillShape(c, gx, base - 9, gx + 10, base - 1, (px, py) => inside(px, py) &&
      base - py <= Math.sin(((px - gx) / 10) * Math.PI) * 9 + 1, (px, py) => pick(ramp, 1 + (py < base - 6 ? 1 : 0)));
  }
}

// --- Building parts -------------------------------------------------------------------------------

function parapet(c, x0, x1, top, ramp, tone) {
  fillShape(c, x0, top, x1, top + 2, () => true, pick(ramp, tone + 1));
  for (let x = x0; x <= x1 - 3; x += 6) {
    fillShape(c, x, top - 4, x + 3, top - 1, () => true, pick(ramp, tone + 1));
    fillShape(c, x + 1, top - 6, x + 2, top - 5, () => true, pick(ramp, tone + 1));
  }
}

/** Square merlons along a fortification's top. Given a `relief`, the walk's parapet stands out from `front` and the
 * merlons a little further. */
function crenels(c, x0, x1, top, ramp, tone, { size = 8, gap = 6, relief = null, front = 0, broken = 0, seed = 7 } = {}) {
  fillShape(c, x0, top, x1, top + 3, () => true, pick(ramp, tone + 1));
  relief?.rect(x0, top, x1, top + 2, front + 2);
  relief?.rect(x0, top + 3, x1, top + 3, front + 1);
  for (let x = x0; x <= x1 - size; x += size + gap) {
    // The siege has knocked some merlons away and broken others down to a ragged stump.
    const harm = hash2(x, 3, seed);
    if (harm < broken * 0.4) continue;
    const stump = harm < broken ? Math.floor(size * (0.35 + hash2(x, 4, seed) * 0.3)) : 0;
    for (let px = x; px < x + size; px++) {
      const ragged = stump ? Math.floor(hash2(px, 5, seed) * 3) : 0;
      const from = top - size + stump + ragged;
      fillShape(c, px, from, px, top - 1, () => true, (xx, yy) => pick(ramp, tone + (yy === from ? 2 : px === x ? 1 : 0)));
      relief?.rect(px, from, px, top - 1, front + 3);
    }
  }
}

function door(c, cx, base, width, height, seed, ctx, state = "shut") {
  if (state === "broken") {
    brokenDoor(c, cx, base, width, height, seed, ctx);
    return;
  }
  archway(c, cx, base, width + 6, height + 4, { ring: 3, ringTone: 4, interior: (x, y) => {
    const lx = x - (cx - width / 2);
    if (Math.abs(x + 0.5 - cx) < 0.7) return P.wood[0];
    const stud = Math.floor(lx) % 6 === 3 && (y - (base - height)) % 9 === 4;
    if (stud) return P.bronze[3];
    if ((y - (base - height)) % 18 === 0) return P.wood[1];
    return pick(P.wood, 2 + (fbm(x * 0.3, y * 1.2, { seed }) > 0.6 ? 1 : 0));
  } });
  // A bronze ring handle.
  c.set(Math.floor(cx) - 3, base - Math.floor(height * 0.45), P.bronze[4]);
  c.set(Math.floor(cx) + 2, base - Math.floor(height * 0.45), P.bronze[4]);
  if (!ctx?.relief) return;
  // The doorway is a recess: the leaves stand back in the wall's thickness, the arch's ring a pixel proud of it,
  // and a stone step before the threshold.
  const half = (width + 6) / 2;
  const rise = half * 0.9;
  const spring = base - (height + 4) + rise;
  const inner = (px, py) => inPointedArch(px, py, cx, spring, half, rise, base);
  const outer = (px, py) => inPointedArch(px, py, cx, spring, half + 3, rise + 3, base);
  ctx.relief.fill(cx - half - 4, base - height - 8, cx + half + 4, base, (px, py) => outer(px, py) && !inner(px, py),
    ctx.front + 1);
  ctx.relief.fill(cx - half, base - height - 4, cx + half, base, inner, (x) =>
    ctx.front - 5 + (Math.abs(x + 0.5 - cx) < 0.7 ? -0.6 : 0));
  fillShape(c, cx - half - 2, base, cx + half + 1, base + 1, () => true, (x, y) => pick(P.stone, y === base ? 4 : 2));
  ctx.relief.rect(cx - half - 2, base, cx + half + 1, base + 1, ctx.front + 2);
  if (state === "boarded") {
    // Nailed shut against the soldiers: planks across the leaves, standing out from them.
    for (const [y, tilt] of [[base - height * 0.72, -2], [base - height * 0.45, 3], [base - height * 0.2, -1]]) {
      for (let x = Math.floor(cx - half - 1); x <= cx + half; x++) {
        const yy = Math.round(y + ((x - cx) / half) * tilt);
        for (let k = 0; k < 4; k++) {
          c.set(x, yy + k, pick(P.wood, k === 0 ? 4 : k === 3 ? 1 : 3));
          ctx.relief.set(x, yy + k, ctx.front + 1.5);
        }
      }
      c.set(Math.floor(cx - half + 2), Math.round(y) + 1, P.iron[4]);
      c.set(Math.floor(cx + half - 3), Math.round(y) + 1, P.iron[4]);
    }
  }
}

/** A door broken in by the soldiers: the doorway open on a dark room (on fire, near a fire), one leaf torn half off
 * its pins and hanging into the street, the other gone; splinters on the step. */
function brokenDoor(c, cx, base, width, height, seed, ctx) {
  const burning = ctx?.burning(cx);
  archway(c, cx, base, width + 6, height + 4, { ring: 3, ringTone: 4, interior: (x, y) => {
    const t = (y - (base - height)) / height;
    if (burning && t > 0.55) {
      const n = fbm(x * 0.25, y * 0.35, { seed: seed + 5 });
      return n > 0.6 ? P.fire[3] : n > 0.45 ? P.fire[2] : P.fire[1];
    }
    return t < 0.3 ? P.night[0] : (x + y) % 9 === 0 ? P.wood[0] : P.night[1];
  } });
  if (!ctx?.relief) return;
  const half = (width + 6) / 2;
  const rise = half * 0.9;
  const spring = base - (height + 4) + rise;
  const inner = (px, py) => inPointedArch(px, py, cx, spring, half, rise, base);
  const outer = (px, py) => inPointedArch(px, py, cx, spring, half + 3, rise + 3, base);
  ctx.relief.fill(cx - half - 4, base - height - 8, cx + half + 4, base, (px, py) => outer(px, py) && !inner(px, py),
    ctx.front + 1);
  ctx.relief.fill(cx - half, base - height - 4, cx + half, base, inner, ctx.front - 22);
  // The torn leaf: hanging from its lower pin, swung out over the step.
  const leafW = Math.floor(width / 2);
  for (let y = base - height + 14; y < base - 2; y++) {
    const swing = Math.floor((y - (base - height + 14)) * 0.18);
    for (let x = 0; x < leafW; x++) {
      const px = Math.floor(cx - half + 1 + x + swing);
      if (x === leafW - 1 && hash2(px, y, seed) < 0.5) continue;
      c.set(px, y, (y - base) % 18 === 0 ? P.wood[1] : pick(P.wood, 2 + (fbm(px * 0.3, y * 1.2, { seed }) > 0.6 ? 1 : 0)));
      ctx.relief.set(px, y, ctx.front - 2 + x * 0.12);
    }
  }
  // Splinters on the step.
  for (let k = 0; k < 6; k++) {
    const sx = Math.floor(cx - half + hash2(k, 1, seed) * width);
    c.set(sx, base - 1, P.wood[3]);
    c.set(sx + 1, base - 1, P.wood[2]);
  }
  fillShape(c, cx - half - 2, base, cx + half + 1, base + 1, () => true, (x, y) => pick(P.stone, y === base ? 4 : 2));
  ctx.relief.rect(cx - half - 2, base, cx + half + 1, base + 1, ctx.front + 2);
  if (burning) ctx.lamp(cx, base - 18, 70, 1.1);
}

function balcony(c, x, y, w, h, lit, ctx) {
  lattice(c, x, y, w, h, { ramp: P.wood, tone: 3, glow: lit ? (px, py) =>
    (hash2(px, py, 3) > 0.5 ? P.fire[3] : P.fire[2]) : null });
  beam(c, x - 3, y + h, w + 6, 4, { tone: 3 });
  for (let k = 0; k < 3; k++) {
    const bx = x + Math.floor((k + 0.5) * (w / 3));
    for (let d = 0; d < 7; d++) c.set(bx - Math.floor(d / 2), y + h + 4 + d, P.wood[2]);
  }
  fillShape(c, x - 2, y - 4, x + w + 1, y - 1, () => true, P.wood[4]);
  fillShape(c, x - 2, y - 1, x + w + 1, y - 1, () => true, P.wood[2]);
  if (!ctx?.relief) return;
  // A closed timber bay standing out on its brackets: it shades the wall under it, and a lit one lights it.
  ctx.relief.rect(x - 2, y - 4, x + w + 1, y + h - 1, ctx.front + 7);
  ctx.relief.rect(x - 3, y + h, x + w + 2, y + h + 3, ctx.front + 6);
  for (let k = 0; k < 3; k++) {
    const bx = x + Math.floor((k + 0.5) * (w / 3));
    for (let d = 0; d < 7; d++) ctx.relief.set(bx - Math.floor(d / 2), y + h + 4 + d, ctx.front + 5 - d * 0.6);
  }
  if (lit) ctx.lamp(x + w / 2, y + h / 2, 70, 0.8);
}

/** A black Abbasid banner hanging from a pole, torn at its foot, a gold crescent on its field. */
function banner(c, x, y, w, h, seed, ctx) {
  beam(c, x - 3, y - 2, w + 6, 2, { ramp: P.wood, tone: 2 });
  ctx?.relief?.rect(x - 3, y - 2, x + w + 2, y - 1, ctx.front + 3);
  for (let px = x; px < x + w; px++) {
    const tear = Math.floor(fbm(px * 0.4, 0, { seed }) * h * 0.45);
    for (let py = y; py < y + h - tear; py++) {
      const fold = Math.sin((px - x) * 0.9) > 0.6 ? 1 : 0;
      const trim = py === y || py === y + 2;
      c.set(px, py, trim ? P.gold[1] : pick([hex("#0b0a0c"), hex("#151317"), hex("#211d24")], fold + (px === x ? 1 : 0)));
      // The cloth hangs a little out from the wall, its folds rising and falling.
      ctx?.relief?.set(px, py, ctx.front + 2 + fold * 0.8);
    }
  }
  crescent(c, x + w / 2, y + Math.min(h * 0.32, 14), Math.max(3, Math.min(w, h) * 0.28));
}

/** A gold crescent, horns up and to the right. */
function crescent(c, cx, cy, r) {
  for (let py = Math.floor(cy - r); py <= cy + r; py++) {
    for (let px = Math.floor(cx - r); px <= cx + r; px++) {
      const outer = Math.hypot(px + 0.5 - cx, py + 0.5 - cy) <= r;
      const inner = Math.hypot(px + 0.5 - (cx + r * 0.42), py + 0.5 - (cy - r * 0.3)) <= r * 0.8;
      if (outer && !inner) c.set(px, py, py < cy - r * 0.2 ? P.gold[4] : P.gold[3]);
    }
  }
}

/** A timber boom jutting from a wall with a pulley, its rope dropping to a hanging cage or a load. */
function boom(c, x, y, length, dir, seed, { cage = true } = {}, ctx = null) {
  const end = x + dir * length;
  const relief = ctx?.relief;
  const front = ctx?.front ?? 0;
  beam(c, Math.min(x, end), y, length, 5, { tone: 2, seed });
  relief?.rect(Math.min(x, end), y, Math.max(x, end), y + 4, front + 4 + 4 * 0.5);
  // A brace under the boom.
  for (let d = 0; d < length * 0.5; d++) {
    c.set(x + dir * d, y + 5 + Math.floor((length * 0.5 - d) * 0.6), P.wood[2]);
    c.set(x + dir * d, y + 6 + Math.floor((length * 0.5 - d) * 0.6), P.wood[1]);
    relief?.set(x + dir * d, y + 5 + Math.floor((length * 0.5 - d) * 0.6), front + 2 + d * 0.15);
    relief?.set(x + dir * d, y + 6 + Math.floor((length * 0.5 - d) * 0.6), front + 2 + d * 0.15);
  }
  fillShape(c, end - 3, y + 5, end + 2, y + 9, () => true, P.iron[3]);
  relief?.rect(end - 3, y + 5, end + 2, y + 9, front + 7);
  const drop = 40 + Math.floor(hash2(seed, 2, 3) * 50);
  for (let d = 0; d < drop; d++) {
    c.set(end, y + 10 + d, d % 3 === 0 ? P.linen[1] : P.linen[0]);
    relief?.set(end, y + 10 + d, front + 8);
  }
  const top = y + 10 + drop;
  if (cage) {
    // A wooden cage: a frame of bars, dark inside, hanging well out from the wall.
    fillShape(c, end - 9, top, end + 9, top + 22, () => true, (px, py) =>
      (px === end - 9 || px === end + 9 || py === top || py === top + 22 || (px - end + 9) % 4 === 0)
        ? pick(P.wood, 3 + (py === top ? 1 : 0)) : P.night[0]);
    relief?.rect(end - 9, top, end + 9, top + 22, front + 10);
    for (const hx of [end - 8, end + 8]) for (let d = 0; d < 6; d++) {
      c.set(hx + (end - hx) * (d / 6), top - 6 + d, P.linen[1]);
      relief?.set(Math.round(hx + (end - hx) * (d / 6)), top - 6 + d, front + 9);
    }
  } else {
    beam(c, end - 8, top, 16, 10, { ramp: P.wood, tone: 3, seed: seed + 1 });
    relief?.rect(end - 8, top, end + 7, top + 9, front + 9);
  }
}

/** A patterned carpet thrown over a ledge to hang down the wall. */
function carpet(c, x, y, w, h, seed, ctx) {
  const field = hash2(seed, 1, 1) < 0.5 ? P.madder : P.indigo;
  for (let py = y; py < y + h; py++) {
    for (let px = x; px < x + w; px++) {
      const lx = px - x;
      const ly = py - y;
      const border = lx < 2 || lx >= w - 2 || ly < 2 || ly >= h - 2;
      const medallion = Math.abs(lx - w / 2) + Math.abs(ly - h / 2) < Math.min(w, h) * 0.3;
      const motif = (lx + ly) % 4 === 0;
      let color = border ? (ly % 2 ? P.saffron[2] : P.indigo[2]) : medallion ? (motif ? P.saffron[3] : P.madder[1])
        : pick(field, 2 + (motif ? 1 : 0));
      if (fbm(px * 0.2, py * 0.2, { seed }) > 0.72) color = mix(color, P.night[0], 0.4);
      c.set(px, py, color);
      // Thrown over the ledge, it hangs out from the wall and sags in its middle.
      ctx?.relief?.set(px, py, ctx.front + 1.5 + Math.sin((lx / w) * Math.PI) * 0.8);
    }
  }
  for (let px = x; px < x + w; px += 2) {
    c.set(px, y + h, P.linen[2]);
    ctx?.relief?.set(px, y + h, ctx.front + 1.5);
  }
}

/** A hanging brass lantern on a bracket, lit or dark. */
function lantern(c, x, y, lit, ctx = null) {
  for (let d = 0; d < 6; d++) c.set(x - 6 + d, y - 6, P.iron[2]);
  c.set(x, y - 5, P.iron[2]);
  fillShape(c, x - 2, y - 4, x + 2, y + 2, () => true, (px, py) =>
    (px === x - 2 || px === x + 2 || py === y - 4 || py === y + 2) ? P.bronze[2] : lit ? P.fire[5] : P.night[1]);
  if (ctx?.relief) {
    // On its bracket, out from the wall; a lit one is a light of the street (relief.mjs).
    ctx.relief.rect(x - 6, y - 6, x, y - 5, ctx.front + 4);
    ctx.relief.rect(x - 2, y - 4, x + 2, y + 2, ctx.front + 5);
    if (lit) ctx.lamp(x, y, 52, 0.75);
  } else if (lit) {
    glow(c, x, y, 16, P.fire[5], 0.4, { steps: 3 });
  }
}

/** A scaling ladder of lashed poles leaning on a wall, foot to top: its foot well out in the street, its top
 * against the wall (given a `relief`). */
function ladder(c, footX, footY, topY, relief = null, front = 0) {
  const lean = 26;
  for (const side of [-5, 5]) {
    for (let y = topY; y <= footY; y++) {
      const t = (y - topY) / (footY - topY);
      const x = Math.round(footX + side - lean * (1 - t));
      c.set(x, y, P.wood[3]);
      c.set(x + 1, y, P.wood[1]);
      relief?.set(x, y, front + 2 + t * 14);
      relief?.set(x + 1, y, front + 2 + t * 14);
    }
  }
  for (let y = topY + 6; y < footY; y += 11) {
    const t = (y - topY) / (footY - topY);
    const x = Math.round(footX - lean * (1 - t));
    for (let k = -5; k <= 5; k++) {
      c.set(x + k, y, P.wood[4]);
      relief?.set(x + k, y, front + 2 + t * 14);
    }
  }
}

/** A band of glazed tile: turquoise (or cobalt) ground with a running interlace. */
function tileBand(c, x0, x1, y0, h, { seed = 3, glaze = P.tile } = {}) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x <= x1; x++) {
      const ly = y - y0;
      const edge = ly === 0 || ly === h - 1;
      const motif = (x + ly) % 8 === 0 || (x - ly + 64) % 8 === 0;
      c.set(x, y, edge ? P.brick[5] : motif ? glaze[4] : hash2(x, y, seed) < 0.04 ? glaze[2] : glaze[1]);
    }
  }
}

/** Patterned brickwork (hazarbaf): bricks laid to make a lattice of small crosses. Given a `relief`, the crosses
 * stand proud and the insets and joints sink, so a grazing light draws the pattern. */
function patternedBrick(c, x0, y0, w, h, { tone = 4, seed = 5, relief = null, depth = 0 } = {}) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const lx = x - x0;
      const ly = y - y0;
      const cell = 12;
      const u = lx % cell;
      const v = ly % cell;
      const cross = (u >= 5 && u <= 6) || (v >= 5 && v <= 6);
      const inset = Math.abs(u - 5.5) <= 1.5 && Math.abs(v - 5.5) <= 1.5;
      const mortar = ly % 4 === 0;
      let k = tone + (cross ? 1 : -1) + (inset ? 1 : 0);
      if (mortar && !cross) k -= 1;
      if (hash2(x >> 2, y >> 2, seed) < 0.05) k -= 1;
      c.set(x, y, pick(P.brick, k));
      relief?.set(x, y, depth + (cross ? 0.7 : 0) + (inset ? -0.9 : 0) + (mortar && !cross ? -0.6 : 0));
    }
  }
}

/** A muqarnas hood filling a pointed arch: rows of small niches stepping out toward the apex. Given a `relief`,
 * each niche is a hollow under its lit lip and each row stands out from the one below, from `depth`. */
function muqarnasHood(c, cx, spring, half, rise, { ramp = P.plaster, tone = 4, rows = 5, relief = null, depth = 0 } = {}) {
  const top = spring - rise;
  const inside = (px, py) => inPointedArch(px, py, cx, spring, half, rise, spring + 1);
  fillShape(c, cx - half, top, cx + half, spring, inside, (x, y) => {
    const t = (y - top) / rise;
    const row = Math.floor(t * rows);
    const cellW = 6 + row * 1.5;
    const u = ((x - cx + 200 + (row % 2) * cellW * 0.5) % cellW) / cellW;
    const v = (t * rows) % 1;
    // Each niche: a dark hollow under a lit lip.
    const step = depth + (rows - row) * 0.9;
    if (v < 0.22) {
      relief?.set(x, y, step + 0.6);
      return pick(ramp, tone + 1);
    }
    if (u > 0.2 && u < 0.8 && v > 0.4) {
      relief?.set(x, y, step - 2.6);
      return pick(ramp, tone - 2 - (v > 0.75 ? 1 : 0));
    }
    relief?.set(x, y, step);
    return pick(ramp, tone - (u < 0.2 ? 1 : 0));
  });
}

/** The relief of an archway drawn by archway(): its ring `ringOut` proud of `front`, its opening `recess` deep (a
 * value or a function of (x, y)). */
function archRelief(relief, cx, base, width, height, { ring = 2, front = 0, ringOut = 1, recess = -6 } = {}) {
  const half = width / 2;
  const rise = half * 0.9;
  const spring = base - height + rise;
  const inner = (px, py) => inPointedArch(px, py, cx, spring, half, rise, base);
  relief.fill(cx - half - ring - 1, base - height - ring - 1, cx + half + ring + 1, base, (px, py) =>
    inPointedArch(px, py, cx, spring, half + ring, rise + ring, base) && !inner(px, py), front + ringOut);
  relief.fill(cx - half, base - height, cx + half, base, inner, typeof recess === "function"
    ? (x, y) => front + recess(x, y) : front + recess);
}

// --- Roofs ----------------------------------------------------------------------------------------

/**
 * The top of a house or a shop: not one crenellation on every roof (it read as a row of teeth) but what Baghdad's
 * roofs had. A parapet with its coping, standing out from the wall; on some a run of stepped merlons (shurafat);
 * on the roof a timber shelter for sleeping out in the heat, water jars, a pole with a cloth hung out, the drain
 * spouts; and where the fire has been, the top broken away with charred joists jutting from the break.
 */
function roofline(c, x0, x1, top, ramp, tone, seed, ctx) {
  const r = rng(seed + 31);
  const front = ctx.front;
  const relief = ctx.relief;
  const width = x1 - x0 + 1;
  const burnt = ctx.burning((x0 + x1) / 2);
  const kind = burnt && r() < 0.7 ? "broken" : r() < 0.15 ? "stepped" : "plain";
  if (kind === "broken") {
    // The fire took the roof: the wall's top is gnawed away in a ragged line, charred joist ends jut from it.
    const from = x0 + Math.floor(width * (0.1 + r() * 0.3));
    const to = Math.min(x1, from + Math.floor(width * (0.35 + r() * 0.3)));
    for (let x = from; x <= to; x++) {
      const t = (x - from) / Math.max(1, to - from);
      const bite = Math.floor(Math.sin(t * Math.PI) * (14 + r() * 2) + (fbm(x * 0.3, 0, { seed }) - 0.5) * 8);
      for (let y = top - 6; y < top + Math.max(0, bite); y++) c.set(x, y, [0, 0, 0, 0]);
      // The broken edge, charred.
      const edge = top + Math.max(0, bite);
      for (let y = edge; y < edge + 3; y++) {
        if (c.alpha(x, y) > 0) c.set(x, y, mix(c.get(x, y), P.night[0], 0.6 - (y - edge) * 0.15));
      }
    }
    for (let jx = from + 4; jx < to - 2; jx += 9 + Math.floor(r() * 5)) {
      const jy = top + 6 + Math.floor(r() * 6);
      const len = 5 + Math.floor(r() * 7);
      fillShape(c, jx, jy - len, jx + 2, jy, () => true, (px, py) => pick(P.wood, py < jy - len + 2 ? 0 : 1));
      relief.rect(jx, jy - len, jx + 2, jy, front + 3);
      if (r() < 0.4) c.set(jx + 1, jy - len, P.fire[3]);
    }
    // The coping still stands where the fire left it.
    for (const [a, b] of [[x0, from - 1], [to + 1, x1]]) if (b > a) coping(c, a, b, top, ramp, tone, relief, front);
    return;
  }
  coping(c, x0, x1, top, ramp, tone, relief, front);
  if (kind === "stepped") {
    shurafat(c, x0, x1, top, ramp, tone, relief, front);
    return;
  }
  // A plain parapet; on the roof behind it, what people kept there.
  const furniture = r();
  if (furniture < 0.32 && width > 80) {
    // A timber shelter: four posts and a slatted roof, for sleeping out in the summer's heat.
    const sx = x0 + 8 + Math.floor(r() * (width - 70));
    const sw = 40 + Math.floor(r() * 18);
    const sh = 22 + Math.floor(r() * 6);
    for (const px of [sx, sx + Math.floor(sw / 2), sx + sw]) {
      fillShape(c, px, top - sh, px + 1, top - 4, () => true, (x) => pick(P.wood, x === px ? 3 : 1));
      relief.rect(px, top - sh, px + 1, top - 4, front - 6);
    }
    for (let x = sx - 3; x <= sx + sw + 3; x++) {
      const sag = Math.floor(Math.sin(((x - sx + 3) / (sw + 6)) * Math.PI) * 2);
      for (let y = top - sh - 3 + sag; y <= top - sh + sag; y++) {
        const slat = (x - sx) % 4 === 0;
        c.set(x, y, pick(P.wood, y === top - sh - 3 + sag ? 4 : slat ? 1 : 3));
        relief.set(x, y, front - 5);
      }
    }
    // A mat or a cloth thrown over its side.
    if (r() < 0.6) {
      const cloth = r() < 0.5 ? P.madder : P.indigo;
      for (let x = sx + sw - 12; x < sx + sw - 2; x++) {
        const hang = 8 + Math.floor(fbm(x * 0.5, 0, { seed: seed + 3 }) * 6);
        for (let y = top - sh + 1; y < top - sh + 1 + hang; y++) {
          c.set(x, y, pick(cloth, 2 + ((x + y) % 5 === 0 ? 1 : 0) - (y > top - sh + hang - 2 ? 1 : 0)));
          relief.set(x, y, front - 4);
        }
      }
    }
  } else if (furniture < 0.55) {
    // Water jars at the parapet, cooling in the night air.
    let jx = x0 + 6 + Math.floor(r() * (width - 40));
    for (let k = 0; k < 2 + Math.floor(r() * 3); k++) {
      const jh = 7 + Math.floor(r() * 3);
      fillShape(c, jx, top - 3 - jh, jx + 6, top - 4, (px, py) => {
        const t = (top - 4 - py) / jh;
        return Math.abs(px - (jx + 3)) <= 3 * (t > 0.85 ? 0.45 : Math.sin(Math.min(1, t * 1.1) * Math.PI) * 0.6 + 0.4);
      }, (px) => pick(P.brick, px < jx + 3 ? 5 : 4));
      relief.rect(jx, top - 3 - jh, jx + 6, top - 4, front - 3);
      jx += 9 + Math.floor(r() * 4);
    }
  } else if (furniture < 0.62 && width > 70) {
    // A line strung between two poles, cloths hung on it to dry, left where they were when the city fell.
    const px = x0 + 8 + Math.floor(r() * (width - 60));
    const span = 34 + Math.floor(r() * 16);
    const ph = 24 + Math.floor(r() * 8);
    for (const x of [px, px + span]) {
      fillShape(c, x, top - ph, x + 1, top - 3, () => true, (xx) => pick(P.wood, xx === x ? 3 : 1));
      relief.rect(x, top - ph, x + 1, top - 3, front - 3);
    }
    const sagAt = (x) => top - ph + 2 + Math.floor(Math.sin(((x - px) / span) * Math.PI) * 4);
    for (let x = px + 2; x < px + span; x++) {
      c.set(x, sagAt(x), P.linen[1]);
      relief.set(x, sagAt(x), front - 2);
    }
    let x = px + 3;
    while (x < px + span - 6) {
      const cw = 6 + Math.floor(r() * 6);
      const cloth = [P.linen, P.madder, P.indigo, P.saffron][Math.floor(r() * 4)];
      const hang = 8 + Math.floor(r() * 8);
      for (let cx = x; cx < Math.min(x + cw, px + span - 2); cx++) {
        const y0 = sagAt(cx) + 1;
        const tear = Math.floor(fbm(cx * 0.6, 2, { seed: seed + 7 }) * 4);
        for (let y = y0; y < y0 + hang - tear; y++) {
          c.set(cx, y, pick(cloth, 2 + (cx === x ? 1 : 0) - ((cx - x) % 4 === 3 ? 1 : 0)));
          relief.set(cx, y, front - 1);
        }
      }
      x += cw + 2 + Math.floor(r() * 3);
    }
  }
  // Drain spouts through the parapet, a short timber channel each.
  for (let x = x0 + 14 + Math.floor(r() * 10); x < x1 - 10; x += 38 + Math.floor(r() * 24)) {
    fillShape(c, x, top + 4, x + 2, top + 6, () => true, (px, py) => pick(P.wood, py === top + 4 ? 3 : 1));
    relief.rect(x, top + 4, x + 2, top + 6, front + 6);
  }
}

/** Shurafat: stepped merlons, broad and low, a gap between each, crowning a coping. */
function shurafat(c, x0, x1, top, ramp, tone, relief, front) {
  for (let x = x0 + 4; x <= x1 - 12; x += 20) {
    for (let step = 0; step < 2; step++) {
      const y = top - 3 - step * 3;
      fillShape(c, x + step * 3, y - 2, x + 11 - step * 3, y, () => true, (px, py) =>
        pick(ramp, tone + (py === y - 2 ? 2 : 1)));
      relief.rect(x + step * 3, y - 2, x + 11 - step * 3, y, front + 2);
    }
  }
}

/** A parapet's coping: a band standing out from the wall, lit on its top, its underside in shadow. */
function coping(c, x0, x1, top, ramp, tone, relief, front) {
  fillShape(c, x0, top - 2, x1, top + 2, () => true, (x, y) => pick(ramp, tone + (y === top - 2 ? 2 : y === top + 2 ? -1 : 1)));
  relief.rect(x0, top - 2, x1, top + 1, front + 2.5);
  relief.rect(x0, top + 2, x1, top + 2, front + 1.5);
}

// --- Buildings ------------------------------------------------------------------------------------

function building(c, x0, width, ground, kind, seed, ctx) {
  const special = SPECIAL[kind];
  if (special) {
    special(c, x0, width, ground, seed, ctx);
    return;
  }
  const r = rng(seed);
  const fullHeight = kind === "khan" || kind === "madrasa" ? 252 : kind === "wall" ? 300 : kind === "mosque" ? 210
    : kind === "library" ? 236 : 190 + Math.floor(r() * 80);
  // Where the level shows its painted city, the street's buildings stand lower (and only now and
  // then rise to a second storey), so the city reads above them.
  const low = ctx.scale < 1 && !(kind === "khan" || kind === "madrasa" || kind === "library") && r() > 0.22;
  const height = low ? Math.round(118 + r() * 34) : Math.round(fullHeight * (ctx.scale < 1 ? 0.9 : 1));
  const top = ground - height;
  const usePlaster = (kind === "houses" || kind === "books" || kind === "madrasa" || kind === "library")
    ? r() < 0.55 : r() < 0.3;
  const ramp = usePlaster ? P.plaster : P.brick;
  const tone = 3;
  // Each house stands a little forward of or back from its neighbours (a street is not a ruler): the joints
  // between them fall into shadow.
  ctx.front = Math.round((r() - 0.5) * 6);
  const relief = ctx.relief;
  if (usePlaster) {
    // Plaster that the fire and the years have stripped in places, showing the brick behind.
    plasterWall(c, x0, top, width, height, { base: tone, seed, relief, depth: ctx.front,
      fallen: ctx.burning(x0 + width / 2) ? 0.3 : 0.16 });
  } else {
    brickWall(c, x0, top, width, height, { base: tone, seed, soot: ctx.soot(x0, width), sootFrom: "top", light: 1,
      relief, depth: ctx.front });
  }
  // A plinth of cut stone along the street, a little proud of the wall.
  brickWall(c, x0, ground - 12, width, 12, { ramp: P.stone, base: 3, seed: seed + 1, brickW: 14, brickH: 6, relief,
    depth: ctx.front + 1.5, damage: 0.08 });
  fillShape(c, x0, ground - 13, x0 + width - 1, ground - 13, () => true, pick(P.stone, 4));
  relief.rect(x0, ground - 13, x0 + width - 1, ground - 13, ctx.front + 2);
  fillShape(c, x0, top, x0, ground, () => true, pick(ramp, tone + 1));
  fillShape(c, x0 + width - 1, top, x0 + width - 1, ground, () => true, pick(ramp, tone - 1));
  if (kind === "houses" || kind === "potters" || kind === "spices" || kind === "books") {
    roofline(c, x0, x0 + width - 1, top, ramp, tone, seed, ctx);
  } else if (kind === "wall") {
    // A city wall keeps its square merlons.
    crenels(c, x0, x0 + width - 1, top, ramp, tone, { size: 10, gap: 7, relief, front: ctx.front });
  } else {
    // The college, the khan, the library and the mosque: a coping crowned with stepped merlons all along.
    coping(c, x0, x0 + width - 1, top, ramp, tone, relief, ctx.front);
    shurafat(c, x0, x0 + width - 1, top, ramp, tone, relief, ctx.front);
  }
  // Roof furniture: a windcatcher or a small dome now and then.
  if (kind !== "wall" && r() < 0.35) {
    const wx = x0 + 12 + Math.floor(r() * (width - 36));
    brickWall(c, wx, top - 34, 14, 34, { base: 3, seed: seed + 9, relief, depth: ctx.front - 8 });
    fillShape(c, wx + 3, top - 28, wx + 10, top - 12, () => true, P.night[0]);
    relief.rect(wx + 3, top - 28, wx + 10, top - 12, ctx.front - 14);
    fillShape(c, wx - 2, top - 37, wx + 15, top - 34, () => true, pick(P.brick, 4));
    relief.rect(wx - 2, top - 37, wx + 15, top - 34, ctx.front - 6);
  } else if (kind === "mosque" || ((kind === "books" || kind === "madrasa") && r() < 0.25)) {
    dome(c, x0 + width * 0.6, top - 2, 26, { ramp: P.tile, tone: 2, shape: "pointed", ribs: 6, light: -0.4, relief,
      depth: ctx.front - 14 });
  }
  if (kind === "madrasa" || kind === "library") {
    tileBand(c, x0 + 2, x0 + width - 3, top + 10, 6, { seed, glaze: COBALT });
    relief.rect(x0 + 2, top + 10, x0 + width - 3, top + 15, ctx.front + 1);
  }
  if (kind !== "wall" && height >= STOREY + 56) {
    // Upper storey: a cornice between the floors, the joists' ends showing under it.
    const floorLine = ground - (kind === "library" ? 156 : STOREY);
    fillShape(c, x0, floorLine - 2, x0 + width - 1, floorLine, () => true, pick(ramp, tone + 1));
    fillShape(c, x0, floorLine + 1, x0 + width - 1, floorLine + 1, () => true, pick(ramp, tone - 1));
    relief.rect(x0, floorLine - 2, x0 + width - 1, floorLine, ctx.front + 2.5);
    for (let jx = x0 + 6; jx < x0 + width - 4; jx += 14) {
      fillShape(c, jx, floorLine + 2, jx + 2, floorLine + 4, () => true, P.wood[2]);
      relief.rect(jx, floorLine + 2, jx + 2, floorLine + 4, ctx.front + 4);
    }
    const upperBase = floorLine - 18;
    if (kind === "khan" || kind === "madrasa") {
      // The gallery is drawn with the arcade below.
    } else if (r() < 0.6 && width >= 90) {
      const bw = Math.floor(width * 0.42);
      balcony(c, x0 + Math.floor((width - bw) / 2), upperBase - 46, bw, 36, r() < 0.45, ctx);
    } else {
      const count = Math.max(1, Math.floor(width / 48));
      for (let k = 0; k < count; k++) {
        const wx = x0 + Math.floor(((k + 0.5) / count) * width);
        const lit = r() < 0.3;
        archway(c, wx, upperBase, 12, 28, { ring: 2, ringTone: 4, interior: (x, y) =>
          (lit ? (hash2(x, y, 5) > 0.5 ? P.fire[3] : P.fire[2]) : (x + y) % 3 === 0 ? P.wood[1] : P.night[0]) });
        // A window is a deep opening: its shutters or its light stand back in the wall's thickness.
        relief.fill(wx - 8, upperBase - 32, wx + 8, upperBase, (px, py) =>
          inPointedArch(px, py, wx, upperBase - 28 + 6 * 0.9, 6, 6 * 0.9, upperBase), ctx.front - 6);
        sill(c, wx - 8, wx + 7, upperBase, relief, ctx.front);
        if (lit) ctx.lamp(wx, upperBase - 12, 46, 0.6);
      }
    }
    if (r() < 0.22 && kind !== "madrasa") banner(c, x0 + 10 + Math.floor(r() * (width - 40)), floorLine - 64, 16, 44, seed, ctx);
  }
  // Ground floor by kind.
  if (["potters", "spices", "books", "khan", "madrasa", "library"].includes(kind)) {
    const tall = kind === "library";
    const bay = kind === "khan" || kind === "madrasa" ? 58 : tall ? 62 : 54 + Math.floor(r() * 10);
    const count = Math.max(1, Math.floor((width - 8) / bay));
    const margin = (width - count * bay) / 2;
    const archH = tall ? 132 : 92;
    for (let k = 0; k < count; k++) {
      const cx = x0 + margin + (k + 0.5) * bay;
      const burnt = ctx.burning(cx) && r() < 0.65;
      archway(c, cx, ground - 8, bay - 12, archH, { ring: 4, ringTone: 4, interior: () => P.night[0] });
      const theme = kind === "khan" ? "cloth" : kind === "madrasa" ? "books" : kind === "library" ? "books" : kind;
      const shelves = tall ? [ground - 26, ground - 46, ground - 66, ground - 86, ground - 106] : null;
      if (kind === "madrasa" && !burnt) {
        // A student's cell: a lamp, a low desk, a few books.
        fillShape(c, cx - 8, ground - 18, cx + 8, ground - 16, () => true, P.wood[3]);
        shopInterior(c, cx, ground - 8, bay - 12, archH, "books", seed * 13 + k, { shelves: [ground - 52] });
        if (r() < 0.4) lantern(c, Math.floor(cx), ground - 72, true, ctx);
      } else {
        shopInterior(c, cx, ground - 8, bay - 12, archH, theme, seed * 13 + k, { burnt, shelves });
      }
      // The shop is a deep vault: its back wall far in, its shelves and goods standing out from it, the arch's
      // ring a pixel proud of the wall.
      const half = (bay - 12) / 2;
      const rise = half * 0.9;
      const spring = ground - 8 - archH + rise;
      const inside = (px, py) => inPointedArch(px, py, cx, spring, half, rise, ground - 8);
      relief.fill(cx - half - 5, ground - 8 - archH - 5, cx + half + 5, ground - 8, (px, py) =>
        inPointedArch(px, py, cx, spring, half + 4, rise + 4, ground - 8) && !inside(px, py), ctx.front + 1);
      relief.fill(cx - half, ground - 8 - archH, cx + half, ground - 8, inside, (x, y) => {
        const back = ctx.front - 16;
        // Shelves and what stands on them come out from the back wall.
        const rgb = c.get(x, y);
        const dark = rgb[0] + rgb[1] + rgb[2] < 40;
        return dark ? back : back + 5;
      });
      if (tall && !burnt && r() < 0.6) {
        // A library ladder against the shelves.
        const lx = Math.floor(cx - bay / 2 + 12 + r() * (bay - 30));
        for (let y = ground - 112; y < ground - 8; y++) {
          c.set(lx, y, P.wood[4]);
          c.set(lx + 6, y, P.wood[4]);
          relief.set(lx, y, ctx.front - 8);
          relief.set(lx + 6, y, ctx.front - 8);
          if ((y - ground) % 7 === 0) {
            fillShape(c, lx, y, lx + 6, y, () => true, P.wood[3]);
            relief.rect(lx, y, lx + 6, y, ctx.front - 8);
          }
        }
      }
      if ((kind === "madrasa" || kind === "library") && k < count - 1) {
        // Glazed tile in the spandrels between the arches.
        const sx = Math.floor(cx + bay / 2);
        for (let y = ground - 8 - archH - 6; y < ground - 8 - archH * 0.55; y++) {
          for (let x = sx - 3; x <= sx + 3; x++) c.set(x, y, (x + y) % 3 === 0 ? COBALT[5] : COBALT[2]);
        }
      }
      if (!["khan", "madrasa", "library"].includes(kind) && !burnt && r() < 0.75) {
        const colors = r() < 0.4 ? [P.awning, P.linen] : r() < 0.5 ? [P.awningAlt, P.linen] : [P.saffron, P.madder];
        awning(c, Math.floor(cx - bay / 2 + 1), ground - 112, bay - 2, 22, { colors, stripe: 5,
          torn: r() < 0.4 ? 0.5 : 0, seed: seed + k, relief, out: [ctx.front + 2, ctx.front + 15] });
      }
      if (r() < 0.3) lantern(c, Math.floor(cx + bay / 2 - 2), ground - (tall ? 136 : 96), r() < 0.5, ctx);
    }
    if (kind === "khan" || kind === "madrasa") {
      for (let k = 0; k < count; k++) {
        const cx = x0 + margin + (k + 0.5) * bay;
        archway(c, cx, ground - STOREY - 22, bay - 18, 66, { ring: 3, ringTone: 4, interior: (x, y) =>
          (y > ground - STOREY - 40 ? P.wood[1] : P.night[0]) });
        const half = (bay - 18) / 2;
        relief.fill(cx - half, ground - STOREY - 22 - 66, cx + half, ground - STOREY - 22, (px, py) =>
          inPointedArch(px, py, cx, ground - STOREY - 22 - 66 + half * 0.9, half, half * 0.9, ground - STOREY - 22),
          ctx.front - 12);
        // A timber railing along the gallery.
        fillShape(c, cx - bay / 2, ground - STOREY - 36, cx + bay / 2, ground - STOREY - 35, () => true, P.wood[3]);
        relief.rect(cx - bay / 2, ground - STOREY - 36, cx + bay / 2, ground - STOREY - 35, ctx.front - 2);
        for (let px = Math.floor(cx - bay / 2); px < cx + bay / 2; px += 4) {
          fillShape(c, px, ground - STOREY - 34, px, ground - STOREY - 23, () => true, P.wood[2]);
          relief.rect(px, ground - STOREY - 34, px, ground - STOREY - 23, ctx.front - 2);
        }
      }
    }
  } else if (kind === "houses") {
    const dx = x0 + Math.floor(width * (0.3 + r() * 0.4));
    // The sack has been down this street: doors broken in, most of all near the fires; some nailed shut.
    const roll = r();
    const state = roll < (ctx.burning(dx) ? 0.55 : 0.25) ? "broken" : roll > 0.84 ? "boarded" : "shut";
    door(c, dx, ground - 10, 30, 82, seed, ctx, state);
    if (ctx.cranes && r() < 0.45) boom(c, r() < 0.5 ? x0 + 6 : x0 + width - 6, top + 40, 34 + Math.floor(r() * 20),
      r() < 0.5 ? 1 : -1, seed + 7, { cage: r() < 0.6 }, ctx);
    if (ctx.carpets && r() < 0.4) carpet(c, x0 + 14 + Math.floor(r() * (width - 50)), ground - STOREY - 4, 22, 36, seed + 8, ctx);
    for (let k = 0; k < 2; k++) {
      // A barred window, deep in the wall, on a stone sill; soot climbs from it where the fire has been.
      const wx = x0 + 10 + Math.floor(r() * (width - 30));
      if (Math.abs(wx + 5 - dx) < 26) continue;
      fillShape(c, wx, ground - 78, wx + 9, ground - 66, () => true, P.night[0]);
      relief.rect(wx, ground - 78, wx + 9, ground - 66, ctx.front - 5);
      for (let b = 1; b < 10; b += 2) {
        fillShape(c, wx + b, ground - 78, wx + b, ground - 66, () => true, P.iron[2]);
        relief.rect(wx + b, ground - 78, wx + b, ground - 66, ctx.front - 2);
      }
      sill(c, wx - 2, wx + 11, ground - 65, relief, ctx.front);
      if (ctx.burning(wx)) soot(c, wx - 3, wx + 12, ground - 79, 30, seed + k);
    }
    if (r() < 0.5) lantern(c, x0 + width - 14, ground - 104, true, ctx);
  } else if (kind === "mosque") {
    for (let x = x0 + 4; x < x0 + width - 4; x++) {
      for (let y = ground - 150; y < ground - 134; y++) {
        const motif = (x + y) % 8 === 0 || (x - y) % 8 === 0;
        c.set(x, y, motif ? P.tile[4] : P.tile[1]);
      }
    }
    relief.rect(x0 + 4, ground - 150, x0 + width - 5, ground - 135, ctx.front + 1);
    archway(c, x0 + width / 2, ground - 10, 46, 104, { ring: 5, ringTone: 4,
      interior: (x, y) => ((x + y) % 5 === 0 && y < ground - 70 ? P.tile[2] : P.night[0]) });
    relief.fill(x0 + width / 2 - 23, ground - 114, x0 + width / 2 + 23, ground - 10, (px, py) =>
      inPointedArch(px, py, x0 + width / 2, ground - 114 + 23 * 0.9, 23, 23 * 0.9, ground - 10), ctx.front - 14);
  } else if (kind === "wall") {
    for (let bx = x0 + 24; bx < x0 + width - 20; bx += 72) {
      brickWall(c, bx, top + 24, 18, height - 24, { base: 4, seed: bx, brickW: 6, light: 1, relief, depth: ctx.front + 6 });
      fillShape(c, bx + 8, top + 70, bx + 9, top + 86, () => true, P.night[0]);
      relief.rect(bx + 8, top + 70, bx + 9, top + 86, ctx.front - 4);
    }
    // The siege: Mongol scaling ladders still leaning where the wall was taken, and a breach
    // patched with rubble.
    for (const lx of [x0 + 90, x0 + 330, x0 + 560]) {
      if (lx > x0 + width - 40) continue;
      ladder(c, lx, ground - 6, top + 40, relief, ctx.front);
    }
    for (let x = x0 + 180; x < x0 + 260 && x < x0 + width; x++) {
      const crack = Math.floor(fbm(x * 0.08, 0, { seed: 77 }) * 40);
      for (let y = top + 6; y < top + 46 + crack; y++) {
        const rubble = y > top + 40 + crack - 4;
        c.set(x, y, rubble ? P.brick[1] : P.night[0]);
        // The breach goes deep into the wall; its patch of rubble stands at its foot.
        relief.set(x, y, ctx.front + (rubble ? -3 : -14));
      }
    }
  }
}

/** A stone sill under a window, standing out from the wall: lit on top, shadowing the wall below. */
function sill(c, x0, x1, y, relief, front) {
  fillShape(c, x0, y, x1, y + 1, () => true, (x, yy) => pick(P.stone, yy === y ? 5 : 2));
  relief.rect(x0, y, x1, y + 1, front + 2.5);
}

/** Soot climbing the wall from an opening the fire has gone through: dark tongues, densest at the opening. Given a
 * `width` instead of an end, a broad plume that far across from x0. */
function soot(c, x0, x1, base, height, seed, width = 0) {
  if (width > 0) x1 = x0 + width;
  for (let x = x0; x <= x1; x++) {
    const reach = height * (0.45 + fbm(x * 0.25, 0, { seed }) * 0.75);
    for (let y = base; y > base - reach; y--) {
      if (c.alpha(x, y) === 0) continue;
      const t = (base - y) / reach;
      c.set(x, y, mix(c.get(x, y), P.night[0], 0.55 * (1 - t)));
    }
  }
}

/** A house gutted by fire: broken walls open to the sky, charred joists and embers in the rubble. */
function ruin(c, x0, width, ground, seed, ctx) {
  ctx.front = 0;
  const relief = ctx.relief;
  const r = rng(seed);
  const height = Math.round((150 + Math.floor(r() * 90)) * (ctx.scale < 1 ? 0.78 : 1));
  const top = ground - height;
  // What stood behind (the next street's houses, or the sky) shows again above the broken walls, at its own depth.
  const behind = c.crop(x0, 0, width, ground);
  const behindDepth = relief.copy(x0, 0, width, ground);
  const plaster = r() < 0.5;
  if (plaster) plasterWall(c, x0, top, width, height, { base: 3, seed, stain: 0.9, relief, fallen: 0.32 });
  else brickWall(c, x0, top, width, height, { base: 3, seed, soot: 1.2, sootFrom: "top", light: 1, damage: 0.1, relief });
  // The broken top edge, lowest where the roof fell in.
  const dip = x0 + width * (0.3 + r() * 0.4);
  for (let x = x0; x < x0 + width; x++) {
    const toward = 1 - Math.min(1, Math.abs(x - dip) / (width * 0.45));
    const jag = Math.floor(fbm(x * 0.05, 0, { seed: seed + 3 }) * 34 + toward * 70 + (hash2(x >> 2, 1, seed) < 0.25 ? 6 : 0));
    const edgeFall = Math.max(0, 14 - Math.min(x - x0, x0 + width - 1 - x)) * 2;
    const cut = top + jag + edgeFall;
    for (let y = top - 1; y < cut; y++) {
      c.set(x, y, behind.get(x - x0, y));
      relief.set(x, y, behindDepth(x - x0, y));
    }
    c.set(x, cut, pick(plaster ? P.plaster : P.brick, 1));
    relief.set(x, cut, 1);
  }
  // The gutted interior behind the fallen front: the charred back wall, seen deep through it.
  const ix0 = x0 + 10;
  const ix1 = x0 + width - 11;
  for (let y = ground - STOREY - 40; y < ground - 10; y++) {
    for (let x = ix0; x <= ix1; x++) {
      if (c.alpha(x, y) === 0) continue;
      const n = fbm(x * 0.09, y * 0.09, { seed: seed + 5 });
      const charred = n > 0.55 ? P.wood[0] : n > 0.42 ? P.night[1] : P.night[2];
      c.set(x, y, mix(c.get(x, y), charred, 0.82));
      relief.set(x, y, -18);
    }
  }
  archway(c, x0 + width * 0.5, ground - 10, 28, 70, { ring: 2, ringTone: 2, interior: (x, y) =>
    (fbm(x * 0.3, y * 0.3, { seed }) > 0.7 ? P.fire[1] : P.night[0]) });
  archRelief(relief, x0 + width * 0.5, ground - 10, 28, 70, { ring: 2, front: -18, ringOut: 1, recess: -10 });
  // Joists of the fallen floor: some still spanning, some snapped and hanging.
  const floor = ground - STOREY;
  for (let jx = ix0 + 4; jx < ix1 - 6; jx += 22) {
    if (c.alpha(jx, floor) === 0) continue;
    const snapped = hash2(jx, 2, seed) < 0.5;
    if (snapped) {
      for (let d = 0; d < 26; d++) {
        const y = floor + Math.floor(d * 0.7);
        c.set(jx + d * 0.6, y, P.wood[1]);
        c.set(jx + d * 0.6, y + 1, P.wood[0]);
        relief.set(Math.round(jx + d * 0.6), y, -12 + d * 0.2);
        relief.set(Math.round(jx + d * 0.6), y + 1, -12 + d * 0.2);
      }
    } else {
      beam(c, jx - 6, floor - 2, 16, 4, { ramp: P.wood, tone: 1, seed: jx });
      relief.rect(jx - 6, floor - 2, jx + 9, floor + 1, -12);
    }
  }
  // Embers and smouldering rubble heaped at the foot.
  for (let x = ix0; x <= ix1; x++) {
    const h = Math.floor(fbm(x * 0.07, 3, { seed }) * 12) + 2;
    for (let y = ground - 10 - h; y < ground - 10; y++) {
      const ember = hash2(x, y, seed) < 0.06;
      c.set(x, y, ember ? (hash2(x, y, seed + 1) < 0.5 ? P.fire[3] : P.fire[2]) : pick(P.brick, 1 + (y % 3 === 0 ? 1 : 0)));
      relief.set(x, y, -12 + (y - (ground - 10 - h)) * 0.5);
    }
  }
  brickWall(c, x0, ground - 12, width, 12, { ramp: P.stone, base: 3, seed: seed + 1, brickW: 14, brickH: 6, relief,
    depth: 1.5, damage: 0.15 });
  if (ctx.cranes && r() < 0.5) boom(c, x0 + width - 8, top + 60, 30 + Math.floor(r() * 16), 1, seed + 5, { cage: r() < 0.5 }, ctx);
  // The embers' own dull light.
  if (ctx.burning(x0 + width / 2)) ctx.lamp(x0 + width / 2, ground - 22, 80, 0.8);
}

/** A bathhouse: a long, low plastered hall under small domes pierced with glass, its furnace
 * chimney and a tiled door. */
function hammam(c, x0, width, ground, seed, ctx) {
  ctx.front = 0;
  const relief = ctx.relief;
  const r = rng(seed);
  const height = 142;
  const top = ground - height;
  plasterWall(c, x0, top, width, height, { base: 3, seed, stain: 0.6, relief, fallen: ctx.burning(x0 + width / 2) ? 0.22 : 0.1 });
  brickWall(c, x0, ground - 12, width, 12, { ramp: P.stone, base: 3, seed: seed + 1, brickW: 14, brickH: 6, relief, depth: 1.5 });
  fillShape(c, x0, top, x0, ground, () => true, P.plaster[4]);
  fillShape(c, x0 + width - 1, top, x0 + width - 1, ground, () => true, P.plaster[2]);
  coping(c, x0, x0 + width - 1, top, P.plaster, 3, relief, 0);
  // Domes over the hot rooms, set back on the roof, each pierced with little glass lights.
  const count = Math.max(2, Math.floor(width / 70));
  for (let k = 0; k < count; k++) {
    const cx = x0 + (k + 0.5) * (width / count);
    const rad = 18 + Math.floor(r() * 8);
    dome(c, cx, top - 1, rad, { ramp: P.plaster, tone: 3, shape: "round", light: -0.4, finial: false, relief, depth: -10 });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI;
      const px = cx + Math.cos(a) * rad * 0.55;
      const py = top - 1 - Math.sin(a) * rad * 0.55;
      c.set(px, py, P.fire[4]);
    }
  }
  // The furnace chimney, back on the roof, with its smoke.
  const fx = x0 + width - 30;
  brickWall(c, fx, top - 44, 12, 44, { base: 3, seed: seed + 4, soot: 1.4, sootFrom: "top", relief, depth: -12 });
  smokeColumn(c, fx + 6, top - 44, 70, 5, { seed: seed + 6, density: 0.6 });
  // A tiled dado and the entrance, open on the warm bath.
  tileBand(c, x0 + 2, x0 + width - 3, ground - 98, 7, { seed });
  relief.rect(x0 + 2, ground - 98, x0 + width - 3, ground - 92, 1);
  const dx = x0 + Math.floor(width * 0.35);
  archway(c, dx, ground - 10, 34, 76, { ring: 4, ringRamp: P.tile, ringTone: 3, interior: (x, y) =>
    (y > ground - 40 && hash2(x >> 1, y >> 1, seed) < 0.15 ? P.glow[2] : P.night[0]) });
  archRelief(relief, dx, ground - 10, 34, 76, { ring: 4, ringOut: 2, recess: -16 });
  ctx.lamp(dx, ground - 26, 56, 0.6);
  for (let k = 0; k < 3; k++) {
    const wx = x0 + width * 0.55 + k * 22;
    if (wx > x0 + width - 40) break;
    fillShape(c, wx, ground - 70, wx + 7, ground - 58, () => true, P.night[0]);
    c.set(wx + 3, ground - 71, P.night[0]);
    c.set(wx + 4, ground - 71, P.night[0]);
    relief.rect(wx, ground - 71, wx + 7, ground - 58, -6);
    sill(c, Math.floor(wx) - 1, Math.floor(wx) + 8, ground - 57, relief, 0);
  }
}

/** A quarter's gate: a massive brick gatehouse over a dark passage, buttress towers and a banner,
 * set where the level's exit is, with houses on either hand. */
function darb(c, x0, width, ground, seed, ctx) {
  const centre = ctx.exitX >= x0 && ctx.exitX < x0 + width ? ctx.exitX : x0 + width / 2;
  const gw = 200;
  const gx = Math.round(centre - gw / 2);
  if (gx - x0 > 60) building(c, x0, gx - x0, ground, "houses", seed + 1, ctx);
  if (x0 + width - (gx + gw) > 60) building(c, gx + gw, x0 + width - (gx + gw), ground, "houses", seed + 2, ctx);
  // The gatehouse stands forward of the houses; its buttress towers further still.
  ctx.front = 4;
  const relief = ctx.relief;
  const height = 262;
  const top = ground - height;
  brickWall(c, gx, top, gw, height, { base: 3, seed, light: 1, soot: 0.6, sootFrom: "bottom", brickW: 7, relief, depth: 4 });
  crenels(c, gx, gx + gw - 1, top, P.brick, 3, { relief, front: 4 });
  for (const bx of [gx, gx + gw - 34]) {
    brickWall(c, bx, top - 16, 34, height + 16, { base: 4, seed: bx, light: 1, brickW: 6, relief, depth: 12 });
    crenels(c, bx, bx + 33, top - 16, P.brick, 4, { size: 6, gap: 5, relief, front: 12 });
    fillShape(c, bx + 16, top + 30, bx + 17, top + 46, () => true, P.night[0]);
    relief.rect(bx + 16, top + 30, bx + 17, top + 46, 3);
    fillShape(c, bx + 33, top - 16, bx + 33, ground, () => true, P.brick[2]);
  }
  patternedBrick(c, gx + 44, top + 22, gw - 88, 40, { seed, relief, depth: 4 });
  tileBand(c, gx + 40, gx + gw - 41, top + 66, 8, { seed });
  relief.rect(gx + 40, top + 66, gx + gw - 41, top + 73, 5);
  // The passage: deep and dark, with the glow of fires beyond its far end spilling out.
  archway(c, centre, ground - 4, 76, 132, { ring: 6, ringTone: 5, interior: (x, y) => {
    const t = (y - (ground - 136)) / 132;
    if (t > 0.82) return hash2(x >> 1, y, seed) < 0.3 ? P.glow[3] : P.glow[2];
    return t > 0.6 ? P.night[1] : P.night[0];
  } });
  archRelief(relief, centre, ground - 4, 76, 132, { ring: 6, front: 4, ringOut: 2, recess: -36 });
  ctx.lamp(centre, ground - 14, 76, 0.9);
  banner(c, Math.round(centre) - 9, top + 84, 18, 40, seed + 3, ctx);
}

/** The college's great portal (pishtaq): a tall frame of patterned brick and glazed tile around a
 * pointed recess under a muqarnas hood, and the open doors of the college below. */
function portal(c, x0, width, ground, seed, ctx) {
  const centre = x0 + width / 2;
  const pw = Math.min(width, 220);
  const px0 = Math.round(centre - pw / 2);
  if (px0 - x0 > 60) building(c, x0, px0 - x0, ground, "madrasa", seed + 1, ctx);
  if (x0 + width - (px0 + pw) > 60) building(c, px0 + pw, x0 + width - (px0 + pw), ground, "madrasa", seed + 2, ctx);
  // The pishtaq stands forward of the college; its tiled frame further; the recess goes deep under its hood.
  ctx.front = 3;
  const relief = ctx.relief;
  const height = 300;
  const top = ground - height;
  patternedBrick(c, px0, top, pw, height, { seed, tone: 4, relief, depth: 3 });
  // Frame: an inscription band across the top and down both sides.
  tileBand(c, px0 + 4, px0 + pw - 5, top + 6, 12, { seed: seed + 1 });
  relief.rect(px0 + 4, top + 6, px0 + pw - 5, top + 17, 4.5);
  for (const sx of [px0 + 6, px0 + pw - 16]) {
    for (let y = top + 18; y < ground - 12; y++) {
      for (let x = sx; x < sx + 10; x++) c.set(x, y, (x + y) % 6 === 0 ? P.tile[4] : (x === sx || x === sx + 9) ? P.brick[5] : P.tile[1]);
    }
    relief.rect(sx, top + 18, sx + 9, ground - 13, 4.5);
  }
  // The recess and its hood.
  const half = (pw - 64) / 2;
  const rise = half * 0.95;
  const spring = top + 40 + rise;
  const ring = (x, y) => inPointedArch(x, y, centre, spring, half + 4, rise + 4, ground - 10)
    && !inPointedArch(x, y, centre, spring, half, rise, ground - 10);
  fillShape(c, centre - half - 4, spring - rise - 4, centre + half + 4, ground - 10, ring,
    (x, y) => ((x + y) % 4 === 0 ? P.tile[3] : P.brick[5]));
  relief.fill(centre - half - 4, spring - rise - 4, centre + half + 4, ground - 10, ring, 4.5);
  fillShape(c, centre - half, spring, centre + half, ground - 10, () => true, (x, y) => pick(P.plaster, 2 + (y % 9 === 0 ? -1 : 0)));
  relief.rect(centre - half, spring, centre + half, ground - 10, -10);
  muqarnasHood(c, centre, spring + 30, half, rise + 30, { ramp: P.plaster, tone: 4, rows: 6, relief, depth: -10 });
  // The doors, thrown open on lamplight and smoke.
  archway(c, centre, ground - 10, 44, 92, { ring: 4, ringRamp: P.tile, ringTone: 3, interior: (x, y) => {
    const t = (y - (ground - 102)) / 92;
    return t > 0.7 ? (hash2(x >> 1, y >> 1, seed) < 0.4 ? P.glow[3] : P.glow[2]) : t > 0.4 ? P.night[1] : P.night[0];
  } });
  archRelief(relief, centre, ground - 10, 44, 92, { ring: 4, front: -10, ringOut: 1.5, recess: -16 });
  ctx.lamp(centre, ground - 26, 66, 0.8);
  for (const side of [-1, 1]) {
    const lx0 = centre + side * 22 - (side > 0 ? 0 : 7);
    const lx1 = centre + side * 22 + (side > 0 ? 7 : 0);
    fillShape(c, lx0, ground - 96, lx1, ground - 11, () => true, (x, y) => (y % 12 === 0 ? P.bronze[2] : pick(P.wood, 3)));
    relief.rect(lx0, ground - 96, lx1, ground - 11, -14);
  }
  // Slender corner minarets, standing out at the frame's corners.
  for (const mx of [px0 + 3, px0 + pw - 4]) {
    fillShape(c, mx - 4, top - 40, mx + 4, top, () => true, (x) => pick(P.brick, 4 + (x > mx ? -1 : 0)));
    relief.fill(mx - 4, top - 40, mx + 4, top, () => true, (x) => 6 + Math.sqrt(Math.max(0, 16 - (x + 0.5 - mx) ** 2)) * 0.5);
    dome(c, mx, top - 40, 5, { ramp: P.tile, tone: 3, shape: "pointed", light: -0.4, relief, depth: 6 });
  }
}

/** The river wall: a low stone parapet with mooring posts and steps down to the water; above it,
 * nothing (the river and the far bank show through). */
function riverWall(c, x0, width, ground, seed, ctx) {
  ctx.front = 0;
  const relief = ctx.relief;
  const h = 38;
  for (let y = ground - h; y < ground; y++) {
    for (let x = x0; x < x0 + width; x++) {
      const course = Math.floor((y - (ground - h)) / 6);
      const joint = (x + course * 9) % 18 === 0 || (y - (ground - h)) % 6 === 0;
      c.set(x, y, joint ? P.stone[1] : pick(P.stone, 3 + (hash2(x >> 3, course, seed) < 0.3 ? -1 : 0)));
      relief.set(x, y, joint ? -0.9 : (hash2(Math.floor((x + course * 9) / 18), course, seed + 2) - 0.5) * 0.7);
    }
  }
  fillShape(c, x0, ground - h - 3, x0 + width - 1, ground - h - 1, () => true, (x, y) => pick(P.stone, y === ground - h - 3 ? 5 : 4));
  relief.rect(x0, ground - h - 3, x0 + width - 1, ground - h - 1, 2.5);
  for (let mx = x0 + 40; mx < x0 + width - 20; mx += 96) {
    fillShape(c, mx, ground - h - 14, mx + 5, ground - h - 3, () => true, (x) => pick(P.wood, 3 + (x === mx ? 1 : 0)));
    relief.rect(mx, ground - h - 14, mx + 5, ground - h - 3, 5);
    // A mooring rope trailing down.
    for (let d = 0; d < 10; d++) {
      c.set(mx + 6 + d, ground - h - 10 + Math.floor(d * d * 0.12), P.linen[1]);
      relief.set(mx + 6 + d, ground - h - 10 + Math.floor(d * d * 0.12), 5);
    }
  }
  // Steps down to the water.
  const sx = x0 + Math.floor(width * 0.6);
  for (let s = 0; s < 5; s++) {
    fillShape(c, sx + s * 6, ground - h + s * 7, sx + 40, ground - h + s * 7 + 1, () => true, P.stone[4]);
    relief.rect(sx + s * 6, ground - h + s * 7, sx + 40, ground - h + s * 7 + 1, 2.5);
  }
}

/** The inner face of the city wall: massive brick with a blind arcade, towers, a stair and a
 * crenellated top. */
function rampart(c, x0, width, ground, seed, ctx) {
  ctx.front = 0;
  const relief = ctx.relief;
  const height = ctx.scale < 1 ? 236 : 324;
  const top = ground - height;
  brickWall(c, x0, top, width, height, { base: 3, seed, light: 1, soot: ctx.soot(x0, width), sootFrom: "bottom", brickW: 9,
    relief, joint: 0.4, calm: true });
  crenels(c, x0, x0 + width - 1, top, P.brick, 3, { size: 10, gap: 7, relief, front: 0, broken: 0.28, seed });
  scarWall(c, x0, width, top, ground, height, seed, relief, ctx);
  // Blind arcade along the foot, sunk into the wall's thickness.
  for (let ax = x0 + 30; ax < x0 + width - 30; ax += 64) {
    archway(c, ax, ground - 10, 44, 112, { ring: 3, ringTone: 4, interior: (x, y) =>
      pick(P.brick, 2 + ((y >> 2) % 2 === 0 && (x >> 3) % 2 === 0 ? 1 : 0)) });
    archRelief(relief, ax, ground - 10, 44, 112, { ring: 3, ringOut: 1, recess: (x, y) =>
      -6 + ((y >> 2) % 2 === 0 && (x >> 3) % 2 === 0 ? 0.4 : 0) });
  }
  // Towers standing well out from the wall: they shade it beside them, and the fires light their faces.
  for (let tx = x0 + 70; tx < x0 + width - 50; tx += 220) {
    const tw = 54;
    for (let y = top - 22; y < ground; y++) {
      for (let x = tx; x < tx + tw; x++) {
        const u = (x - tx) / tw;
        const shade = u < 0.2 ? 1 : u > 0.75 ? -1 : 0;
        const brick = ((y >> 2) + ((x >> 3) & 1)) % 2;
        const joint = brick && x % 8 === 0;
        c.set(x, y, pick(P.brick, 3 + shade + (joint ? -1 : 0)));
        relief.set(x, y, 12 + (joint ? -0.7 : 0) - ((y & 3) === 0 ? 0.5 : 0));
      }
    }
    crenels(c, tx, tx + tw - 1, top - 22, P.brick, 4, { size: 7, gap: 5, relief, front: 12 });
    for (let y = top + 20; y < ground - 60; y += 70) {
      fillShape(c, tx + 26, y, tx + 27, y + 14, () => true, P.night[0]);
      relief.rect(tx + 26, y, tx + 27, y + 14, 3);
    }
  }
  // A stair climbing the wall's face to the walk, each step standing out from it.
  const sx = x0 + width - 160;
  if (sx > x0 + 20) {
    for (let s = 0; s < 24; s++) {
      const x = sx + s * 6;
      const y = ground - 12 - s * 12;
      if (y < top + 10) break;
      fillShape(c, x, y, x + 12, y + 3, () => true, P.brick[5]);
      relief.rect(x, y, x + 12, y + 3, 7);
      fillShape(c, x, y + 4, x + 12, ground - 10, () => true, (px, py) => pick(P.brick, 2 + (py % 4 === 0 ? -1 : 0)));
      relief.rect(x, y + 4, x + 12, ground - 10, 6);
    }
  }
}

/**
 * What a siege does to a city wall, so it reads as one great built thing marked by its story, not a sheet of brick:
 * a cut-stone base course along its foot, a stone string course along its face, patches where it was mended in
 * paler brick, the scars of stones from the engines (a shallow crater, its cracks running out), and soot climbing
 * from fires at its foot.
 */
function scarWall(c, x0, width, top, ground, height, seed, relief, ctx) {
  void ctx;
  const r = rng(seed + 77);
  // Repairs first, so the courses run over them.
  for (let k = 0; k < Math.max(1, Math.floor(width / 360)); k++) {
    const pw = 40 + Math.floor(r() * 40);
    const ph = 26 + Math.floor(r() * 30);
    const px = x0 + 20 + Math.floor(r() * Math.max(1, width - pw - 40));
    const py = top + 30 + Math.floor(r() * Math.max(1, height * 0.5));
    brickWall(c, px, py, pw, ph, { base: 4, seed: seed + 300 + k, brickW: 7, light: 1, relief, joint: 0.4, damage: 0,
      calm: true });
  }
  // The base course of cut stone, and a string course a little under half way up.
  brickWall(c, x0, ground - 18, width, 18, { ramp: P.stone, base: 3, seed: seed + 3, brickW: 16, brickH: 6, relief, depth: 2,
    damage: 0.1, joint: 0.6 });
  fillShape(c, x0, ground - 19, x0 + width - 1, ground - 19, () => true, pick(P.stone, 5));
  relief.rect(x0, ground - 19, x0 + width - 1, ground - 19, 2.5);
  // The string course stands well out, so the light from above leaves a band of shadow under it the length of the wall.
  const string = top + Math.round(height * 0.42);
  fillShape(c, x0, string, x0 + width - 1, string + 5, () => true, (x, y) =>
    pick(P.stone, y === string ? 5 : y === string + 5 ? 2 : y === string + 1 ? 4 : 3 + (hash2(x >> 4, 9, seed) < 0.2 ? -1 : 0)));
  relief.rect(x0, string, x0 + width - 1, string + 4, 4.5);
  relief.rect(x0, string + 5, x0 + width - 1, string + 5, 3);
  // Scars of the engines' stones: a shallow crater, darker and broken, its cracks running out.
  for (let k = 0; k < Math.max(1, Math.floor(width / 300)); k++) {
    const cx = x0 + 30 + Math.floor(r() * Math.max(1, width - 60));
    const cy = top + 20 + Math.floor(r() * height * 0.45);
    const rad = 10 + Math.floor(r() * 8);
    for (let y = cy - rad - 2; y <= cy + rad + 2; y++) {
      for (let x = cx - rad - 2; x <= cx + rad + 2; x++) {
        const d = Math.hypot(x - cx, (y - cy) * 1.15) / rad + (fbm(x * 0.4, y * 0.4, { seed: seed + k }) - 0.5) * 0.5;
        if (d > 1 || c.alpha(x, y) === 0) continue;
        c.set(x, y, pick(P.brick, d < 0.55 ? 1 : 2 + (hash2(x, y, seed) < 0.3 ? 1 : 0)));
        relief.set(x, y, -4.5 * (1 - d * d));
      }
    }
    for (let a = 0; a < 5; a++) {
      const angle = r() * Math.PI * 2;
      const len = rad + 6 + Math.floor(r() * 14);
      let x = cx + Math.cos(angle) * rad * 0.8;
      let y = cy + Math.sin(angle) * rad * 0.8;
      for (let s2 = 0; s2 < len; s2++) {
        x += Math.cos(angle + (fbm(s2 * 0.3, a, { seed }) - 0.5) * 1.2);
        y += Math.sin(angle + (fbm(s2 * 0.3, a, { seed }) - 0.5) * 1.2);
        if (c.alpha(Math.round(x), Math.round(y)) === 0) break;
        c.set(Math.round(x), Math.round(y), P.brick[1]);
        relief.set(Math.round(x), Math.round(y), -1.4);
      }
    }
  }
  // Soot climbing from the fires that burned against its foot.
  for (let k = 0; k < Math.max(1, Math.floor(width / 420)); k++) {
    soot(c, x0 + 20 + Math.floor(r() * Math.max(1, width - 80)), 0, ground - 20, 90 + Math.floor(r() * 50), seed + 900 + k, 46);
  }
}

/** Siege scaffolding of lashed poles and planks leaning on a wall. */
function scaffold(c, x, ground, w, h, seed, relief = null, front = 0) {
  for (let px = x; px <= x + w; px += Math.max(10, Math.floor(w / 3))) {
    for (let y = ground - h; y < ground; y++) {
      c.set(px, y, P.wood[3]);
      c.set(px + 1, y, P.wood[1]);
      relief?.set(px, y, front + 16);
      relief?.set(px + 1, y, front + 16);
    }
  }
  for (let y = ground - h + 14; y < ground - 6; y += 38) {
    beam(c, x - 3, y, w + 7, 3, { tone: 3, seed: seed + y });
    relief?.rect(x - 3, y, x + w + 3, y + 2, front + 17);
    // Diagonal braces between the decks.
    for (let d = 0; d < Math.min(w, 34); d++) {
      c.set(x + d, y + 3 + Math.floor(d * 1.05), P.wood[2]);
      relief?.set(x + d, y + 3 + Math.floor(d * 1.05), front + 15);
    }
  }
}

/** The southern gate: two square towers hung with crescent banners about a tiled gateway, its
 * portcullis down, the wall running away on either hand and a siege scaffold left against it. */
function gatehouse(c, x0, width, ground, seed, ctx) {
  const centre = Math.round(ctx.exitX >= x0 && ctx.exitX < x0 + width ? ctx.exitX : x0 + width / 2);
  const top = ground - (ctx.scale < 1 ? 262 : 300);
  rampart(c, x0, width, ground, seed + 9, ctx);
  const relief = ctx.relief;
  const tw = 84;
  for (const side of [-1, 1]) {
    // A great square tower, standing far out from the wall.
    const tx = Math.round(centre + side * 90 - tw / 2);
    const ttop = top - 36;
    brickWall(c, tx, ttop, tw, ground - ttop, { base: 4, seed: seed + side * 7, light: 1, brickW: 9, soot: 0.8,
      sootFrom: "bottom", relief, depth: 18 });
    fillShape(c, tx, ttop, tx + 1, ground, () => true, P.brick[5]);
    fillShape(c, tx + tw - 3, ttop, tx + tw - 1, ground, () => true, P.brick[2]);
    crenels(c, tx - 3, tx + tw + 2, ttop, P.brick, 4, { size: 9, gap: 6, relief, front: 18, broken: 0.12, seed: seed + side });
    // Machicolations: stone corbels standing out under the parapet, dark drops between them.
    for (let mx = tx; mx < tx + tw - 3; mx += 7) {
      fillShape(c, mx, ttop + 4, mx + 4, ttop + 13, () => true, (x, y) =>
        pick(P.stone, y === ttop + 4 ? 5 : x === mx ? 4 : 3 - (y > ttop + 10 ? 1 : 0)));
      relief.rect(mx, ttop + 4, mx + 4, ttop + 13, 21);
      fillShape(c, mx + 5, ttop + 4, mx + 6, ttop + 9, () => true, P.night[0]);
      relief.rect(mx + 5, ttop + 4, mx + 6, ttop + 9, 16);
    }
    for (let k = 0; k < 4; k++) {
      archway(c, tx + 13 + k * 19, ttop + 32, 6, 14, { ring: 1, ringTone: 5 });
      archRelief(relief, tx + 13 + k * 19, ttop + 32, 6, 14, { ring: 1, front: 18, ringOut: 0.5, recess: -9 });
    }
    ctx.front = 18;
    banner(c, tx + 18, ttop + 54, tw - 36, 128, seed + side * 3, ctx);
  }
  ctx.front = 0;
  scaffold(c, Math.round(centre - 90 - tw / 2 - 46), ground, 40, 220, seed, relief, 0);
  // Iron fire-baskets on the towers either side of the gateway, lit against the dark of the passage.
  for (const side of [-1, 1]) {
    const bx = Math.round(centre + side * (92 / 2 + 22));
    const by = ground - 120;
    fillShape(c, bx - 1, by, bx, by + 18, () => true, P.iron[2]);
    relief.rect(bx - 1, by, bx, by + 18, 20);
    fillShape(c, bx - 5, by - 7, bx + 4, by, (x, y) => y === by + 0.5 || Math.floor(x - bx + 5) % 3 === 0, P.iron[3]);
    for (let y = by - 13; y < by; y++) {
      for (let x = bx - 4; x <= bx + 3; x++) {
        const t = (by - y) / 13;
        if (Math.abs(x + 0.5 - bx) > 4 * (1 - t * 0.7)) continue;
        c.set(x, y, t > 0.7 ? P.fire[5] : t > 0.35 ? P.fire[4] : P.fire[3]);
      }
    }
    relief.rect(bx - 5, by - 13, bx + 4, by, 21);
    ctx.lamp(bx, by - 6, 96, 1.2);
  }
  // The gateway: a tiled frame and inscription band about a pointed arch, deep in the gatehouse.
  const gw = 92;
  for (let y = ground - 212; y < ground - 4; y++) {
    for (let x = centre - gw / 2 - 16; x <= centre + gw / 2 + 16; x++) {
      c.set(x, y, (x + y) % 6 === 0 ? COBALT[4] : (x - y + 600) % 6 === 0 ? P.tile[4] : COBALT[1]);
    }
  }
  relief.rect(centre - gw / 2 - 16, ground - 212, centre + gw / 2 + 16, ground - 5, 5);
  tileBand(c, Math.round(centre - gw / 2 - 16), Math.round(centre + gw / 2 + 16), ground - 226, 14, { seed, glaze: P.tile });
  relief.rect(Math.round(centre - gw / 2 - 16), ground - 226, Math.round(centre + gw / 2 + 16), ground - 213, 7);
  const grate = (x, y) => {
    const lx = Math.round(x - (centre - gw / 2));
    const ly = Math.round(y - (ground - 180));
    return lx % 11 === 0 || lx % 11 === 1 || ly % 16 === 0 || ly % 16 === 1;
  };
  archway(c, centre, ground - 4, gw, 176, { ring: 6, ringTone: 5, interior: (x, y) => {
    const lx = Math.round(x - (centre - gw / 2));
    const ly = Math.round(y - (ground - 180));
    // The portcullis: an iron-shod timber grid with spiked feet, darkness behind.
    const bar = lx % 11 === 0 || lx % 11 === 1;
    const rail = ly % 16 === 0 || ly % 16 === 1;
    if (bar || rail) return (bar && rail) ? P.iron[3] : pick(P.wood, bar ? 2 : 3);
    return ly > 150 ? P.night[1] : P.night[0];
  } });
  archRelief(relief, centre, ground - 4, gw, 176, { ring: 6, front: 5, ringOut: 2, recess: (x, y) => (grate(x, y) ? -10 : -40) });
  for (let k = 0; k < 9; k++) {
    const sx = Math.round(centre - gw / 2 + 5 + k * 11);
    for (let d = 0; d < 4; d++) {
      c.set(sx, ground - 4 - 10 + d, P.iron[4 - Math.floor(d / 2)]);
      relief.set(sx, ground - 4 - 10 + d, -9);
    }
  }
}
/** The Mongols' camp in a square: felt tents before a courtyard wall, horse-tail standards and
 * braziers; above the wall, the city. */
function camp(c, x0, width, ground, seed, ctx) {
  ctx.front = 0;
  const relief = ctx.relief;
  const r = rng(seed);
  const wallH = 84;
  plasterWall(c, x0, ground - wallH, width, wallH, { base: 2, seed, stain: 0.8, relief, fallen: 0.12 });
  coping(c, x0, x0 + width - 1, ground - wallH, P.plaster, 2, relief, 0);
  let x = x0 + 20;
  while (x < x0 + width - 60) {
    const tw = 56 + Math.floor(r() * 26);
    const th = 34 + Math.floor(r() * 10);
    const cx = x + tw / 2;
    // A felt tent pitched well out from the wall: a drum wall under a low dome, a painted door.
    for (let y = ground - th; y < ground - 6; y++) {
      for (let px = x; px < x + tw; px++) {
        const u = (px - cx) / (tw / 2);
        const roof = ground - th + Math.floor((1 - Math.sqrt(Math.max(0, 1 - u * u))) * 14);
        if (y < roof) continue;
        const wallLine = y > ground - th + 16;
        const band = wallLine && (y - (ground - th)) % 9 === 0;
        c.set(px, y, band ? P.rust[2] : pick(P.felt, 2 + (u < -0.4 ? 1 : u > 0.5 ? -1 : 0) + (wallLine ? 0 : 1)));
        relief.set(px, y, 20 + Math.sqrt(Math.max(0, 1 - u * u)) * tw * 0.3 - (wallLine ? 0 : (ground - th + 16 - y) * 0.5));
      }
    }
    fillShape(c, cx - 5, ground - 24, cx + 5, ground - 7, () => true, (px, py) => (py % 4 === 0 ? P.ochre[3] : P.rust[3]));
    relief.rect(cx - 5, ground - 24, cx + 5, ground - 7, 20 + tw * 0.3 - 1);
    // Smoke from its roof ring.
    if (r() < 0.6) smokeColumn(c, cx, ground - th - 2, 40, 3, { seed: seed + x, density: 0.5 });
    x += tw + 28 + Math.floor(r() * 40);
    if (r() < 0.7) {
      // A horse-tail standard on a tall pole, planted before the tents.
      const sx = x - 16;
      fillShape(c, sx, ground - 120, sx + 1, ground - 8, () => true, P.wood[3]);
      relief.rect(sx, ground - 120, sx + 1, ground - 8, 26);
      c.set(sx, ground - 122, P.iron[4]);
      c.set(sx + 1, ground - 121, P.iron[3]);
      for (let t = 0; t < 9; t++) {
        for (let d = 0; d < 30; d++) {
          const px = sx - 6 + t * 1.5 + Math.sin(d * 0.2 + t) * 1.2;
          c.set(px, ground - 116 + d, t % 3 === 0 ? P.ash[2] : hex("#120e10"));
          relief.set(Math.round(px), ground - 116 + d, 26);
        }
      }
    }
  }
}

const SPECIAL = { ruin, hammam, darb, portal, river: riverWall, rampart, gatehouse, camp };

/** Houses a street further back, low and dark, so alleys and the dips of ruined walls show the next
 * street rather than the sky. */
function deepBand(c, x0, x1, ground, seed, relief) {
  const shades = [mix(P.brick[1], P.night[1], 0.5), mix(P.brick[2], P.night[1], 0.5), mix(P.plaster[2], P.night[1], 0.55)];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = 18 + Math.floor(hash2(i, 1, seed) * 26);
    const h = 84 + Math.floor(hash2(i, 2, seed) * 50);
    const tone = Math.floor(hash2(i, 3, seed) * 3);
    for (let px = x; px < Math.min(x + w, x1); px++) {
      for (let y = ground - h; y < ground; y++) {
        const edge = y === ground - h || px === x;
        c.set(px, y, edge ? shades[Math.min(2, tone + 1)] : shades[tone]);
        relief?.set(px, y, -26);
      }
    }
    if (hash2(i, 4, seed) < 0.3) {
      const wx = x + Math.floor(w / 2) - 1;
      const wy = ground - h + 10;
      fillShape(c, wx, wy, wx + 2, wy + 4, () => true, hash2(i, 5, seed) < 0.4 ? P.fire[2] : P.night[0]);
    }
    x += w;
    i += 1;
  }
}

/** Maps every opaque pixel to the nearest colour of `palette` (the level painting's), in a
 * perceptual space, so the street is drawn in the same colours as the city beyond it. */
function toPalette(c, palette) {
  const lab = (rgb) => {
    const f = (v) => {
      const l = (v / 255) ** 2.2;
      return Math.cbrt(l);
    };
    return [f(rgb[0]) * 0.3 + f(rgb[1]) * 0.59 + f(rgb[2]) * 0.11, f(rgb[0]) - f(rgb[1]), f(rgb[1]) - f(rgb[2])];
  };
  const entries = palette.map((rgb) => ({ rgb, lab: lab(rgb) }));
  const cache = new Map();
  for (let i = 0; i < c.width * c.height; i++) {
    if (c.data[i * 4 + 3] === 0) continue;
    const key = (c.data[i * 4] << 16) | (c.data[i * 4 + 1] << 8) | c.data[i * 4 + 2];
    let to = cache.get(key);
    if (!to) {
      const l = lab([c.data[i * 4], c.data[i * 4 + 1], c.data[i * 4 + 2]]);
      let best = Infinity;
      for (const e of entries) {
        const d = (e.lab[0] - l[0]) ** 2 * 2 + (e.lab[1] - l[1]) ** 2 + (e.lab[2] - l[2]) ** 2;
        if (d < best) { best = d; to = e.rgb; }
      }
      cache.set(key, to);
    }
    c.data[i * 4] = to[0];
    c.data[i * 4 + 1] = to[1];
    c.data[i * 4 + 2] = to[2];
  }
}

// --- The whole street -----------------------------------------------------------------------------

export function paintBackdrop(level, look = "night") {
  const W = level.cols * 16;
  const H = BACKDROP_HEIGHT;
  const c = new Canvas(W, H);
  const relief = new Relief(W, H);
  const lamps = [];
  const ground = H;
  const base = GRADES[look] ?? GRADES.night;
  // Before a painted city the street stands darker, a silhouette lit by its fires and the sky.
  const grade = level.painting ? { ...base, ambient: base.ambient * 0.86, haze: base.haze + 0.08, fire: base.fire * 1.25,
    edgeAmount: base.edgeAmount + 0.15 } : base;
  const fires = level.fires.map(([col, row, size]) => ({ x: col * 16 + 8, y: row * 16 - BACKDROP_TOP, size }));
  const ctx = {
    soot: (x0, w) => (fires.some((f) => f.x > x0 - 40 && f.x < x0 + w + 40) ? 1.1 : 0.35),
    burning: (x) => fires.some((f) => Math.abs(f.x - x) < 60),
    exitX: level.exit.col * 16,
    scale: level.painting ? 0.6 : 1,
    cranes: !!level.dress?.cranes,
    carpets: !!level.dress?.carpets,
    // The relief the painters write (relief.mjs), the depth of the wall of the building being painted, and the
    // street's lamps and lit windows, which light it as its fires do.
    relief,
    front: 0,
    lamp: (x, y, radius, strength) => lamps.push({ x, y, radius, strength }),
  };
  for (const section of level.sections) {
    const themes = Array.isArray(section.theme) ? section.theme : [section.theme];
    if (!themes.some((kind) => kind === "river" || kind === "camp")) {
      deepBand(c, section.from * 16, section.to * 16, ground, section.from + 3, relief);
    }
  }
  for (const section of level.sections) {
    let x = section.from * 16;
    const end = section.to * 16;
    let seed = section.from * 7 + 1;
    const themes = Array.isArray(section.theme) ? section.theme : [section.theme];
    while (x < end) {
      const kind = themes[Math.floor(hash2(seed, 5, 3) * themes.length)];
      let width = WHOLE.includes(kind) ? end - x : 120 + Math.floor(hash2(seed, 0, 1) * 90);
      if (end - (x + width) < 80) width = end - x;
      const alley = !WHOLE.includes(kind) && kind !== "khan" && kind !== "madrasa" && hash2(seed, 1, 2) < 0.2 && width > 140;
      building(c, x, alley ? width - 30 : width, ground, kind, seed, ctx);
      x += width;
      seed += 17;
    }
  }
  // The hour, lit from the relief (relief.mjs): the night sky on every face, shut out from under what stands out;
  // the fires and lamps lighting what is turned to them, shut out from behind what stands in their way; the upper
  // storeys sinking into the night.
  lightRelief(c, relief, {
    ambient: { color: grade.sky, strength: grade.ambient },
    lights: [
      ...fires.map((f) => ({ x: f.x, y: f.y - 14, z: 22, radius: f.size === "large" ? 210 : f.size === "medium" ? 170 : 125,
        color: FIRELIGHT, strength: 3.2 * grade.fire })),
      ...lamps.map((l) => ({ x: l.x, y: l.y, z: 10, radius: l.radius, color: LAMPLIGHT, strength: 1.4 * l.strength })),
    ],
    key: grade.key ?? null,
    haze: { tint: grade.tint, top: grade.haze, street: 0.06 },
  });
  // Light from the sky catching the parapets.
  for (let x = 0; x < W; x++) {
    for (let y = 1; y < H; y++) {
      if (c.alpha(x, y) > 0 && c.alpha(x, y - 1) === 0) {
        c.set(x, y, mix(c.get(x, y), grade.edge, grade.edgeAmount));
        break;
      }
    }
  }
  // The relief it was lit from, kept with it for whoever would look at it.
  c.relief = relief;
  return c;
}

export function buildBackdrop({ OUT, REVIEW, want, level }) {
  if (!want("backdrop")) return;
  const c = paintBackdrop(level, level.look ?? "night");
  if (level.painting) toPalette(c, JSON.parse(readFileSync(join(OUT, "palette.json"), "utf8")));
  const chunks = Math.ceil(c.width / CHUNK);
  for (let i = 0; i < chunks; i++) {
    c.crop(i * CHUNK, 0, CHUNK, c.height).save(join(OUT, `backdrop_${i}.png`));
  }
  const width = c.width;
  for (const [tag, from] of [["a", 0], ["b", Math.floor(width * 0.4)], ["c", Math.max(0, width - 1280)]]) {
    c.crop(from, 0, Math.min(1280, width - from), c.height).save(join(REVIEW, `${level.id}_backdrop_${tag}.png`));
  }
  console.log(`backdrop ${chunks} chunks`);
}
