// The furnishings of the streets, modelled in 3D and rendered as the characters are (props3d.mjs, clutter3d.mjs): the
// market's stalls under their timber roofs, the post captives are tied to, the college's folding lecterns, scroll
// racks, a bookcase pulled down, its fountain, cypresses and armillary sphere, and the siege's horse-tail standards
// and broken ladder. The camera looks level, so what lies down is propped or heaped, or it would vanish edge-on.
//
// Model space: x to the right of the screen, y away from the camera, z up, in pixels, the ground at z = 0.
import { P } from "../lib/palette.mjs";
import { ellipsoid, lathe, limb, merge, ribbon, rotated, roundedBox, translate, tube, warp } from "../lib/meshes.mjs";
import { frameAlong } from "../lib/space.mjs";
import { pick } from "../lib/sprite_shader.mjs";
import { book, bookMaterial, COVERS, hash, material, random, render } from "./props3d.mjs";
import { BRONZE, IRON, LINEN, PLANKS, STONE, TIMBER, at, clay, GLAZE, grain, jarProfile, scene } from "./clutter3d.mjs";

const frac = (x) => x - Math.floor(x);

/** A cloth hung across x from `x0` to `x1`, its middle at height `z` and `height` tall, waving in folds `fold` deep. */
function hanging(x0, x1, y, z, height, fold, period) {
  const points = [];
  for (let x = x0; x <= x1 + 0.01; x += 1.5) points.push([x, y + Math.sin(x / period) * fold, z]);
  return ribbon(points, points.map(() => height), points.map(() => [0, 0, 1]));
}

/** A ring (a torus) of radius `R` and thickness `r` about `axis` through `o`. */
function ring(o, axis, R, r, { segments = 28 } = {}) {
  const profile = [];
  for (let k = 0; k <= 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    profile.push([R + Math.cos(a) * r, Math.sin(a) * r]);
  }
  return lathe(profile, { frame: frameAlong(o, axis, [1, 0, 0]), segments, closeBottom: false, closeTop: false });
}

// --- Materials ---------------------------------------------------------------------------------------------

/** Rope of twisted hemp: the twist runs round it in light and dark. */
const ROPE = material(P.linen, -0.3, { shade: (s) => pick(P.linen, s.light, frac((s.u + s.v) / 1.8) < 0.4 ? -1.1 : -0.2) });
/** Dark walnut: the college's furniture. */
const WALNUT = material(P.wood, -0.5, { shade: (s) => pick(P.wood, s.light, hash(s.x >> 1, s.y >> 2, 4) < 0.22 ? -1.2 : -0.5) });
/** A cloth hung in stripes `wide` pixels across, of the given ramps. */
const stripes = (ramps, wide, extra = {}) => material(ramps[0], 0, {
  ...extra,
  shade: (s) => {
    if (extra.hem && s.y > extra.hem(s.x)) return null;
    const ramp = ramps[Math.floor(s.x / wide) % ramps.length];
    return pick(ramp, s.light, s.x % wide === 0 ? -0.9 : -0.1);
  },
});
/** A page of a book: pale, its lines of writing across it. */
const PAGE = material(P.parchment, -0.4, {
  shade: (s) => (s.y % 2 === 0 && hash(s.x, s.y, 6) < 0.55 ? P.night[2] : pick(P.parchment, s.light, -0.6)),
});
/** A rolled scroll: parchment, its tie of coloured cord about its middle. */
const scrollMaterial = (tie, length) => material(P.parchment, -0.4, {
  shade: (s) => (Math.abs(s.v - length / 2) < 0.8 ? pick(tie, s.light, 0) : pick(P.parchment, s.light, -0.5)),
});
/** Glazed tile in cobalt and white, set in the basin's wall. */
const COBALT = ["#0b1230", "#14215a", "#203584", "#3657a6", "#7393c8", "#cfd9ea"].map((c) => [
  parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16), 255]);
