// Hulegu's soldiers, modelled in 3D after the concept art (07, 08): domed iron helmets with fur
// brims, bronze finials and horsehair plumes; riveted lamellar over dark padded coats; red cloth
// strips hanging from the belt; baggy trousers into strap-wound boots; round shields of dark hide
// rimmed in bronze. The swordsman carries a sabre, the spearman a spear with a red tassel and a
// cloth mask over his face, the archer a composite bow and a quiver and no cuirass. The captain is
// half a head taller in heavy lamellar with a fur mantle, a red plume, a tattered cloak, a gold-
// worked shield and a sabre. The keshig veteran is a swordsman masked, in indigo, with a white
// plume; the mace-bearer is armoured to the collar, masked, with a flanged mace in both hands; the
// Georgian shield-bearer (Hulegu's Christian allies marched with him) wears mail and a conical
// helmet with a nasal, behind a tall painted shield, with a short spear; the siege engineer, in a
// felt cap and no armour, carries clay pots of burning naphtha.
import { P } from "../lib/palette.mjs";
import { hex, mix } from "../lib/canvas.mjs";
import { add, clamp, normalize, scale, sub, toParent } from "../lib/space.mjs";
import { ellipsoid, lathe, limb, mesh, place, roundedBox, shieldDisc, tube } from "../lib/meshes.mjs";
import { pick } from "../lib/sprite_shader.mjs";
import {
  band, bodyColliders, bootShaft, fist, foot, hangingFromHead, headPoint, onHead, rest, shoulderCap, skirt, sleeve,
  torsoRings, torsoWeights, trousers,
} from "./figure3d.mjs";

const ramp = (...codes) => codes.map((c) => hex(c));
const frac = (x) => x - Math.floor(x);

// --- Palette ---------------------------------------------------------------------------------

const SKIN = ramp("#24150e", "#43281a", "#694330", "#8f6446", "#b18866");
const HAIR = ramp("#090707", "#141010", "#201918", "#2e2522");
/** Deels: deep madder-brown for the swordsman and the Captain, umber for the spearman, indigo for the archer. */
const DEEL_MADDER = ramp("#110a0b", "#1e1113", "#2d1818", "#3f2220", "#532d29", "#6b3a33");
const DEEL_UMBER = ramp("#100c0a", "#1c1511", "#2a1f18", "#3a2b21", "#4d392b", "#634a37");
const DEEL_INDIGO = ramp("#0b0c12", "#141621", "#1e2233", "#2a3046", "#3a425c", "#4d5774");
const PLATE = ramp("#0e0d0d", "#1c1917", "#2c2623", "#403833", "#584c45", "#75665d", "#9a887c");
const RED = ramp("#160807", "#2e0f0d", "#4c1713", "#6d211a", "#902f22", "#b04530");
const FUR = ramp("#120d09", "#211810", "#33261a", "#4a3826", "#644d36", "#82684a");
const LEATHER = ramp("#120b08", "#20150e", "#312014", "#452e1d", "#5d3f28", "#775236");
const TROUSERS = ramp("#131010", "#201a17", "#2d2520", "#3d322b", "#504238");
const IRON = ramp("#0f1114", "#1d2025", "#2e333a", "#444b54", "#626b75", "#8d97a2", "#c6cfd8");
const BRONZE = ramp("#2a180b", "#4d2f12", "#7a5220", "#a97b35", "#d2a65a", "#f0d48e");
const GOLD = ramp("#3a240f", "#6b4418", "#a07028", "#d0a548", "#f0d58c");
const HIDE = ramp("#0e0a08", "#1a1310", "#271c17", "#36271f", "#47342a", "#5c4436");
const WOOD = ramp("#140d08", "#22160d", "#341f12", "#4a2d19", "#633d22", "#7d4f2c");
const STEEL = ramp("#101318", "#20252c", "#363d47", "#555e6a", "#7f8995", "#b7c1cb", "#e6edf2");
const MASK = ramp("#0b0909", "#151112", "#201a1b", "#2c2425");
/** Raw flesh where a part was cut away, wet and dark. */
const DEEL_CRIMSON = ramp("#120607", "#230b0d", "#371114", "#4e181a", "#682221", "#842e29");
/** The Kipchak horsemen's dun felt. */
const DEEL_OCHRE = ramp("#120d07", "#22180d", "#352614", "#4b371c", "#644a26", "#7f5f33");
const WHITE = ramp("#3b3733", "#615a53", "#8c847a", "#b7aea1", "#ddd5c7", "#f1ebdf");
const CLAY = ramp("#1e110b", "#341d12", "#4f2c1a", "#6d3f25", "#8d5633", "#ab6f45");
const FELT = ramp("#121010", "#1f1b19", "#2e2825", "#403834", "#544943", "#6a5d55");
const BLOOD = ramp("#1a0505", "#3a0a0a", "#5e1111", "#8a1a16", "#b3271e", "#d8402e");
const BONE = ramp("#6e5f52", "#a39280", "#d2c3ad");

const outlineOf = (r, k = 0.55) => mix(r[0], P.outline, k);
const shaded = (r, bias = 0, extra = {}) => ({ ramp: r, outline: outlineOf(r), line: r[0], rim: 0.3,
  shade: (s) => pick(r, s.light, bias), ...extra });
const metal = (r, s, bias = 0, threshold = 0.55) => (s.glint > threshold ? r[r.length - 1] : pick(r, s.light, bias));

/**
 * Lamellar: rows of small iron plates laced together, a bronze rivet catching the light on each.
 * `rowsize` is a row's height in pixels.
 */
function lamellar(s, bias = 0, rowsize = 2.6) {
  const row = Math.floor(s.v / rowsize);
  const across = (s.u + (row % 2) * 0.9) / 1.8;
  const inRow = frac(s.v / rowsize);
  if (inRow < 0.26) return pick(PLATE, s.light, bias - 1.6);
  if (inRow > 0.4 && inRow < 0.7 && frac(across) < 0.34 && s.light > 0.45) return metal(BRONZE, s, 0.2, 0.3);
  return frac(across) < 0.16 ? pick(PLATE, s.light, bias - 1) : metal(PLATE, s, bias, 0.7);
}

// --- Materials -------------------------------------------------------------------------------

