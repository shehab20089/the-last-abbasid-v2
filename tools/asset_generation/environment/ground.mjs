// The street underfoot, painted for a level's whole length and cut into chunks drawn over the tiles (which stay for
// the collisions): the paving, seen a little from above, worn and strewn with what the sack has left, catching the
// fires as the facades behind it do; the kerb under it and the masonry beneath, falling into the dark; and in the
// play the stone steps and terraces, the crates and the timber galleries, lit by the same lights.
//
// The light is the facades' (backdrop.mjs: the hour's grade, the fires), but the ground is not a wall. Its paving
// faces up, to the sky and the flames standing on it; its front face stands before the fires, so they cannot reach it
// but by a spill, and by what the lit paving throws back onto the kerb.
import { join } from "node:path";
import { Canvas, P, fbm, hash2, hex, mix, pick } from "./env_lib.mjs";
import { rng } from "../lib/noise.mjs";
import { CHUNK, STREET_ROW, levelGrade, streetLights, toPalette } from "./backdrop.mjs";
import { SKY_DIR, display, emissiveSet, linear } from "./relief.mjs";

/** The level y of a level's ground: room above its highest stone, crate or plank (a gallery) for what is seen of its
 * top. */
export function groundTop(level) {
  const rows = level.terrain.filter(([material]) => material !== "brick").map(([, , , r0]) => r0);
  return Math.min(STREET_ROW - 4, ...rows) * 16 - 8;
}

/** How a pixel takes the light: a face turned to the viewer, the paving's top (turned up), the arris between them,
 * or something lying loose on the paving. */
const EMPTY = 0;
const FACE = 1;
const TOP = 2;
const LIP = 3;
const LOOSE = 4;

/** The paving: rows above the walking line, and at and below it, before the lip. */
const BAND_UP = 3;
const BAND_DOWN = 5;
/** How far out toward the viewer the street's front stands, and the faces in the play (stone, crates, timber). */
const FRONT = 40;
const PLAY = 8;

/** Warm, smoke-stained stone, matched to the paintings (the tiles' own). */
const STONE = ["#120e0e", "#1c1615", "#28201d", "#372c27", "#4a3d34", "#615041", "#7d6650", "#9e8263"].map((c) => hex(c));
/** Packed earth of the camp's square. */
const EARTH = ["#120d0a", "#1e1611", "#2c2119", "#3d2e22", "#50402f", "#66523c", "#7f6a4e"].map((c) => hex(c));

/** How each stretch of street is paved, by its theme. */
const PAVING = {
  houses: "flags", potters: "flags", spices: "flags", books: "flags", khan: "flags", mosque: "flags", darb: "flags",
  portal: "fine", madrasa: "fine", library: "fine", hammam: "bricks", ruin: "bricks", river: "slabs", wall: "slabs",
  rampart: "slabs", gatehouse: "slabs", camp: "earth",
};
/** What lies in the street, by its theme: [kind, how many to a hundred pixels]. */
const LITTER = {
  houses: [["stone", 1.2], ["shard", 0.8], ["splinter", 0.6], ["cloth", 0.15]],
  potters: [["shard", 2.6], ["stone", 0.6], ["splinter", 0.3]],
  spices: [["spice", 0.7], ["shard", 0.8], ["stone", 0.5]],
  books: [["page", 2.2], ["stone", 0.5], ["splinter", 0.3]],
  khan: [["straw", 1.6], ["splinter", 0.8], ["stone", 0.5]],
  mosque: [["stone", 0.9], ["page", 0.4]],
  darb: [["stone", 1.2], ["splinter", 0.5]],
  portal: [["page", 1.2], ["stone", 0.6]],
  madrasa: [["page", 1.6], ["stone", 0.5]],
  library: [["page", 2.4], ["splinter", 0.4]],
  hammam: [["stone", 1.2], ["shard", 0.8]],
  ruin: [["stone", 2.2], ["charcoal", 1.6], ["splinter", 1.0]],
  river: [["stone", 0.9], ["arrow", 0.25]],
  wall: [["stone", 1.6], ["arrow", 0.5], ["splinter", 0.4]],
  rampart: [["stone", 1.8], ["arrow", 0.7], ["splinter", 0.5]],
  gatehouse: [["stone", 1.6], ["arrow", 0.8], ["splinter", 0.5]],
  camp: [["straw", 2.0], ["arrow", 0.4], ["splinter", 0.4]],
};

class Ground {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.c = new Canvas(width, height);
    const n = width * height;
    this.kind = new Uint8Array(n);
    /** How far out toward the viewer: the facades' foot is 0. */
    this.z = new Float32Array(n);
    /** For the paving: the row of its surface (its height in the street); for the rest, its own row. */
    this.wy = new Float32Array(n);
    /** Small relief on a face (mortar, chips, a stone's bulge), for its tilt and its hollows. */
    this.rel = new Float32Array(n);
    /** Occlusion, and the dark that gathers under the street. */
    this.shade = new Float32Array(n).fill(1);
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  put(x, y, color, kind, { z = 0, wy = y, rel = 0, shade = 1 } = {}) {
    if (!this.inside(x, y)) return;
    const i = y * this.width + x;
    this.c.set(x, y, color);
    this.kind[i] = kind;
    this.z[i] = z;
    this.wy[i] = wy;
    this.rel[i] = rel;
    this.shade[i] = shade;
  }

