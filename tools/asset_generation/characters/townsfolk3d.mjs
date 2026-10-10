// The people of Baghdad in 3D, after the same body as Yusuf and the soldiers: long robes to the
// ankle over loose trousers and soft shoes; turbans, caps and headscarves. Shaykh Ibrahim the
// bookseller (indigo and saffron, a great cream turban, a white beard, a satchel of manuscripts),
// Hamid, a wounded guardsman of the Caliph in Abbasid black, a mother sheltering her child,
// townspeople fleeing (or held captive), Salim in his saffron sash, Shaykh Abd al-Latif the old
// keeper of the college library in a green so dark it is nearly black, and a young copyist.
import { P } from "../lib/palette.mjs";
import { hex, mix } from "../lib/canvas.mjs";
import { toParent } from "../lib/space.mjs";
import { ellipsoid, lathe, place, roundedBox, tube } from "../lib/meshes.mjs";
import { pick } from "../lib/sprite_shader.mjs";
import {
  bodyColliders, bootShaft, fist, foot, hangingFromHead, headPoint, onHead, rest, shoulderCap, skirt, sleeve,
  band, torsoRings, torsoWeights, trousers,
} from "./figure3d.mjs";
import { dusty } from "./wear.mjs";

const ramp = (...codes) => codes.map((c) => hex(c));
const frac = (x) => x - Math.floor(x);
const outlineOf = (r, k = 0.55) => mix(r[0], P.outline, k);
const shaded = (r, bias = 0, extra = {}) => ({ ramp: r, outline: outlineOf(r), line: r[0], rim: 0.3,
  shade: (s) => pick(r, s.light, bias), ...extra });

const BLACK = ramp("#09080a", "#121014", "#1c181e", "#28222b", "#373039", "#48404a");
const DEEP_GREEN = ramp("#070f0e", "#0d1b19", "#142a26", "#1d3c36", "#2a5249", "#3a6a5e");
const CREAM = ramp("#3d362c", "#5f5646", "#857a64", "#ab9f84", "#cfc3a5", "#e8dec4");
const WHITE_BEARD = ramp("#4a4440", "#76706a", "#a39d95", "#cfc9bf", "#e9e4da");
const SKIN = ramp("#26140f", "#46271b", "#6c3f2b", "#93603d", "#b98557");
const HAIR = ramp("#0b0808", "#161010", "#221a17", "#30251f");
/** A worn, darkened madder for headscarves. */
const DUSK_RED = ramp("#1a0a0a", "#311312", "#4a1d19", "#652a22", "#83392c");
/** The townsfolk's dyes as firelight at night shows them: duller than any faction colour (style guide §5). */
const LINEN = ramp("#25211b", "#3b352c", "#544b3e", "#6d624f", "#877a62");
const WOOL = ramp("#17130f", "#26201b", "#382f28", "#4b4037", "#605247");
const INDIGO = ramp("#0f111a", "#1a1e2d", "#262d42", "#353f58", "#48546f");
const MADDER = ramp("#1f0c0a", "#361511", "#4f1f19", "#692b21", "#83392b");
const SAFFRON = ramp("#2c1d08", "#4d330e", "#6f4c16", "#93661f", "#b4822b");
const SLIPPER = ramp("#140c08", "#25170e", "#3a2416", "#523420");

/** A robe material: the cloth on its ramp, a trim along the hem and the cuffs. */
function robeMaterial(cloth, trim, { pattern = false, bias = -0.55 } = {}) {
  const shade = (s) => {
    const length = s.part.length ?? 99;
    if (s.v > length - 1.8) return pick(trim, s.light, -0.2);
    const fold = Math.abs(frac(s.w * 8 + s.v * 0.02) - 0.5) < 0.07 && s.v > 3;
    if (pattern && frac((s.u + s.v) / 5) < 0.12 && s.light > 0.45) return pick(cloth, s.light, bias + 1);
    return pick(cloth, s.light, bias - (fold ? 1 : 0));
  };
  return {
    feel: "cloth", ramp: cloth, outline: outlineOf(cloth), line: cloth[0], rim: 0.32,
    // The hem has dragged through the dust and ash of the streets.
    shade: (s) => (s.part.length ? dusty(shade(s), s, s.v / s.part.length, { from: 0.62, amount: 0.4, seed: 3 }) : shade(s)),
  };
}

