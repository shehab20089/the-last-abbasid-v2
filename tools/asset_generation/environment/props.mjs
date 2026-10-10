// Props that dress the streets of every level: market stalls (their timber roofs are the one-way
// platforms), clay jars, grain sacks, smouldering book piles, scattered pages, a fallen black
// banner, rubble, a charred beam, a broken cart; a well and the posts captives are roped to; the
// college's lecterns, scroll racks, toppled shelves, spilt ink, fountain, cypress and armillary
// sphere; the siege's braziers, horse-tail standards, catapult stones and broken ladders; the lamp
// niche where the hero rests; each level's exit gate; and dark foreground silhouettes. Each prop is
// drawn standing on its bottom edge. The set pieces soldiers handle (a pyre of books, a plundered
// chest) are modelled in 3D in props3d.mjs and rendered like the characters.
import { join } from "node:path";
import {
  Canvas, P, archway, awning, bayer, beam, brickWall, fbm, fillShape, glow, hash2, hex, mix, pick,
} from "./env_lib.mjs";
import { rng } from "../lib/noise.mjs";
import { strip } from "../lib/canvas.mjs";
import { props3d } from "./props3d.mjs";
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

/** A clay jar of height h, its widest point a third of the way up. */
function jar(c, cx, base, h, ramp = P.brick, { broken = false, seed = 1 } = {}) {
  const w = h * 0.62;
  for (let y = base - h; y < base; y++) {
    const t = (base - y) / h;
    let half = t > 0.86 ? w * 0.18 : t > 0.8 ? w * 0.28 : Math.sin(Math.min(1, t * 1.25) * Math.PI) * w * 0.5 + w * 0.12;
    if (broken && t > 0.55 + hash2(Math.floor(cx), Math.floor(y / 3), seed) * 0.2) continue;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - cx) / Math.max(1, half);
      if (Math.abs(u) > 1) continue;
      let k = 3 + (u < -0.35 ? 1 : u > 0.45 ? -1 : 0);
      if (t > 0.78 && t < 0.82) k -= 1; // the neck ring
      if (Math.abs(t - 0.45) < 0.02) k -= 1; // a painted band
      c.set(x, y, pick(ramp, k));
    }
  }
}

function sack(c, x, base, w, h, ramp) {
  for (let y = base - h; y < base; y++) {
    const t = (base - y) / h;
    const half = (w / 2) * (t > 0.82 ? 0.45 : 0.85 + Math.sin(t * Math.PI) * 0.15);
    const cx = x + w / 2;
    for (let px = Math.floor(cx - half); px <= Math.ceil(cx + half); px++) {
      const u = (px + 0.5 - cx) / half;
      c.set(px, y, pick(ramp, 2 + (u < -0.3 ? 1 : u > 0.5 ? -1 : 0) + (t > 0.8 && t < 0.86 ? -1 : 0)));
    }
  }
}

/** A heap of goods spilled from a sack (spices or grain). */
function heap(c, x, base, w, h, ramp) {
  for (let px = x; px < x + w; px++) {
    const t = (px - x) / w;
    const top = base - Math.round(Math.sin(t * Math.PI) * h);
    for (let y = top; y < base; y++) c.set(px, y, pick(ramp, 2 + (y === top ? 1 : 0) + (bayer(px, y) < 0.2 ? -1 : 0)));
  }
}

// --- Stalls ----------------------------------------------------------------------------------------