  /** Darkens what is already there (a stain, ash, soot) without changing how it takes the light. */
  tint(x, y, color, amount) {
    if (!this.inside(x, y) || this.kind[y * this.width + x] === EMPTY) return;
    this.c.set(x, y, mix(this.c.get(x, y), color, amount));
  }
}

function terrainGrid(level) {
  const grid = Array.from({ length: level.rows }, () => new Array(level.cols).fill(null));
  for (const [material, c0, c1, r0, r1] of level.terrain) {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = material;
  }
  return grid;
}

/** Joints along a course: for each x, the index of the piece it lies in, and whether it is a joint. */
function course(width, seed, min, spread) {
  const piece = new Int32Array(width);
  const joint = new Uint8Array(width);
  let x = -Math.floor(hash2(seed, 0, 1) * min);
  let k = 0;
  while (x < width) {
    const length = min + Math.floor(hash2(k, seed, 2) * spread);
    for (let px = Math.max(0, x); px < Math.min(width, x + length); px++) {
      piece[px] = k;
      joint[px] = px === x ? 1 : 0;
    }
    x += length;
    k += 1;
  }
  return { piece, joint };
}

// --- The street ---------------------------------------------------------------------------------------------

/**
 * The paving's colour at x on band row i (0 at the back, where the facades stand), by its kind. Returns
 * [colour, relief] (a joint or a hollow sinks).
 */
function paver(style, x0, i, courses, seed) {
  const back = courses.back;
  const front = courses.front;
  // The joints run back into the street, so they lean: a floor seen a little from above and from the side.
  const x = Math.max(0, x0 - Math.round((i - 4) * 0.8));
  if (style === "earth") {
    // Packed earth, rutted by wheels along the street, pocked by hooves.
    const n = fbm(x * 0.09, i * 0.6, { seed, octaves: 3 });
    let tone = 4 + (n > 0.62 ? 1 : n < 0.36 ? -1 : 0);
    const rut = (i === 3 || i === 6) && fbm(x * 0.04, i, { seed: seed + 3 }) > 0.42;
    if (rut) tone -= 1;
    if (hash2(x >> 1, i, seed + 5) < 0.025) tone -= 1;
    return [pick(EARTH, tone), rut ? -0.4 : 0];
  }
  if (style === "slabs") {
    // Great slabs of the walls' own stone, one course across, worn smooth along the walk.
    const k = back.piece[x];
    if (back.joint[x]) return [STONE[3], -0.7];
    let tone = 5 + (hash2(k, 1, seed) < 0.3 ? -1 : 0) + (i === 3 || i === 4 ? 0.4 : 0);
    if (hash2(k, 2, seed) < 0.18 && Math.abs((x - k * 7) % 11 - i) < 1) tone -= 1.5;
    return [pick(STONE, tone), 0];
  }
  if (style === "bricks") {
    // Fired pavers in courses of two rows, the joints staggered, scorched and broken where the quarter burned.
    const row = [-1, 0, 0, -1, 1, 1, -1, 2][i];
    if (row < 0) return [P.brick[1], -0.7];
    const within = i - [1, 4, 7][row];
    const shift = row % 2 ? 3 : 0;
    const k = Math.floor((x + shift) / 6);
    if ((x + shift) % 6 === 0) return [P.brick[1], -0.6];
    let tone = 3 + (hash2(k, row, seed) < 0.3 ? -1 : hash2(k, row, seed) > 0.85 ? 1 : 0) + (within === 0 ? 0.5 : 0);
    if (hash2(k, row, seed + 4) < 0.08) return [P.brick[1], -1.2];
    return [pick(P.brick, tone), 0];
  }
  // Flags in two courses: the back one (rows 1 to 3) and the front one (rows 5 to 7), a joint between; worn paler
  // along the walking line; now and then one cracked, sunk or gone, the earth under it showing.
  const fine = style === "fine";
  const frontCourse = i >= 5;
  if (i === 4) return [STONE[3], -0.7];
  const c = frontCourse ? front : back;
  const k = c.piece[x];
  if (c.joint[x]) return [STONE[fine ? 4 : 3], fine ? -0.4 : -0.7];
  const h = hash2(k, frontCourse ? 7 : 3, seed);
  if (!fine && h < 0.045) return [pick(EARTH, 2 + (hash2(x, i, seed) < 0.3 ? 1 : 0)), -1.4];
  let tone = (fine ? 6 : 5) + (h < 0.28 ? -1 : h > 0.86 ? 1 : 0) + (i === 3 || i === 5 ? 0.45 : 0);
  if (!fine && hash2(k, 11, seed) < 0.16 && Math.abs(((x * 2 + i * 3 + k * 5) % 13) - 6) < 0.6) tone -= 1.5;
  if (!fine && hash2(k, 13, seed) < 0.1) tone -= 1;
  return [pick(STONE, tone), 0];
}