const BASIN = material(P.stone, 0, {
  shade: (s) => {
    if (s.v > 2.5 && s.v < 7.5) {
      const motif = (Math.floor(s.u / 2) + Math.floor(s.v / 2)) % 3 === 0;
      return motif ? pick(COBALT, s.light, 1.2) : pick(COBALT, s.light, -0.6);
    }
    return pick(P.stone, s.light, hash(Math.floor(s.u / 6), Math.floor(s.v / 3), 2) < 0.3 ? -0.6 : 0);
  },
});
/** Falling water: pale, the key glinting off it. */
const WATER = material(P.indigo, 0, { rim: 0, glintPower: 8, shade: (s) => (s.glint > 0.3 ? COBALT[5] : pick(P.indigo, s.light, 1.2)) });
/** A cypress's foliage: a dark flame, its clumps in light and shadow. */
const FOLIAGE = material(P.jade, -1.2, {
  rim: 0.15,
  shade: (s) => pick(P.jade, s.light, hash(Math.floor(s.x / 2), Math.floor(s.y / 3), 8) < 0.35 ? -2.1 : -1.2),
});
/** Horse hair: black, a sheen on it; some tails grey. */
const hair = (grey) => material(grey ? P.ash : [P.night[0], P.night[1], P.coat[1], P.coat[2], P.coat[3]], grey ? -1.5 : 0, {
  rim: 0.25,
  glintPower: 10,
  shade: (s) => {
    const ramp = grey ? P.ash : [P.night[0], P.night[1], P.coat[1], P.coat[2], P.coat[3]];
    if (s.glint > 0.45) return ramp[Math.min(ramp.length - 1, 3)];
    return pick(ramp, s.light, grey ? -1.5 : frac(s.u * 1.7) < 0.3 ? -0.8 : 0);
  },
});
const GOLD = material(P.gold, -0.2, { glintPower: 12, shade: (s) => (s.glint > 0.45 ? P.gold[4] : pick(P.gold, s.light, -0.2)) });

// --- The market's stalls --------------------------------------------------------------------------------------

/**
 * A stall under a timber roof (the planks above it are the street's, a way over): four posts, a cloth hung at its
 * back, a counter of planks with its goods, a striped valance hanging from the front beam (torn on some), and the
 * goods spilt into the street. 96 px across, 41 px from the street to the planks.
 */
export function stall3d(variant) {
  const s = scene();
  const r = random(variant * 31 + 3);
  const W = 96;
  const H = 64;
  const roof = 41;
  const front = -6;
  const back = 9;
  for (const x of [-44.5, 44.5]) {
    for (const y of [front, back]) s.add(limb([x, y, 0], [x, y, roof], 1.3, 1.2, { steps: 3, sides: 8 }), TIMBER, { group: `post${x}${y}` });
  }
  s.add(limb([-47, front, roof - 1.2], [47, front, roof - 1.2], 1.4, 1.4, { steps: 4, sides: 8 }), TIMBER, { group: "beam" });
  // The cloth at its back, in folds.
  const cloth = [[P.awning, P.linen], [P.awningAlt, P.linen], [P.saffron, P.madder]][variant % 3];
  s.add(hanging(-43.5, 43.5, back + 1, 29.5, 21, 1.4, 2.2), stripes(cloth, 7), { group: "back" });
  // The counter and its front of planks.
  s.add(roundedBox([0, front + 5, 19], [88, 12, 2.4], { roundness: 0.12 }), PLANKS, { group: "counter" });
  s.add(roundedBox([0, front - 0.6, 9.5], [88, 1.6, 19], { roundness: 0.08 }), PLANKS, { group: "front" });
  // Its goods: heaps of spice, jars, open sacks of grain.
  let x = -38;
  let k = 0;
  while (x < 36) {
    const kind = r();
    if (kind < 0.42) {
      const ramp = [P.saffron, P.madder, P.ochre, P.jade][Math.floor(r() * 4)];
      s.add(ellipsoid([x + 3, front + 4 + r() * 3, 20.2], [4.6, 3.6, 3.2], { rings: 5, segments: 12 }), grain(ramp), { group: `g${k}` });
      x += 10;
    } else if (kind < 0.72) {
      const h = 8 + r() * 4;
      const glazed = r() < 0.35;
      s.add(lathe(jarProfile(h, 3.2, 0.36), { frame: at([x + 2, front + 5 + r() * 3, 20.2]), segments: 12 }),
        glazed ? GLAZE : clay(r() < 0.5 ? P.brick : P.plaster), { group: `g${k}` });
      x += 8;
    } else {
      s.add(roundedBox([x + 3.5, front + 6, 24], [7.5, 6.5, 8], { roundness: 0.6 }), LINEN, { group: `g${k}` });
      s.add(ellipsoid([x + 3.5, front + 6, 28], [3, 2.6, 1.4], { rings: 4, segments: 8 }), grain([P.ochre, P.saffron][k % 2]),
        { group: `g${k}t` });
      x += 10;
    }
    k += 1;
  }
  // The valance hanging from the front beam, scalloped, torn on the second stall.
  const hemBase = H - 1 - 30;
  const hem = (px) => hemBase - Math.abs(Math.sin((px / 6) * Math.PI)) * 2
    - (variant === 1 ? Math.floor(hash(Math.floor(px / 3), 1, 9) * hash(Math.floor(px / 9), 2, 9) * 9) : 0);
  s.add(hanging(-W / 2 + 0.5, W / 2 - 0.5, front - 1.8, 35, 10.5, 0.6, 1.9),
    stripes(variant % 2 === 0 ? [P.awning, P.linen] : [P.awningAlt, P.linen], 6, { hem }), { group: "valance" });
  // Spilt in the street.
  s.add(ellipsoid([30, -13, 0], [8, 4, 2.4], { rings: 4, segments: 12 }), grain(P.saffron), { group: "spilt" });
  return render(s.parts, { width: W, height: H });
}

