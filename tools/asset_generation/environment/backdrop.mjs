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

/** Every level's street is the top of tile row 28. */
export const STREET_ROW = 28;
/** Height of the backdrop above the street, and the level y of its top. */
export const BACKDROP_HEIGHT = 360;
export const BACKDROP_TOP = STREET_ROW * 16 - BACKDROP_HEIGHT;
export const CHUNK = 600;
/** Ground-floor height: a storey a little taller than a man. */
const STOREY = 118;
const CLEAR = [0, 0, 0, 0];

/** How each hour grades the facades: the darkness overhead, and the light on the parapets. */
const GRADES = {
  night: { tint: P.night[1], top: 0.58, mid: 0.39, edge: hex("#8a87a6"), edgeAmount: 0.35, fire: 1 },
  smoke: { tint: hex("#170c12"), top: 0.6, mid: 0.41, edge: hex("#b0645a"), edgeAmount: 0.3, fire: 1.1 },
  predawn: { tint: hex("#121126"), top: 0.52, mid: 0.36, edge: hex("#b48a92"), edgeAmount: 0.35, fire: 0.85 },
  dawn: { tint: hex("#1a1e2e"), top: 0.44, mid: 0.3, edge: hex("#e2ae7c"), edgeAmount: 0.45, fire: 0.7 },
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

/** Square merlons along a fortification's top. */
function crenels(c, x0, x1, top, ramp, tone, { size = 8, gap = 6 } = {}) {
  fillShape(c, x0, top, x1, top + 3, () => true, pick(ramp, tone + 1));
  for (let x = x0; x <= x1 - size; x += size + gap) {
    fillShape(c, x, top - size, x + size - 1, top - 1, () => true, (px) => pick(ramp, tone + (px === x ? 1 : 0)));
    fillShape(c, x, top - size, x + size - 1, top - size, () => true, pick(ramp, tone + 2));
  }
}

function door(c, cx, base, width, height, seed) {
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
}

function balcony(c, x, y, w, h, lit) {
  lattice(c, x, y, w, h, { ramp: P.wood, tone: 3, glow: lit ? (px, py) =>
    (hash2(px, py, 3) > 0.5 ? P.fire[3] : P.fire[2]) : null });
  beam(c, x - 3, y + h, w + 6, 4, { tone: 3 });
  for (let k = 0; k < 3; k++) {
    const bx = x + Math.floor((k + 0.5) * (w / 3));
    for (let d = 0; d < 7; d++) c.set(bx - Math.floor(d / 2), y + h + 4 + d, P.wood[2]);
  }
  fillShape(c, x - 2, y - 4, x + w + 1, y - 1, () => true, P.wood[4]);
  fillShape(c, x - 2, y - 1, x + w + 1, y - 1, () => true, P.wood[2]);
}

/** A black Abbasid banner hanging from a pole, torn at its foot, a gold crescent on its field. */
function banner(c, x, y, w, h, seed) {
  beam(c, x - 3, y - 2, w + 6, 2, { ramp: P.wood, tone: 2 });
  for (let px = x; px < x + w; px++) {
    const tear = Math.floor(fbm(px * 0.4, 0, { seed }) * h * 0.45);
    for (let py = y; py < y + h - tear; py++) {
      const fold = Math.sin((px - x) * 0.9) > 0.6 ? 1 : 0;
      const trim = py === y || py === y + 2;
      c.set(px, py, trim ? P.gold[1] : pick([hex("#0b0a0c"), hex("#151317"), hex("#211d24")], fold + (px === x ? 1 : 0)));
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
function boom(c, x, y, length, dir, seed, { cage = true } = {}) {
  const end = x + dir * length;
  beam(c, Math.min(x, end), y, length, 5, { tone: 2, seed });
  // A brace under the boom.
  for (let d = 0; d < length * 0.5; d++) {
    c.set(x + dir * d, y + 5 + Math.floor((length * 0.5 - d) * 0.6), P.wood[2]);
    c.set(x + dir * d, y + 6 + Math.floor((length * 0.5 - d) * 0.6), P.wood[1]);
  }
  fillShape(c, end - 3, y + 5, end + 2, y + 9, () => true, P.iron[3]);
  const drop = 40 + Math.floor(hash2(seed, 2, 3) * 50);
  for (let d = 0; d < drop; d++) c.set(end, y + 10 + d, d % 3 === 0 ? P.linen[1] : P.linen[0]);
  const top = y + 10 + drop;
  if (cage) {
    // A wooden cage: a frame of bars, dark inside.
    fillShape(c, end - 9, top, end + 9, top + 22, () => true, (px, py) =>
      (px === end - 9 || px === end + 9 || py === top || py === top + 22 || (px - end + 9) % 4 === 0)
        ? pick(P.wood, 3 + (py === top ? 1 : 0)) : P.night[0]);
    for (const hx of [end - 8, end + 8]) for (let d = 0; d < 6; d++) c.set(hx + (end - hx) * (d / 6), top - 6 + d, P.linen[1]);
  } else {
    beam(c, end - 8, top, 16, 10, { ramp: P.wood, tone: 3, seed: seed + 1 });
  }
}

/** A patterned carpet thrown over a ledge to hang down the wall. */
function carpet(c, x, y, w, h, seed) {
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
    }
    // Fringe.
  }
  for (let px = x; px < x + w; px += 2) c.set(px, y + h, P.linen[2]);
}

/** A hanging brass lantern on a bracket, lit or dark. */
function lantern(c, x, y, lit) {
  for (let d = 0; d < 6; d++) c.set(x - 6 + d, y - 6, P.iron[2]);
  c.set(x, y - 5, P.iron[2]);
  fillShape(c, x - 2, y - 4, x + 2, y + 2, () => true, (px, py) =>
    (px === x - 2 || px === x + 2 || py === y - 4 || py === y + 2) ? P.bronze[2] : lit ? P.fire[5] : P.night[1]);
  if (lit) glow(c, x, y, 16, P.fire[5], 0.4, { steps: 3 });
}

/** A scaling ladder of lashed poles leaning on a wall, foot to top. */
function ladder(c, footX, footY, topY) {
  const lean = 26;
  for (const side of [-5, 5]) {
    for (let y = topY; y <= footY; y++) {
      const t = (y - topY) / (footY - topY);
      const x = Math.round(footX + side - lean * (1 - t));
      c.set(x, y, P.wood[3]);
      c.set(x + 1, y, P.wood[1]);
    }
  }
  for (let y = topY + 6; y < footY; y += 11) {
    const t = (y - topY) / (footY - topY);
    const x = Math.round(footX - lean * (1 - t));
    for (let k = -5; k <= 5; k++) c.set(x + k, y, P.wood[4]);
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

/** Patterned brickwork (hazarbaf): bricks laid to make a lattice of small crosses. */
function patternedBrick(c, x0, y0, w, h, { tone = 4, seed = 5 } = {}) {
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
    }
  }
}

/** A muqarnas hood filling a pointed arch: rows of small niches stepping out toward the apex. */
function muqarnasHood(c, cx, spring, half, rise, { ramp = P.plaster, tone = 4, rows = 5 } = {}) {
  const top = spring - rise;
  const inside = (px, py) => inPointedArch(px, py, cx, spring, half, rise, spring + 1);
  fillShape(c, cx - half, top, cx + half, spring, inside, (x, y) => {
    const t = (y - top) / rise;
    const row = Math.floor(t * rows);
    const cellW = 6 + row * 1.5;
    const u = ((x - cx + 200 + (row % 2) * cellW * 0.5) % cellW) / cellW;
    const v = (t * rows) % 1;
    // Each niche: a dark hollow under a lit lip.
    if (v < 0.22) return pick(ramp, tone + 1);
    if (u > 0.2 && u < 0.8 && v > 0.4) return pick(ramp, tone - 2 - (v > 0.75 ? 1 : 0));
    return pick(ramp, tone - (u < 0.2 ? 1 : 0));
  });
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
  if (usePlaster) plasterWall(c, x0, top, width, height, { base: tone, seed });
  else brickWall(c, x0, top, width, height, { base: tone, seed, soot: ctx.soot(x0, width), sootFrom: "top", light: 1 });
  brickWall(c, x0, ground - 12, width, 12, { base: 2, seed: seed + 1 });
  fillShape(c, x0, top, x0, ground, () => true, pick(ramp, tone + 1));
  fillShape(c, x0 + width - 1, top, x0 + width - 1, ground, () => true, pick(ramp, tone - 1));
  parapet(c, x0, x0 + width - 1, top, ramp, tone);
  // Roof furniture: a windcatcher or a small dome now and then.
  if (kind !== "wall" && r() < 0.35) {
    const wx = x0 + 12 + Math.floor(r() * (width - 36));
    brickWall(c, wx, top - 34, 14, 34, { base: 3, seed: seed + 9 });
    fillShape(c, wx + 3, top - 28, wx + 10, top - 12, () => true, P.night[0]);
    fillShape(c, wx - 2, top - 37, wx + 15, top - 34, () => true, pick(P.brick, 4));
  } else if (kind === "mosque" || ((kind === "books" || kind === "madrasa") && r() < 0.25)) {
    dome(c, x0 + width * 0.6, top - 2, 26, { ramp: P.tile, tone: 2, shape: "pointed", ribs: 6, light: -0.4 });
  }
  if (kind === "madrasa" || kind === "library") tileBand(c, x0 + 2, x0 + width - 3, top + 10, 6, { seed, glaze: COBALT });
  if (kind !== "wall" && height >= STOREY + 56) {
    // Upper storey.
    const floorLine = ground - (kind === "library" ? 156 : STOREY);
    fillShape(c, x0, floorLine - 2, x0 + width - 1, floorLine, () => true, pick(ramp, tone + 1));
    fillShape(c, x0, floorLine + 1, x0 + width - 1, floorLine + 1, () => true, pick(ramp, tone - 1));
    // Projecting joist ends under the cornice.
    for (let jx = x0 + 6; jx < x0 + width - 4; jx += 14) fillShape(c, jx, floorLine + 2, jx + 2, floorLine + 4, () => true, P.wood[2]);
    const upperBase = floorLine - 18;
    if (kind === "khan" || kind === "madrasa") {
      // The gallery is drawn with the arcade below.
    } else if (r() < 0.6 && width >= 90) {
      const bw = Math.floor(width * 0.42);
      balcony(c, x0 + Math.floor((width - bw) / 2), upperBase - 46, bw, 36, r() < 0.45);
    } else {
      const count = Math.max(1, Math.floor(width / 48));
      for (let k = 0; k < count; k++) {
        const wx = x0 + Math.floor(((k + 0.5) / count) * width);
        const lit = r() < 0.3;
        archway(c, wx, upperBase, 12, 28, { ring: 2, ringTone: 4, interior: (x, y) =>
          (lit ? (hash2(x, y, 5) > 0.5 ? P.fire[3] : P.fire[2]) : (x + y) % 3 === 0 ? P.wood[1] : P.night[0]) });
        if (lit) glow(c, wx, upperBase - 12, 24, P.glow[4], 0.35, { steps: 3 });
      }
    }
    if (r() < 0.22 && kind !== "madrasa") banner(c, x0 + 10 + Math.floor(r() * (width - 40)), floorLine - 64, 16, 44, seed);
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
        if (r() < 0.4) lantern(c, Math.floor(cx), ground - 72, true);
      } else {
        shopInterior(c, cx, ground - 8, bay - 12, archH, theme, seed * 13 + k, { burnt, shelves });
      }
      if (tall && !burnt && r() < 0.6) {
        // A library ladder against the shelves.
        const lx = Math.floor(cx - bay / 2 + 12 + r() * (bay - 30));
        for (let y = ground - 112; y < ground - 8; y++) {
          c.set(lx, y, P.wood[4]);
          c.set(lx + 6, y, P.wood[4]);
          if ((y - ground) % 7 === 0) fillShape(c, lx, y, lx + 6, y, () => true, P.wood[3]);
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
          torn: r() < 0.4 ? 0.5 : 0, seed: seed + k });
      }
      if (r() < 0.3) lantern(c, Math.floor(cx + bay / 2 - 2), ground - (tall ? 136 : 96), r() < 0.5);
    }
    if (kind === "khan" || kind === "madrasa") {
      for (let k = 0; k < count; k++) {
        const cx = x0 + margin + (k + 0.5) * bay;
        archway(c, cx, ground - STOREY - 22, bay - 18, 66, { ring: 3, ringTone: 4, interior: (x, y) =>
          (y > ground - STOREY - 40 ? P.wood[1] : P.night[0]) });
        // A timber railing along the gallery.
        fillShape(c, cx - bay / 2, ground - STOREY - 36, cx + bay / 2, ground - STOREY - 35, () => true, P.wood[3]);
        for (let px = Math.floor(cx - bay / 2); px < cx + bay / 2; px += 4) {
          fillShape(c, px, ground - STOREY - 34, px, ground - STOREY - 23, () => true, P.wood[2]);
        }
      }
    }
  } else if (kind === "houses") {
    door(c, x0 + Math.floor(width * (0.3 + r() * 0.4)), ground - 10, 30, 82, seed);
    if (ctx.cranes && r() < 0.45) boom(c, r() < 0.5 ? x0 + 6 : x0 + width - 6, top + 40, 34 + Math.floor(r() * 20),
      r() < 0.5 ? 1 : -1, seed + 7, { cage: r() < 0.6 });
    if (ctx.carpets && r() < 0.4) carpet(c, x0 + 14 + Math.floor(r() * (width - 50)), ground - STOREY - 4, 22, 36, seed + 8);
    for (let k = 0; k < 2; k++) {
      const wx = x0 + 10 + Math.floor(r() * (width - 30));
      fillShape(c, wx, ground - 78, wx + 9, ground - 66, () => true, P.night[0]);
      for (let b = 1; b < 10; b += 2) fillShape(c, wx + b, ground - 78, wx + b, ground - 66, () => true, P.iron[2]);
    }
    if (r() < 0.5) lantern(c, x0 + width - 14, ground - 104, true);
  } else if (kind === "mosque") {
    for (let x = x0 + 4; x < x0 + width - 4; x++) {
      for (let y = ground - 150; y < ground - 134; y++) {
        const motif = (x + y) % 8 === 0 || (x - y) % 8 === 0;
        c.set(x, y, motif ? P.tile[4] : P.tile[1]);
      }
    }
    archway(c, x0 + width / 2, ground - 10, 46, 104, { ring: 5, ringTone: 4,
      interior: (x, y) => ((x + y) % 5 === 0 && y < ground - 70 ? P.tile[2] : P.night[0]) });
  } else if (kind === "wall") {
    for (let bx = x0 + 24; bx < x0 + width - 20; bx += 72) {
      brickWall(c, bx, top + 24, 18, height - 24, { base: 4, seed: bx, brickW: 6, light: 1 });
      fillShape(c, bx + 8, top + 70, bx + 9, top + 86, () => true, P.night[0]);
    }
    // The siege: Mongol scaling ladders still leaning where the wall was taken, and a breach
    // patched with rubble.
    for (const lx of [x0 + 90, x0 + 330, x0 + 560]) {
      if (lx > x0 + width - 40) continue;
      ladder(c, lx, ground - 6, top + 40);
    }
    for (let x = x0 + 180; x < x0 + 260 && x < x0 + width; x++) {
      const crack = Math.floor(fbm(x * 0.08, 0, { seed: 77 }) * 40);
      for (let y = top + 6; y < top + 46 + crack; y++) c.set(x, y, y > top + 40 + crack - 4 ? P.brick[1] : P.night[0]);
    }
  }
}