/** A market stall 96 px wide whose roof line is 48 px up (row 25 planks sit on it). */
function stall(variant) {
  const w = 96;
  const h = 64;
  const c = new Canvas(w, h);
  const base = h;
  const roof = h - 48;
  const r = rng(variant * 31 + 3);
  // Back cloth (shade) between the posts.
  const back = [P.awning, P.awningAlt, P.saffron][variant % 3];
  fillShape(c, 6, roof + 2, w - 7, base - 18, () => true, (x, y) => pick(back, 1 + ((x >> 2) % 2 === 0 ? 0 : -1) + (y < roof + 5 ? 1 : 0)));
  // Posts.
  for (const px of [3, w - 7]) beam(c, px, roof, 4, base - roof, { tone: 3, seed: px });
  // Counter with goods.
  beam(c, 4, base - 20, w - 8, 4, { tone: 4 });
  fillShape(c, 6, base - 16, w - 7, base - 1, () => true, (x, y) => pick(P.wood, 2 + ((x % 12 === 0) ? -1 : 0)));
  let gx = 8;
  while (gx < w - 16) {
    const kind = r();
    if (kind < 0.4) {
      const ramp = [P.saffron, P.madder, P.ochre, P.jade][Math.floor(r() * 4)];
      heap(c, gx, base - 20, 12, 5, ramp);
      gx += 13;
    } else if (kind < 0.7) {
      jar(c, gx + 4, base - 20, 10, [P.brick, P.tile, P.plaster][Math.floor(r() * 3)]);
      gx += 10;
    } else {
      sack(c, gx, base - 20, 10, 9, P.linen);
      gx += 11;
    }
  }
  // The valance hanging from the roof beam, torn on some stalls.
  awning(c, 0, roof - 2, w, 12, { colors: variant % 2 === 0 ? [P.awning, P.linen] : [P.awningAlt, P.linen],
    stripe: 6, torn: variant === 1 ? 0.55 : 0.15, slope: 0, seed: variant + 9 });
  // Spilled goods on the street.
  heap(c, w - 26, base, 18, 3, P.saffron);
  return outline(c);
}

// --- Small props --------------------------------------------------------------------------------

function jars() {
  const c = new Canvas(44, 30);
  jar(c, 10, 30, 26, P.brick);
  jar(c, 24, 30, 20, P.plaster);
  jar(c, 35, 30, 14, P.tile);
  return outline(c);
}

function brokenJars() {
  const c = new Canvas(40, 22);
  jar(c, 12, 22, 20, P.brick, { broken: true, seed: 3 });
  for (let i = 0; i < 9; i++) {
    const x = 18 + Math.floor(hash2(i, 0, 5) * 20);
    fillShape(c, x, 19 + Math.floor(hash2(i, 1, 5) * 2), x + 2, 21, () => true, pick(P.brick, 3 + (i % 2)));
  }
  return outline(c);
}

function sacks() {
  const c = new Canvas(46, 22);
  sack(c, 2, 22, 14, 18, P.linen);
  sack(c, 14, 22, 15, 14, P.linen);
  heap(c, 28, 22, 16, 6, P.ochre);
  return outline(c);
}

/** Books flung into a heap and set alight: charred edges, glowing seams, a few still whole. */
function bookPile() {
  const c = new Canvas(52, 22);
  const r = rng(77);
  for (let i = 0; i < 26; i++) {
    const x = 4 + Math.floor(r() * 40);
    const y = 21 - Math.floor(r() * (12 - Math.abs(x - 24) * 0.35));
    const ramp = [P.madder, P.indigo, P.leather, P.saffron, P.wool][Math.floor(r() * 5)];
    const w = 6 + Math.floor(r() * 4);
    for (let px = x; px < x + w; px++) {
      for (let py = y; py < y + 3; py++) {
        const char = fbm(px * 0.4, py * 0.4, { seed: i }) > 0.55;
        c.set(px, py, char ? (r() < 0.15 ? P.fire[3] : P.night[1]) : pick(ramp, py === y ? 3 : 1));
      }
    }
  }
  return outline(c);
}

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

function fallenBanner() {
  const c = new Canvas(54, 10);
  beam(c, 0, 6, 54, 2, { ramp: P.wood, tone: 2 });
  for (let x = 8; x < 46; x++) {
    const h = 5 - Math.floor(fbm(x * 0.3, 0, { seed: 4 }) * 3);
    for (let y = 9 - h; y < 9; y++) c.set(x, y, y === 9 - h ? P.gold[1] : (x % 5 === 0 ? hex("#1d1a20") : hex("#0f0e11")));
  }
  return outline(c);
}

function rubble() {
  const c = new Canvas(56, 18);
  const r = rng(13);
  for (let i = 0; i < 40; i++) {
    const x = 2 + Math.floor(r() * 50);
    const top = 17 - Math.floor((1 - Math.abs(x - 28) / 28) * 14 * r());
    const w = 3 + Math.floor(r() * 4);
    const h = 2 + Math.floor(r() * 2);
    fillShape(c, x, top, x + w, Math.min(17, top + h), () => true, (px, py) => pick(P.brick, 3 + (py === top ? 1 : 0) - (r() < 0.2 ? 1 : 0)));
  }
  return outline(c);
}