// --- The posts, the college ---------------------------------------------------------------------------------

/** A post where the soldiers tie their captives: rope wound about it, its end hanging, a coil on the ground. */
export function ropePost3d() {
  const s = scene();
  s.add(limb([0, 0, 0], [0, 0, 32], 1.9, 1.7, { steps: 4, sides: 10 }), TIMBER, { group: "post" });
  for (let k = 0; k < 4; k++) s.add(ring([0, 0, 12.5 + k * 1.8], [0, 0, 1], 2.4, 0.75, { segments: 14 }), ROPE, { group: "wind" });
  s.add(tube([{ c: [2.4, -1, 12.6], rx: 0.6 }, { c: [3.6, -2, 7.5], rx: 0.6 }, { c: [4.4, -3, 3], rx: 0.6 }, { c: [6, -4, 0.8], rx: 0.6 }],
    { sides: 6 }), ROPE, { group: "end" });
  s.add(ring([0.5, -6, 1.1], [0, 0, 1], 4.8, 1.1, { segments: 20 }), ROPE, { group: "coil" });
  s.add(ring([0.5, -6, 3], [0, 0, 1], 4.2, 1.0, { segments: 20 }), ROPE, { group: "coil2" });
  return render(s.parts, { width: 20, height: 34 });
}

/** A folding lectern (rahl): two carved boards crossed, an open book lying in the crook of their arms. */
export function lectern3d() {
  const s = scene();
  for (const side of [-1, 1]) {
    const board = translate(rotated(roundedBox([0, 0, 0], [1.4, 9, 23], { roundness: 0.2 }), [0, 1, 0], side * 40), [0, 0, 10.5]);
    s.add(board, WALNUT, { group: `board${side}` });
  }
  // The book's halves resting on the upper arms.
  for (const side of [-1, 1]) {
    const page = translate(rotated(roundedBox([side * 5, 0, 0], [10, 8, 1.4], { roundness: 0.2 }), [0, 1, 0], -side * 34), [0, 0, 16.2]);
    s.add(page, PAGE, { group: "book" });
    const cover = translate(rotated(roundedBox([side * 5.2, 0, -1], [10.6, 8.6, 0.7], { roundness: 0.2 }), [0, 1, 0], -side * 34), [0, 0, 16.2]);
    s.add(cover, material(P.madder, -0.3), { group: "cover" });
  }
  return render(s.parts, { width: 26, height: 24 });
}

