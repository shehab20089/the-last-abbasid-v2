// The clutter of the streets, modelled in 3D and rendered as the characters are (props3d.mjs), so it takes their light,
// their outline and the fires' rim: clay jars whole and broken, grain sacks, a broken handcart, rubble, a charred beam,
// a heap of books, a fallen banner, the catapults' stone shot, a brazier and a well. The camera looks level (no
// pitch), so nothing here lies flat: what has fallen is heaped, draped or propped, or it would vanish edge-on.
//
// Model space: x to the right of the screen, y away from the camera, z up, in pixels, the ground at z = 0.
import { P } from "../lib/palette.mjs";
import { ellipsoid, lathe, limb, merge, rotated, roundedBox, translate, warp } from "../lib/meshes.mjs";
import { pick } from "../lib/sprite_shader.mjs";
import { CHARRED, COVERS, book, bookMaterial, hash, material, random, render, scorched } from "./props3d.mjs";

const frac = (x) => x - Math.floor(x);
export const at = (o) => ({ o, x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] });
/** A frame whose z axis (a lathe's) runs along y, toward the camera's far side: a wheel facing the viewer. */
export const facing = (o) => ({ o, x: [1, 0, 0], y: [0, 0, 1], z: [0, 1, 0] });

/** Parts collected for render(). */
export function scene() {
  const parts = [];
  return {
    parts,
    add(mesh, mat, extra = {}) {
      parts.push({ mesh, material: mat, group: extra.group ?? `p${parts.length}`, ...extra });
    },
  };
}

// --- Materials ---------------------------------------------------------------------------------------------

/** Fired clay, a painted band about its shoulder (between heights `band[0]` and `band[1]` along the profile). */
export const clay = (ramp, { band = null, bias = -0.2 } = {}) => material(ramp, bias, {
  shade: (s) => (band && s.v > band[0] && s.v < band[1] ? pick(band[2], s.light, -0.3) : pick(ramp, s.light, bias)),
});
/** A turquoise glaze, glossy: the key throws back off it. */
export const GLAZE = material(P.tile, -0.1, { glintPower: 14, shade: (s) => (s.glint > 0.42 ? P.tile[5] : pick(P.tile, s.light, -0.1)) });
/** Coarse linen, a seam darker here and there. */
export const LINEN = material(P.linen, -0.4, { shade: (s) => pick(P.linen, s.light, frac(s.u / 5.5) < 0.12 ? -1.3 : -0.4) });
/** Grain or spice heaped: speckled. */
export const grain = (ramp) => material(ramp, -0.2, { rim: 0.15, shade: (s) => pick(ramp, s.light, hash(s.x, s.y, 7) < 0.22 ? -1.2 : -0.1) });
/** Planks: a dark seam every few pixels across the face, the grain running along. */
export const PLANKS = material(P.wood, 0, { shade: (s) => pick(P.wood, s.light, s.y % 4 === 0 ? -1.3 : hash(s.x >> 2, s.y, 3) < 0.2 ? -0.7 : -0.2) });
export const TIMBER = material(P.wood, 0, { shade: (s) => pick(P.wood, s.light, hash(s.x >> 1, s.y >> 2, 5) < 0.25 ? -0.8 : -0.2) });
export const IRON = material(P.iron, -0.6, { glintPower: 16, shade: (s) => (s.glint > 0.55 ? P.iron[4] : pick(P.iron, s.light, -0.8)) });
export const BRONZE = material(P.bronze, -0.3, { glintPower: 14, shade: (s) => (s.glint > 0.5 ? P.bronze[4] : pick(P.bronze, s.light, -0.3)) });
/** A fired brick, each a little different. */
export const brick = (k) => material(P.brick, -0.2 + (k % 3) * 0.25, { shade: (s) => pick(P.brick, s.light, -0.2 + (k % 3) * 0.25 - (hash(s.x, s.y, k) < 0.1 ? 1 : 0)) });
/** Rough stone, pitted. */
export const STONE = material(P.stone, 0, { shade: (s) => pick(P.stone, s.light, hash(s.x, s.y, 11) < 0.12 ? -1.2 : 0) });
/** Timber the fire has had: charcoal in scales, black splits between them, a few still glowing; ash on what faces
 * up. */