function materialsFor(DEEL) {
return {
  skin: shaded(SKIN, 0.45, { rim: 0.25 }),
  hair: shaded(HAIR, 0.2, { rim: 0.2 }),
  eye: { ramp: HAIR, outline: P.outline, line: HAIR[0], rim: 0, shade: () => hex("#080606") },
  mask: shaded(MASK, 0, { rim: 0.2 }),
  deel: {
    ramp: DEEL, outline: outlineOf(DEEL), line: DEEL[0], rim: 0.3,
    shade: (s) => pick(DEEL, s.light, -0.4 - (frac((s.u * 0.7 + s.v) / 4.2) < 0.16 && s.light > 0.5 ? 1 : 0)),
  },
  cuirass: { ramp: PLATE, outline: outlineOf(PLATE), line: PLATE[0], rim: 0.34, shade: (s) => lamellar(s) },
  pauldron: { ramp: PLATE, outline: outlineOf(PLATE), line: PLATE[0], rim: 0.34, shade: (s) => lamellar(s, -0.3, 2.3) },
  tassets: {
    ramp: PLATE, outline: outlineOf(PLATE), line: PLATE[0], rim: 0.34,
    shade(s) {
      if (s.v > s.part.length - 1.2) return metal(BRONZE, s, -0.6, 0.6);
      if (s.w < s.part.edge + 0.02 || s.w > 1 - s.part.edge - 0.02) return pick(PLATE, s.light, -1.5);
      return lamellar(s, -0.5);
    },
  },
  deelSkirt: {
    ramp: DEEL, outline: outlineOf(DEEL), line: DEEL[0], rim: 0.3,
    shade(s) {
      if (s.v > s.part.length - 1.6) return pick(RED, s.light, -0.8);
      return pick(DEEL, s.light, -0.5 - (Math.abs(frac(s.w * 9) - 0.5) < 0.08 ? 1 : 0));
    },
  },
  furTrimSkirt: {
    ramp: DEEL, outline: outlineOf(DEEL), line: DEEL[0], rim: 0.3,
    shade(s) {
      if (s.v > s.part.length - 2.4) return pick(FUR, s.light, -0.2 - ((s.x + s.y) % 3 === 0 ? 1 : 0));
      if (s.w < s.part.edge + 0.035 || s.w > 1 - s.part.edge - 0.035) return pick(FUR, s.light, -0.4);
      // Patterned panels down the coat.
      const panel = Math.abs(frac(s.w * 6) - 0.5) < 0.07;
      return pick(DEEL, s.light, -0.4 - (panel ? -1 : 0));
    },
  },
  sleeve: {
    ramp: DEEL, outline: outlineOf(DEEL), line: DEEL[0], rim: 0.3,
    shade(s) {
      if (s.v > 14.6) {
        // Iron bracers, riveted.
        if (s.v > 15 && s.v < 15.9) return metal(BRONZE, s, -0.5, 0.6);
        const rivet = frac(s.u / 2.2) < 0.3 && frac(s.v / 2.6) < 0.3;
        return rivet ? metal(BRONZE, s, 0, 0.4) : metal(IRON, s, -1, 0.6);
      }
      return pick(DEEL, s.light, -0.3 - (frac(s.v / 3) < 0.18 && s.light > 0.5 ? 1 : 0));
    },
  },
  archerSleeve: {
    ramp: DEEL, outline: outlineOf(DEEL), line: DEEL[0], rim: 0.3,
    shade(s) {
      if (s.v > 18) return pick(LEATHER, s.light, -0.4);
      return pick(DEEL, s.light, -0.3 - (frac(s.v / 3) < 0.18 && s.light > 0.5 ? 1 : 0));
    },
  },
  glove: shaded(LEATHER, -0.8),
  fur: {
    ramp: FUR, outline: outlineOf(FUR), line: FUR[0], rim: 0.42,
    shade: (s) => pick(FUR, s.light, -0.2 - (((s.x * 3 + s.y * 2) % 5 === 0) ? 1 : 0)),
  },
  helmet: { ramp: IRON, outline: outlineOf(IRON), line: IRON[0], rim: 0.3, shade: (s) => metal(IRON, s, -1.3, 0.62) },
  // Bright worked steel: a knife's blade, an axe's edge.
  knife: { ramp: STEEL, outline: outlineOf(STEEL), line: STEEL[0], rim: 0.35, shade: (s) => metal(STEEL, s, 0.4, 0.5) },
  helmetBand: {
    ramp: BRONZE, outline: outlineOf(BRONZE), line: BRONZE[0], rim: 0.3,
    shade: (s) => metal(BRONZE, s, -0.5 - ((Math.floor(s.u * 0.8) % 3 === 0) ? 1 : 0), 0.6),
  },
  bronze: { ramp: BRONZE, outline: outlineOf(BRONZE), line: BRONZE[0], rim: 0.3, shade: (s) => metal(BRONZE, s, 0, 0.45) },
  gold: { ramp: GOLD, outline: outlineOf(GOLD), line: GOLD[0], rim: 0.2, shade: (s) => metal(GOLD, s, 0, 0.45) },
  belt: {
    ramp: LEATHER, outline: outlineOf(LEATHER), line: LEATHER[0], rim: 0.25,
    shade: (s) => (frac(s.u / 3.4) < 0.3 && s.v > 0.4 && s.v < 1.4 ? metal(BRONZE, s, 0.2) : pick(LEATHER, s.light, -0.5)),
  },
  sash: {
    ramp: RED, outline: outlineOf(RED), line: RED[0], rim: 0.3,
    shade: (s) => pick(RED, s.light, -0.5 - (frac(s.v / 1.5) < 0.3 ? 1 : 0)),
  },
  strip: {
    ramp: RED, outline: outlineOf(RED), line: RED[0], rim: 0.35,
    shade(s) {
      if (s.w > 0.84 && (s.x + s.y) % 2 === 0) return null;
      return pick(RED, s.light, -0.5 - (Math.abs(s.u) > 0.9 ? 0.6 : 0));
    },
  },
  plume: {
    ramp: HAIR, outline: outlineOf(HAIR, 0.3), line: HAIR[0], rim: 0.5,
    shade(s) {
      if (s.w > 0.8 && (s.x + s.y) % 2 === 0) return null;
      return pick(HAIR, s.light, 0.4 - (frac(s.u * 1.3) < 0.3 ? 1 : 0));
    },
  },
  redPlume: {
    ramp: RED, outline: outlineOf(RED, 0.4), line: RED[0], rim: 0.5,
    shade(s) {
      if (s.w > 0.8 && (s.x + s.y) % 2 === 0) return null;
      return pick(RED, s.light, 0 - (frac(s.u * 1.3) < 0.3 ? 1 : 0));
    },
  },
  cloak: {
    ramp: DEEL, outline: outlineOf(DEEL), line: DEEL[0], rim: 0.4,
    shade(s) {
      if (s.w > 0.88 && (s.x * 2 + s.y) % 3 === 0) return null;
      if (s.w > 0.8 && s.w < 0.84) return pick(RED, s.light, -0.8);
      return pick(DEEL, s.light, -0.2 - (Math.abs(s.u) > 3.5 ? 0.6 : 0));
    },
  },
  trousers: {
    ramp: TROUSERS, outline: outlineOf(TROUSERS), line: TROUSERS[0], rim: 0.25,
    shade: (s) => pick(TROUSERS, s.light, -0.1 - (Math.abs(frac(s.w * 3 + s.v * 0.035) - 0.5) < 0.06 ? 1 : 0)),
  },
  boot: {
    ramp: LEATHER, outline: outlineOf(LEATHER), line: LEATHER[0], rim: 0.25,
    shade(s) {
      const a = frac((s.v * 0.9 + s.u * 0.6) / 2.6) < 0.3;
      const b = frac((s.v * 0.9 - s.u * 0.6) / 2.6) < 0.3;
      return pick(LEATHER, s.light, -0.7 - (a || b ? 1 : 0));
    },
  },
  foot: shaded(LEATHER, -1),
  shield: {
    ramp: HIDE, outline: outlineOf(HIDE, 0.6), line: HIDE[0], rim: 0.34,
    shade(s) {
      const r = s.w;
      if (r > s.part.radius - 0.1) return pick(LEATHER, s.light, -1.4);
      if (r > s.part.radius - 1.2) return metal(BRONZE, s, -0.5, 0.55);
      // Bronze studs in a ring.
      const a = Math.atan2(s.v, s.u);
      if (Math.abs(r - (s.part.radius - 2.4)) < 0.6 && frac((a / (2 * Math.PI)) * 12) < 0.3) return metal(BRONZE, s, 0.2, 0.4);
      if (s.glint > 0.72) return HIDE[5];
      return pick(HIDE, s.light, -0.5 - (frac((s.u + s.v * 0.6) / 3.1) < 0.12 ? 1 : 0));
    },
  },
  captainShield: {
    ramp: HIDE, outline: outlineOf(HIDE, 0.6), line: HIDE[0], rim: 0.34,
    shade(s) {
      const r = s.w;
      if (r > s.part.radius - 0.1) return pick(LEATHER, s.light, -1.4);
      if (r > s.part.radius - 1.4) return metal(BRONZE, s, -0.3, 0.5);
      const a = Math.atan2(s.v, s.u);
      if (Math.abs(r - (s.part.radius - 2.6)) < 0.6 && frac((a / (2 * Math.PI)) * 16) < 0.3) return metal(GOLD, s, 0, 0.4);
      // A gold beast coiled about the boss: a spiral that thickens toward the rim.
      const swirl = frac((a / (2 * Math.PI)) * 2 + r / 5.5);
      if (r > 3.6 && swirl < 0.13 + r * 0.004) return metal(GOLD, s, -0.9, 0.6);
      if (s.glint > 0.72) return HIDE[5];
      return pick(HIDE, s.light, -0.6);
    },
  },
  boss: { ramp: BRONZE, outline: outlineOf(BRONZE), line: BRONZE[0], rim: 0.3, shade: (s) => metal(BRONZE, s, 0.1, 0.4) },
  grip: shaded(LEATHER, -1.2, { rim: 0 }),
  // A wound's face: wet red flesh, a pale core of bone at its middle.
  stump: {
    ramp: BLOOD, outline: outlineOf(BLOOD, 0.4), line: BLOOD[0], rim: 0.15, glintPower: 10,
    shade: (s) => (s.glint > 0.5 ? BLOOD[5] : Math.abs(s.v) > s.part.bone ? pick(BONE, s.light, -0.4) : pick(BLOOD, s.light, 0.6)),
  },
  codex: {
    ramp: RED, outline: outlineOf(RED), line: RED[0], rim: 0.3,
    // A red leather binding with pale page edges.
    shade: (s) => (Math.abs(s.v) < 0.7 ? pick(FUR, s.light, 1.4) : pick(RED, s.light, -0.3)),
  },
  shaft: {
    ramp: WOOD, outline: outlineOf(WOOD), line: WOOD[0], rim: 0.2,
    shade: (s) => pick(WOOD, s.light, -0.4 - (frac(s.v / 5) < 0.1 ? 1 : 0)),
  },
  tassel: {
    ramp: RED, outline: outlineOf(RED), line: RED[0], rim: 0.4,
    shade: (s) => (s.w > 0.75 && (s.x + s.y) % 2 === 0 ? null : pick(RED, s.light, -0.2)),
  },
  bow: {
    ramp: WOOD, outline: outlineOf(WOOD), line: WOOD[0], rim: 0.3,
    shade(s) {
      if (Math.abs(s.v - s.part.length / 2) < 2.4) return pick(LEATHER, s.light, -0.5);
      if (s.v < 1.6 || s.v > s.part.length - 1.6) return metal(BRONZE, s, -0.4);
      return pick(WOOD, s.light, -0.1 - (frac(s.v / 2.6) < 0.2 ? 1 : 0));
    },
  },
  quiver: {
    ramp: LEATHER, outline: outlineOf(LEATHER), line: LEATHER[0], rim: 0.3,
    shade(s) {
      if (frac(s.v / 4.5) < 0.18) return metal(BRONZE, s, -0.5, 0.6);
      return pick(LEATHER, s.light, -0.4);
    },
  },
  fletching: {
    ramp: RED, outline: outlineOf(RED), line: RED[0], rim: 0.3,
    shade: (s) => ((s.x + s.y) % 2 === 0 ? pick(RED, s.light, -0.4) : pick(FUR, s.light, 0.4)),
  },
  whitePlume: {
    ramp: WHITE, outline: outlineOf(WHITE, 0.45), line: WHITE[0], rim: 0.5,
    shade(s) {
      if (s.w > 0.8 && (s.x + s.y) % 2 === 0) return null;
      return pick(WHITE, s.light, -0.6 - (frac(s.u * 1.3) < 0.3 ? 1 : 0));
    },
  },
  // Mail: rows of small iron rings, each catching a point of light.
  mail: {
    ramp: IRON, outline: outlineOf(IRON), line: IRON[0], rim: 0.32,
    shade(s) {
      const ring = (Math.floor(s.u / 1.2) + Math.floor(s.v / 1.1)) % 2 === 0;
      return metal(IRON, s, ring ? -1.0 : -1.6, ring ? 0.66 : 0.82);
    },
  },
  // The shield-bearer's tall shield: a crimson field, a bone border inside an iron rim, an iron
  // spine down its middle; plain planks behind.
  towerShield: {
    ramp: DEEL_CRIMSON, outline: outlineOf(DEEL_CRIMSON, 0.6), line: DEEL_CRIMSON[0], rim: 0.34,
    shade(s) {
      if (s.w < 0) return pick(WOOD, s.light, -0.6);
      if (s.w < 1.1) return metal(IRON, s, -0.6, 0.55);
      if (s.w < 2.1) return pick(WHITE, s.light, -1.4);
      if (Math.abs(s.u) < 0.9) {
        const rivet = frac(s.v / 4.4) < 0.25;
        return rivet ? metal(BRONZE, s, 0, 0.4) : metal(IRON, s, -0.9, 0.6);
      }
      if (s.glint > 0.75) return DEEL_CRIMSON[5];
      return pick(DEEL_CRIMSON, s.light, -0.2 - (frac((s.u + s.v * 0.4) / 3.3) < 0.1 ? 1 : 0));
    },
  },
  clay: {
    ramp: CLAY, outline: outlineOf(CLAY), line: CLAY[0], rim: 0.3,
    shade: (s) => pick(CLAY, s.light, -0.3 - (frac(s.v / 2.2) < 0.18 ? 1 : 0)),
  },
  wick: {
    ramp: BRONZE, outline: outlineOf(BRONZE, 0.3), line: BRONZE[0], rim: 0,
    shade: (s) => (s.glint > 0.3 ? BRONZE[5] : BRONZE[4]),
  },
  felt: shaded(FELT, -0.2, { rim: 0.3 }),
};
}