function charredBeam() {
  const c = new Canvas(70, 26);
  for (let x = 0; x < 70; x++) {
    const y = Math.floor(20 - x * 0.24);
    for (let t = 0; t < 6; t++) {
      const ember = fbm(x * 0.3, t * 0.5, { seed: 3 }) > 0.7;
      c.set(x, y + t, ember && x % 3 === 0 ? P.fire[3] : pick(P.wood, t === 0 ? 2 : t === 5 ? 0 : 1));
    }
  }
  return outline(c);
}

function cart() {
  const c = new Canvas(64, 36);
  beam(c, 4, 14, 50, 5, { tone: 3 });
  for (let x = 6; x < 52; x += 8) beam(c, x, 6, 2, 9, { tone: 3 });
  beam(c, 52, 16, 12, 3, { tone: 2 });
  // One wheel on, one fallen.
  const wheel = (cx, cy, r0) => {
    for (let a = 0; a < 64; a++) {
      const ang = (a / 64) * Math.PI * 2;
      for (let d = r0 - 2; d <= r0; d++) c.set(Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d), P.wood[d === r0 ? 2 : 3]);
    }
    for (let s = 0; s < 6; s++) {
      const ang = (s / 6) * Math.PI * 2;
      for (let d = 0; d < r0; d++) c.set(Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d), P.wood[2]);
    }
  };
  wheel(16, 25, 10);
  for (let x = 34; x < 58; x++) for (let y = 32; y < 35; y++) c.set(x, y, P.wood[(x + y) % 3 === 0 ? 1 : 2]);
  return outline(c);
}

// --- The streets, the college and the siege -------------------------------------------------------

/** A round stone well-head under a timber frame, its pulley, rope and bucket. */
function well() {
  const c = new Canvas(48, 40);
  for (let y = 22; y < 40; y++) {
    for (let x = 6; x < 42; x++) {
      const u = (x + 0.5 - 24) / 18;
      const course = Math.floor((y - 22) / 5);
      const joint = (y - 22) % 5 === 0 || (x + course * 4) % 9 === 0;
      c.set(x, y, joint ? P.stone[1] : pick(P.stone, 3 + (u < -0.5 ? 1 : u > 0.55 ? -1 : 0)));
    }
  }
  fillShape(c, 5, 20, 42, 22, () => true, (x, y) => pick(P.stone, y === 20 ? 5 : 4));
  for (const px of [7, 39]) beam(c, px, 2, 3, 19, { tone: 3, seed: px });
  beam(c, 4, 1, 40, 3, { tone: 4 });
  fillShape(c, 21, 4, 26, 8, () => true, P.wood[2]);
  for (let y = 9; y < 15; y++) c.set(24, y, P.linen[1]);
  fillShape(c, 21, 15, 27, 20, () => true, (x, y) => (y === 15 ? P.iron[3] : pick(P.wood, 2)));
  return outline(c);
}

/** A post with a coil of rope: where the soldiers tie their captives. */
function ropePost() {
  const c = new Canvas(20, 34);
  beam(c, 8, 2, 4, 32, { tone: 3, seed: 5 });
  for (let y = 12; y < 20; y += 2) fillShape(c, 6, y, 13, y, () => true, P.linen[2]);
  for (let d = 0; d < 9; d++) c.set(13 + Math.floor(d / 3), 20 + d, P.linen[1]);
  fillShape(c, 2, 30, 17, 33, () => true, (x, y) => ((x + y) % 2 === 0 ? P.linen[1] : P.linen[2]));
  return outline(c);
}

/** A folding lectern (rahl) holding an open book. */
function lectern() {
  const c = new Canvas(26, 24);
  for (let d = 0; d < 16; d++) {
    c.set(5 + d, 23 - d, P.wood[3]);
    c.set(6 + d, 23 - d, P.wood[2]);
    c.set(20 - d, 23 - d, P.wood[3]);
    c.set(21 - d, 23 - d, P.wood[4]);
  }
  fillShape(c, 3, 6, 22, 9, () => true, (x, y) => (x === 12 || x === 13 ? P.leather[1] : y === 6 ? P.parchment[4] : P.parchment[2]));
  for (let x = 4; x < 22; x += 2) if (x < 11 || x > 14) c.set(x, 8, P.night[1]);
  return outline(c);
}