export const BURNT = material(P.smoke, 0, {
  rim: 0.2,
  shade: (s) => {
    const along = s.x + s.y;
    const cx = Math.floor(along / 3);
    const cy = Math.floor(s.y / 2);
    const split = along % 3 === 0 || (s.y % 2 === 0 && hash(cx, cy, 9) < 0.5);
    if (split && hash(cx, cy, 21) < 0.14) return P.fire[2 + Math.floor(hash(s.y, s.x, 2) * 2)];
    if (split) return P.night[0];
    if (s.n[1] > 0.55 && s.light > 0.45) return pick(P.ash, s.light, -2.4);
    return pick(P.smoke, s.light, -0.6);
  },
});
/** Black cloth, its gold-worked edge catching the light. */
const BANNER = material([P.night[0], P.night[1], P.coat[1], P.coat[2], P.coat[3]], 0, {
  shade: (s) => (Math.abs(s.v) < 0.6 ? pick(P.gold, s.light, -0.6) : pick([P.night[0], P.night[1], P.coat[1], P.coat[2], P.coat[3]], s.light, -0.2)),
});
/** Live coals: glowing in their hollows, grey where the ash has crusted. */
const COALS = material(P.fire, 0, {
  rim: 0,
  outline: P.night[0],
  shade: (s) => {
    const h = hash(s.x, s.y, 17);
    if (h < 0.25) return P.ash[0];
    return P.fire[2 + Math.floor((1 - s.light) * 2.5 + h * 1.5)];
  },
});

// --- Jars ------------------------------------------------------------------------------------------------

/** A jar's profile for lathe(): foot, swelling body, shoulder, neck and rolled lip; `belly` its widest radius. */
export function jarProfile(h, belly, neck = 0.3) {
  return [
    [belly * 0.45, 0], [belly * 0.72, h * 0.06], [belly * 0.95, h * 0.2], [belly, h * 0.34], [belly * 0.94, h * 0.5],
    [belly * 0.66, h * 0.68], [belly * neck * 1.15, h * 0.79], [belly * neck, h * 0.86], [belly * neck * 1.4, h * 0.92],
    [belly * neck * 1.3, h * 0.98], [belly * neck * 0.9, h],
  ];
}

/** Two loop handles from a jar's shoulder to its neck. */
function handles(s, x, y, h, belly, mat) {
  for (const side of [-1, 1]) {
    const shoulder = [x + side * belly * 0.7, y, h * 0.66];
    const out = [x + side * (belly * 0.78 + 1.2), y, h * 0.8];
    const neck = [x + side * belly * 0.38, y, h * 0.86];
    s.add(merge(limb(shoulder, out, 0.8, 0.8, { steps: 2, sides: 6 }), limb(out, neck, 0.8, 0.8, { steps: 2, sides: 6 })), mat,
      { group: `jar${x}` });
  }
}

/** Three jars at a door: a tall storage jar with handles and a painted band, a pale water jar, a small glazed one. */
export function jars3d() {
  const s = scene();
  const big = clay(P.brick, { band: [11, 13.5, P.madder] });
  s.add(lathe(jarProfile(26, 8.2), { frame: at([-11, 4, 0]), segments: 18 }), big, { group: "jar-11" });
  handles(s, -11, 4, 26, 8.2, big);
  s.add(lathe(jarProfile(19, 6.4, 0.34), { frame: at([3, -1, 0]), segments: 16 }), clay(P.plaster, { band: [7.5, 9, P.wood] }),
    { group: "jar3" });
  s.add(lathe(jarProfile(13, 4.8, 0.42), { frame: at([13, -7, 0]), segments: 14 }), GLAZE, { group: "jar13" });
  return render(s.parts, { width: 48, height: 32 });
}

