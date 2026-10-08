// The 16x16 tileset every level shares: stone paving over masonry that sinks into darkness, dressed
// stone blocks, timber platforms (one-way), crates and fired-brick walls, each with variants and edge
// pieces, in warm smoke-stained tones matched to the concept paintings. Patterns repeat every 16 px
// or less (or continue by row), so any variant sits next to any other without a seam.
import { Canvas, P, fbm, hash2, hex, pick } from "./env_lib.mjs";

export const TILE = 16;

/** Atlas coordinates by role. The level builder picks among variants by position. */
export const ATLAS = {
  streetTop: [[0, 0], [1, 0], [2, 0], [3, 0]],
  streetTopLeft: [4, 0],
  streetTopRight: [5, 0],
  streetTopSingle: [6, 0],
  streetFill: [[0, 1], [1, 1], [2, 1], [3, 1]],
  streetFillLeft: [4, 1],
  streetFillRight: [5, 1],
  streetDeep: [[0, 2], [1, 2]],
  streetDeepLeft: [4, 2],
  streetDeepRight: [5, 2],
  stoneTop: [[0, 3], [1, 3]],
  stoneTopLeft: [2, 3],
  stoneTopRight: [3, 3],
  stoneFill: [[4, 3], [5, 3]],
  stoneFillLeft: [6, 3],
  stoneFillRight: [7, 3],
  stoneTopSingle: [7, 0],
  plankLeft: [0, 4],
  plankMid: [[1, 4], [2, 4]],
  plankRight: [3, 4],
  plankSingle: [4, 4],
  crate: [[2, 2], [3, 2]],
  brick: [[0, 5], [1, 5], [2, 5]],
  brickTop: [[3, 5], [4, 5]],
  brickLeft: [5, 5],
  brickRight: [6, 5],
};
export const ATLAS_SIZE = [8, 6];

/** Tiles whose collision is a thin one-way top (the rest are solid squares). */
export const ONE_WAY = new Set(["0:4", "1:4", "2:4", "3:4", "4:4"].map((k) => k.replace(":", ",")));

function tile(atlas, col, row, paint) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const color = paint(x, y, col * TILE + x, row * TILE + y);
      if (color) atlas.set(col * TILE + x, row * TILE + y, color);
    }
  }
}

/** Warm, smoke-stained stone: the paving and masonry of every street, matched to the paintings. */
const WARM = ["#120e0e", "#1c1615", "#28201d", "#372c27", "#4a3d34", "#615041", "#7d6650", "#9e8263"].map((c) => hex(c));
const warm = (i) => WARM[Math.max(0, Math.min(WARM.length - 1, Math.round(i)))];

/**
 * Bevelled blocks in courses: each block lit along its top, shadowed along its foot, its own tone,
 * now and then cracked. gy is the row within the column of tiles (so courses continue down).
 */
function masonry(gx, gy, base, seed, { course = 6, length = 12 } = {}) {
  const row = Math.floor(gy / course);
  const within = gy - row * course;
  const shift = row % 2 === 0 ? 0 : Math.floor(length / 2);
  const col = Math.floor((gx + shift) / length);
  const along = (gx + shift) - col * length;
  if (within === course - 1 || along === 0) return warm(base - 2);
  let tone = base + (hash2(col, row, seed) < 0.3 ? -1 : hash2(col, row, seed) > 0.82 ? 1 : 0);
  if (within === 0) tone += 1;
  if (within === course - 2) tone -= 0.6;
  if (along === length - 1) tone -= 0.5;
  // A crack across a few blocks, and the odd chipped corner.
  if (hash2(col, row, seed + 3) < 0.12 && Math.abs(along - Math.floor(length / 2) - (within - 2)) < 0.6) tone -= 1.5;
  if (within <= 1 && along <= 1 && hash2(col, row, seed + 5) < 0.4) tone -= 1;
  return warm(tone);
}

/** The street: a worn paving edge lit by the fires and the sky, then the masonry beneath it, sinking
 * into darkness. */
