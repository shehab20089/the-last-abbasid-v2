// Set pieces modelled in 3D and rendered into pixel art the way the characters are (the same
// G-buffer rasteriser, sprite shader, separation lines, firelit rim and outline), so the props the
// soldiers handle match them: the pyre of books the Mongols feed in the booksellers' market, and a
// plundered chest. Like every prop each stands on its bottom edge; build_level.mjs places them.
//
// Model space is the characters': x to the right of the screen, y away from the camera, z up, in
// pixels, the ground at z = 0.
import { Canvas, mix } from "../lib/canvas.mjs";
import { P } from "../lib/palette.mjs";
import { ellipsoid, lathe, limb, merge, rotated, roundedBox, translate } from "../lib/meshes.mjs";
import { rasterize, spriteCamera } from "../lib/raster.mjs";
import { toParent } from "../lib/space.mjs";
import { pick, shadeSprite } from "../lib/sprite_shader.mjs";
import { solveBody } from "../characters/body3d.mjs";
import { prepareCharacter, renderPiece, renderPoses } from "../characters/render3d.mjs";
import { townsperson } from "../characters/townsfolk3d.mjs";
import { CORPSES, TOWNSFOLK_PIECES } from "../characters/townsfolk3d_animations.mjs";

const SAMPLES = 4;
const YAW = 22;
const frac = (x) => x - Math.floor(x);
const hash = (x, y, seed = 0) => frac(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453);

/** A small seeded random source (mulberry32). */
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A material from a ramp: lit by the key, a dark outline, a touch of firelight on the back edge. */
const material = (ramp, bias = 0, extra = {}) => ({
  ramp, outline: mix(ramp[0], P.outline, 0.55), line: ramp[0], rim: 0.3, shade: (s) => pick(ramp, s.light, bias), ...extra,
});

/** Renders parts ({ mesh, material, group?, prio? }) into a canvas of the given size. */
function render(parts, { width, height, baseline = 1, yaw = YAW }) {
  const camera = spriteCamera({ width, height, scale: SAMPLES, yaw, baseline });
  const items = parts.map((p, id) => ({ id, v: p.mesh.v, uv: p.mesh.uv, t: p.mesh.t, smooth: p.mesh.smooth,
    twoSided: p.mesh.twoSided, bias: p.bias }));
  const g = rasterize(camera, items);
  return shadeSprite(g, camera, parts.map((p, i) => ({ group: p.group ?? `part${i}`, prio: 1, ...p })), {}).canvas;
}

// --- Books -------------------------------------------------------------------------------------

const COVERS = [P.madder, P.indigo, P.leather, P.saffron, P.jade, P.ochre, P.wool];

// A book's surface (a rounded box, its length along x): v is the height up its edge (0 at the
// middle of the page block); w goes round it from the head (0) by the fore-edge (0.25) and the
// tail (0.5) to the spine (0.75), which faces the camera when the book lies square.
const pagesShow = (s) => Math.abs(s.v) < 0.32 && Math.abs(frac(s.w) - 0.75) > 0.12;

/** A bound book: leather covers and spine, the page block showing at head, tail and fore-edge. */
function bookMaterial(cover) {
  return material(cover, -0.2, {
    shade: (s) => (pagesShow(s) ? pick(P.parchment, s.light, -1.2) : pick(cover, s.light, -0.1)),
  });
}

/** A book the fire has had: black, ash at its edges, a crack here and there still glowing. */
const CHARRED = material(P.night, 0, {
  rim: 0.15,
  shade: (s) => {
    const h = hash(Math.floor(s.x / 2), s.y, 3);
    if (h < 0.05) return P.fire[3 + Math.floor(hash(s.y, s.x, 5) * 2)];
    if (Math.abs(s.v) < 0.4 && s.light > 0.5) return pick(P.ash, s.light, -2);
    return pick(P.night, s.light, 1.6);
  },
});