const sleeveMaterial = (cloth, trim) => ({
  feel: "cloth", ramp: cloth, outline: outlineOf(cloth), line: cloth[0], rim: 0.3,
  shade: (s) => (s.v > 24 ? pick(trim, s.light, -0.2) : pick(cloth, s.light, -0.2 - (frac(s.v / 3.4) < 0.15 && s.light > 0.5 ? 1 : 0))),
});

const turbanMaterial = (cloth) => ({
  feel: "cloth", ramp: cloth, outline: outlineOf(cloth), line: cloth[0], rim: 0.35,
  shade: (s) => pick(cloth, s.light, 0.1 - (frac((s.u * 0.8 + s.v * 1.6) / 2.6) < 0.22 ? 1 : 0)),
});

const M = {
  skin: shaded(SKIN, 0.35, { rim: 0.25, feel: "skin" }),
  hair: shaded(HAIR, 0.2, { feel: "hair" }),
  white: shaded(WHITE_BEARD, -0.1, { rim: 0.3, feel: "hair" }),
  eye: { ramp: HAIR, outline: P.outline, line: HAIR[0], rim: 0, shade: () => hex("#0a0707") },
  slipper: shaded(SLIPPER, -0.4, { feel: "leather" }),
  leather: shaded(P.leather, -0.2, { feel: "leather" }),
  satchelFlap: shaded(P.leather, -0.9, { feel: "leather" }),
  bronze: { feel: "metal", ramp: P.bronze, outline: outlineOf(P.bronze), line: P.bronze[0], rim: 0.3,
    shade: (s) => (s.glint > 0.5 ? P.bronze[4] : pick(P.bronze, s.light, 0)) },
  bandage: shaded(CREAM, 0.2, { feel: "cloth" }),
  blood: shaded(P.blood, -0.6),
  // Where the head was cut away: wet red flesh, a pale core of bone.
  stump: { ramp: P.blood, outline: outlineOf(P.blood, 0.4), line: P.blood[0], rim: 0.15, glintPower: 10,
    shade: (s) => (s.glint > 0.5 ? P.blood[4] : Math.abs(s.v) > 1.4 ? pick(CREAM, s.light, -1.5) : pick(P.blood, s.light, 0.5)) },
};

/**
 * A robed townsperson. options: { robe, trim, sash, sleeves (the robe's colour by default),
 * trousers, head: "turban" | "cap" | "scarf" | "bare", headCloth, beard: "white" | "dark" |
 * null, satchel, child, wound, girth }.
 */