/** A rack of pigeonholes in dark walnut, a rolled scroll or two in most, their ends turned to the street. */
export function scrollRack3d() {
  const s = scene();
  const r = random(44);
  s.add(roundedBox([0, 4.6, 19], [41, 1, 37], { roundness: 0.05 }), material(P.wood, -1.6, { rim: 0 }), { group: "backboard" });
  for (const x of [-20.4, 20.4]) s.add(roundedBox([x, 0, 19], [1.8, 10, 38], { roundness: 0.1 }), WALNUT, { group: `side${x}` });
  for (const z of [0.8, 10, 19.2, 28.4, 37.4]) s.add(roundedBox([0, 0, z], [42, 10, 1.6], { roundness: 0.1 }), WALNUT, { group: `shelf${z}` });
  for (const x of [-12.2, -4.1, 4.1, 12.2]) s.add(roundedBox([x, 0, 19], [1.3, 10, 36], { roundness: 0.1 }), WALNUT, { group: `div${x}` });
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      if (r() > 0.78) continue;
      const cx = -16.2 + col * 8.1;
      const floor = 1.6 + row * 9.2;
      const count = r() < 0.4 ? 2 : 1;
      for (let k = 0; k < count; k++) {
        const dx = count === 2 ? (k ? 1.7 : -1.7) : (r() - 0.5) * 1.5;
        const z = floor + 1.6 + (count === 2 && k ? 0 : 0);
        const tie = [P.madder, P.saffron, P.jade, P.indigo][Math.floor(r() * 4)];
        s.add(limb([cx + dx, 3.8, z], [cx + dx, -4.6 + r() * 1.5, z], 1.5, 1.5, { steps: 3, sides: 10, dome: 0.15 }), scrollMaterial(tie, 8.4),
          { group: `scroll${row}${col}${k}` });
      }
    }
  }
  return render(s.parts, { width: 44, height: 40 });
}

/** A bookcase pulled down on its face, its back to the sky, its books spilt across the floor beyond it. */
export function shelfFallen3d() {
  const s = scene();
  const r = random(91);
  s.add(roundedBox([-11, 1, 5.2], [56, 12, 10.4], { roundness: 0.08, rings: 6, segments: 24 }), PLANKS, { group: "case" });
  // A shelf's end and its books still caught in the case's open end.
  s.add(roundedBox([17.6, 1, 5.2], [1.2, 12, 10.4], { roundness: 0.1 }), WALNUT, { group: "end" });
  for (let i = 0; i < 16; i++) {
    const cover = COVERS[Math.floor(r() * COVERS.length)];
    const stacked = i < 5;
    s.add(book(stacked ? 24 + r() * 3 : 21 + r() * 16, (r() - 0.5) * 12, stacked ? i * 2.3 : r() * 1.2, {
      len: 8 + r() * 3, wide: 6 + r() * 2, thick: 1.8 + r(), yaw: stacked ? r() * 30 : r() * 180,
      tilt: stacked ? (r() - 0.5) * 10 : (r() - 0.5) * 60, roll: stacked ? 0 : (r() - 0.5) * 50,
    }), bookMaterial(cover), { group: `b${i}` });
  }
  return render(s.parts, { width: 80, height: 22 });
}

/** A courtyard fountain: an eight-sided basin on a step, cobalt tile set in its wall, a column and a bowl above,
 * water falling from the bowl's lip into the basin. */
export function fountain3d() {
  const s = scene();
  s.add(lathe([[37, 0], [37, 2.8], [33, 3.2]], { frame: at([0, 0, 0]), segments: 8 }), STONE, { group: "step" });
  s.add(lathe([[33, 3], [33, 11], [34.6, 11.4], [34.6, 12.8], [31, 13]], { frame: at([0, 0, 0]), segments: 8, closeTop: false }), BASIN,
    { group: "basin" });
  s.add(lathe([[3.4, 11], [2.6, 14], [2.4, 22], [3.4, 23.6]], { frame: at([0, 0, 0]), segments: 12 }), STONE, { group: "column" });
  s.add(lathe([[2, 23.4], [7, 24.4], [11, 26.4], [12.2, 28], [11.4, 28.6]], { frame: at([0, 0, 0]), segments: 16, closeTop: false }), STONE,
    { group: "bowl" });
  s.add(lathe([[1.6, 27.6], [1.2, 29.6], [1.8, 30.4], [0.6, 31.6]], { frame: at([0, 0, 0]), segments: 10 }), STONE, { group: "finial" });
  s.add(limb([0, 0, 31.4], [0, 0, 33.4], 0.5, 0.3, { steps: 2, sides: 6 }), WATER, { group: "jet" });
  for (const [x, y] of [[-12, -2], [12, -2], [-6, -10], [6, -10]]) {
    s.add(limb([x, y, 27.4], [x * 1.12, y * 1.1 - 0.5, 12.2], 0.45, 0.6, { steps: 3, sides: 6 }), WATER, { group: `fall${x}${y}` });
  }
  return render(s.parts, { width: 80, height: 34 });
}