function street(x, y, variant, { top = true, left = false, right = false, deep = 0 } = {}) {
  const gx = x + variant * 16;
  if (top) {
    if ((left && x === 0 && y < 2) || (right && x === 15 && y < 2)) return null;
    if (y === 0) return (left && x <= 1) || (right && x >= 14) ? warm(5) : hash2(gx, 0, 3) < 0.18 ? warm(7) : warm(6);
    if (y === 1) return warm(5);
    if (y === 2) return hash2(gx, 2, 4) < 0.5 ? warm(4) : warm(3);
  }
  const gy = (top ? y - 3 : y + 13) + deep * 16;
  const base = 4 - Math.min(2.6, gy / 12);
  let c = masonry(gx, gy, base, 17);
  if ((left && x <= 1) || (right && x >= 14)) c = warm(Math.max(0, WARM.indexOf(c) - 1));
  return c;
}

/** Dressed stone blocks (steps, plinths, ledges): bigger blocks, a lit top. */
function stone(x, y, variant, { top = true, left = false, right = false } = {}) {
  const gx = x + variant * 7;
  if (top && ((left && x === 0 && y === 0) || (right && x === 15 && y === 0))) return null;
  if (top && y === 0) return hash2(gx, 0, 23) < 0.2 ? warm(7) : warm(6);
  if (top && y === 1) return warm(5);
  let c = masonry(gx, y + (top ? 6 : 0), 4, 21, { course: 8, length: 16 });
  if ((left && x === 0) || (right && x === 15)) c = warm(Math.max(0, WARM.indexOf(c) - 1));
  return c;
}
/** A timber platform: a thick plank on top, the rest open. */
function plank(x, y, variant, { left = false, right = false } = {}) {
  if (y > 6) {
    // Brackets under the ends.
    if ((left && x >= 2 && x <= 4 && y < 12 - (x - 2)) || (right && x >= 11 && x <= 13 && y < 12 - (13 - x))) {
      return pick(P.wood, 2);
    }
    return null;
  }
  if ((left && x === 0 && (y === 0 || y === 6)) || (right && x === 15 && (y === 0 || y === 6))) return null;
  if (y === 0) return P.wood[5];
  if (y === 6) return P.wood[1];
  if (y === 5) return P.wood[2];
  const gx = x + variant * 11;
  let tone = 3 + (fbm(gx * 0.2, y * 1.2, { seed: 31 }) > 0.6 ? 1 : 0);
  if (gx % 12 === 0) tone = 1; // a joint between boards
  if (y === 1) tone += 1;
  if ((left && x === 0) || (right && x === 15)) tone -= 1;
  return pick(P.wood, tone);
}

/** A plank crate: frame, a diagonal brace, nails, a lit lid. */
function crate(x, y, variant) {
  const frame = x === 0 || x === 15 || y === 0 || y === 15;
  if (frame) {
    if (y === 0) return P.wood[5];
    if ((x === 0 || x === 15) && (y === 2 || y === 13)) return P.bronze[3];
    return x === 15 || y === 15 ? P.wood[1] : P.wood[3];
  }
  const brace = variant === 0 ? Math.abs(x - y) <= 1 : Math.abs(x - (15 - y)) <= 1;
  if (brace) return P.wood[4];
  if (y % 5 === 0) return P.wood[1];
  return pick(P.wood, 2 + (fbm(x * 0.3, y * 1.5, { seed: 51 + variant }) > 0.6 ? 1 : 0));
}

function brick(x, y, variant, { top = false, left = false, right = false } = {}) {
  const gx = x + variant * 16;
  if (top && y < 3) {
    // A plaster cap along the wall top.
    if (y === 0) return P.plaster[4];
    return P.plaster[y === 1 ? 3 : 2];
  }
  const row = Math.floor(y / 4);
  const offset = row % 2 === 0 ? 0 : 4;
  if (y % 4 === 0 || (gx + offset) % 8 === 0) return P.brick[1];
  let tone = 3 + (hash2(Math.floor((gx + offset) / 8), row + variant * 3, 41) < 0.3 ? -1 : 0);
  if (y % 4 === 1) tone += 1;
  if ((left && x === 0) || (right && x === 15)) tone -= 1;
  return pick(P.brick, tone);
}