/** A storage jar smashed: its foot and body standing to a jagged break, the grain it held spilt, shards about it, a
 * great curved piece propped against it. */
export function brokenJars3d() {
  const s = scene();
  const r = random(41);
  const h = 22;
  const cut = 11.5;
  // The body to the break: the profile up to the cut, its rim made jagged.
  const profile = jarProfile(h, 7.2).filter(([, z]) => z <= cut).concat([[7.2 * 0.97, cut]]);
  let body = lathe(profile, { frame: at([-9, 2, 0]), segments: 18, closeTop: false });
  body = warp(body, (p) => (p[2] > cut - 0.2 ? [p[0], p[1], p[2] - hash(Math.round(p[0] * 3), Math.round(p[1] * 3), 5) * 4.5] : p));
  s.add(body, clay(P.brick, { band: [9, 10.6, P.madder] }), { group: "body" });
  // What was in it, dark at the break.
  s.add(ellipsoid([-9, 2, cut - 3], [6, 6, 1.4], { rings: 4, segments: 14 }), material(P.night, 0, { rim: 0 }), { group: "body" });
  // The grain spilt out from it in a low heap.
  s.add(ellipsoid([4, -1, 0], [9, 5.5, 2.6], { rings: 5, segments: 16 }), grain(P.ochre), { group: "grain" });
  // A great curved piece of the jar's shoulder propped against it, and the shards scattered.
  const shard = rotated(rotated(roundedBox([0, 0, 0], [7, 1.2, 6], { roundness: 0.3 }), [0, 0, 1], 20), [1, 0, 0], -25);
  s.add(translate(shard, [-1, -5, 3.2]), clay(P.brick), { group: "shard" });
  for (let i = 0; i < 7; i++) {
    const piece = rotated(rotated(roundedBox([0, 0, 0], [2.5 + r() * 2.5, 1.0, 1.5 + r() * 1.5], { roundness: 0.35 }),
      [0, 0, 1], r() * 180), [1, 0, 0], 40 + r() * 40);
    s.add(translate(piece, [6 + r() * 12, -6 + r() * 10, 0.9]), clay(r() < 0.3 ? P.plaster : P.brick), { group: `s${i}` });
  }
  return render(s.parts, { width: 44, height: 24 });
}

// --- Sacks ------------------------------------------------------------------------------------------------

/** Grain sacks of coarse linen: one standing, tied at its neck; one slumped against it; grain heaped from a third
 * the soldiers slashed open. */
export function sacks3d() {
  const s = scene();
  // Standing: a lumpy body, the gathered neck and its tie.
  s.add(roundedBox([-12, 3, 7.5], [11.5, 9.5, 15], { roundness: 0.72, rings: 10, segments: 18 }), LINEN, { group: "a" });
  s.add(ellipsoid([-12, 3, 15.6], [2.7, 2.4, 1.8], { rings: 5, segments: 10 }), LINEN, { group: "a" });
  s.add(ellipsoid([-12, 3, 17.9], [3.6, 2.8, 1.7], { rings: 5, segments: 10 }), LINEN, { group: "a2" });
  s.add(limb([-14.6, 3, 16.6], [-9.4, 3, 16.6], 0.6, 0.6, { steps: 2, sides: 6 }), material(P.wood, 0.4), { group: "tie" });
  // Slumped against it.
  s.add(translate(rotated(roundedBox([0, 0, 0], [13, 10, 11], { roundness: 0.78, rings: 10, segments: 18 }), [0, 1, 0], -16),
    [0.5, -2, 5.6]), LINEN, { group: "b" });
  // Slashed open: its grain in a heap, the empty sack lying in folds behind it.
  s.add(ellipsoid([14, -3, 0], [8.5, 6, 4.6], { rings: 6, segments: 16 }), grain(P.ochre), { group: "heap" });
  s.add(ellipsoid([17, 4, 1.4], [6, 4, 2.2], { rings: 5, segments: 12 }), LINEN, { group: "empty" });
  return render(s.parts, { width: 48, height: 24 });
}