/** Rubble masonry under the kerb: rounded stones of many sizes in dark mortar, each bulging, lit on its top. */
function rubble(x, y, seed) {
  const cw = 11;
  const ch = 7;
  const gx = Math.floor(x / cw);
  const gy = Math.floor(y / ch);
  let d1 = Infinity;
  let d2 = Infinity;
  let id = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const cx = (gx + ox) * cw + hash2(gx + ox, gy + oy, seed) * cw;
      const cy = (gy + oy) * ch + hash2(gx + ox, gy + oy, seed + 1) * ch;
      const d = Math.hypot((x - cx) * 0.8, y - cy);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = (gx + ox) * 7919 + (gy + oy) * 104729;
      } else if (d < d2) {
        d2 = d;
      }
    }
  }
  if (d2 - d1 < 1.3) return { color: STONE[1], rel: -0.8 };
  const h = hash2(id, 3, seed);
  const tone = 3 + (h < 0.35 ? -1 : 0);
  return { color: pick(STONE, tone), rel: Math.max(0, 1.0 - d1 * 0.22) };
}

/** The kerb: long dressed stones under the lip, each its own tone, chipped at the corners. */
function kerb(x, j, courses, seed) {
  const k = courses.kerb.piece[x];
  if (courses.kerb.joint[x]) return [STONE[2], -0.9];
  if (j === 5) return [STONE[2], -0.5];
  const h = hash2(k, 21, seed);
  let tone = 4 + (h < 0.3 ? -1 : h > 0.85 ? 1 : 0) + (j === 0 ? 0.6 : 0);
  if (j <= 1 && hash2(k, 23, seed) < 0.3 && (x - courses.kerbStart(x)) < 2) return [STONE[2], -1];
  return [pick(STONE, tone), 0];
}

// --- What lies in the street --------------------------------------------------------------------------------

/** One thing lying on the paving at x, on band row i (its foot), drawn over it. */
function litter(g, kind, x, line, i, seed) {
  const footY = line - BAND_UP + i;
  const z = (i * FRONT) / (BAND_UP + BAND_DOWN - 1);
  const loose = (px, py, color, rel = 0) => g.put(px, py, color, LOOSE, { z, wy: line, rel });
  const r = rng(seed);
  if (kind === "stone") {
    // A lump of fallen masonry: lit on its top, dark at its foot.
    const w = 2 + Math.floor(r() * 4);
    const h = 1 + Math.floor(r() * Math.min(3, w));
    const ramp = r() < 0.6 ? STONE : P.brick;
    for (let dx = 0; dx < w; dx++) {
      const top = h - (dx === 0 || dx === w - 1 ? 1 : 0);
      for (let dy = 0; dy < top; dy++) {
        loose(x + dx, footY - dy, pick(ramp, dy === top - 1 ? 5 : dy === 0 ? 3 : 4), dy * 0.5);
      }
    }
  } else if (kind === "shard") {
    // A shard of a broken jar: glazed or bare clay, curved.
    const ramp = r() < 0.35 ? P.tile : r() < 0.5 ? P.plaster : P.brick;
    const w = 2 + Math.floor(r() * 3);
    for (let dx = 0; dx < w; dx++) loose(x + dx, footY - (dx > 0 && dx < w - 1 && r() < 0.5 ? 1 : 0), pick(ramp, 4 + (dx === 0 ? 1 : 0)));
  } else if (kind === "splinter") {
    const w = 3 + Math.floor(r() * 4);
    const slope = r() < 0.5 ? 0 : r() < 0.5 ? 1 : -1;
    for (let dx = 0; dx < w; dx++) loose(x + dx, footY - Math.round((dx / w) * slope), pick(P.wood, 3 + (dx % 2)));
  } else if (kind === "page") {
    // A leaf torn from a book: pale, a line of writing across it, its corner turned up.
    const w = 3 + Math.floor(r() * 2);
    for (let dx = 0; dx < w; dx++) {
      loose(x + dx, footY, pick(P.parchment, dx === 1 ? 2 : 3));
      if (dx === w - 1 && r() < 0.6) loose(x + dx, footY - 1, P.parchment[4], 0.6);
    }
    if (r() < 0.6) loose(x + 1, footY, P.wood[0]);
  } else if (kind === "spice") {
    // Spice spilled from a split sack, in a fan across the stones.
    const ramp = r() < 0.5 ? P.saffron : r() < 0.6 ? P.madder : P.ochre;
    const w = 5 + Math.floor(r() * 6);
    for (let dx = 0; dx < w; dx++) {
      const reach = Math.round(Math.sin((dx / w) * Math.PI) * 2);
      for (let dy = -reach; dy <= 0; dy++) {
        if (hash2(x + dx, dy, seed) < 0.75) loose(x + dx, footY + dy, pick(ramp, 2 + (dy === -reach ? 1 : 0)));
      }
    }
  } else if (kind === "straw") {
    const w = 3 + Math.floor(r() * 4);
    for (let dx = 0; dx < w; dx++) if (r() < 0.8) loose(x + dx, footY - (r() < 0.3 ? 1 : 0), pick(P.saffron, 1 + (r() < 0.4 ? 1 : 0)));
  } else if (kind === "charcoal") {
    // Charred wood from the fires: black, a glow left in some.
    const w = 2 + Math.floor(r() * 4);
    for (let dx = 0; dx < w; dx++) loose(x + dx, footY - (dx % 2), dx === 1 && r() < 0.3 ? P.fire[2] : P.night[1]);
  } else if (kind === "cloth") {
    // A dropped head-cloth or sash.
    const ramp = r() < 0.5 ? P.madder : P.indigo;
    const w = 5 + Math.floor(r() * 4);
    for (let dx = 0; dx < w; dx++) {
      loose(x + dx, footY, pick(ramp, 2));
      if (dx > 0 && dx < w - 1) loose(x + dx, footY - 1, pick(ramp, 3), 0.5);
    }
  } else if (kind === "arrow") {
    // A spent arrow lying across the paving: the shaft, its fletching and its iron head.
    const len = 10 + Math.floor(r() * 4);
    const dir = r() < 0.5 ? 1 : -1;
    const drop = r() < 0.5 ? 1 : 2;
    for (let d = 0; d < len; d++) {
      const px = x + d * dir;
      const py = footY - Math.round((d / len) * drop);
      const color = d < 3 ? (d % 2 ? P.linen[3] : P.madder[2]) : d === len - 1 ? P.iron[4] : P.wood[4];
      loose(px, py, color);
    }
  }
}