// --- Kinds -----------------------------------------------------------------------------------

/** What sets each soldier apart. */
const KINDS = {
  swordsman: { cuirass: true, weapon: "sabre", shield: 9.4, plume: "black", mask: false, beard: true, deel: DEEL_MADDER },
  spearman: { cuirass: true, weapon: "spear", shield: 9.0, plume: "black", mask: true, beard: false, deel: DEEL_UMBER },
  archer: { cuirass: false, weapon: "bow", shield: 0, plume: "black", mask: false, beard: true, furHat: true,
    deel: DEEL_INDIGO },
  captain: { cuirass: true, weapon: "sabre", shield: 11.2, plume: "red", mask: false, beard: true, heavy: true,
    deel: DEEL_MADDER },
  veteran: { cuirass: true, weapon: "sabre", shield: 9.4, plume: "white", mask: true, beard: false, deel: DEEL_INDIGO },
  maceman: { cuirass: true, full: true, weapon: "mace", shield: 0, plume: "black", mask: true, beard: false,
    deel: DEEL_UMBER, scale: 1.06 },
  shieldbearer: { cuirass: true, mail: true, weapon: "shortspear", shield: 0, tower: true, plume: "none", mask: false,
    beard: true, helmet: "conical", deel: DEEL_CRIMSON },
  engineer: { cuirass: false, weapon: "pot", shield: 0, plume: "none", mask: false, beard: true, hat: "felt",
    deel: DEEL_UMBER },
  // A Kipchak skirmisher of the steppe: no armour and no shield, a fur cap, a short sabre and a long knife.
  skirmisher: { cuirass: false, weapon: "knives", shield: 0, plume: "none", mask: false, beard: true, furHat: true,
    deel: DEEL_OCHRE },
  // A Georgian axeman: mail to the knee, a conical helm, a long-hafted bearded axe in both hands.
  axeman: { cuirass: true, mail: true, full: true, weapon: "axe", shield: 0, plume: "none", mask: false, beard: true,
    helmet: "conical", deel: DEEL_CRIMSON, scale: 1.08 },
};