/** A rack of pigeonholes, each with a rolled scroll. */
function scrollRack() {
  const c = new Canvas(44, 40);
  fillShape(c, 1, 1, 42, 39, () => true, P.wood[1]);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const x = 3 + col * 8;
      const y = 3 + row * 9;
      fillShape(c, x, y, x + 6, y + 7, () => true, P.night[0]);
      if (hash2(row, col, 4) < 0.75) {
        fillShape(c, x + 1, y + 2, x + 5, y + 6, () => true, (px) => pick(P.parchment, px === x + 1 ? 1 : 3));
        c.set(x + 3, y + 4, hash2(row, col, 5) < 0.5 ? P.madder[3] : P.saffron[3]);
      }
    }
  }
  for (let y = 1; y < 40; y += 9) fillShape(c, 1, y, 42, y + 1, () => true, P.wood[3]);
  return outline(c);
}

/** A bookcase pulled down on its face, its books spilt across the floor. */
function shelfFallen() {
  const c = new Canvas(80, 22);
  beam(c, 6, 12, 56, 10, { tone: 3, seed: 9 });
  for (let x = 8; x < 60; x += 9) fillShape(c, x, 12, x + 1, 21, () => true, P.wood[1]);
  const r = rng(91);
  for (let i = 0; i < 18; i++) {
    const x = 40 + Math.floor(r() * 36);
    const y = 16 + Math.floor(r() * 5);
    const ramp = [P.madder, P.indigo, P.leather, P.saffron, P.jade][Math.floor(r() * 5)];
    fillShape(c, x, y, x + 5, y + 1, () => true, (px, py) => pick(ramp, py === y ? 3 : 1));
  }
  return outline(c);
}

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

/** A courtyard fountain: a stone basin on a stepped base, its bowl spilling water. */
function fountain() {
  const c = new Canvas(80, 34);
  fillShape(c, 2, 24, 77, 33, () => true, (x, y) => pick(P.stone, (y === 24 ? 5 : 3) + (x % 12 === 0 ? -1 : 0)));
  fillShape(c, 6, 20, 73, 24, () => true, (x, y) => (y === 20 ? P.stone[5] : (x + y) % 7 === 0 ? P.tile[4] : P.indigo[2]));
  fillShape(c, 34, 8, 45, 20, () => true, (x) => pick(P.stone, 4 + (x > 41 ? -1 : 0)));
  fillShape(c, 26, 5, 53, 8, () => true, (x, y) => pick(P.stone, y === 5 ? 5 : 3));
  for (const sx of [28, 51]) for (let y = 9; y < 20; y++) if (y % 3 !== 0) c.set(sx, y, P.indigo[4]);
  fillShape(c, 38, 2, 41, 4, () => true, P.indigo[4]);
  return outline(c);
}

/** A tall cypress: a dark flame of foliage on a short trunk. */
function cypress() {
  const c = new Canvas(26, 120);
  for (let y = 4; y < 112; y++) {
    const t = (y - 4) / 108;
    const half = 11 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * (t < 0.15 ? t / 0.15 : 1);
    for (let x = Math.floor(13 - half); x <= Math.ceil(13 + half); x++) {
      const u = (x + 0.5 - 13) / Math.max(1, half);
      const leaf = fbm(x * 0.4, y * 0.25, { seed: 6 }) > 0.5;
      c.set(x, y, pick(P.jade, (u < -0.2 ? 2 : 1) + (leaf ? 0 : -1) - (y > 100 ? 1 : 0)));
    }
  }
  fillShape(c, 12, 108, 14, 119, () => true, P.wood[2]);
  return outline(c);
}

/** A brass armillary sphere on a turned stand. */
function armillary() {
  const c = new Canvas(30, 40);
  const [cx, cy, r] = [15, 13, 11];
  for (let a = 0; a < 120; a++) {
    const ang = (a / 120) * Math.PI * 2;
    c.set(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), P.bronze[3]);
    c.set(Math.round(cx + Math.cos(ang) * r * 0.45), Math.round(cy + Math.sin(ang) * r), P.bronze[2]);
    c.set(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r * 0.35), P.bronze[4]);
  }
  for (let d = -r - 2; d <= r + 2; d++) c.set(cx + Math.round(d * 0.5), cy + d, P.bronze[1]);
  fillShape(c, 14, 25, 16, 34, () => true, P.bronze[2]);
  fillShape(c, 8, 34, 22, 39, () => true, (x, y) => pick(P.wood, 3 + (y === 34 ? 1 : 0)));
  return outline(c);
}