/** A tall cypress: a dark flame of foliage, clumped, on a short trunk. */
export function cypress3d() {
  const s = scene();
  s.add(limb([0, 0, 0], [0, 0, 12], 1.6, 1.3, { steps: 2, sides: 8 }), TIMBER, { group: "trunk" });
  const profile = [];
  for (let k = 0; k <= 30; k++) {
    const t = k / 30;
    const radius = 10.5 * Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * (t < 0.1 ? 0.35 + t * 6.5 : 1) * (1 - t ** 6);
    profile.push([Math.max(0.3, radius), 6 + t * 110]);
  }
  let crown = lathe(profile, { frame: at([0, 0, 0]), segments: 18 });
  crown = warp(crown, (p, uv) => {
    const n = hash(Math.floor(uv[1] / 4), Math.floor(uv[2] * 7), 7) - 0.5;
    const k = 1 + n * 0.34;
    return [p[0] * k, p[1] * k, p[2]];
  });
  s.add(crown, FOLIAGE, { group: "crown" });
  return render(s.parts, { width: 26, height: 120 });
}

/** A brass armillary sphere on a turned stand: its rings (the meridian, the horizon, the equator, the ecliptic), the
 * pole's axis through them, the little earth at their heart. */
export function armillary3d() {
  const s = scene();
  s.add(lathe([[7.5, 0], [7.5, 2], [6, 2.6], [5.2, 3.8]], { frame: at([0, 0, 0]), segments: 16 }), WALNUT, { group: "base" });
  s.add(lathe([[1.8, 3.6], [1.2, 9], [2, 11], [1.3, 13.6], [2.4, 14.6]], { frame: at([0, 0, 0]), segments: 12 }), BRONZE, { group: "stand" });
  const o = [0, 0, 26];
  s.add(ring(o, [0, 1, 0], 10.2, 0.75), BRONZE, { group: "meridian" });
  s.add(ring(o, [0, Math.sin(0.28), Math.cos(0.28)], 10.8, 0.6), BRONZE, { group: "horizon" });
  s.add(ring(o, [Math.sin(0.55), 0.25, Math.cos(0.55)], 8.6, 0.55), BRONZE, { group: "equator" });
  s.add(ring(o, [-Math.sin(0.95), 0.2, Math.cos(0.95)], 8.6, 0.5), BRONZE, { group: "ecliptic" });
  s.add(limb([Math.sin(0.55) * -12, 0, 26 - Math.cos(0.55) * 12], [Math.sin(0.55) * 12, 0, 26 + Math.cos(0.55) * 12], 0.5, 0.5,
    { steps: 3, sides: 6 }), BRONZE, { group: "axis" });
  s.add(ellipsoid(o, [2.4, 2.4, 2.4], { rings: 6, segments: 10 }), material(P.teal, 0), { group: "earth" });
  return render(s.parts, { width: 30, height: 40 });
}

// --- The siege --------------------------------------------------------------------------------------------

/** A Mongol horse-tail standard (tug): a tall pole crowned with an iron trident over a gilt ball, and the tails hung
 * from it, black and a few grey, swinging out as they fall. */