// --- The play: stone, crates, timber ------------------------------------------------------------------------

/** Dressed stone in courses (steps, terraces, plinths): each block chamfered, its own tone. */
function ashlar(x, y, seed) {
  const row = Math.floor(y / 8);
  const shift = row % 2 ? 8 : 0;
  const k = Math.floor((x + shift) / 16);
  const u = (x + shift) % 16;
  const v = y % 8;
  if (u === 0 || v === 7) return [STONE[2], -0.9];
  const h = hash2(k, row, seed);
  let tone = 5 + (h < 0.3 ? -1 : h > 0.85 ? 1 : 0) + (v === 0 ? 0.6 : 0) - (v === 6 ? 0.5 : 0);
  if (hash2(k, row, seed + 1) < 0.15 && Math.abs(u - 8 - (v - 3)) < 0.6) tone -= 1.4;
  return [pick(STONE, tone), u === 1 || u === 15 || v === 0 || v === 6 ? -0.25 : 0];
}

/** One crate of `size` px square with its foot at (x, foot): a frame of planks, boards, a brace, nails at the corners. */
function crate(g, x0, top, size, seed, exposed) {
  const brace = hash2(x0, top, seed) < 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x0 + x;
      const py = top + y;
      const frame = x < 2 || x >= size - 2 || y < 2 || y >= size - 2;
      const diag = brace ? Math.abs(x - y) <= 1 : Math.abs(x - (size - 1 - y)) <= 1;
      let color;
      let rel = 0;
      if (frame) {
        color = pick(P.wood, (x === 0 || y === 0) ? 4 : (x === size - 1 || y === size - 1) ? 1 : 3);
        rel = 1;
        if ((x === 1 || x === size - 2) && (y === 1 || y === size - 2)) color = P.iron[4];
      } else if (diag) {
        color = pick(P.wood, 4);
        rel = 0.8;
      } else {
        const board = Math.floor((y - 2) / 4);
        color = (y - 2) % 4 === 3 ? P.wood[1] : pick(P.wood, 2 + (fbm(px * 0.35, board * 3, { seed }) > 0.6 ? 1 : 0));
        rel = (y - 2) % 4 === 3 ? -0.5 : 0;
      }
      g.put(px, py, color, FACE, { z: PLAY, rel });
    }
  }
  if (exposed) {
    // The lid, seen a little from above.
    for (let x = 0; x < size; x++) {
      for (let dy = 1; dy <= 2; dy++) g.put(x0 + x, top - dy, pick(P.wood, dy === 2 ? 3 : 4), TOP, { z: PLAY - 6 + dy * 2, wy: top });
    }
  }
}

// --- Painting ------------------------------------------------------------------------------------------------

/**
 * Paints the level's ground: the street along its whole length, what lies in it, the blood of its dead, its stone,
 * its crates and its timber; lit by its fires and the hour (backdrop.mjs's grade).
 */