// --- The cart -----------------------------------------------------------------------------------------------

/** A wheel facing the viewer: rim, hub and spokes, centred at (x, y, r) so it stands on the ground. */
function wheel(s, x, y, radius, group, { lean = 0 } = {}) {
  const o = [x, y, radius];
  const rim = lathe([[radius - 1.8, -1], [radius, -1], [radius, 1], [radius - 1.8, 1], [radius - 1.8, -1]],
    { frame: facing(o), segments: 28, closeBottom: false, closeTop: false });
  const hub = lathe([[1.6, -1.6], [2.2, -1], [2.2, 1], [1.6, 1.6]], { frame: facing(o), segments: 12 });
  const spokes = [];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.3;
    spokes.push(limb([x + Math.cos(a) * 2, y, radius + Math.sin(a) * 2], [x + Math.cos(a) * (radius - 1.4), y, radius + Math.sin(a) * (radius - 1.4)],
      0.6, 0.55, { steps: 2, sides: 6 }));
  }
  let m = merge(rim, hub, ...spokes);
  if (lean) m = rotated(m, [1, 0, 0], lean, [x, y, 0]);
  s.add(m, TIMBER, { group });
}

/** A handcart abandoned in the street: its bed of planks on one wheel and its shafts, the other wheel off and leaning
 * against it, a sack still in it. */
export function cart3d() {
  const s = scene();
  const axle = 9;
  // The bed tips toward its missing wheel's side, the shafts' ends on the ground.
  let bed = merge(
    roundedBox([0, 0, 0], [38, 17, 2.4], { roundness: 0.12 }),
    roundedBox([0, -8, 3], [38, 1.6, 5.5], { roundness: 0.12 }),
    roundedBox([0, 8, 3], [38, 1.6, 5.5], { roundness: 0.12 }),
    roundedBox([-18.5, 0, 3], [1.6, 17, 5.5], { roundness: 0.12 }),
  );
  bed = translate(rotated(bed, [0, 1, 0], 9), [-4, 0, axle + 3]);
  s.add(bed, PLANKS, { group: "bed" });
  for (const y of [-6.5, 6.5]) {
    s.add(limb([13, y, axle + 1.2], [31, y * 0.8, 1], 1.0, 0.9, { steps: 3, sides: 8 }), TIMBER, { group: `shaft${y}` });
  }
  s.add(limb([-4, -11, axle], [-4, 11, axle], 0.9, 0.9, { steps: 2, sides: 6 }), IRON, { group: "axle" });
  wheel(s, -4, -11, axle, "near");
  // The other wheel, off its axle, leaning on the bed's far side.
  wheel(s, 6, 13, axle - 0.5, "far", { lean: 16 });
  s.add(roundedBox([-8, 1, axle + 8], [10, 9, 7], { roundness: 0.7 }), LINEN, { group: "sack" });
  return render(s.parts, { width: 72, height: 40 });
}

// --- Rubble and timber ---------------------------------------------------------------------------------------