/** A house gutted by fire: broken walls open to the sky, charred joists and embers in the rubble. */
function ruin(c, x0, width, ground, seed, ctx) {
  const r = rng(seed);
  const height = Math.round((150 + Math.floor(r() * 90)) * (ctx.scale < 1 ? 0.78 : 1));
  const top = ground - height;
  // What stood behind (the next street's houses, or the sky) shows again above the broken walls.
  const behind = c.crop(x0, 0, width, ground);
  const plaster = r() < 0.5;
  if (plaster) plasterWall(c, x0, top, width, height, { base: 3, seed, stain: 0.9 });
  else brickWall(c, x0, top, width, height, { base: 3, seed, soot: 1.2, sootFrom: "top", light: 1, damage: 0.1 });
  // The broken top edge, lowest where the roof fell in.
  const dip = x0 + width * (0.3 + r() * 0.4);
  for (let x = x0; x < x0 + width; x++) {
    const toward = 1 - Math.min(1, Math.abs(x - dip) / (width * 0.45));
    const jag = Math.floor(fbm(x * 0.05, 0, { seed: seed + 3 }) * 34 + toward * 70 + (hash2(x >> 2, 1, seed) < 0.25 ? 6 : 0));
    const edgeFall = Math.max(0, 14 - Math.min(x - x0, x0 + width - 1 - x)) * 2;
    const cut = top + jag + edgeFall;
    for (let y = top - 1; y < cut; y++) c.set(x, y, behind.get(x - x0, y));
    c.set(x, cut, pick(plaster ? P.plaster : P.brick, 1));
  }
  // The gutted interior behind the fallen front: charred back wall, the burnt-out doorway.
  const ix0 = x0 + 10;
  const ix1 = x0 + width - 11;
  for (let y = ground - STOREY - 40; y < ground - 10; y++) {
    for (let x = ix0; x <= ix1; x++) {
      if (c.alpha(x, y) === 0) continue;
      const n = fbm(x * 0.09, y * 0.09, { seed: seed + 5 });
      const charred = n > 0.55 ? P.wood[0] : n > 0.42 ? P.night[1] : P.night[2];
      c.set(x, y, mix(c.get(x, y), charred, 0.82));
    }
  }
  archway(c, x0 + width * 0.5, ground - 10, 28, 70, { ring: 2, ringTone: 2, interior: (x, y) =>
    (fbm(x * 0.3, y * 0.3, { seed }) > 0.7 ? P.fire[1] : P.night[0]) });
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
      }
    } else {
      beam(c, jx - 6, floor - 2, 16, 4, { ramp: P.wood, tone: 1, seed: jx });
    }
  }
  // Embers and smouldering rubble at the foot.
  for (let x = ix0; x <= ix1; x++) {
    const h = Math.floor(fbm(x * 0.07, 3, { seed }) * 12) + 2;
    for (let y = ground - 10 - h; y < ground - 10; y++) {
      const ember = hash2(x, y, seed) < 0.06;
      c.set(x, y, ember ? (hash2(x, y, seed + 1) < 0.5 ? P.fire[3] : P.fire[2]) : pick(P.brick, 1 + (y % 3 === 0 ? 1 : 0)));
    }
  }
  brickWall(c, x0, ground - 12, width, 12, { base: 2, seed: seed + 1 });
  if (ctx.cranes && r() < 0.5) boom(c, x0 + width - 8, top + 60, 30 + Math.floor(r() * 16), 1, seed + 5, { cage: r() < 0.5 });
  if (ctx.burning(x0 + width / 2)) glow(c, x0 + width / 2, ground - 30, 70, P.fire[3], 0.4);
}