export function standard3d() {
  const s = scene();
  const r = random(7);
  s.add(limb([0, 0, 0], [0, 0, 86], 0.95, 0.85, { steps: 6, sides: 8 }), TIMBER, { group: "pole" });
  s.add(ellipsoid([0, 0, 84], [1.9, 1.9, 1.9], { rings: 6, segments: 10 }), GOLD, { group: "ball" });
  s.add(limb([0, 0, 85.5], [0, 0, 91], 0.5, 0.35, { steps: 2, sides: 6 }), IRON, { group: "prong" });
  for (const side of [-1, 1]) {
    s.add(merge(limb([0, 0, 86.2], [side * 3, 0, 87.6], 0.45, 0.45, { steps: 2, sides: 6 }),
      limb([side * 3, 0, 87.6], [side * 3.3, 0, 90.4], 0.45, 0.3, { steps: 2, sides: 6 })), IRON, { group: "prong" });
  }
  s.add(lathe([[1.4, 80.8], [2.2, 81.4], [2.2, 82.6], [1.4, 83]], { frame: at([0, 0, 0]), segments: 12 }), material(P.felt, 0), { group: "cap" });
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + r() * 0.3;
    const len = 28 + r() * 10;
    const sway = (r() - 0.3) * 3;
    s.add(tube([
      { c: [Math.cos(a) * 1.6, Math.sin(a) * 1.4, 81.6], rx: 0.75 },
      { c: [Math.cos(a) * 4.6 + sway * 0.4, Math.sin(a) * 3.6, 81.6 - len * 0.45], rx: 0.7 },
      { c: [Math.cos(a) * 6.2 + sway, Math.sin(a) * 4.4, 81.6 - len], rx: 0.3 },
    ], { sides: 5 }), hair(k % 4 === 1), { group: `tail${k}` });
  }
  return render(s.parts, { width: 24, height: 92 });
}

/** A siege ladder snapped: its lower half still leaning against the wall behind, splintered at the break; its upper
 * half fallen across the ground before it. */
export function ladderBroken3d() {
  const s = scene();
  const railA = [[-4.5, -9, 0], [-2.5, 12, 47]];
  const railB = [[4.5, -9, 0], [6.2, 10.5, 41]];
  s.add(limb(...railA, 1.15, 1.0, { steps: 4, sides: 8 }), TIMBER, { group: "railA" });
  s.add(limb(...railB, 1.15, 1.0, { steps: 4, sides: 8 }), TIMBER, { group: "railB" });
  // The break: the rail split, a long splinter standing off it.
  s.add(limb(railB[1], [7.8, 11, 45.5], 0.6, 0.2, { steps: 2, sides: 5 }), TIMBER, { group: "splinter" });
  s.add(limb(railA[1], [-1.6, 12.4, 50], 0.55, 0.2, { steps: 2, sides: 5 }), TIMBER, { group: "splinterA" });
  const along = (rail, z) => {
    const t = z / rail[1][2];
    return [rail[0][0] + (rail[1][0] - rail[0][0]) * t, rail[0][1] + (rail[1][1] - rail[0][1]) * t, z];
  };
  for (let z = 6; z < 40; z += 8) s.add(limb(along(railA, z), along(railB, z), 0.75, 0.75, { steps: 2, sides: 6 }), TIMBER, { group: `rung${z}` });
  // The upper half on the ground before it, one end propped on a stone.
  s.add(ellipsoid([12, -16, 1.6], [3, 2.4, 2.2], { rings: 4, segments: 8 }), STONE, { group: "stone" });
  s.add(limb([-17, -18, 1.1], [15, -16, 4.6], 1.1, 1.0, { steps: 4, sides: 8 }), TIMBER, { group: "railC" });
  s.add(limb([-18, -10, 1.1], [14, -8, 4.4], 1.1, 1.0, { steps: 4, sides: 8 }), TIMBER, { group: "railD" });
  for (let k = 0; k < 4; k++) {
    const t = 0.12 + k * 0.26;
    s.add(limb([-17 + 32 * t, -18 + 2 * t, 1.1 + 3.5 * t], [-18 + 32 * t, -10 + 2 * t, 1.1 + 3.3 * t], 0.7, 0.7, { steps: 2, sides: 6 }),
      TIMBER, { group: `rungC${k}` });
  }
  return render(s.parts, { width: 40, height: 62 });
}

/** Every furnishing by the name the levels place it by. */
export function furnishings3d() {
  return [
    ["stall_0", stall3d(0)], ["stall_1", stall3d(1)], ["stall_2", stall3d(2)], ["rope_post", ropePost3d()], ["lectern", lectern3d()],
    ["scroll_rack", scrollRack3d()], ["shelf_fallen", shelfFallen3d()], ["fountain", fountain3d()], ["cypress", cypress3d()],
    ["armillary", armillary3d()], ["standard", standard3d()], ["ladder_broken", ladderBroken3d()],
  ];
}