/** Half-burnt: the cover scorched black from one end, embers along the line where it burns. */
function scorched(cover) {
  return material(cover, -0.2, {
    shade: (s) => {
      const edge = frac(s.w * 2 + 0.25);
      if (edge < 0.4) return pick(P.night, s.light, 1.4);
      if (edge < 0.46) return hash(s.x, s.y, 9) < 0.5 ? P.fire[3] : P.fire[2];
      return pagesShow(s) ? pick(P.parchment, s.light, -1.6) : pick(cover, s.light, -0.5);
    },
  });
}

/** A book lying at (x, y, z) (z its underside), turned by yaw and tilted. */
function book(x, y, z, { len = 10, wide = 7.5, thick = 2.4, yaw = 0, tilt = 0, roll = 0 } = {}) {
  let m = roundedBox([0, 0, thick / 2], [len, wide, thick], { roundness: 0.22, rings: 6, segments: 12 });
  if (tilt) m = rotated(m, [0, 1, 0], tilt);
  if (roll) m = rotated(m, [1, 0, 0], roll);
  m = rotated(m, [0, 0, 1], yaw);
  return translate(m, [x, y, z]);
}

/** A scroll: a parchment roll with darker turned ends. */
const SCROLL = material(P.parchment, -0.4, {
  shade: (s) => (s.v < 0.8 || s.v > s.part.length - 0.8 ? pick(P.ochre, s.light, 0) : pick(P.parchment, s.light, -0.5)),
});

// --- The pyre ----------------------------------------------------------------------------------

/**
 * Books thrown on a heap and burning, over a bed of ash; to its left the pile still to be burnt
 * (a soldier stands there to feed the fire). The level sets a fire on the heap's centre, 6 px right
 * of the prop's middle.
 */
export function bookPyre() {
  const r = random(1258);
  const parts = [];
  const add = (mesh, mat, extra = {}) => parts.push({ mesh, material: mat, ...extra });

  // The bed of ash and embers under the heap.
  add(ellipsoid([6, 0, 0.4], [27, 12, 2.6], { rings: 6, segments: 20 }), material(P.ash, -1.4, {
    rim: 0,
    shade: (s) => {
      const h = hash(s.x, s.y, 11);
      if (h < 0.12) return P.fire[2 + Math.floor(h * 25)];
      return pick(h < 0.5 ? P.smoke : P.ash, s.light, h < 0.5 ? 0 : -2.2);
    },
  }), { group: "ash", separate: false });

  // The heap: rings of books, fewer and more burnt toward the top where the fire is fiercest.
  const layers = [[10, 20], [8, 16], [7, 12], [5, 8], [3, 4.5], [1, 1]];
  layers.forEach(([count, radius], level) => {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r() * 0.6;
      const x = 6 + Math.cos(a) * radius * (0.55 + r() * 0.45);
      const y = Math.sin(a) * radius * 0.45;
      const z = level * 2.9 + r() * 0.8;
      const burnt = level >= 3 || r() < level * 0.22;
      const cover = COVERS[Math.floor(r() * COVERS.length)];
      const mat = burnt ? CHARRED : level >= 1 && r() < 0.5 ? scorched(cover) : bookMaterial(cover);
      // Thrown, not stacked: tipped every way, so covers show as well as page edges.
      add(book(x, y, z, { len: 8.5 + r() * 3.5, wide: 6.5 + r() * 2, thick: 2 + r() * 1.2, yaw: r() * 180,
        tilt: (r() - 0.5) * 70, roll: (r() - 0.5) * 50 }), mat, { group: `book${level}_${i}` });
    }
  });
  // Scrolls thrown on with the books.
  for (const [a, b] of [[[-10, -6, 2.2], [1, -9, 4.8]], [[12, -8, 5.5], [22, -4, 2.0]], [[2, 4, 9.5], [12, 6, 8]]]) {
    add(limb(a, b, 1.5, 1.4, { sides: 8, steps: 3 }), SCROLL, { group: `scroll${a[0]}`,
      length: Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) });
  }

  // Still to burn: a stack at the left, and an open book face down beside it.
  [[-27, -2, 0, 4], [-27.5, -2.4, 2.4, -7], [-26.4, -1.6, 4.8, 9], [-27, -2, 7.2, -3]].forEach(([x, y, z, yaw], i) => {
    add(book(x, y, z, { len: 11, wide: 8, thick: 2.4, yaw }), bookMaterial(COVERS[(i * 3 + 1) % COVERS.length]),
      { group: `stack${i}` });
  });
  add(book(-15, -9, 0, { len: 9, wide: 6, thick: 1.6, yaw: 20, tilt: -12 }), bookMaterial(P.madder), { group: "open1" });
  add(book(-15, -9, 0.2, { len: 9, wide: 6, thick: 1.6, yaw: -150, tilt: -12 }), bookMaterial(P.madder), { group: "open1" });
  return render(parts, { width: 76, height: 30 });
}