/** A bathhouse: a long, low plastered hall under small domes pierced with glass, its furnace
 * chimney and a tiled door. */
function hammam(c, x0, width, ground, seed, ctx) {
  const r = rng(seed);
  const height = 142;
  const top = ground - height;
  plasterWall(c, x0, top, width, height, { base: 3, seed, stain: 0.6 });
  brickWall(c, x0, ground - 12, width, 12, { base: 2, seed: seed + 1 });
  fillShape(c, x0, top, x0, ground, () => true, P.plaster[4]);
  fillShape(c, x0 + width - 1, top, x0 + width - 1, ground, () => true, P.plaster[2]);
  parapet(c, x0, x0 + width - 1, top, P.plaster, 3);
  // Domes over the hot rooms, each pierced with little glass lights.
  const count = Math.max(2, Math.floor(width / 70));
  for (let k = 0; k < count; k++) {
    const cx = x0 + (k + 0.5) * (width / count);
    const rad = 18 + Math.floor(r() * 8);
    dome(c, cx, top - 1, rad, { ramp: P.plaster, tone: 3, shape: "round", light: -0.4, finial: false });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI;
      const px = cx + Math.cos(a) * rad * 0.55;
      const py = top - 1 - Math.sin(a) * rad * 0.55;
      c.set(px, py, P.fire[4]);
    }
  }
  // The furnace chimney with its smoke.
  const fx = x0 + width - 30;
  brickWall(c, fx, top - 44, 12, 44, { base: 3, seed: seed + 4, soot: 1.4, sootFrom: "top" });
  smokeColumn(c, fx + 6, top - 44, 70, 5, { seed: seed + 6, density: 0.6 });
  // A tiled dado and the entrance.
  tileBand(c, x0 + 2, x0 + width - 3, ground - 98, 7, { seed });
  const dx = x0 + Math.floor(width * 0.35);
  archway(c, dx, ground - 10, 34, 76, { ring: 4, ringRamp: P.tile, ringTone: 3, interior: (x, y) =>
    (y > ground - 40 && hash2(x >> 1, y >> 1, seed) < 0.15 ? P.glow[2] : P.night[0]) });
  for (let k = 0; k < 3; k++) {
    const wx = x0 + width * 0.55 + k * 22;
    if (wx > x0 + width - 40) break;
    fillShape(c, wx, ground - 70, wx + 7, ground - 58, () => true, P.night[0]);
    c.set(wx + 3, ground - 71, P.night[0]);
    c.set(wx + 4, ground - 71, P.night[0]);
  }
  if (ctx.burning(x0 + width / 2)) glow(c, x0 + width / 2, ground - 40, 80, P.fire[3], 0.3);
}