export function paintGround(level, { look = level.look ?? "night", lamps = [] } = {}) {
  const W = level.cols * 16;
  const TOP = groundTop(level);
  const H = level.rows * 16 - TOP;
  const g = new Ground(W, H);
  const grid = terrainGrid(level);
  const at = (col, row) => (row < 0 || row >= level.rows || col < 0 || col >= level.cols ? "edge" : grid[row][col]);
  const solid = (m) => m !== null && m !== "plank" && m !== "edge";
  const sectionAt = (col) => level.sections.find((s) => col >= s.from && col < s.to) ?? level.sections[level.sections.length - 1];
  const themeAt = (col) => {
    const t = sectionAt(col).theme;
    return Array.isArray(t) ? t[0] : t;
  };
  const fires = level.fires.map(([col, row, size]) => ({ x: col * 16 + 8, y: row * 16, size }));
  const nearFire = (x, reach) => fires.some((f) => Math.abs(f.x - x) < reach);
  const seed = level.cols * 31 + level.rows;
  const courses = {
    back: course(W, seed + 1, 9, 9),
    front: course(W, seed + 2, 10, 10),
    kerb: course(W, seed + 3, 18, 12),
  };
  courses.kerbStart = (x) => {
    let s = x;
    while (s > 0 && !courses.kerb.joint[s]) s -= 1;
    return s;
  };
  // Each street column's top row and its walking line (canvas row), or -1.
  const streetRows = new Int32Array(level.cols).fill(-1);
  const lines = new Int32Array(level.cols).fill(-1);
  for (let col = 0; col < level.cols; col++) {
    for (let row = 0; row < level.rows; row++) {
      if (grid[row][col] === "street") {
        streetRows[col] = row;
        lines[col] = row * 16 - TOP;
        break;
      }
    }
  }

  // The street: the paving where it lies open to the sky, then the lip, the kerb and the rubble under it.
  for (let x = 0; x < W; x++) {
    const col = x >> 4;
    const line = lines[col];
    if (line < 0) continue;
    const style = PAVING[themeAt(col)] ?? "flags";
    const open = !solid(at(col, streetRows[col] - 1));
    for (let i = open ? 0 : BAND_UP; i < BAND_UP + BAND_DOWN; i++) {
      const y = line - BAND_UP + i;
      let [color, rel] = paver(style, x, i, courses, seed);
      // The back edge, against the facades' foot, in their shadow.
      const shade = i === 0 ? 0.55 : i === 1 ? 0.8 : 1;
      if (i === 0) color = mix(color, STONE[1], 0.5);
      g.put(x, y, color, TOP, { z: (i * FRONT) / (BAND_UP + BAND_DOWN - 1), wy: line, rel, shade });
    }
    // The lip: the edge of the paving, catching the light.
    const lipY = line + BAND_DOWN;
    g.put(x, lipY, style === "earth" ? EARTH[5] : style === "bricks" ? P.brick[4] : STONE[6], LIP, { z: FRONT, wy: lipY });
    // The kerb, then rubble masonry, sinking into the dark under the street.
    for (let y = lipY + 1; y < H; y++) {
      const j = y - lipY - 1;
      let color;
      let rel;
      if (style === "earth") {
        const n = fbm(x * 0.12, y * 0.2, { seed: seed + 9, octaves: 3 });
        color = pick(EARTH, 3 + (n > 0.6 ? 1 : n < 0.35 ? -1 : 0) - (j < 2 ? 0 : 0.5));
        rel = n > 0.7 ? 0.5 : 0;
        if (hash2(x >> 1, y >> 1, seed) < 0.05) {
          color = STONE[3];
          rel = 0.8;
        }
      } else if (j < 6) {
        [color, rel] = kerb(x, j, courses, seed);
      } else {
        const s = rubble(x, y, seed + 13);
        color = s.color;
        rel = s.rel;
      }
      const fall = Math.min(1, Math.max(0, (j - 5) / 32));
      g.put(x, y, color, FACE, { z: FRONT, rel, shade: 1 - 0.88 * fall * fall * (3 - 2 * fall) });
    }
  }

  // What the sack has left lying in the street, by its stretch: thicker near the fires (ash, charcoal, embers).
  const r = rng(seed + 77);
  for (const section of level.sections) {
    const theme = Array.isArray(section.theme) ? section.theme[0] : section.theme;
    const kinds = LITTER[theme] ?? LITTER.houses;
    for (const [kind, density] of kinds) {
      const count = Math.round(((section.to - section.from) * 16 * density) / 100);
      for (let k = 0; k < count; k++) {
        const x = section.from * 16 + Math.floor(r() * (section.to - section.from) * 16);
        const line = lines[x >> 4];
        if (line < 0) continue;
        // Mostly before the walking line, so the way stays clear where the feet go.
        const i = r() < 0.75 ? 4 + Math.floor(r() * 4) : 1 + Math.floor(r() * 3);
        if (i < BAND_UP && solid(at(x >> 4, streetRows[x >> 4] - 1))) continue;
        litter(g, kind, x, line, i, seed + k * 13 + kind.length);
      }
    }
  }
  for (const f of fires) {
    // Ash and cinders spread about each fire, a few embers still glowing in them.
    const line = lines[Math.max(0, Math.min(level.cols - 1, f.x >> 4))];
    if (line < 0 || Math.abs(f.y - TOP - line) > 2) continue;
    const reach = f.size === "large" ? 60 : f.size === "medium" ? 44 : 30;
    for (let x = f.x - reach; x <= f.x + reach; x++) {
      for (let i = 1; i < BAND_UP + BAND_DOWN; i++) {
        const y = line - BAND_UP + i;
        const t = Math.abs(x - f.x) / reach;
        const n = fbm(x * 0.15, i * 0.5, { seed: seed + f.x });
        if (n < 0.35 + t * 0.4) continue;
        g.tint(x, y, n > 0.7 ? P.ash[0] : P.night[1], n > 0.7 ? 0.45 : 0.35 * (1 - t));
        if (n > 0.66 && hash2(x, y, seed) < 0.06 * (1 - t)) g.put(x, y, hash2(x, y, seed + 1) < 0.5 ? P.fire[3] : P.fire[4], LOOSE, { z: 20, wy: line });
      }
    }
  }
  // The blood of the dead lying in the street, pooled about them and run between the stones.
  for (const [kind, col, row] of level.props ?? []) {
    if (!kind.startsWith("corpse_")) continue;
    const cx = Math.round(col * 16);
    const line = lines[Math.max(0, Math.min(level.cols - 1, cx >> 4))];
    if (line < 0 || (row != null && row !== STREET_ROW)) continue;
    const pr = rng(Math.round(col * 97));
    const half = 14 + Math.floor(pr() * 12);
    const off = Math.round((pr() - 0.5) * 16);
    for (let x = cx - half - 4 + off; x <= cx + half + 4 + off; x++) {
      for (let i = 2; i < BAND_UP + BAND_DOWN; i++) {
        const y = line - BAND_UP + i;
        const u = (x - cx - off) / half;
        const v = (i - 5) / 3;
        const d = u * u + v * v * 1.6 + (fbm(x * 0.2, i * 0.7, { seed: col * 7 }) - 0.5) * 0.7;
        if (d > 1) continue;
        const k = y * W + x;
        if (x < 0 || x >= W || g.kind[k] === EMPTY) continue;
        g.put(x, y, d > 0.8 ? P.blood[1] : d > 0.4 ? P.blood[0] : mix(P.blood[0], P.night[0], 0.3), g.kind[k] === LIP ? LIP : TOP,
          { z: g.z[k], wy: g.wy[k], rel: -0.2, shade: g.shade[k] });
      }
    }
    // Run down over the lip onto the kerb.
    for (let k = 0; k < 3; k++) {
      const x = cx + off + Math.round((pr() - 0.5) * half * 1.4);
      const len = 2 + Math.floor(pr() * 6);
      for (let d = 0; d <= len; d++) g.tint(x, line + BAND_DOWN + d, P.blood[0], 0.75 - d * 0.06);
    }
  }

  // The stone of the play: steps, terraces, plinths, standing on the street with their tops to walk on.
  for (const [material, c0, c1, r0, r1] of level.terrain) {
    if (material !== "stone") continue;
    const x0 = c0 * 16;
    const x1 = (c1 + 1) * 16 - 1;
    const top = r0 * 16 - TOP;
    const bottom = (r1 + 1) * 16 - TOP - 1;
    for (let x = x0; x <= x1; x++) {
      const col = x >> 4;
      // A column of the block that something stands on is not walked on, nor seen from above.
      let colTop = top;
      while (colTop <= bottom && solid(at(col, (colTop + TOP) / 16 - 1)) && at(col, (colTop + TOP) / 16 - 1) !== "stone") colTop += 16;
      const exposed = !solid(at(col, (colTop + TOP) / 16 - 1));
      const edge = x === x0 ? -1.4 : x === x0 + 1 ? -0.5 : x === x1 ? -1.4 : x === x1 - 1 ? -0.5 : 0;
      if (exposed) {
        // The block's top: two rows of it seen from above behind the line, the line and two before it, the lip.
        for (let i = 0; i < 5; i++) {
          const y = colTop - 2 + i;
          const k = Math.floor(x / 16);
          const joint = x % 16 === 0;
          const tone = 6 + (hash2(k, r0, seed) < 0.3 ? -1 : 0) + (i === 2 ? 0.4 : 0) - (i === 0 ? 1.2 : 0);
          g.put(x, y, joint ? STONE[4] : pick(STONE, tone), TOP, { z: PLAY - 4 + i * 4, wy: colTop, rel: joint ? -0.5 : 0,
            shade: i === 0 ? 0.7 : 1 });
        }
        g.put(x, colTop + 3, STONE[7], LIP, { z: PLAY + 12, wy: colTop + 3 });
      }
      for (let y = exposed ? colTop + 4 : colTop; y <= bottom; y++) {
        const [color, rel] = ashlar(x, y + TOP, seed + 31);
        g.put(x, y, color, FACE, { z: PLAY, rel: rel + edge });
      }
    }
  }

  // Crates stacked in the play: the big ones where two by two fit, small ones elsewhere.
  for (const [material, c0, c1, r0, r1] of level.terrain) {
    if (material !== "crate") continue;
    const used = new Set();
    for (let row = r1; row >= r0; row--) {
      for (let col = c0; col <= c1; col++) {
        if (used.has(`${col},${row}`)) continue;
        const big = col + 1 <= c1 && row - 1 >= r0 && !used.has(`${col + 1},${row}`) && hash2(col, row, seed) < 0.6;
        const size = big ? 32 : 16;
        const topRow = big ? row - 1 : row;
        for (let dc = 0; dc < size / 16; dc++) for (let dr = 0; dr < size / 16; dr++) used.add(`${col + dc},${topRow + dr}`);
        const exposed = !solid(at(col, topRow - 1)) && (!big || !solid(at(col + 1, topRow - 1)));
        crate(g, col * 16, topRow * 16 - TOP, size, seed + col * 3 + row, exposed);
      }
    }
  }

  // Timber in the play: planks to stand on (a stall's roof, a gallery), on brackets; a gallery high over the street
  // stands on posts.
  for (const [material, c0, c1, r0] of level.terrain) {
    if (material !== "plank") continue;
    const x0 = c0 * 16;
    const x1 = (c1 + 1) * 16 - 1;
    const top = r0 * 16 - TOP;
    for (let x = x0; x <= x1; x++) {
      for (let dy = 1; dy <= 2; dy++) g.put(x, top - dy, pick(P.wood, dy === 2 ? 3 : 4), TOP, { z: PLAY - 6 + dy * 2, wy: top });
      for (let y = 0; y < 7; y++) {
        const end = x === x0 || x === x1;
        let color = y === 0 ? P.wood[5] : y === 6 ? P.wood[1] : y === 5 ? P.wood[2]
          : pick(P.wood, 3 + (fbm(x * 0.2, y * 1.2, { seed: seed + 41 }) > 0.6 ? 1 : 0));
        if ((x - x0) % 23 === 0 && y > 0 && y < 6) color = P.wood[1];
        if (end) color = P.wood[1];
        g.put(x, top + y, color, FACE, { z: PLAY, rel: y === 0 ? 0.6 : y >= 5 ? -0.4 : 0 });
      }
    }
    // Brackets under the ends.
    for (const [bx, dir] of [[x0 + 2, 1], [x1 - 2, -1]]) {
      for (let d = 0; d < 6; d++) {
        for (let w = 0; w < 2; w++) g.put(bx + dir * (d + w), top + 7 + (5 - d), pick(P.wood, 2 + (w === 0 ? 1 : 0)), FACE, { z: PLAY, rel: 0.4 });
        g.put(bx, top + 7 + d, P.wood[2], FACE, { z: PLAY, rel: 0.4 });
      }
    }
    if (r0 <= STREET_ROW - 5) {
      // A gallery's posts, down to the street.
      const line = lines[c0] >= 0 ? lines[c0] : (STREET_ROW * 16 - TOP);
      const span = x1 - x0;
      const count = Math.max(2, Math.round(span / 96) + 1);
      for (let k = 0; k < count; k++) {
        const px = Math.round(x0 + 4 + (k * (span - 10)) / (count - 1));
        const pcol = px >> 4;
        let blocked = false;
        for (let row = r0 + 1; row < STREET_ROW; row++) if (solid(at(pcol, row)) || solid(at((px + 3) >> 4, row))) blocked = true;
        if (blocked) continue;
        for (let y = top + 7; y < line; y++) {
          for (let w = 0; w < 4; w++) {
            g.put(px + w, y, pick(P.wood, w === 0 ? 4 : w === 3 ? 1 : 2 + (fbm(px * 0.5, y * 0.3, { seed }) > 0.6 ? 1 : 0)), FACE,
              { z: PLAY, rel: w === 0 || w === 3 ? -0.6 : 0.3 });
          }
        }
      }
    }
  }

  lightGround(g, level, look, lamps, TOP);
  return g.c;
}