// --- The plundered chest -----------------------------------------------------------------------

/** Planks of dark wood: the grain runs along, a darker seam between boards. */
const CHEST_WOOD = material(P.wood, 0, {
  shade: (s) => pick(P.wood, s.light, frac(s.v / 3.1) < 0.18 ? -1.4 : -0.3),
});
const STRAP = material(P.iron, -0.5, {
  shade: (s) => (s.glint > 0.6 ? P.iron[P.iron.length - 1] : frac(s.u / 2.5) < 0.2 ? P.brass[3] : pick(P.iron, s.light, -0.8)),
  glintPower: 18,
});
/** The lid's planks outside; its inside face (turned to the camera once thrown back) in shadow. */
const LID_WOOD = material(P.wood, 0, {
  shade: (s) => (s.v < -0.5 ? pick(P.wood, s.light, -2.2) : pick(P.wood, s.light, frac(s.u / 3.1) < 0.18 ? -1.4 : -0.3)),
});

/**
 * A strongbox broken open: the lid thrown back on its hinges, a cloth dragged out over its front,
 * and what the looter cast aside on the ground (a brass ewer, coins). A soldier kneels at its left
 * to rifle it.
 */
export function lootedChest() {
  const parts = [];
  const add = (mesh, mat, extra = {}) => parts.push({ mesh, material: mat, ...extra });
  const [W, D, H] = [26, 13, 15];
  add(roundedBox([0, 0, H / 2], [W, D, H], { roundness: 0.12, rings: 8, segments: 16 }), CHEST_WOOD, { group: "chest" });
  for (const x of [-8.5, 8.5]) add(roundedBox([x, 0, H / 2], [2.2, D + 0.8, H + 0.6], { roundness: 0.1 }), STRAP, { group: "chest" });
  add(roundedBox([0, -D / 2 - 0.4, H - 4], [3.4, 1.2, 4.4], { roundness: 0.2 }), material(P.brass, -0.3), { group: "chest" });
  // The lid, flung back past upright on its hinges along the back edge.
  let lid = roundedBox([0, -D / 2, 1.3], [W + 0.6, D + 0.4, 2.6], { roundness: 0.15 });
  lid = merge(lid, ...[-8.5, 8.5].map((x) => roundedBox([x, -D / 2, 1.3], [2.2, D + 0.8, 3.0], { roundness: 0.1 })));
  lid = translate(rotated(lid, [1, 0, 0], -128), [0, D / 2, H]);
  add(lid, LID_WOOD, { group: "lid" });

  // A red cloth half dragged out, hanging over the front edge.
  add(roundedBox([-4, -D / 2 - 0.8, H - 3.2], [9, 1.2, 7.5], { roundness: 0.5 }), material(P.madder, -0.2, {
    shade: (s) => pick(P.madder, s.light, frac(s.u / 2.6) < 0.3 ? -1.2 : -0.1),
  }), { group: "cloth" });
  // Cast aside: a brass ewer, a few coins.
  const ewer = lathe([[0.1, 0], [2.6, 0.4], [3.2, 2.8], [2.6, 5.4], [1.2, 6.8], [1.0, 8.6], [1.6, 9.6], [0.4, 10]],
    { segments: 12 });
  add(translate(ewer, [W / 2 + 5, -3, 0]), material(P.brass, -0.2, { glintPower: 14,
    shade: (s) => (s.glint > 0.5 ? P.brass[4] : pick(P.brass, s.light, -0.4)) }), { group: "ewer" });
  [[10, -10], [13, -11.5], [W / 2 + 9, -7], [4, -12], [-3, -11]].forEach(([x, y], i) => {
    add(ellipsoid([x, y, 0.5], [1.4, 1.4, 0.5], { rings: 4, segments: 8 }), material(P.gold, 0.4), { group: `coin${i}` });
  });
  return render(parts, { width: 56, height: 34 });
}