/** A quarter's gate: a massive brick gatehouse over a dark passage, buttress towers and a banner,
 * set where the level's exit is, with houses on either hand. */
function darb(c, x0, width, ground, seed, ctx) {
  const centre = ctx.exitX >= x0 && ctx.exitX < x0 + width ? ctx.exitX : x0 + width / 2;
  const gw = 200;
  const gx = Math.round(centre - gw / 2);
  if (gx - x0 > 60) building(c, x0, gx - x0, ground, "houses", seed + 1, ctx);
  if (x0 + width - (gx + gw) > 60) building(c, gx + gw, x0 + width - (gx + gw), ground, "houses", seed + 2, ctx);
  const height = 262;
  const top = ground - height;
  brickWall(c, gx, top, gw, height, { base: 3, seed, light: 1, soot: 0.6, sootFrom: "bottom", brickW: 7 });
  crenels(c, gx, gx + gw - 1, top, P.brick, 3);
  for (const bx of [gx, gx + gw - 34]) {
    brickWall(c, bx, top - 16, 34, height + 16, { base: 4, seed: bx, light: 1, brickW: 6 });
    crenels(c, bx, bx + 33, top - 16, P.brick, 4, { size: 6, gap: 5 });
    fillShape(c, bx + 16, top + 30, bx + 17, top + 46, () => true, P.night[0]);
    fillShape(c, bx + 33, top - 16, bx + 33, ground, () => true, P.brick[2]);
  }
  patternedBrick(c, gx + 44, top + 22, gw - 88, 40, { seed });
  tileBand(c, gx + 40, gx + gw - 41, top + 66, 8, { seed });
  // The passage: dark, with the glow of fires beyond its far end.
  archway(c, centre, ground - 4, 76, 132, { ring: 6, ringTone: 5, interior: (x, y) => {
    const t = (y - (ground - 136)) / 132;
    if (t > 0.82) return hash2(x >> 1, y, seed) < 0.3 ? P.glow[3] : P.glow[2];
    return t > 0.6 ? P.night[1] : P.night[0];
  } });
  banner(c, Math.round(centre) - 9, top + 84, 18, 40, seed + 3);
}