// --- Light ---------------------------------------------------------------------------------------------------

/** Lights the ground from how each pixel lies (its kind, depth, height and relief), by the level's hour and fires. */
function lightGround(g, level, look, lamps, top) {
  const { c, width: W, height: H } = g;
  const grade = levelGrade(level, look);
  const amb = linear(grade.sky).map((v) => v * grade.ambient);
  // The fires stand in the street before the facades, a little before the walking line.
  const lights = streetLights(level, lamps, grade, 0, top, { fireZ: 22 }).map((l) => ({ ...l, lin: linear(l.color).map((v) => v * l.strength) }));
  const key = grade.key ?? null;
  const kd = key ? (() => {
    const len = Math.hypot(key.dir[0], key.dir[1], key.dir[2]);
    return key.dir.map((v) => v / len);
  })() : null;
  const kl = key ? linear(key.color).map((v) => v * key.strength) : null;
  const light = new Float32Array(W * H * 3);
  // A neighbour's relief counts only on the same surface (the same kind, as far out); past its edge, its own.
  const relAt = (x, y, own, kind, z) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return own;
    const j = y * W + x;
    return g.kind[j] === kind && g.z[j] === z ? g.rel[j] : own;
  };
  const normal = (x, y, kind) => {
    if (kind === TOP) return [0, -0.97, 0.24];
    if (kind === LIP) return [0, -0.7, 0.71];
    const i = y * W + x;
    const own = g.rel[i];
    const z = g.z[i];
    const gx = Math.max(-1.2, Math.min(1.2, (relAt(x + 1, y, own, kind, z) - relAt(x - 1, y, own, kind, z)) * 0.5));
    const gy = Math.max(-1.2, Math.min(1.2, (relAt(x, y + 1, own, kind, z) - relAt(x, y - 1, own, kind, z)) * 0.5));
    const n = kind === LOOSE ? [-gx, -gy - 0.9, 1] : [-gx, -gy, 1];
    const len = Math.hypot(n[0], n[1], n[2]);
    return [n[0] / len, n[1] / len, n[2] / len];
  };
  // The fire's light on the lip of each column, thrown back onto the kerb below it.
  const lipLight = new Float32Array(W * 3);
  const lipRow = new Int32Array(W).fill(-1);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const kind = g.kind[i];
      if (kind === EMPTY) continue;
      const n = normal(x, y, kind);
      const rel = g.rel[i];
      const ao = Math.max(0.45, 1 - Math.max(0, -rel) * 0.22);
      // The paving lies open to the whole sky, where a wall sees half of it.
      const open = kind === TOP || kind === LIP ? 1.35 : 1;
      const skyK = ao * open * (0.3 + 0.95 * Math.max(0, n[0] * SKY_DIR[0] + n[1] * SKY_DIR[1] + n[2] * SKY_DIR[2]));
      let r0 = amb[0] * skyK;
      let r1 = amb[1] * skyK;
      let r2 = amb[2] * skyK;
      if (key) {
        const k = Math.max(0, n[0] * kd[0] + n[1] * kd[1] + n[2] * kd[2]) * ao;
        r0 += kl[0] * k;
        r1 += kl[1] * k;
        r2 += kl[2] * k;
      }
      const wy = kind === TOP || kind === LOOSE ? g.wy[i] : y;
      const z = g.z[i];
      let f0 = 0;
      let f1 = 0;
      let f2 = 0;
      for (const l of lights) {
        const dx = l.x - (x + 0.5);
        if (Math.abs(dx) > l.radius) continue;
        const dy = l.y - wy;
        const dz = l.z - z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > l.radius) continue;
        const lambert = Math.max(0, (n[0] * dx + n[1] * dy + n[2] * dz) / dist);
        const fall = Math.pow(1 - dist / l.radius, 1.35);
        // A face the fire stands behind takes only a spill of it, the light thrown about the street.
        const spill = kind === FACE ? 0.16 * Math.pow(Math.max(0, 1 - Math.hypot(dx, l.y - y) / l.radius), 1.6) : 0;
        const k = (lambert * ao + spill) * fall;
        f0 += l.lin[0] * k;
        f1 += l.lin[1] * k;
        f2 += l.lin[2] * k;
      }
      if (kind === LIP) {
        lipLight[x * 3] = f0;
        lipLight[x * 3 + 1] = f1;
        lipLight[x * 3 + 2] = f2;
        lipRow[x] = y;
      }
      light[i * 3] = r0 + f0;
      light[i * 3 + 1] = r1 + f1;
      light[i * 3 + 2] = r2 + f2;
    }
  }
  // What the lit paving throws back onto the kerb just under its lip.
  for (let x = 0; x < W; x++) {
    if (lipRow[x] < 0) continue;
    for (let d = 1; d <= 12; d++) {
      const y = lipRow[x] + d;
      if (y >= H) break;
      const i = y * W + x;
      if (g.kind[i] !== FACE) break;
      const k = 0.45 * (1 - d / 13) ** 2;
      light[i * 3] += lipLight[x * 3] * k;
      light[i * 3 + 1] += lipLight[x * 3 + 1] * k;
      light[i * 3 + 2] += lipLight[x * 3 + 2] * k;
    }
  }
  const emissive = emissiveSet();
  const tint = linear(grade.tint);
  const veil = 0.06;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (g.kind[i] === EMPTY) continue;
      const rgb = c.get(x, y);
      if (emissive.has((rgb[0] << 16) | (rgb[1] << 8) | rgb[2])) continue;
      const lin = linear(rgb);
      const s = g.shade[i];
      const lit = [lin[0] * light[i * 3] * s, lin[1] * light[i * 3 + 1] * s, lin[2] * light[i * 3 + 2] * s];
      const out = display(lit.map((v, k) => v + (tint[k] - v) * veil));
      c.set(x, y, [out[0], out[1], out[2], 255]);
    }
  }
}

/** Builds the level's ground into its env folder as chunks, with review crops. */
export function buildGround({ OUT, REVIEW, level, lamps, palette }) {
  const c = paintGround(level, { lamps });
  if (palette) toPalette(c, palette);
  const chunks = Math.ceil(c.width / CHUNK);
  for (let i = 0; i < chunks; i++) c.crop(i * CHUNK, 0, CHUNK, c.height).save(join(OUT, `ground_${i}.png`));
  const width = c.width;
  for (const [tag, from] of [["a", 0], ["b", Math.floor(width * 0.4)], ["c", Math.max(0, width - 640)]]) {
    c.crop(from, 0, Math.min(640, width - from), c.height).scaled(2).save(join(REVIEW, `${level.id}_ground_${tag}.png`));
  }
  console.log(`ground ${chunks} chunks`);
  return c;
}