/**
 * A tall shield (a pavise): a board `height` tall and `width` wide, bowed a little about its upright,
 * facing +z in its frame with its x axis up the face; the grip sits `drop` above its middle. UV: u
 * across and v up the face (pixels), w the distance in from the nearest edge (-1 behind).
 */
function towerBoard(width, height, { bow = 1.4, thickness = 1.3, drop = 4, cols = 8, rows = 14 } = {}) {
  const v = [];
  const uv = [];
  const t = [];
  const hw = width / 2;
  const hh = height / 2;
  const columns = cols + 1;
  for (const side of [1, -1]) {
    const start = v.length;
    for (let i = 0; i <= rows; i++) {
      const x = -hh - drop + (height * i) / rows;
      for (let k = 0; k <= cols; k++) {
        const y = -hw + (width * k) / cols;
        const z = side > 0 ? thickness / 2 + bow * (1 - (y / hw) ** 2) : -thickness / 2 + bow * (1 - (y / hw) ** 2) * 0.6;
        v.push([x, y, z]);
        uv.push([y, x + drop, side > 0 ? Math.min(hw - Math.abs(y), hh - Math.abs(x + drop)) : -1]);
      }
    }
    for (let i = 0; i < rows; i++) {
      for (let k = 0; k < cols; k++) {
        const a = start + i * columns + k;
        if (side > 0) t.push([a, a + columns, a + columns + 1], [a, a + columns + 1, a + 1]);
        else t.push([a, a + columns + 1, a + columns], [a, a + 1, a + columns + 1]);
      }
    }
  }
  return mesh(v, uv, t, { twoSided: true });
}