/** The college's great portal (pishtaq): a tall frame of patterned brick and glazed tile around a
 * pointed recess under a muqarnas hood, and the open doors of the college below. */
function portal(c, x0, width, ground, seed, ctx) {
  const centre = x0 + width / 2;
  const pw = Math.min(width, 220);
  const px0 = Math.round(centre - pw / 2);
  if (px0 - x0 > 60) building(c, x0, px0 - x0, ground, "madrasa", seed + 1, ctx);
  if (x0 + width - (px0 + pw) > 60) building(c, px0 + pw, x0 + width - (px0 + pw), ground, "madrasa", seed + 2, ctx);
  const height = 300;
  const top = ground - height;
  patternedBrick(c, px0, top, pw, height, { seed, tone: 4 });
  // Frame: an inscription band across the top and down both sides.
  tileBand(c, px0 + 4, px0 + pw - 5, top + 6, 12, { seed: seed + 1 });
  for (const sx of [px0 + 6, px0 + pw - 16]) {
    for (let y = top + 18; y < ground - 12; y++) {
      for (let x = sx; x < sx + 10; x++) c.set(x, y, (x + y) % 6 === 0 ? P.tile[4] : (x === sx || x === sx + 9) ? P.brick[5] : P.tile[1]);
    }
  }
  // The recess and its hood.
  const half = (pw - 64) / 2;
  const rise = half * 0.95;
  const spring = top + 40 + rise;
  fillShape(c, centre - half - 4, spring - rise - 4, centre + half + 4, ground - 10, (x, y) =>
    inPointedArch(x, y, centre, spring, half + 4, rise + 4, ground - 10) && !inPointedArch(x, y, centre, spring, half, rise, ground - 10),
  (x, y) => ((x + y) % 4 === 0 ? P.tile[3] : P.brick[5]));
  fillShape(c, centre - half, spring, centre + half, ground - 10, () => true, (x, y) => pick(P.plaster, 2 + (y % 9 === 0 ? -1 : 0)));
  muqarnasHood(c, centre, spring + 30, half, rise + 30, { ramp: P.plaster, tone: 4, rows: 6 });
  // The doors, thrown open on lamplight and smoke.
  archway(c, centre, ground - 10, 44, 92, { ring: 4, ringRamp: P.tile, ringTone: 3, interior: (x, y) => {
    const t = (y - (ground - 102)) / 92;
    return t > 0.7 ? (hash2(x >> 1, y >> 1, seed) < 0.4 ? P.glow[3] : P.glow[2]) : t > 0.4 ? P.night[1] : P.night[0];
  } });
  for (const side of [-1, 1]) {
    fillShape(c, centre + side * 22 - (side > 0 ? 0 : 7), ground - 96, centre + side * 22 + (side > 0 ? 7 : 0), ground - 11,
      () => true, (x, y) => (y % 12 === 0 ? P.bronze[2] : pick(P.wood, 3)));
  }
  // Slender corner minarets.
  for (const mx of [px0 + 3, px0 + pw - 4]) {
    fillShape(c, mx - 4, top - 40, mx + 4, top, () => true, (x) => pick(P.brick, 4 + (x > mx ? -1 : 0)));
    dome(c, mx, top - 40, 5, { ramp: P.tile, tone: 3, shape: "pointed", light: -0.4 });
  }
}