/** What is left of a house front in the street: broken bricks and stones heaped in a mound, a split timber in it. */
export function rubble3d() {
  const s = scene();
  const r = random(13);
  const mound = (x) => Math.max(0, 9.5 * (1 - (x / 26) ** 2));
  for (let i = 0; i < 42; i++) {
    const x = (r() - 0.5) * 50;
    const y = (r() - 0.5) * 12;
    const z = mound(x) * (0.25 + r() * 0.75) + 1;
    let m;
    let mat;
    if (r() < 0.72) {
      m = roundedBox([0, 0, 0], [5.5, 2.8, 2.3], { roundness: 0.22, rings: 4, segments: 8 });
      mat = brick(i);
    } else {
      m = ellipsoid([0, 0, 0], [2.6 + r() * 1.2, 2 + r(), 1.6 + r()], { rings: 4, segments: 8 });
      mat = STONE;
    }
    m = rotated(rotated(rotated(m, [0, 0, 1], r() * 180), [0, 1, 0], (r() - 0.5) * 60), [1, 0, 0], (r() - 0.5) * 40);
    s.add(translate(m, [x, y, z]), mat, { group: `r${i}` });
  }
  s.add(limb([-17, 4, 2], [7, 1, 9.5], 1.3, 1.1, { steps: 3, sides: 8 }), BURNT, { group: "joist" });
  return render(s.parts, { width: 60, height: 20 });
}

/** A roof beam fallen from a burnt house: one end in the street, the other propped on a lump of masonry; charred
 * black and split, ash along its top, embers still in its cracks. */
export function charredBeam3d() {
  const s = scene();
  s.add(ellipsoid([26, 3, 4.5], [6.5, 5, 6], { rings: 6, segments: 12 }), brick(1), { group: "lump" });
  s.add(roundedBox([22, -2, 2], [5, 3, 3], { roundness: 0.25 }), brick(2), { group: "lump2" });
  let beam = roundedBox([0, 0, 0], [64, 5.2, 5], { roundness: 0.2, rings: 6, segments: 18 });
  beam = translate(rotated(beam, [0, 1, 0], -13), [0, 1, 9.8]);
  s.add(beam, BURNT, { group: "beam" });
  return render(s.parts, { width: 76, height: 28 });
}

/** Books flung into a heap at the roadside, some scorched, a few burnt black: the soldiers' work, not yet a pyre. */
export function bookPile3d() {
  const s = scene();
  const r = random(77);
  [[9, 17], [7, 12], [4, 7], [1, 1]].forEach(([count, radius], level) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r() * 0.7;
      const x = Math.cos(a) * radius * (0.5 + r() * 0.5);
      const y = Math.sin(a) * radius * 0.4;
      const cover = COVERS[Math.floor(r() * COVERS.length)];
      const mat = r() < 0.12 + level * 0.08 ? CHARRED : r() < 0.3 ? scorched(cover) : bookMaterial(cover);
      s.add(book(x, y, level * 2.6 + r() * 0.6, { len: 8 + r() * 3.5, wide: 6 + r() * 2, thick: 1.8 + r() * 1.2, yaw: r() * 180,
        tilt: (r() - 0.5) * 60, roll: (r() - 0.5) * 40 }), mat, { group: `b${level}_${i}` });
    }
  });
  return render(s.parts, { width: 56, height: 22 });
}

/** A black banner torn down: its pole across the street, its cloth crumpled over a heap of rubble, the gold-worked
 * edge of its folds catching the light. */
export function fallenBanner3d() {
  const s = scene();
  s.add(roundedBox([-3, 3, 1.6], [12, 6, 3.2], { roundness: 0.4 }), brick(2), { group: "under" });
  s.add(limb([-27, -3, 1.3], [26, 4, 1.3], 1.1, 1.1, { steps: 4, sides: 8 }), TIMBER, { group: "pole" });
  s.add(ellipsoid([31, 4.4, 1.6], [1.6, 1.6, 1.6], { rings: 4, segments: 8 }), BRONZE, { group: "finial" });
  // The cloth in folds, heaped over the pole and the rubble under it.
  for (const [x, y, z, rx, ry, rz, tilt] of [[-8, 0, 3.4, 11, 6, 3.4, 8], [4, 1, 4.6, 9, 5.5, 3.6, -10], [13, 2, 2.6, 7, 5, 2.6, 14],
    [-17, -1, 2.1, 6, 4.5, 2.1, -6]]) {
    s.add(translate(rotated(ellipsoid([0, 0, 0], [rx, ry, rz], { rings: 6, segments: 16 }), [0, 1, 0], tilt), [x, y, z]), BANNER,
      { group: `fold${x}` });
  }
  return render(s.parts, { width: 64, height: 14 });
}