/** A bronze brazier on a tripod, heaped with glowing coals. */
function brazier() {
  const c = new Canvas(20, 28);
  for (let d = 0; d < 14; d++) {
    c.set(4 + Math.floor(d * 0.3), 27 - d, P.iron[2]);
    c.set(15 - Math.floor(d * 0.3), 27 - d, P.iron[2]);
    c.set(10, 27 - d, P.iron[1]);
  }
  fillShape(c, 2, 9, 17, 14, () => true, (x, y) => (y === 9 ? P.bronze[4] : pick(P.bronze, 2 + (x < 6 ? 1 : 0))));
  for (let x = 3; x < 17; x++) {
    const h = 2 + Math.floor(hash2(x, 1, 3) * 3);
    for (let y = 9 - h; y < 9; y++) c.set(x, y, hash2(x, y, 4) < 0.5 ? P.fire[4] : P.fire[2]);
  }
  return outline(c);
}

/** A Mongol horse-tail standard (tug): a tall pole crowned with a trident and black tails. */
function standard() {
  const c = new Canvas(24, 92);
  fillShape(c, 11, 8, 12, 91, () => true, (x) => pick(P.wood, x === 11 ? 3 : 2));
  for (const [x, y] of [[11, 0], [11, 1], [11, 2], [8, 3], [14, 3], [8, 4], [14, 4], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5]]) c.set(x, y, P.iron[4]);
  fillShape(c, 8, 6, 15, 8, () => true, P.gold[2]);
  for (let t = 0; t < 8; t++) {
    for (let d = 0; d < 34; d++) {
      const x = 7 + t + Math.round(Math.sin(d * 0.18 + t * 0.9) * 1.5 + d * 0.06);
      c.set(x, 9 + d, t % 4 === 0 ? P.ash[1] : hex("#0f0c0d"));
    }
  }
  return outline(c);
}

/** Stone shot for the catapults, heaped where it fell. */
function stoneBalls() {
  const c = new Canvas(26, 24);
  for (const [bx, by, r] of [[8, 17, 6.5], [19, 18, 5.5], [13, 9, 6]]) {
    for (let y = Math.floor(by - r); y <= by + r; y++) {
      for (let x = Math.floor(bx - r); x <= bx + r; x++) {
        const d = Math.hypot(x + 0.5 - bx, y + 0.5 - by) / r;
        if (d > 1) continue;
        const lit = (bx - x) * 0.6 + (by - y) * 0.8;
        c.set(x, y, pick(P.stone, 3 + (lit > 2 ? 1 : lit < -2 ? -1 : 0) + (hash2(x, y, 7) < 0.1 ? -1 : 0)));
      }
    }
  }
  return outline(c);
}

/** A siege ladder snapped in two, one half leaning, one fallen. */
function ladderBroken() {
  const c = new Canvas(40, 62);
  for (const side of [0, 9]) {
    for (let y = 0; y < 48; y++) {
      const x = Math.round(8 + side + y * 0.32);
      c.set(x, y, P.wood[3]);
      c.set(x + 1, y, P.wood[1]);
    }
  }
  for (let y = 5; y < 46; y += 9) {
    const x = Math.round(8 + y * 0.32);
    for (let k = 0; k <= 9; k++) c.set(x + k, y, P.wood[4]);
  }
  beam(c, 4, 56, 34, 3, { tone: 3 });
  beam(c, 2, 59, 34, 3, { tone: 2 });
  for (let x = 6; x < 36; x += 8) c.set(x, 58, P.wood[4]);
  return outline(c);
}

// --- The lamp niche (checkpoint) ----------------------------------------------------------------