/** The river wall: a low stone parapet with mooring posts and steps down to the water; above it,
 * nothing (the river and the far bank show through). */
function riverWall(c, x0, width, ground, seed) {
  const h = 38;
  for (let y = ground - h; y < ground; y++) {
    for (let x = x0; x < x0 + width; x++) {
      const course = Math.floor((y - (ground - h)) / 6);
      const joint = (x + course * 9) % 18 === 0 || (y - (ground - h)) % 6 === 0;
      c.set(x, y, joint ? P.stone[1] : pick(P.stone, 3 + (hash2(x >> 3, course, seed) < 0.3 ? -1 : 0)));
    }
  }
  fillShape(c, x0, ground - h - 3, x0 + width - 1, ground - h - 1, () => true, (x, y) => pick(P.stone, y === ground - h - 3 ? 5 : 4));
  for (let mx = x0 + 40; mx < x0 + width - 20; mx += 96) {
    fillShape(c, mx, ground - h - 14, mx + 5, ground - h - 3, () => true, (x) => pick(P.wood, 3 + (x === mx ? 1 : 0)));
    // A mooring rope trailing down.
    for (let d = 0; d < 10; d++) c.set(mx + 6 + d, ground - h - 10 + Math.floor(d * d * 0.12), P.linen[1]);
  }
  // Steps down to the water.
  const sx = x0 + Math.floor(width * 0.6);
  for (let s = 0; s < 5; s++) {
    fillShape(c, sx + s * 6, ground - h + s * 7, sx + 40, ground - h + s * 7 + 1, () => true, P.stone[4]);
  }
}

/** The inner face of the city wall: massive brick with a blind arcade, towers, a stair and a
 * crenellated top. */