// --- The siege ---------------------------------------------------------------------------------------------

/** Stone shot for the catapults, heaped where it fell: two on the street, one lodged between them. */
export function stoneBalls3d() {
  const s = scene();
  s.add(ellipsoid([-6, 2, 6], [6.2, 6.2, 6.2], { rings: 10, segments: 16 }), STONE, { group: "a" });
  s.add(ellipsoid([6.5, -1, 5.5], [5.6, 5.6, 5.6], { rings: 10, segments: 16 }), STONE, { group: "b" });
  s.add(ellipsoid([0.5, 3.5, 14.5], [5.8, 5.8, 5.8], { rings: 10, segments: 16 }), STONE, { group: "c" });
  return render(s.parts, { width: 28, height: 26 });
}

/** A bronze brazier on an iron tripod, heaped with live coals. */
export function brazier3d() {
  const s = scene();
  s.add(lathe([[1.6, 14.4], [5.5, 15], [8, 17.2], [8.7, 19.2], [8.2, 19.8]], { frame: at([0, 0, 0]), segments: 20, closeTop: false }),
    BRONZE, { group: "bowl" });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.5;
    s.add(limb([Math.cos(a) * 4, Math.sin(a) * 4, 15], [Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0.4], 0.7, 0.6, { steps: 3, sides: 6 }),
      IRON, { group: `leg${k}` });
  }
  const r = random(5);
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const d = r() * 5;
    s.add(ellipsoid([Math.cos(a) * d, Math.sin(a) * d, 19.6 + r() * 1.2], [2.2, 2.2, 1.6], { rings: 4, segments: 8 }), COALS,
      { group: `coal${i}` });
  }
  return render(s.parts, { width: 22, height: 30 });
}

// --- The well ------------------------------------------------------------------------------------------------

/** A round well-head of coursed stone under a timber frame: its pulley, the rope, a bucket left hanging. */
export function well3d() {
  const s = scene();
  const R = 15;
  const courses = material(P.stone, 0, {
    shade: (sf) => {
      const course = Math.floor(sf.v / 4.4);
      const joint = frac(sf.v / 4.4) < 0.2 || frac(sf.u / 9 + course * 0.5) < 0.08;
      return pick(P.stone, sf.light, joint ? -1.4 : hash(Math.floor(sf.u / 9), course, 3) < 0.3 ? -0.6 : 0);
    },
  });
  s.add(lathe([[R, 0], [R, 13], [R + 1.2, 13.4], [R + 1.2, 15.6], [R - 2, 15.8]], { frame: at([0, 0, 0]), segments: 32, closeTop: false }),
    courses, { group: "head" });
  // The dark of the shaft at its mouth.
  s.add(ellipsoid([0, 0, 15], [R - 2.2, R - 2.2, 0.6], { rings: 3, segments: 20 }), material(P.night, 0, { rim: 0 }), { group: "mouth" });
  for (const x of [-R + 1.5, R - 1.5]) s.add(limb([x, 0, 15], [x, 0, 38], 1.4, 1.3, { steps: 3, sides: 8 }), TIMBER, { group: `post${x}` });
  s.add(limb([-R - 1, 0, 37.5], [R + 1, 0, 37.5], 1.5, 1.5, { steps: 3, sides: 8 }), TIMBER, { group: "beam" });
  s.add(lathe([[2.6, -1], [3.2, -0.6], [3.2, 0.6], [2.6, 1]], { frame: facing([0, 0, 34.5]), segments: 14 }), TIMBER, { group: "pulley" });
  s.add(limb([2.8, 0, 34], [2.8, 0, 22.5], 0.45, 0.45, { steps: 2, sides: 5 }), material(P.linen, -0.2), { group: "rope" });
  s.add(lathe([[1.9, 17.5], [2.4, 18], [2.8, 22], [2.6, 22.4]], { frame: at([2.8, 0, 0]), segments: 12 }), material(P.wood, 0, {
    shade: (sf) => (Math.abs(sf.v - 1.2) < 0.6 || Math.abs(sf.v - 3.6) < 0.5 ? pick(P.iron, sf.light, -0.4) : pick(P.wood, sf.light, -0.2)),
  }), { group: "bucket" });
  return render(s.parts, { width: 52, height: 46 });
}