function buildParts(kind) {
  const k = KINDS[kind];
  const M = materialsFor(k.deel);
  const parts = [];
  const add_ = (name, mesh, bind, material, options = {}) => parts.push({ name, mesh, bind, material, ...options });
  const put = (name, { mesh, bind }, material, options) => add_(name, mesh, bind, material, options);

  // The padded coat beneath everything: a stout, broad body.
  const rings = torsoRings([
    [37.0, 5.5, 5.8, 6.6], [40.5, 5.6, 5.8, 6.8], [44.0, 5.6, 5.4, 6.9, -0.1], [47.5, 6.2, 5.5, 7.6],
    [51.0, 6.8, 5.8, 8.3, 0.2], [55.0, 7.0, 6.0, 8.8, 0.3], [58.4, 6.3, 5.7, 9.0, 0.1], [60.6, 5.0, 4.8, 7.8, -0.2],
    [62.0, 3.5, 3.5, 4.6], [63.0, 2.7, 2.7, 2.9],
  ]);
  add_("torso", tube(rings, { sides: 20 }), torsoWeights, M.deel, { group: "torso" });
  if (k.cuirass) {
    // Lamellar from the hips to the chest, the captain's and the mace-bearer's to the collar; mail for
    // the shield-bearer.
    const top = k.heavy || k.full ? 60.2 : 58.8;
    add_("cuirass", band(rings, [40.6, 44, 47.5, 51, 55, top], k.heavy || k.full ? 1.0 : 0.8, { sides: 22 }), torsoWeights,
      k.mail ? M.mail : M.cuirass, { group: "torso" });
  }
  add_("sash", band(rings, [42.2, 43.4, 44.6], k.cuirass ? 1.25 : 0.7), torsoWeights, M.sash, { group: "torso" });
  add_("belt", band(rings, [40.8, 41.8, 42.8], k.cuirass ? 1.45 : 1.0), "pelvis", M.belt, { group: "torso", prio: 1.3 });
  {
    const frame = { o: [k.cuirass ? 7.4 : 6.8, -0.6, 41.8], x: [0, 1, 0], y: [0, 0, 1], z: [1, 0, 0] };
    const r = k.heavy ? 2.1 : 1.7;
    add_("roundel", lathe([[r, 0], [r * 0.93, 0.5], [r * 0.5, 0.95], [0, 1.05]], { frame, segments: 12 }), "pelvis", M.bronze,
      { group: "torso", prio: 3 });
  }
  if (k.heavy) {
    // The captain's chest disc.
    const frame = { o: [7.6, -2.2, 55.2], x: [0, 1, 0], y: [0, 0, 1], z: [0.93, -0.36, 0] };
    add_("chestDisc", lathe([[2.4, 0], [2.3, 0.5], [1.4, 1.0], [0, 1.15]], { frame, segments: 14 }), "chest", M.bronze,
      { group: "torso", prio: 3 });
  }

  // Fur at the collar (a full mantle for the captain).
  add_("collar", place(lathe(k.heavy
    ? [[3.4, 7.0], [8.6, 7.8], [10.2, 9.6], [9.4, 11.6], [6.4, 13.4], [3.6, 14.2]]
    : [[3.3, 9.4], [6.6, 10.2], [7.2, 11.6], [5.8, 13.2], [3.5, 14.1]], { segments: 20, squash: [1, k.heavy ? 1.0 : 1.12] }),
  rest.chest), "chest", M.fur, { group: "collar" });

  // Skirts: the coat to mid-shin, then lamellar tassets over it to the knee.
  const coat = skirt(k.cuirass ? [
    [44.5, 6.4, 6.4, 7.6], [40.0, 7.0, 7.2, 8.0], [34.0, 8.0, 8.4, 8.8], [27.5, 9.0, 9.6, 9.4], [21.0, 9.8, 10.6, 9.9],
    [16.5, 10.2, 11.0, 10.1],
  ] : [
    [44.5, 6.2, 6.2, 7.3], [40.0, 6.9, 7.0, 7.8], [34.0, 7.9, 8.2, 8.5], [27.5, 8.9, 9.4, 9.1], [21.0, 9.6, 10.4, 9.6],
    [17.5, 10.0, 10.8, 9.8],
  ], { open: k.cuirass ? 0.7 : 1.05, free: 0.82 });
  add_("skirt", coat.mesh, coat.bind, k.cuirass ? M.deelSkirt : M.furTrimSkirt,
    { group: "skirt", skirt: true, length: coat.length, edge: coat.edge });
  if (k.cuirass) {
    const plates = skirt(k.heavy ? [
      [45.2, 7.2, 7.2, 8.4], [40.6, 7.9, 8.1, 8.9], [34.5, 8.9, 9.3, 9.6], [28.5, 9.9, 10.4, 10.2], [22.0, 10.6, 11.2, 10.6],
    ] : [
      [45.0, 7.0, 7.0, 8.2], [40.4, 7.7, 7.9, 8.7], [34.5, 8.7, 9.1, 9.4], [28.6, 9.6, 10.1, 9.9], [25.2, 10.0, 10.5, 10.1],
    ], { open: 1.2, free: 0.72 });
    add_("tassets", plates.mesh, plates.bind, k.mail ? M.mail : M.tassets, { group: "tassets", skirt: true,
      length: plates.length, edge: plates.edge });
  }

  // Arms: padded sleeves, iron bracers, lamellar pauldrons.
  for (const side of ["N", "F"]) {
    put(`sleeve${side}`, sleeve(side, [3.7, 3.55, 3.2, 3.0, 3.15, 3.0, 2.7, 2.4]), k.cuirass ? M.sleeve : M.archerSleeve,
      { group: `arm${side}` });
    put(`shoulder${side}`, shoulderCap(side, k.heavy || k.full ? [4.9, 5.0, 4.3] : k.cuirass ? [4.4, 4.5, 3.9] : [3.8, 3.9, 3.5],
      k.heavy || k.full ? 1.4 : 1.0), k.mail ? M.mail : k.cuirass ? M.pauldron : M.deel, { group: `arm${side}` });
    put(`fist${side}`, fist(side, [3.5, 3.1, 3.7]), M.glove, { group: `arm${side}`, prio: 1.4 });
  }

  // Legs.
  for (const side of ["N", "F"]) {
    put(`trousers${side}`, trousers(side, [5.1, 5.4, 5.1, 4.5, 4.3, 4.0, 3.3]), M.trousers, { group: `leg${side}` });
    put(`boot${side}`, bootShaft(side, [3.4, 3.15, 2.85, 2.7]), M.boot, { group: `leg${side}` });
    put(`foot${side}`, foot(side, [9.0, 3.7, 4.3]), M.foot, { group: `leg${side}` });
  }

  // Head: a broad face, a drooping moustache, a domed helmet on a fur brim.
  add_("neck", place(tube([{ c: [0, 0, -0.5], rx: 2.9 }, { c: [0, 0, 4.2], rx: 2.7 }], { sides: 10 }), rest.neck), "neck",
    M.skin, { group: "head" });
  // Wounds, shown only where a part has been cut away (a cap on the body, the same on the piece).
  const wound = (name, centre, radii, frame, bind, bone) =>
    add_(name, place(ellipsoid(centre, radii, { rings: 6, segments: 14 }), frame), bind, M.stump,
      { group: name, prio: 1.8, optional: true, bone });
  wound("stumpNeck", [0, 0, 4.0], [3.0, 2.9, 1.1], rest.neck, "neck", 1.45);
  wound("stumpShoulderN", [0, 0, 3.6], [3.8, 3.6, 1.5], rest.upperArmN, "chest", 1.9);
  wound("stumpHipN", [0, 0, -1.6], [5.8, 5.6, 1.8], rest.thighN, "pelvis", 2.2);
  wound("stumpWaist", [0.3, 0, 4.9], [7.6, 6.8, 1.4], rest.pelvis, "pelvis", 2.0);
  wound("stumpChest", [0.3, 0, -0.6], [7.0, 6.4, 1.3], rest.spine, "spine", 1.85);
  add_("skull", onHead(ellipsoid([-0.3, 0, 5.0], [4.7, 4.3, 5.3])), "head", M.skin, { group: "head" });
  add_("face", onHead(ellipsoid([1.7, 0, 2.8], [3.3, 3.5, 3.2])), "head", M.skin, { group: "head" });
  add_("nose", onHead(ellipsoid([4.3, 0, 4.0], [1.0, 0.85, 1.3], { rings: 6, segments: 8 })), "head", M.skin,
    { group: "head", prio: 1.5 });
  for (const y of [-1.8, 1.8]) {
    add_("eye", onHead(ellipsoid([3.6, y, 5.0], [0.65, 0.6, 0.45], { rings: 6, segments: 8 })), "head", M.eye,
      { group: "head", prio: 5 });
  }
  if (k.mask) {
    add_("mask", onHead(ellipsoid([2.4, 0, 2.2], [3.0, 4.0, 3.4])), "head", M.mask, { group: "head", prio: 1.2 });
  } else {
    add_("moustache", onHead(ellipsoid([3.9, 0, 2.6], [0.9, 2.2, 0.55], { rings: 6, segments: 8 })), "head", M.hair,
      { group: "head", prio: 2 });
    if (k.beard) {
      add_("beard", onHead(ellipsoid([2.8, 0, 0.9], [2.0, 2.2, 2.0])), "head", M.hair, { group: "head" });
    }
  }
  const helmetFrame = { o: [-0.2, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  if (k.helmet === "conical" || k.hat === "felt") {
    // A Georgian's pointed helmet with a nasal and a mail aventail; or an engineer's tall felt cap.
    const conical = k.helmet === "conical";
    add_("helmet", onHead(lathe(conical
      ? [[5.4, 5.8], [5.5, 7.4], [5.0, 9.4], [3.9, 11.6], [2.4, 13.4], [0.9, 14.9], [0.2, 15.6]]
      : [[5.3, 5.4], [5.6, 6.8], [5.4, 8.8], [4.7, 10.8], [3.6, 12.6], [2.0, 13.8], [0.5, 14.3]],
    { frame: helmetFrame, squash: [1, 0.96], segments: 18 })), "head", conical ? M.helmet : M.felt, { group: "head" });
    add_("brim", onHead(lathe(conical
      ? [[5.45, 5.6], [5.75, 6.0], [5.75, 6.9], [5.45, 7.3]]
      : [[5.4, 4.9], [6.4, 5.3], [6.6, 6.4], [5.9, 7.2], [5.2, 7.4]], { frame: helmetFrame, squash: [1, 0.97], segments: 20,
      closeBottom: false, closeTop: false })), "head", conical ? M.helmetBand : M.felt, { group: "brim" });
    if (conical) {
      add_("helmetBand", onHead(roundedBox([4.9, 0, 3.6], [0.9, 1.1, 4.6], { roundness: 0.6 })), "head", M.helmet,
        { group: "head", prio: 2.2 });
    }
    const aventail = tube([
      { c: [-0.6, 0, 5.4], rf: 5.2, rb: 5.6, ry: 5.4 }, { c: [-0.8, 0, 2.6], rf: 5.4, rb: 6.2, ry: 6.0 },
      { c: [-1.0, 0, -0.6], rf: 5.8, rb: 6.9, ry: 6.8 },
    ].map((r) => ({ ...r, c: headPoint(r.c) })), { sides: 18, open: 2.6, front: rest.head.x });
    add_("neckGuard", aventail, hangingFromHead(0.5), conical ? M.mail : M.felt, { group: "hood" });
  } else {
  add_("helmet", onHead(lathe(k.furHat
    ? [[5.3, 6.4], [5.4, 7.6], [5.0, 9.4], [4.0, 11.0], [2.4, 12.2], [0.7, 12.8]]
    : [[5.3, 6.0], [5.45, 7.4], [5.2, 9.0], [4.4, 10.6], [3.1, 12.0], [1.5, 13.0], [0.5, 13.5]],
  { frame: helmetFrame, squash: [1, 0.96], segments: 18 })), "head", k.furHat ? M.deel : M.helmet, { group: "head" });
  if (!k.furHat) {
    add_("helmetBand", onHead(lathe([[5.5, 8.6], [5.35, 9.3], [5.0, 10.0]], { frame: helmetFrame, squash: [1, 0.97],
      segments: 18, closeBottom: false, closeTop: false })), "head", M.helmetBand, { group: "head", prio: 1.3 });
  }
  add_("brim", onHead(lathe(k.furHat
    ? [[5.0, 4.6], [6.9, 5.0], [7.4, 6.6], [6.6, 8.2], [5.2, 8.6]]
    : [[5.0, 4.8], [6.5, 5.2], [6.9, 6.4], [6.2, 7.6], [5.1, 7.9]], { frame: helmetFrame, squash: [1, 0.97], segments: 20,
    closeBottom: false, closeTop: false })), "head", M.fur, { group: "brim" });
  add_("finial", onHead(lathe([[1.0, 13.0], [1.1, 13.8], [0.6, 14.8], [0.9, 15.4], [0.2, 16.6]], { frame: helmetFrame,
    segments: 8 })), "head", M.bronze, { group: "head", prio: 3 });
  // The neck guard: leather flaps under the brim (lamellar for the captain).
  const guard = tube([
    { c: [-0.6, 0, 5.4], rf: 5.2, rb: 5.6, ry: 5.4 }, { c: [-0.8, 0, 2.6], rf: 5.4, rb: 6.2, ry: 6.0 },
    { c: [-1.0, 0, -0.6], rf: 5.8, rb: 6.9, ry: 6.8 },
  ].map((r) => ({ ...r, c: headPoint(r.c) })), { sides: 18, open: 2.6, front: rest.head.x });
  add_("neckGuard", guard, hangingFromHead(0.5), k.heavy || k.full ? M.pauldron : M.deel, { group: "hood" });
  }

  // Shield on the far arm: round, or the shield-bearer's tall one.
  if (k.tower) {
    add_("shield", place(towerBoard(17, 38), rest.shield), "shield", M.towerShield, { group: "shield" });
  }
  if (k.shield) {
    const radius = k.shield;
    add_("shield", place(shieldDisc(radius, { dome: radius * 0.2, thickness: 1.3 }), rest.shield), "shield",
      k.heavy ? M.captainShield : M.shield, { group: "shield", radius });
    const b = radius * 0.27;
    add_("boss", place(lathe([[b, radius * 0.2 + 0.5], [b * 0.95, radius * 0.2 + 1.3], [b * 0.62, radius * 0.2 + 2.1],
      [0, radius * 0.2 + 2.5]], { segments: 14 }), rest.shield), "shield", M.boss, { group: "shield", prio: 2 });
  }

  // Weapons in the near hand.
  const onWeapon = (m) => place(m, rest.sword);
  if (k.weapon === "sabre") {
    add_("grip", onWeapon(limb([-3.3, 0, 0], [2.3, 0, 0], 0.9, 0.85, { sides: 8, steps: 2 })), "sword", M.grip,
      { group: "sword", prio: 2 });
    add_("pommel", onWeapon(ellipsoid([-3.9, 0, 0.3], [1.1, 1.0, 1.3], { rings: 6, segments: 8 })), "sword", M.bronze,
      { group: "sword", prio: 2.5 });
    add_("guard", onWeapon(roundedBox([2.8, 0, 0], [1.2, 1.3, 6.0], { roundness: 0.6 })), "sword", M.bronze,
      { group: "sword", prio: 2.5 });
    // A plundered codex, held only while he feeds it to the fire.
    // Gripped by one edge, it stands out of the fist the way the blade would; covers face the camera.
    add_("book", place(roundedBox([5.0, 0, 2.6], [11, 8, 2.6], { roundness: 0.3,
      axes: [[1, 0, 0], [0, 0, 1], [0, 1, 0]] }), rest.handN), "handN", M.codex, { group: "sword", prio: 2, optional: true });
  } else if (k.weapon === "spear") {
    add_("shaft", onWeapon(limb([-24, 0, 0], [46, 0, 0], 0.95, 0.85, { sides: 8, steps: 6 })), "sword", M.shaft,
      { group: "sword", prio: 2.2 });
    add_("socket", onWeapon(limb([44.5, 0, 0], [47.5, 0, 0], 1.25, 1.0, { sides: 8, steps: 2 })), "sword", M.helmet,
      { group: "sword", prio: 2.5 });
  } else if (k.weapon === "shortspear") {
    add_("shaft", onWeapon(limb([-12, 0, 0], [30, 0, 0], 0.9, 0.8, { sides: 8, steps: 5 })), "sword", M.shaft,
      { group: "sword", prio: 2.2 });
    add_("socket", onWeapon(limb([29, 0, 0], [32, 0, 0], 1.2, 0.95, { sides: 8, steps: 2 })), "sword", M.helmet,
      { group: "sword", prio: 2.5 });
  } else if (k.weapon === "mace") {
    // A long haft, iron-banded, and a flanged bronze head (six flanges: a six-sided lathe).
    add_("shaft", onWeapon(limb([-7, 0, 0], [24, 0, 0], 0.95, 0.9, { sides: 8, steps: 5 })), "sword", M.shaft,
      { group: "sword", prio: 2.2 });
    const head = { o: [23, 0, 0], x: [0, 1, 0], y: [0, 0, 1], z: [1, 0, 0] };
    add_("maceHead", onWeapon(lathe([[0.9, 0], [2.6, 1.2], [3.4, 3.4], [3.2, 5.6], [1.8, 7.4], [0.5, 8.6]],
      { frame: head, segments: 6 })), "sword", M.bronze, { group: "sword", prio: 2.6 });
    add_("pommel", onWeapon(ellipsoid([-7.6, 0, 0], [1.2, 1.2, 1.2], { rings: 6, segments: 8 })), "sword", M.helmet,
      { group: "sword", prio: 2.5 });
  } else if (k.weapon === "knives") {
    // A short curved sabre in the near hand.
    add_("grip", onWeapon(limb([-3.0, 0, 0], [2.0, 0, 0], 0.85, 0.8, { sides: 8, steps: 2 })), "sword", M.grip,
      { group: "sword", prio: 2 });
    add_("pommel", onWeapon(ellipsoid([-3.5, 0, 0.2], [1.0, 0.9, 1.1], { rings: 6, segments: 8 })), "sword", M.bronze,
      { group: "sword", prio: 2.5 });
    add_("guard", onWeapon(roundedBox([2.4, 0, 0], [1.0, 1.1, 4.4], { roundness: 0.6 })), "sword", M.bronze,
      { group: "sword", prio: 2.5 });
    // A long knife in the far fist (whose centre sits 2.5 off the wrist), its blade carrying on the
    // forearm's line past the knuckles, so a stab reads as the arm's reach made longer.
    const onKnife = (m) => place(m, rest.handF);
    add_("daggerGrip", onKnife(limb([-2.2, 0, 2.5], [2.0, 0, 2.5], 0.8, 0.75, { sides: 8, steps: 2 })), "handF", M.grip,
      { group: "armF", prio: 2.2 });
    add_("daggerGuard", onKnife(roundedBox([2.2, 0, 2.5], [0.8, 1.0, 3.2], { roundness: 0.6 })), "handF", M.bronze,
      { group: "armF", prio: 2.5 });
    add_("dagger", onKnife(roundedBox([7.6, 0, 2.5], [10.6, 0.9, 2.0], { roundness: 0.4 })), "handF", M.knife,
      { group: "armF", prio: 2.4 });
  } else if (k.weapon === "axe") {
    // A long haft, iron-shod, and a broad bearded head on the edge side of its end.
    add_("shaft", onWeapon(limb([-14, 0, 0], [30, 0, 0], 1.0, 0.92, { sides: 8, steps: 6 })), "sword", M.shaft,
      { group: "sword", prio: 2.2 });
    add_("socket", onWeapon(limb([25, 0, 0], [30, 0, 0], 1.35, 1.25, { sides: 8, steps: 2 })), "sword", M.helmet,
      { group: "sword", prio: 2.5 });
    // The head: a narrow neck off the socket flaring to a broad edge, its beard reaching down the haft.
    add_("axeHead", onWeapon(roundedBox([27.6, 0, 2.6], [4.6, 1.3, 4.4], { roundness: 0.4 })), "sword", M.helmet,
      { group: "sword", prio: 2.6 });
    add_("axeBlade", onWeapon(roundedBox([25.6, 0, 6.8], [10.4, 0.9, 4.2], { roundness: 0.35 })), "sword", M.knife,
      { group: "sword", prio: 2.7 });
    add_("pommel", onWeapon(ellipsoid([-14.6, 0, 0], [1.2, 1.2, 1.2], { rings: 6, segments: 8 })), "sword", M.helmet,
      { group: "sword", prio: 2.5 });
  } else if (k.weapon === "pot") {
    // A clay pot of naphtha in the throwing hand, its wick alight; three more on a strap at his hip.
    const held = { o: [1.4, 0, 1.2], x: [0, 1, 0], y: [1, 0, 0], z: [0, 0, 1] };
    add_("pot", onWeapon(lathe([[0.6, -3.2], [2.5, -2.4], [3.0, -0.4], [2.6, 1.6], [1.2, 2.6], [0.9, 3.4]],
      { frame: held, segments: 12 })), "sword", M.clay, { group: "sword", prio: 2.2, optional: true });
    add_("wick", onWeapon(ellipsoid([1.4, 0, 5.4], [0.9, 0.9, 1.4], { rings: 4, segments: 6 })), "sword", M.wick,
      { group: "sword", prio: 3, optional: true });
    for (const [x, y, z] of [[-5.6, -7.2, -2.6], [-6.8, -4.6, -3.4], [-6.2, -1.8, -2.8]]) {
      const at = { o: toParent(rest.pelvis, [x, y, z]), x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
      add_("satchel", place(lathe([[0.5, -2.6], [2.1, -2.0], [2.5, -0.3], [2.1, 1.3], [1.0, 2.1], [0.8, 2.8]], { segments: 10 }),
        at), "pelvis", M.clay, { group: "quiver" });
    }
  } else if (k.weapon === "bow") {
    // The composite bow, gripped in the far fist: its stave runs along the shield frame's x (held
    // upright when the archer faces his mark), its belly toward him, its tips recurved away.
    const pts = BOW_STAVE.map((p) => toParent(rest.shield, p));
    const radii = BOW_STAVE.map((_, i) => (Math.abs(i - 6) < 1.5 ? 1.15 : 0.9 - Math.abs(i - 6) * 0.04));
    add_("bow", tube(pts.map((c, i) => ({ c, rx: radii[i] })), { sides: 8 }), "shield", M.bow,
      { group: "bow", prio: 2.2, length: 34 });
    // The quiver at the near hip, arrows standing in it.
    const quiver = { o: toParent(rest.pelvis, [-3.5, -7.6, -3]), x: [1, 0, 0], y: [0, 1, 0], z: normalize([-0.35, 0, 1]) };
    add_("quiver", place(lathe([[2.0, -8], [2.3, -2], [2.5, 4], [2.6, 7]], { segments: 12 }), quiver), "pelvis", M.quiver,
      { group: "quiver" });
    add_("fletching", place(lathe([[2.2, 7], [2.6, 9], [1.8, 11], [0.6, 11.6]], { segments: 10 }), quiver), "pelvis",
      M.fletching, { group: "quiver", prio: 1.5 });
  }
  return parts;
}

// --- Cloth -------------------------------------------------------------------------------------

function buildChains(kind) {
  const k = KINDS[kind];
  const M = materialsFor(k.deel);
  const chains = [];
  // The horsehair plume from the finial (none on a Georgian helmet or a felt cap).
  if (k.plume !== "none") chains.push({
    name: "plume",
    anchor: (f) => toParent(f.head, [-0.6, 0, 16.0]),
    dir: (f) => sub(toParent(f.head, [-6, 0, 12]), toParent(f.head, [-0.6, 0, 16.0])),
    links: 6,
    length: k.heavy ? 22 : 18,
    stiffness: 0.25,
    widths: [2.2, 3.0, 3.4, 3.4, 3.0, 2.4, 1.8],
    material: k.plume === "red" ? M.redPlume : k.plume === "white" ? M.whitePlume : M.plume,
    group: "plume",
    catch: 2.0,
    weight: 0.7,
    twist: 30,
  });
  // Red strips from the belt: front, side, back.
  const strips = k.heavy ? [[6.8, -2.4, 13, 3.0], [3.6, -7.4, 11, 2.6], [-6.4, -3.0, 14, 3.2], [6.0, 3.4, 10, 2.6]]
    : [[7.0, -2.6, 12, 2.6], [-6.0, -3.6, 10, 2.4], [5.6, 3.4, 9, 2.2]];
  for (const [x, y, length, width] of k.mail ? [] : strips) {
    chains.push({
      name: "strip",
      anchor: (f) => toParent(f.pelvis, [x, y, 1.6]),
      dir: () => [0, 0, -1],
      links: 4,
      length,
      stiffness: 0.3,
      widths: [width, width, width * 0.95, width * 0.85, width * 0.75],
      material: M.strip,
      group: "strip",
      weight: 1.2,
    });
  }
  if (k.heavy) {
    // The captain's tattered cloak from the shoulders.
    chains.push({
      name: "cloak",
      anchor: (f) => toParent(f.chest, [-6.6, 0.4, 9.6]),
      dir: (f) => sub(toParent(f.chest, [-9, 0.4, -6]), toParent(f.chest, [-6.6, 0.4, 9.6])),
      links: 7,
      length: 40,
      stiffness: 0.3,
      widths: [12, 12.5, 12.5, 12, 11.5, 11, 10, 9],
      material: M.cloak,
      group: "cloak",
      catch: 0.55,
      weight: 1.7,
      twist: 10,
    });
  }
  if (k.weapon === "spear") {
    // The tassel below the spearhead.
    chains.push({
      name: "tassel",
      anchor: (f) => toParent(f.sword, [44.6, 0, 0]),
      dir: () => [0, 0, -1],
      links: 3,
      length: 7,
      stiffness: 0.1,
      widths: [2.4, 2.8, 2.4, 1.6],
      material: M.tassel,
      group: "tassel",
      weight: 1,
    });
  }
  return chains;
}

// --- Weapons drawn as lines -------------------------------------------------------------------

const BLADES = {
  sabre: { from: 3.4, length: 25, curve: 2.6, colors: { edge: STEEL[6], flat: STEEL[4], spine: STEEL[3], dark: STEEL[1] } },
  spear: { from: 47.5, length: 9.5, curve: 0, colors: { edge: STEEL[6], flat: STEEL[4], spine: STEEL[3], dark: STEEL[1] } },
  shortspear: { from: 32, length: 8.5, curve: 0, colors: { edge: STEEL[6], flat: STEEL[4], spine: STEEL[3], dark: STEEL[1] } },
  knives: { from: 2.8, length: 17, curve: 2.0, colors: { edge: STEEL[6], flat: STEEL[4], spine: STEEL[3], dark: STEEL[1] } },
  // The axe's head is modelled; its line is only for where it strikes.
  axe: { from: 20.6, length: 10.4, curve: 0, lift: 7.6, hidden: true, colors: { edge: STEEL[6], flat: STEEL[4], spine: STEEL[3], dark: STEEL[1] } },
  // The mace's head is modelled; its line is only for where it strikes.
  mace: { from: 22, length: 10, curve: 0, hidden: true, colors: { edge: STEEL[6], flat: STEEL[4], spine: STEEL[3], dark: STEEL[1] } },
  captain: { from: 3.4, length: 30, curve: 3.0, colors: { edge: STEEL[6], flat: STEEL[4], spine: STEEL[3], dark: STEEL[1] } },
};

/** The archer's string, and an arrow when one is nocked: lines drawn over the render. */
function bowLines(frames, pose) {
  const bow = frames.shield;
  const top = toParent(bow, BOW_STAVE[BOW_STAVE.length - 1]);
  const bottom = toParent(bow, BOW_STAVE[0]);
  const drawn = pose.draw ?? 0;
  const rest_ = add(scale(add(top, bottom), 0.5), scale(bow.z, -1.6));
  const nock = drawn > 0 ? toParent(frames.handN, [0, 0, 2.6]) : rest_;
  const lines = [{ points: [top, nock, bottom], color: hex("#b9ad95"), width: 1 }];
  if (pose.arrow) {
    const grip = bow.o;
    const dir = normalize(sub(grip, nock));
    const tip = add(grip, scale(dir, 6));
    lines.push({ points: [nock, tip], color: hex("#7a5c3e"), width: 1 });
    lines.push({ points: [add(tip, scale(dir, -1.5)), tip], color: hex("#d4dbe2"), width: 1 });
  }
  return lines;
}

/** The bow's stave in the shield frame: x along the stave, z toward the mark. */
const BOW_STAVE = Array.from({ length: 13 }, (_, i) => {
  const t = i / 12 - 0.5;
  const tip = Math.max(0, Math.abs(t) - 0.4);
  return [t * 34, 0, -2.6 * (2 * t) ** 2 + tip * 22];
});

/** A Mongol soldier ready for the renderer. */
export function mongol(kind) {
  const k = KINDS[kind];
  return {
    parts: buildParts(kind),
    chains: buildChains(kind),
    blade: k.weapon === "bow" || k.weapon === "pot" ? null : BLADES[k.heavy ? "captain" : k.weapon],
    lines: k.weapon === "bow" ? bowLines : null,
    colliders: (f) => bodyColliders(f, { torso: k.heavy || k.full ? 7.8 : 7.0, thigh: 6.0, hips: k.cuirass ? 9.2 : 8.2 }),
    rest,
    yaw: 22,
    scale: k.heavy ? 1.14 : (k.scale ?? 1),
  };
}