// --- The dead of the streets ---------------------------------------------------------------------
// The townsfolk the soldiers killed, rendered from their own models in the poses they fell in
// (CORPSES in townsfolk3d_animations.mjs), the blood pooled beneath them.

/** A pool of blood on the street under a stretch of a body: ragged at its ends, glossy in places. */
function bloodBeneath(canvas, from, to, ground, seed) {
  for (let x = Math.max(0, Math.floor(from)); x <= Math.min(canvas.width - 1, Math.ceil(to)); x++) {
    const t = (x - from) / Math.max(1, to - from);
    const edge = Math.min(t, 1 - t);
    if (edge < 0.08 && hash(x, seed) < 0.5) continue;
    const thick = edge < 0.12 ? 1 : edge < 0.28 ? 2 : 3;
    for (let k = 0; k < thick; k++) {
      const y = ground + 1 - k;
      if (canvas.alpha(x, y) > 0 && k > 0) continue;
      canvas.set(x, y, k === thick - 1 && hash(x, seed + 1) < 0.12 ? P.blood[3] : k === 0 ? P.blood[0] : P.blood[1]);
    }
  }
}

/** A corpse: rendered, its severed head laid beside it if it has one, cropped, standing in its blood. */
function corpse({ kind, pose, head }, seed) {
  const character = prepareCharacter(townsperson(kind));
  const [width, height, baseline] = [140, 48, 4];
  const [frame] = renderPoses(character, { size: [width, height], fps: 1, poses: [pose] });
  const canvas = frame.canvas;
  const ground = height - baseline;
  // Where the chest and neck lie, to pool the blood beneath them.
  const camera = spriteCamera({ width, height, scale: 1, yaw: character.yaw, baseline });
  const f = solveBody(pose, character.build);
  const neck = camera.project(toParent(f.neck, [0, 0, 4]))[0];
  const hips = camera.project(f.pelvis.o)[0];
  if (head) {
    const piece = TOWNSFOLK_PIECES[kind].head;
    const [lying] = renderPiece(character, { ...piece, angles: [100] });
    const at = Math.round(neck + 12);
    canvas.blit(lying.canvas, at - piece.size[0] / 2, Math.round(ground - lying.bottom - piece.size[1] / 2));
  }
  bloodBeneath(canvas, Math.min(neck, hips) - 6, Math.max(neck, hips) + (head ? 22 : 10), ground, seed);
  // Cropped to the body, its bottom row one pixel into the street (props stand on their bottom edge).
  let left = width;
  let right = 0;
  let top = height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (canvas.alpha(x, y) === 0) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
    }
  }
  const out = new Canvas(right - left + 3, ground + 2 - top + 1);
  out.blit(canvas, -left + 1, -top + 1);
  return out;
}

/** Every 3D prop by name. */
export function props3d() {
  const dead = Object.entries(CORPSES).map(([name, def], i) => [name, corpse(def, 31 + i * 7)]);
  return [["book_pyre", bookPyre()], ["chest_looted", lootedChest()], ...dead];
}