function rampart(c, x0, width, ground, seed, ctx) {
  const height = ctx.scale < 1 ? 236 : 324;
  const top = ground - height;
  brickWall(c, x0, top, width, height, { base: 3, seed, light: 1, soot: ctx.soot(x0, width), sootFrom: "bottom", brickW: 9 });
  crenels(c, x0, x0 + width - 1, top, P.brick, 3, { size: 10, gap: 7 });
  // Blind arcade along the foot.
  for (let ax = x0 + 30; ax < x0 + width - 30; ax += 64) {
    archway(c, ax, ground - 10, 44, 112, { ring: 3, ringTone: 4, interior: (x, y) =>
      pick(P.brick, 2 + ((y >> 2) % 2 === 0 && (x >> 3) % 2 === 0 ? 1 : 0)) });
  }
  // Towers standing out from the wall.
  for (let tx = x0 + 70; tx < x0 + width - 50; tx += 220) {
    const tw = 54;
    for (let y = top - 22; y < ground; y++) {
      for (let x = tx; x < tx + tw; x++) {
        const u = (x - tx) / tw;
        const shade = u < 0.2 ? 1 : u > 0.75 ? -1 : 0;
        const brick = ((y >> 2) + ((x >> 3) & 1)) % 2;
        c.set(x, y, pick(P.brick, 3 + shade + (brick && (x % 8 === 0) ? -1 : 0)));
      }
    }
    crenels(c, tx, tx + tw - 1, top - 22, P.brick, 4, { size: 7, gap: 5 });
    for (let y = top + 20; y < ground - 60; y += 70) fillShape(c, tx + 26, y, tx + 27, y + 14, () => true, P.night[0]);
  }
  // A stair climbing the wall's face to the walk.
  const sx = x0 + width - 160;
  if (sx > x0 + 20) {
    for (let s = 0; s < 24; s++) {
      const x = sx + s * 6;
      const y = ground - 12 - s * 12;
      if (y < top + 10) break;
      fillShape(c, x, y, x + 12, y + 3, () => true, P.brick[5]);
      fillShape(c, x, y + 4, x + 12, ground - 10, () => true, (px, py) => pick(P.brick, 2 + (py % 4 === 0 ? -1 : 0)));
    }
  }
}

/** Siege scaffolding of lashed poles and planks leaning on a wall. */
function scaffold(c, x, ground, w, h, seed) {
  for (let px = x; px <= x + w; px += Math.max(10, Math.floor(w / 3))) {
    for (let y = ground - h; y < ground; y++) {
      c.set(px, y, P.wood[3]);
      c.set(px + 1, y, P.wood[1]);
    }
  }
  for (let y = ground - h + 14; y < ground - 6; y += 38) {
    beam(c, x - 3, y, w + 7, 3, { tone: 3, seed: seed + y });
    // Diagonal braces between the decks.
    for (let d = 0; d < Math.min(w, 34); d++) {
      c.set(x + d, y + 3 + Math.floor(d * 1.05), P.wood[2]);
    }
  }
}

/** The southern gate: two square towers hung with crescent banners about a tiled gateway, its
 * portcullis down, the wall running away on either hand and a siege scaffold left against it. */
function gatehouse(c, x0, width, ground, seed, ctx) {
  const centre = Math.round(ctx.exitX >= x0 && ctx.exitX < x0 + width ? ctx.exitX : x0 + width / 2);
  const top = ground - (ctx.scale < 1 ? 262 : 300);
  rampart(c, x0, width, ground, seed + 9, ctx);
  const tw = 84;
  for (const side of [-1, 1]) {
    const tx = Math.round(centre + side * 90 - tw / 2);
    const ttop = top - 36;
    brickWall(c, tx, ttop, tw, ground - ttop, { base: 4, seed: seed + side * 7, light: 1, brickW: 9, soot: 0.8,
      sootFrom: "bottom" });
    fillShape(c, tx, ttop, tx + 1, ground, () => true, P.brick[5]);
    fillShape(c, tx + tw - 3, ttop, tx + tw - 1, ground, () => true, P.brick[2]);
    crenels(c, tx - 3, tx + tw + 2, ttop, P.brick, 4, { size: 9, gap: 6 });
    for (let k = 0; k < 4; k++) archway(c, tx + 13 + k * 19, ttop + 32, 6, 14, { ring: 1, ringTone: 5 });
    banner(c, tx + 18, ttop + 54, tw - 36, 128, seed + side * 3);
  }
  scaffold(c, Math.round(centre - 90 - tw / 2 - 46), ground, 40, 220, seed);
  // The gateway: a tiled frame and inscription band about a pointed arch.
  const gw = 92;
  for (let y = ground - 212; y < ground - 4; y++) {
    for (let x = centre - gw / 2 - 16; x <= centre + gw / 2 + 16; x++) {
      c.set(x, y, (x + y) % 6 === 0 ? COBALT[4] : (x - y + 600) % 6 === 0 ? P.tile[4] : COBALT[1]);
    }
  }
  tileBand(c, Math.round(centre - gw / 2 - 16), Math.round(centre + gw / 2 + 16), ground - 226, 14, { seed, glaze: P.tile });
  archway(c, centre, ground - 4, gw, 176, { ring: 6, ringTone: 5, interior: (x, y) => {
    const lx = Math.round(x - (centre - gw / 2));
    const ly = Math.round(y - (ground - 180));
    // The portcullis: an iron-shod timber grid with spiked feet, darkness behind.
    const bar = lx % 11 === 0 || lx % 11 === 1;
    const rail = ly % 16 === 0 || ly % 16 === 1;
    if (bar || rail) return (bar && rail) ? P.iron[3] : pick(P.wood, bar ? 2 : 3);
    return ly > 150 ? P.night[1] : P.night[0];
  } });
  for (let k = 0; k < 9; k++) {
    const sx = Math.round(centre - gw / 2 + 5 + k * 11);
    for (let d = 0; d < 4; d++) c.set(sx, ground - 4 - 10 + d, P.iron[4 - Math.floor(d / 2)]);
  }
}
/** The Mongols' camp in a square: felt tents before a courtyard wall, horse-tail standards and
 * braziers; above the wall, the city. */