function robed(options) {
  const parts = [];
  const add_ = (name, mesh, bind, material, extra = {}) => parts.push({ name, mesh, bind, material, ...extra });
  const put = (name, { mesh, bind }, material, extra) => add_(name, mesh, bind, material, extra);
  const g = options.girth ?? 1;
  const rings = torsoRings([
    [37.0, 5.3 * g, 5.5 * g, 6.2 * g], [40.5, 5.3 * g, 5.5 * g, 6.4 * g], [44.0, 5.2 * g, 5.2 * g, 6.4 * g, -0.1],
    [47.5, 5.7 * g, 5.3 * g, 7.0 * g], [51.0, 6.2 * g, 5.5 * g, 7.6 * g, 0.2], [55.0, 6.4 * g, 5.6 * g, 8.0 * g, 0.2],
    [58.4, 5.8 * g, 5.4 * g, 8.2 * g], [60.6, 4.6, 4.5, 7.0], [62.0, 3.3, 3.3, 4.2], [63.0, 2.6, 2.6, 2.8],
  ]);
  const robe = robeMaterial(options.robe, options.trim, { pattern: options.pattern });
  add_("torso", tube(rings, { sides: 20 }), torsoWeights, robe, { group: "torso" });
  if (options.sash) {
    // A sash the story names (Salim's) is wide and bright enough to pick him out by it.
    const sashBand = options.wideSash ? [40.6, 43.4, 46.2] : [42.6, 44.0, 45.4];
    add_("sash", band(rings, sashBand, 0.6), torsoWeights,
      { ...shaded(options.sash, -0.2, { feel: "cloth" }), shade: (s) => pick(options.sash, s.light, -0.2 - (frac(s.v / 1.4) < 0.3 ? 1 : 0)) },
      { group: "torso" });
  }
  // The robe's skirt to the ankles, closed but for a slit at the front.
  const gown = skirt([
    [45.0, 5.6 * g, 5.6 * g, 6.8 * g], [39.0, 6.0 * g, 6.6 * g, 7.4 * g], [31.0, 6.4 * g, 7.8 * g, 8.0 * g],
    [22.0, 6.7 * g, 8.8 * g, 8.6 * g], [13.0, 7.0 * g, 9.6 * g, 9.0 * g], [6.2, 7.2 * g, 10.2 * g, 9.3 * g],
  ], { open: 0.18, free: 0.86 });
  add_("skirt", gown.mesh, gown.bind, robe, { group: "skirt", skirt: true, length: gown.length });
  const sleeves = options.sleeves ?? options.robe;
  for (const side of ["N", "F"]) {
    put(`sleeve${side}`, sleeve(side, [3.4, 3.3, 3.2, 3.1, 3.2, 3.3, 3.4, 3.2]), sleeveMaterial(sleeves, options.trim),
      { group: `arm${side}` });
    put(`shoulder${side}`, shoulderCap(side, [3.4, 3.5, 3.1], 0.6), shaded(sleeves, -0.2, { feel: "cloth" }), { group: `arm${side}` });
    put(`hand${side}`, fist(side, [2.8, 2.4, 3.2]), M.skin, { group: `arm${side}`, prio: 1.4 });
    put(`trousers${side}`, trousers(side, [4.4, 4.6, 4.3, 3.9, 3.7, 3.4, 3.0], 0.7), shaded(options.trousers ?? LINEN, -0.6, { feel: "cloth" }),
      { group: `leg${side}` });
    put(`ankle${side}`, bootShaft(side, [2.9, 2.7, 2.5, 2.4], 0.66), shaded(options.trousers ?? LINEN, -0.8, { feel: "cloth" }),
      { group: `leg${side}` });
    put(`foot${side}`, foot(side, [8.4, 3.2, 3.6]), M.slipper, { group: `leg${side}` });
  }

  // Head.
  add_("neck", place(tube([{ c: [0, 0, -0.5], rx: 2.5 }, { c: [0, 0, 4.2], rx: 2.3 }], { sides: 10 }), rest.neck), "neck",
    M.skin, { group: "head" });
  // The wound of a beheading, shown only by the poses (and the piece) that need it.
  add_("stumpNeck", place(ellipsoid([0, 0, 4.0], [2.7, 2.6, 1.1], { rings: 6, segments: 14 }), rest.neck), "neck", M.stump,
    { group: "stumpNeck", prio: 1.8, optional: true });
  add_("skull", onHead(ellipsoid([-0.3, 0, 5.0], [4.5, 4.0, 5.2])), "head", M.skin, { group: "head" });
  add_("face", onHead(ellipsoid([1.6, 0, 2.7], [3.2, 3.1, 3.2])), "head", M.skin, { group: "head" });
  add_("nose", onHead(ellipsoid([4.3, 0, 4.0], [1.1, 0.8, 1.4], { rings: 6, segments: 8 })), "head", M.skin,
    { group: "head", prio: 1.5 });
  for (const y of [-1.7, 1.7]) {
    add_("eye", onHead(ellipsoid([3.5, y, 5.0], [0.65, 0.55, 0.55], { rings: 6, segments: 8 })), "head", M.eye,
      { group: "head", prio: 5 });
  }
  if (options.beard === "white") {
    add_("beard", onHead(ellipsoid([2.2, 0, 0.2], [2.9, 3.4, 4.4])), "head", M.white, { group: "head" });
    add_("moustache", onHead(ellipsoid([3.9, 0, 2.9], [0.9, 1.8, 0.6], { rings: 6, segments: 8 })), "head", M.white,
      { group: "head", prio: 2 });
  } else if (options.beard === "dark") {
    add_("beard", onHead(ellipsoid([2.3, 0, 1.3], [3.0, 3.4, 2.7])), "head", M.hair, { group: "head" });
  }
  const headCloth = options.headCloth ?? CREAM;
  if (options.head === "turban" || options.head === "bigTurban") {
    const big = options.head === "bigTurban" ? 1.18 : 1;
    add_("turban", onHead(lathe([[5.0, 5.0], [5.9 * big, 6.2], [6.3 * big, 8.0], [6.0 * big, 10.0], [4.8 * big, 11.6],
      [2.6 * big, 12.6], [0.6, 13.0]], { frame: { o: [-0.3, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, segments: 18,
      squash: [1, 0.95] })), "head", turbanMaterial(headCloth), { group: "head" });
  } else if (options.head === "cap") {
    add_("cap", onHead(lathe([[4.9, 6.4], [5.1, 7.6], [4.6, 9.4], [3.0, 10.8], [0.6, 11.4]], { frame: { o: [-0.3, 0, 0],
      x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, segments: 16 })), "head", turbanMaterial(headCloth), { group: "head" });
    add_("hair", onHead(ellipsoid([-1.6, 0, 5.4], [3.6, 4.1, 4.2])), "head", M.hair, { group: "head" });
  } else if (options.head === "scarf") {
    add_("scarfTop", onHead(lathe([[5.2, 4.6], [5.4, 6.8], [5.0, 9.2], [3.6, 11.0], [0.6, 11.8]], {
      frame: { o: [-0.4, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }, segments: 18 })), "head",
    turbanMaterial(headCloth), { group: "hood" });
    const scarf = tube([
      { c: [-0.5, 0, 6.4], rf: 5.2, rb: 5.6, ry: 5.4 }, { c: [-0.7, 0, 3.4], rf: 5.3, rb: 6.2, ry: 5.9 },
      { c: [-0.8, 0, 0.2], rf: 5.6, rb: 6.9, ry: 6.6 }, { c: [-0.9, 0, -3.0], rf: 6.4, rb: 7.8, ry: 7.8 },
    ].map((r) => ({ ...r, c: headPoint(r.c) })), { sides: 18, open: 2.2, front: rest.head.x });
    add_("scarf", scarf, hangingFromHead(0.6), turbanMaterial(headCloth), { group: "hood" });
  }

  // What they carry.
  if (options.satchel) {
    const hand = rest.handF;
    // A flat leather satchel hanging from the fist by its strap: height along the arm, width forward.
    add_("satchel", place(roundedBox([6.4, 0, 0.8], [7.4, 3.0, 9.4], { roundness: 0.3 }), hand), "handF", M.leather,
      { group: "satchel" });
    add_("satchelFlap", place(roundedBox([3.6, -0.3, 0.8], [3.0, 3.4, 9.6], { roundness: 0.3 }), hand), "handF", M.satchelFlap,
      { group: "satchel", prio: 1.2 });
    add_("buckle", place(ellipsoid([4.9, -1.8, 0.8], [1.0, 0.6, 1.0], { rings: 6, segments: 8 }), hand), "handF", M.bronze,
      { group: "satchel", prio: 3 });
  }
  if (options.child) {
    const chest = rest.chest;
    add_("childBody", place(ellipsoid([8.6, -1.5, 1.0], [4.0, 4.4, 6.2]), chest), "chest", shaded(MADDER, -0.1, { feel: "cloth" }),
      { group: "child" });
    add_("childHead", place(ellipsoid([8.0, -1.6, 8.6], [2.9, 2.8, 3.1]), chest), "chest", M.skin, { group: "child" });
    add_("childHair", place(ellipsoid([7.2, -1.6, 9.6], [2.4, 2.9, 2.4]), chest), "chest", M.hair, { group: "child" });
  }
  if (options.wound) {
    // A bandage bound about the brow, dark where it has bled through.
    add_("bandage", onHead(lathe([[4.9, 6.6], [5.2, 7.4], [5.1, 8.4]], { frame: { o: [-0.3, 0, 0], x: [1, 0, 0],
      y: [0, 1, 0], z: [0, 0, 1] }, segments: 16, closeBottom: false, closeTop: false })), "head",
    { ...M.bandage, shade: (s) => (s.w > 0.05 && s.w < 0.16 ? pick(P.blood, s.light, -0.4) : pick(CREAM, s.light, 0.2)) },
    { group: "head", prio: 1.3 });
  }
  return parts;
}

/** Cloth that hangs free on some of them: a turban's tail, a scarf's end. */
function chains(options) {
  const out = [];
  if (options.tail) {
    out.push({
      name: "turbanTail",
      anchor: (f) => toParent(f.head, [-5.2, 0.8, 7.6]),
      dir: (f) => [-0.4, 0, -1],
      links: 4,
      length: 12,
      stiffness: 0.25,
      widths: [3.2, 3.0, 2.8, 2.5, 2.2],
      material: turbanMaterial(options.headCloth ?? CREAM),
      group: "tail",
      catch: 1.4,
      weight: 0.9,
    });
  }
  return out;
}

const PEOPLE = {
  scholar: { robe: INDIGO, trim: SAFFRON, sash: SAFFRON, head: "bigTurban", beard: "white", satchel: true, girth: 1.06,
    tail: true },
  guard: { robe: BLACK, trim: P.gold, sash: MADDER, head: "turban", headCloth: BLACK, beard: "dark", wound: true,
    trousers: BLACK },
  mother: { robe: WOOL, trim: MADDER, head: "scarf", headCloth: DUSK_RED, child: true, scale: 0.94 },
  refugee_man: { robe: LINEN, trim: WOOL, sash: MADDER, head: "cap", headCloth: WOOL, beard: "dark" },
  refugee_woman: { robe: MADDER, trim: SAFFRON, sash: SAFFRON, head: "scarf", headCloth: WOOL, scale: 0.94 },
  salim: { robe: LINEN, trim: MADDER, sash: P.saffron, wideSash: true, head: "turban", headCloth: CREAM, beard: "dark", tail: true },
  librarian: { robe: DEEP_GREEN, trim: P.gold, sash: P.gold, head: "turban", headCloth: CREAM, beard: "white", satchel: true,
    pattern: true },
  copyist: { robe: INDIGO, trim: LINEN, sash: LINEN, head: "cap", headCloth: LINEN, scale: 0.95 },
};

/** Arrows standing in a back (a pose's `arrows`: how many), drawn as lines over the render. */
function arrowLines(frames, pose) {
  const lines = [];
  for (let i = 0; i < (pose.arrows ?? 0); i++) {
    const from = toParent(frames.chest, [-3.2, 1.5 - i * 3, 6 - i * 4]);
    const to = toParent(frames.chest, [-16, 2.5 - i * 3.5, 13 - i * 5]);
    lines.push({ points: [from, to], color: hex("#6e5238") });
    lines.push({ points: [to, toParent(frames.chest, [-17.5, 2.6 - i * 3.5, 14 - i * 5])], color: hex("#b9b2a4") });
  }
  return lines;
}

/** A townsperson ready for the renderer. */
export function townsperson(kind) {
  const options = PEOPLE[kind];
  return {
    parts: robed(options),
    chains: chains(options),
    lines: arrowLines,
    blade: null,
    colliders: (f) => bodyColliders(f, { torso: 6.4, thigh: 5.4, hips: 9.6 }),
    rest,
    yaw: 22,
    scale: options.scale ?? 1,
  };
}

export const KINDS = Object.keys(PEOPLE);