/** A wall fragment with a prayer-niche recess and an oil lamp: frame 0 dark, 1..4 lit (flicker). */
function lampNiche() {
  const frames = [];
  // Frames 0-1: not yet lit, an ember breathing on the wick so the lamp reads as one waiting for a flame;
  // frames 2-5: alight.
  for (let f = 0; f < 6; f++) {
    const c = new Canvas(40, 64);
    const lit = f > 1;
    brickWall(c, 0, 4, 40, 60, { base: 3, seed: 61, light: 1 });
    fillShape(c, 0, 0, 39, 4, () => true, P.plaster[4]);
    archway(c, 20, 56, 20, 40, { ring: 2, ringTone: 5, interior: (x, y) => {
      const d = Math.hypot(x - 20, y - 44);
      if (!lit) return d < 3.5 ? P.glow[f === 0 ? 2 : 1] : d < 7.5 ? P.glow[0] : y > 44 ? P.night[1] : P.night[0];
      return d < 6 ? P.fire[3] : d < 11 ? P.glow[4] : d < 16 ? P.glow[2] : P.glow[0];
    } });
    // A stone shelf and a bronze lamp.
    fillShape(c, 9, 50, 31, 52, () => true, P.stone[4]);
    fillShape(c, 15, 47, 25, 49, () => true, (x, y) => (y === 47 ? P.bronze[4] : P.bronze[2]));
    fillShape(c, 24, 46, 27, 47, () => true, P.bronze[3]);
    if (!lit) c.set(20, 45, f === 0 ? P.fire[3] : P.fire[2]);
    if (lit) {
      const flicker = [0, 1, -1, 1][f - 2];
      const flame = [[19, 45], [20, 45], [19, 44], [20, 44], [20, 43 + flicker], [20, 42 + flicker]];
      flame.forEach(([x, y], i) => c.set(x, y, i < 2 ? P.fire[5] : i < 4 ? P.fire[6] : P.fire[4]));
    }
    frames.push(c);
  }
  return frames;
}

// --- The river gate (exit) ------------------------------------------------------------------------

function riverGate(open) {
  const c = new Canvas(80, 128);
  brickWall(c, 0, 8, 80, 120, { base: 3, seed: 71, light: 1, soot: 0.4 });
  for (let x = 0; x < 80; x += 8) fillShape(c, x, 0, x + 4, 8, () => true, P.brick[4]);
  archway(c, 40, 124, 48, 96, { ring: 5, ringTone: 5, interior: (x, y) => {
    if (open) {
      // Through the open gate: the river at night, reflecting the fires.
      if (y > 100) return (x + y) % 5 === 0 ? P.glow[3] : (y % 3 === 0 ? P.indigo[2] : P.indigo[1]);
      return y > 80 ? P.night[2] : P.night[1];
    }
    const plank = Math.floor((x - 16) / 6);
    if (Math.abs(x + 0.5 - 40) < 1) return P.wood[0];
    if ((y - 28) % 14 === 0) return P.iron[2];
    if ((x - 16) % 6 === 0) return P.wood[1];
    return pick(P.wood, 2 + (hash2(plank, 0, 7) > 0.6 ? 1 : 0));
  } });
  if (!open) {
    for (let y = 40; y < 120; y += 14) for (let x = 18; x < 63; x += 4) c.set(x, y + 1, P.bronze[3]);
  }
  return c;
}

/** The gate of a quarter: heavy double doors under a brick arch, a crescent nailed above; open, the
 * passage beyond and the glow of the next street. */
function quarterGate(open) {
  const c = new Canvas(80, 128);
  archway(c, 40, 126, 60, 112, { ring: 6, ringTone: 5, interior: (x, y) => {
    if (open) {
      const t = (y - 14) / 112;
      if (t > 0.78) return hash2(x >> 1, y, 3) < 0.35 ? P.glow[4] : P.glow[3];
      return t > 0.5 ? P.glow[1] : P.night[1];
    }
    if (Math.abs(x + 0.5 - 40) < 1) return P.iron[1];
    if ((y - 20) % 18 === 0) return P.iron[3];
    if ((x - 12) % 8 === 0) return P.wood[1];
    return pick(P.wood, 2 + (fbm(x * 0.3, y * 1.1, { seed: 5 }) > 0.6 ? 1 : 0));
  } });
  if (!open) for (let y = 38; y < 120; y += 18) for (let x = 14; x < 67; x += 6) c.set(x, y + 1, P.bronze[3]);
  const [cx, cy, r] = [40, 26, 5];
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const outer = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r;
      const inner = Math.hypot(x + 0.5 - (cx + 2), y + 0.5 - (cy - 1.5)) <= r * 0.8;
      if (outer && !inner && !open) c.set(x, y, P.gold[3]);
    }
  }
  return c;
}

/** The college's garden door: a small door in a tiled frame; open, the garden's palms against
 * the paling sky. */