/** Paints the whole atlas. */
export function buildTileset() {
  const atlas = new Canvas(ATLAS_SIZE[0] * TILE, ATLAS_SIZE[1] * TILE);
  ATLAS.streetTop.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => street(x, y, v)));
  tile(atlas, 4, 0, (x, y) => street(x, y, 0, { left: true }));
  tile(atlas, 5, 0, (x, y) => street(x, y, 1, { right: true }));
  tile(atlas, 6, 0, (x, y) => street(x, y, 2, { left: true, right: true }));
  ATLAS.streetFill.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => street(x, y, v, { top: false })));
  tile(atlas, 4, 1, (x, y) => street(x, y, 0, { top: false, left: true }));
  tile(atlas, 5, 1, (x, y) => street(x, y, 1, { top: false, right: true }));
  ATLAS.streetDeep.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => street(x, y, v, { top: false, deep: 1 })));
  tile(atlas, 4, 2, (x, y) => street(x, y, 0, { top: false, left: true, deep: 1 }));
  tile(atlas, 5, 2, (x, y) => street(x, y, 1, { top: false, right: true, deep: 1 }));
  ATLAS.stoneTop.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => stone(x, y, v)));
  tile(atlas, 2, 3, (x, y) => stone(x, y, 0, { left: true }));
  tile(atlas, 3, 3, (x, y) => stone(x, y, 1, { right: true }));
  ATLAS.stoneFill.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => stone(x, y + 8, v, { top: false })));
  tile(atlas, 6, 3, (x, y) => stone(x, y + 8, 0, { top: false, left: true }));
  tile(atlas, 7, 3, (x, y) => stone(x, y + 8, 1, { top: false, right: true }));
  tile(atlas, 7, 0, (x, y) => stone(x, y, 2, { left: true, right: true }));
  tile(atlas, 0, 4, (x, y) => plank(x, y, 0, { left: true }));
  ATLAS.plankMid.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => plank(x, y, v + 1)));
  tile(atlas, 3, 4, (x, y) => plank(x, y, 3, { right: true }));
  tile(atlas, 4, 4, (x, y) => plank(x, y, 4, { left: true, right: true }));
  ATLAS.crate.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => crate(x, y, v)));
  ATLAS.brick.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => brick(x, y, v)));
  ATLAS.brickTop.forEach(([c, r], v) => tile(atlas, c, r, (x, y) => brick(x, y, v, { top: true })));
  tile(atlas, 5, 5, (x, y) => brick(x, y, 0, { left: true }));
  tile(atlas, 6, 5, (x, y) => brick(x, y, 1, { right: true }));
  return atlas;
}

/** The TileSet resource text: one atlas, solid squares, one-way planks. */
export function tilesetResource(texturePath) {
  const lines = ['[gd_resource type="TileSet" format=3]', "",
    `[ext_resource type="Texture2D" path="${texturePath}" id="1_atlas"]`, "",
    '[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_market"]',
    'texture = ExtResource("1_atlas")'];
  const used = new Set();
  const collect = (entry) => {
    if (typeof entry[0] === "number") used.add(`${entry[0]},${entry[1]}`);
    else entry.forEach((e) => used.add(`${e[0]},${e[1]}`));
  };
  Object.values(ATLAS).forEach(collect);
  for (const key of [...used].sort()) {
    const [c, r] = key.split(",").map(Number);
    lines.push(`${c}:${r}/0 = 0`);
    if (ONE_WAY.has(key)) {
      lines.push(`${c}:${r}/0/physics_layer_0/polygon_0/points = PackedVector2Array(-8, -8, 8, -8, 8, -3, -8, -3)`);
      lines.push(`${c}:${r}/0/physics_layer_0/polygon_0/one_way = true`);
    } else {
      lines.push(`${c}:${r}/0/physics_layer_0/polygon_0/points = PackedVector2Array(-8, -8, 8, -8, 8, 8, -8, 8)`);
    }
  }
  lines.push("", "[resource]", "physics_layer_0/collision_layer = 1",
    'sources/0 = SubResource("TileSetAtlasSource_market")', "");
  return lines.join("\n");
}