// --- The foreground ------------------------------------------------------------------------------------------

/**
 * A heap in the near dark between the viewer and the street, passing low across the foot of the view: rubble, a
 * broken jar, a charred beam end jutting from it. Nearer than the fires and out of their light, it is all but black;
 * the firelight beyond catches only its top.
 */
export function foregroundHeap() {
  const s = scene();
  const r = random(97);
  const mound = (x) => Math.max(0, 30 * (1 - (x / 74) ** 2) * (0.75 + 0.25 * Math.sin(x * 0.09 + 1)));
  for (let i = 0; i < 70; i++) {
    const x = (r() - 0.5) * 140;
    const y = (r() - 0.5) * 16;
    const z = mound(x) * (0.35 + r() * 0.65) + 1;
    const m = r() < 0.6
      ? roundedBox([0, 0, 0], [9, 4.5, 3.8], { roundness: 0.22, rings: 4, segments: 8 })
      : ellipsoid([0, 0, 0], [4 + r() * 2.5, 3 + r() * 2, 3 + r() * 2], { rings: 4, segments: 8 });
    s.add(translate(rotated(rotated(m, [0, 0, 1], r() * 180), [0, 1, 0], (r() - 0.5) * 60), [x, y, z]), r() < 0.6 ? brick(i) : STONE,
      { group: `h${i}` });
  }
  const jar = lathe(jarProfile(30, 10).filter(([, z]) => z < 19).concat([[9.6, 19]]), { frame: at([34, -4, 8]), segments: 16, closeTop: false });
  s.add(warp(jar, (p) => (p[2] > 26.5 ? [p[0], p[1], p[2] - hash(Math.round(p[0] * 2), Math.round(p[1] * 2), 3) * 6] : p)), clay(P.brick),
    { group: "jar" });
  s.add(translate(rotated(roundedBox([0, 0, 0], [46, 6, 6], { roundness: 0.2 }), [0, 1, 0], -28), [-30, 2, 22]), BURNT, { group: "beam" });
  const c = render(s.parts, { width: 160, height: 48 });
  // Into the dark, but for the firelight along its top.
  for (let x = 0; x < c.width; x++) {
    let edge = 0;
    for (let y = 0; y < c.height; y++) {
      const col = c.get(x, y);
      if (col[3] === 0) {
        edge = 0;
        continue;
      }
      const dark = [col[0] * 0.2, col[1] * 0.18, col[2] * 0.2, 255].map(Math.round);
      const rim = edge === 0 ? 0.55 : edge === 1 ? 0.22 : 0;
      c.set(x, y, rim ? [0, 1, 2].map((k) => Math.round(dark[k] + (P.fire[3][k] - dark[k]) * rim)).concat(255) : dark);
      edge += 1;
    }
  }
  return c;
}

/** Every piece of clutter by the name the levels place it by. */
export function clutter3d() {
  return [
    ["jars", jars3d()], ["jars_broken", brokenJars3d()], ["sacks", sacks3d()], ["cart", cart3d()], ["rubble", rubble3d()],
    ["beam_charred", charredBeam3d()], ["book_pile", bookPile3d()], ["banner_fallen", fallenBanner3d()],
    ["stone_ball", stoneBalls3d()], ["brazier", brazier3d()], ["well", well3d()], ["fg_rubble", foregroundHeap()],
  ];
}