function gardenDoor(open) {
  const c = new Canvas(64, 112);
  fillShape(c, 4, 6, 59, 111, () => true, (x, y) => ((x + y) % 6 === 0 ? P.tile[4] : (x - y + 300) % 6 === 0 ? P.indigo[4] : P.indigo[1]));
  fillShape(c, 4, 6, 59, 9, () => true, P.brick[5]);
  archway(c, 32, 110, 36, 88, { ring: 3, ringTone: 5, interior: (x, y) => {
    if (open) {
      const t = (y - 22) / 88;
      if (t < 0.55) return t < 0.25 ? hex("#3b2b52") : hex("#6e3d55");
      const palm = Math.abs(x - 24) < 1.5 || (y < 72 && Math.abs(x - 24 - (72 - y) * 0.6) < 1.2) || Math.abs(x - 42) < 1;
      return palm ? hex("#0b0a14") : t > 0.85 ? P.jade[0] : hex("#141228");
    }
    if (Math.abs(x + 0.5 - 32) < 0.8) return P.wood[0];
    if ((y - 24) % 14 === 0) return P.bronze[2];
    return pick(P.wood, 3 + (Math.floor(x) % 5 === 0 ? -1 : 0));
  } });
  return c;
}

/** The last gate: great iron-bound doors filling the gatehouse arch; open, first light and the
 * river road beyond. */
function lastGate(open) {
  const c = new Canvas(96, 184);
  archway(c, 48, 182, 86, 172, { ring: 5, ringTone: 5, interior: (x, y) => {
    const t = (y - 10) / 172;
    if (open) {
      // Dawn beyond the gate: a gold horizon, the road and the river.
      if (t < 0.62) return t < 0.3 ? hex("#c89a7a") : t < 0.48 ? hex("#e2ae7c") : hex("#f0c890");
      if (t < 0.7) return (x % 9 < 6 && t < 0.66) ? hex("#3a3241") : hex("#5a4a4c");
      return t > 0.9 ? P.stone[3] : (y + x) % 7 === 0 ? hex("#e8b878") : hex("#4a5470");
    }
    const lx = x - 5;
    if (Math.abs(x + 0.5 - 48) < 1.2) return P.iron[1];
    if ((y - 12) % 20 === 0 || (y - 12) % 20 === 1) return P.iron[2];
    if (lx % 10 === 5 && (y - 12) % 20 === 10) return P.iron[4];
    return pick(P.wood, 2 + (fbm(x * 0.22, y * 0.9, { seed: 8 }) > 0.62 ? 1 : 0) + (lx % 10 === 0 ? -1 : 0));
  } });
  if (!open) beam(c, 6, 92, 84, 8, { tone: 4, seed: 3 });
  return c;
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

function foregroundRubble() {
  const c = new Canvas(160, 48);
  const dark = [hex("#060507"), hex("#0d0b0e"), hex("#1a141a")];
  for (let x = 0; x < 160; x++) {
    const top = 48 - Math.floor(10 + fbm(x * 0.05, 0, { seed: 8 }) * 30 + (hash2(Math.floor(x / 7), 0, 2) * 6));
    for (let y = top; y < 48; y++) c.set(x, y, dark[y === top ? 2 : y < top + 3 ? 1 : 0]);
  }
  for (const [x, h] of [[30, 28], [44, 22], [112, 32]]) jar(c, x, 48 - 4, h, dark.concat(dark));
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
  for (let v = 0; v < 3; v++) save(`stall_${v}`, stall(v));
  save("jars", jars());
  save("jars_broken", brokenJars());
  save("sacks", sacks());
  save("book_pile", bookPile());
  save("pages", pages());
  save("banner_fallen", fallenBanner());
  save("rubble", rubble());
  save("beam_charred", charredBeam());
  save("cart", cart());
  save("well", well());
  save("rope_post", ropePost());
  save("lectern", lectern());
  save("scroll_rack", scrollRack());
  save("shelf_fallen", shelfFallen());
  save("ink_spill", inkSpill());
  save("fountain", fountain());
  save("cypress", cypress());
  save("armillary", armillary());
  save("brazier", brazier());
  save("standard", standard());
  save("stone_ball", stoneBalls());
  save("ladder_broken", ladderBroken());
  // Set pieces the soldiers handle, modelled in 3D and rendered like them (environment/props3d.mjs).
  for (const [name, canvas] of props3d()) save(name, canvas);
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
  save("fg_rubble", foregroundRubble());
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