function camp(c, x0, width, ground, seed) {
  const r = rng(seed);
  const wallH = 84;
  plasterWall(c, x0, ground - wallH, width, wallH, { base: 2, seed, stain: 0.8 });
  parapet(c, x0, x0 + width - 1, ground - wallH, P.plaster, 2);
  let x = x0 + 20;
  while (x < x0 + width - 60) {
    const tw = 56 + Math.floor(r() * 26);
    const th = 34 + Math.floor(r() * 10);
    const cx = x + tw / 2;
    // A felt tent: a drum wall under a low dome, a painted door.
    for (let y = ground - th; y < ground - 6; y++) {
      for (let px = x; px < x + tw; px++) {
        const u = (px - cx) / (tw / 2);
        const roof = ground - th + Math.floor((1 - Math.sqrt(Math.max(0, 1 - u * u))) * 14);
        if (y < roof) continue;
        const wallLine = y > ground - th + 16;
        const band = wallLine && (y - (ground - th)) % 9 === 0;
        c.set(px, y, band ? P.rust[2] : pick(P.felt, 2 + (u < -0.4 ? 1 : u > 0.5 ? -1 : 0) + (wallLine ? 0 : 1)));
      }
    }
    fillShape(c, cx - 5, ground - 24, cx + 5, ground - 7, () => true, (px, py) => (py % 4 === 0 ? P.ochre[3] : P.rust[3]));
    // Smoke from its roof ring.
    if (r() < 0.6) smokeColumn(c, cx, ground - th - 2, 40, 3, { seed: seed + x, density: 0.5 });
    x += tw + 28 + Math.floor(r() * 40);
    if (r() < 0.7) {
      // A horse-tail standard on a tall pole.
      const sx = x - 16;
      fillShape(c, sx, ground - 120, sx + 1, ground - 8, () => true, P.wood[3]);
      c.set(sx, ground - 122, P.iron[4]);
      c.set(sx + 1, ground - 121, P.iron[3]);
      for (let t = 0; t < 9; t++) {
        for (let d = 0; d < 30; d++) {
          const px = sx - 6 + t * 1.5 + Math.sin(d * 0.2 + t) * 1.2;
          c.set(px, ground - 116 + d, t % 3 === 0 ? P.ash[2] : hex("#120e10"));
        }
      }
    }
  }
}

const SPECIAL = { ruin, hammam, darb, portal, river: riverWall, rampart, gatehouse, camp };

/** Houses a street further back, low and dark, so alleys and the dips of ruined walls show the next
 * street rather than the sky. */
function deepBand(c, x0, x1, ground, seed) {
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
  const ground = H;
  const base = GRADES[look] ?? GRADES.night;
  // Before a painted city the street stands darker, a silhouette lit by its fires and the sky.
  const grade = level.painting ? { ...base, top: base.top + 0.2, mid: base.mid + 0.2, fire: base.fire * 1.35,
    edgeAmount: base.edgeAmount + 0.15 } : base;
  const fires = level.fires.map(([col, row, size]) => ({ x: col * 16 + 8, y: row * 16 - BACKDROP_TOP, size }));
  const ctx = {
    soot: (x0, w) => (fires.some((f) => f.x > x0 - 40 && f.x < x0 + w + 40) ? 1.1 : 0.35),
    burning: (x) => fires.some((f) => Math.abs(f.x - x) < 60),
    exitX: level.exit.col * 16,
    scale: level.painting ? 0.6 : 1,
    cranes: !!level.dress?.cranes,
    carpets: !!level.dress?.carpets,
  };
  for (const section of level.sections) {
    const themes = Array.isArray(section.theme) ? section.theme : [section.theme];
    if (!themes.some((kind) => kind === "river" || kind === "camp")) {
      deepBand(c, section.from * 16, section.to * 16, ground, section.from + 3);
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
  // The hour: the upper storeys sink into darkness, the street level keeps its colour, and the
  // fires warm what is near them.
  for (let y = 0; y < H; y++) {
    const t = y / H;
    const dark = t < 0.55 ? grade.top - t * 0.35 : grade.mid - (t - 0.55) * 0.35;
    for (let x = 0; x < W; x++) {
      if (c.alpha(x, y) === 0) continue;
      c.set(x, y, mix(c.get(x, y), grade.tint, dark));
    }
  }
  for (const f of fires) {
    const radius = f.size === "large" ? 160 : f.size === "medium" ? 120 : 80;
    glow(c, f.x, f.y - 12, radius, P.fire[3], 0.55 * grade.fire);
    glow(c, f.x, f.y - 22, radius * 0.55, P.fire[5], 0.32 * grade.fire);
  }
  // Light from the sky catching the parapets.
  for (let x = 0; x < W; x++) {
    for (let y = 1; y < H; y++) {
      if (c.alpha(x, y) > 0 && c.alpha(x, y - 1) === 0) {
        c.set(x, y, mix(c.get(x, y), grade.edge, grade.edgeAmount));
        break;
      }
    }
  }
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
