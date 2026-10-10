// Yusuf ibn Harun, guardsman of the Caliph, modelled in 3D after the concept art (01): a steel
// helmet with an engraved bronze band, a bronze spike and a nasal over a dark teal hood; a short
// black beard; a quilted near-black coat to the knees, open below the belt, crossed by a baldric
// with a bronze roundel; a long teal scarf at the neck with its tail flying behind; mail sleeves
// and leather bracers banded in bronze; a teal sash and a studded belt; loose dark trousers
// bloused into strap-wound boots; a round shield of dark teal lacquer worked with a gold star and
// a bronze boss; a gently curved sabre.
//
// Parts are modelled around the rest pose of body3d.mjs and bound to its bones. Materials turn
// the renderer's surface samples (light, normal, surface UV) into palette colours.
import { P } from "../lib/palette.mjs";
import { hex, mix } from "../lib/canvas.mjs";
import { clamp, sub, toParent } from "../lib/space.mjs";
import { ellipsoid, lathe, limb, place, roundedBox, shieldDisc, tube } from "../lib/meshes.mjs";
import { pick, rampIndex } from "../lib/sprite_shader.mjs";
import { ribbonSides } from "./body3d.mjs";
import {
  band, bodyColliders, bootShaft, fist, foot, hangingFromHead, headPoint, onHead, rest, shoulderCap, skirt, sleeve,
  torsoRings, torsoWeights, trousers,
} from "./figure3d.mjs";

const ramp = (...codes) => codes.map((c) => hex(c));
const at = (r, i) => r[clamp(i, 0, r.length - 1)];
const frac = (x) => x - Math.floor(x);

// --- Palette ---------------------------------------------------------------------------------

const COAT = ramp("#0d0a0a", "#171110", "#221a17", "#2f241f", "#40322a", "#564437");
const MAIL = ramp("#121419", "#23272e", "#383e48", "#545c68", "#7a8490", "#aeb8c4");
const TEAL = ramp("#071618", "#0d2626", "#143938", "#1e4f4c", "#2b6863", "#3f8679");
const SASH = ramp("#0a1e20", "#11312f", "#194643", "#255f59", "#367a70", "#4d9686");
const LEATHER = ramp("#130c08", "#22160e", "#352315", "#4b331f", "#64462c", "#7f5c3b");
const BRONZE = ramp("#2a180b", "#4d2f12", "#7a5220", "#a97b35", "#d2a65a", "#f0d48e");
const STEEL = ramp("#101318", "#20252c", "#363d47", "#555e6a", "#7f8995", "#b7c1cb", "#e6edf2");
const HELM = ramp("#111316", "#1f2329", "#30363e", "#454c56", "#5f6772", "#868f9a", "#c9d1d9");
const SKIN = ramp("#26140f", "#46271b", "#6c3f2b", "#93603d", "#b98557");
const HAIR = ramp("#0b0808", "#161010", "#221a17", "#30251f");
const TROUSERS = ramp("#0f0b09", "#19130f", "#241c16", "#31261e", "#423328");
const LACQUER = ramp("#08100f", "#0f1d1c", "#172b29", "#21403b", "#2d564e", "#3e6f63");
const GOLD = ramp("#3a240f", "#6b4418", "#a07028", "#d0a548", "#f0d58c");

const outlineOf = (r, k = 0.55) => mix(r[0], P.outline, k);

/** A plain material on a ramp, lit by the key light; `bias` shifts it darker or lighter. */
function shaded(r, bias = 0, extra = {}) {
  return { ramp: r, outline: outlineOf(r), line: r[0], rim: 0.32, shade: (s) => pick(r, s.light, bias), ...extra };
}

/** Metal: lit on its ramp, with a hard glint where it turns to the light. */
const metal = (r, s, bias = 0, threshold = 0.55) => (s.glint > threshold ? r[r.length - 1] : pick(r, s.light, bias));

/** Quilting: diamond lines stitched across padded cloth. */
const quilt = (s, size = 3.8) => s.light > 0.52 && (frac((s.u + s.v) / size) < 0.22 || frac((s.u - s.v) / size) < 0.22);

// --- Materials -------------------------------------------------------------------------------

const M = {};

/** The coat's body: quilted, a teal stole hanging down its front, a baldric and its roundel. */
M.coat = {
  ramp: COAT, outline: outlineOf(COAT), line: COAT[0], rim: 0.34,
  shade(s) {
    const around = (s.w > 0.5 ? s.w - 1 : s.w) * 44; // pixels from the front, + toward the far side
    // The baldric, from the near shoulder down to the far hip, and its bronze boss.
    const strap = Math.abs((around + 5.4) * 15 / 11.6 - (21 - s.v)) / 1.73;
    if (Math.hypot(around - 0.2, s.v - 13.6) < 1.6) return metal(BRONZE, s, 0.4);
    if (strap < 0.95 && s.v > 5 && s.v < 22) return pick(LEATHER, s.light, -0.2 + (strap > 0.55 ? -1 : 0));
    // The scarf's end, hanging down the chest.
    if (around > -1.2 && around < 2.4 && s.v > 7.5) {
      const fold = frac((s.v + around * 0.6) / 3) < 0.22;
      return pick(TEAL, s.light, 0.1 - (fold ? 1 : 0));
    }
    return pick(COAT, s.light, -0.6 - (quilt(s) ? 1 : 0));
  },
};

/** The coat's skirt: quilted, teal facings down its open front, a bronze and teal hem. */
function skirtMaterial(length, edge) {
  return {
    ramp: COAT, outline: outlineOf(COAT), line: COAT[0], rim: 0.34,
    shade(s) {
      if (s.v > length - 1.3) return pick(TEAL, s.light, -0.3);
      if (s.v > length - 2.3) return metal(BRONZE, s, -0.6, 0.7);
      if (s.w < edge + 0.03 || s.w > 1 - edge - 0.03) return pick(TEAL, s.light, -0.2);
      return pick(COAT, s.light, -0.6 - (quilt(s) ? 1 : 0));
    },
  };
}

/** Sleeves: the coat's short sleeve, mail on the upper arm, a bronze-banded leather bracer. */
M.sleeve = {
  ramp: MAIL, outline: outlineOf(MAIL), line: MAIL[0], rim: 0.3,
  shade(s) {
    if (s.v < 4.4) return pick(COAT, s.light, -0.6 - (quilt(s) ? 1 : 0));
    if (s.v < 13.6) {
      const ring = (Math.floor(s.u * 1.15) + Math.floor(s.v * 1.4)) & 1;
      if (s.glint > 0.5 && !ring) return MAIL[5];
      return pick(MAIL, s.light, -0.7 - ring);
    }
    if (s.v < 14.4) return MAIL[0];
    if ((s.v > 15 && s.v < 16.2) || (s.v > 23.2 && s.v < 24.4)) return metal(BRONZE, s, -0.4);
    return pick(LEATHER, s.light, -0.2);
  },
};

M.glove = shaded(LEATHER, -1);
M.shoulder = { ...M.sleeve, shade: (s) => pick(COAT, s.light, -0.25 - (quilt(s) ? 1 : 0)) };

M.trousers = {
  ramp: TROUSERS, outline: outlineOf(TROUSERS), line: TROUSERS[0], rim: 0.28,
  shade(s) {
    const fold = Math.abs(frac(s.w * 3 + s.v * 0.035) - 0.5) < 0.06;
    return pick(TROUSERS, s.light, -0.1 - (fold ? 1 : 0));
  },
};

M.boot = {
  ramp: LEATHER, outline: outlineOf(LEATHER), line: LEATHER[0], rim: 0.25,
  shade(s) {
    const a = frac((s.v * 0.9 + s.u * 0.6) / 2.6) < 0.3;
    const b = frac((s.v * 0.9 - s.u * 0.6) / 2.6) < 0.3;
    return pick(LEATHER, s.light, -0.6 - (a || b ? 1 : 0));
  },
};
M.foot = shaded(LEATHER, -0.9);

M.skin = shaded(SKIN, 0.1, { rim: 0.25 });
M.beard = shaded(HAIR, 0.2, { rim: 0.2 });
M.eye = { ramp: HAIR, outline: P.outline, line: HAIR[0], rim: 0, shade: () => hex("#0a0707") };

M.helmet = {
  ramp: HELM, outline: outlineOf(HELM), line: HELM[0], rim: 0.3,
  shade: (s) => metal(HELM, s, -1.6, 0.62),
};
M.band = {
  ramp: BRONZE, outline: outlineOf(BRONZE), line: BRONZE[0], rim: 0.35,
  shade(s) {
    const engraved = (Math.floor(s.u * 0.9) + Math.floor(s.v * 2.2)) % 3 === 0;
    return metal(BRONZE, s, -0.3 - (engraved ? 1 : 0), 0.6);
  },
};
M.bronze = { ramp: BRONZE, outline: outlineOf(BRONZE), line: BRONZE[0], rim: 0.35, shade: (s) => metal(BRONZE, s, 0, 0.45) };
M.nasal = { ramp: STEEL, outline: outlineOf(STEEL), line: STEEL[0], rim: 0.3, shade: (s) => metal(STEEL, s, 0, 0.5) };

M.hood = {
  ramp: TEAL, outline: outlineOf(TEAL), line: TEAL[0], rim: 0.34,
  shade(s) {
    const fold = Math.abs(frac(s.w * 7) - 0.5) < 0.1 && s.v > 2;
    return pick(TEAL, s.light, -0.9 - (fold ? 1 : 0));
  },
};
M.collar = {
  ramp: TEAL, outline: outlineOf(TEAL), line: TEAL[0], rim: 0.34,
  shade(s) {
    const fold = frac(s.v * 0.55 + s.w * 4) < 0.18;
    return pick(TEAL, s.light, -0.3 - (fold ? 1 : 0));
  },
};
M.scarf = {
  ramp: TEAL, outline: outlineOf(TEAL), line: TEAL[0], rim: 0.4,
  shade(s) {
    if (s.w > 0.9 && (s.x + s.y) % 2 === 0) return null;
    if (s.w > 0.74 && s.w < 0.79) return pick(GOLD, s.light, -1.2);
    return pick(TEAL, s.light, -0.25 - (Math.abs(s.u) > 1.2 ? 0.5 : 0));
  },
};
M.sash = {
  ramp: SASH, outline: outlineOf(SASH), line: SASH[0], rim: 0.3,
  shade(s) {
    const stripe = frac(s.v / 1.4) < 0.3;
    return pick(SASH, s.light, -0.4 - (stripe ? 1 : 0));
  },
};
M.sashEnd = {
  ramp: SASH, outline: outlineOf(SASH), line: SASH[0], rim: 0.3,
  shade(s) {
    if (s.w > 0.86 && s.x % 2 === 0) return null;
    if (s.w > 0.8 && s.w < 0.86) return pick(GOLD, s.light, -1);
    return pick(SASH, s.light, -0.5);
  },
};
M.belt = {
  ramp: LEATHER, outline: outlineOf(LEATHER), line: LEATHER[0], rim: 0.25,
  shade(s) {
    if (frac(s.u / 3.2) < 0.3 && s.v > 0.5 && s.v < 1.3) return metal(BRONZE, s, 0.3);
    return pick(LEATHER, s.light, -0.5);
  },
};

/** The shield: dark teal lacquer, a gold eight-pointed star and ring, a bronze rim. */
M.shield = {
  ramp: LACQUER, outline: outlineOf(LACQUER, 0.6), line: LACQUER[0], rim: 0.34,
  shade(s) {
    const r = s.w;
    if (r > 10.4) return pick(LEATHER, s.light, -1.2); // the back and the edge
    if (r > 9.3) return metal(BRONZE, s, -0.2, 0.5);
    const x = s.u;
    const y = s.v;
    const square = Math.max(Math.abs(x), Math.abs(y));
    const diamond = (Math.abs(x) + Math.abs(y)) / Math.SQRT2;
    const star = Math.max(square, diamond);
    if (Math.abs(r - 7.6) < 0.4) return metal(GOLD, s, -1.4, 0.7);
    if (Math.abs(star - 5.4) < 0.4) return pick(LACQUER, s.light, 1.2);
    if (s.glint > 0.7) return LACQUER[5];
    return pick(LACQUER, s.light, -0.6);
  },
};
M.boss = { ramp: BRONZE, outline: outlineOf(BRONZE), line: BRONZE[0], rim: 0.3, shade: (s) => metal(BRONZE, s, 0.2, 0.4) };
M.grip = shaded(LEATHER, -1.2, { rim: 0 });
/** The naphtha flask: fired clay ringed by its turning, and a rag wick alight. */
const CLAY = ramp("#1e110b", "#341d12", "#4f2c1a", "#6d3f25", "#8d5633", "#ab6f45");
M.clay = { ramp: CLAY, outline: outlineOf(CLAY), line: CLAY[0], rim: 0.3,
  shade: (s) => pick(CLAY, s.light, -0.3 - (frac(s.v / 2.2) < 0.18 ? 1 : 0)) };
M.wick = { ramp: BRONZE, outline: outlineOf(BRONZE, 0.3), line: BRONZE[0], rim: 0,
  shade: (s) => (s.glint > 0.3 ? BRONZE[5] : BRONZE[4]) };
M.gold = { ramp: GOLD, outline: outlineOf(GOLD), line: GOLD[0], rim: 0.2, shade: (s) => metal(GOLD, s, 0, 0.45) };

// --- Model ------------------------------------------------------------------------------------

/** The sprite camera turns this many degrees toward his front: a three-quarter view. */
export const YAW = 22;

export { rest };

function buildParts() {
  const parts = [];
  const add_ = (name, mesh, bind, material, options = {}) => parts.push({ name, mesh, bind, material, ...options });
  const put = (name, { mesh, bind }, material, options) => add_(name, mesh, bind, material, options);

  // Torso: the coat over a broad, padded chest. Rings: [z, front, back, half-width, forward].
  const rings = torsoRings([
    [37.0, 5.3, 5.5, 6.3], [40.5, 5.3, 5.5, 6.5], [44.0, 5.1, 5.1, 6.5, -0.2], [47.5, 5.7, 5.2, 7.2],
    [51.0, 6.5, 5.5, 8.0, 0.2], [55.0, 6.8, 5.7, 8.6, 0.3], [58.4, 6.1, 5.5, 8.9, 0.1], [60.6, 4.9, 4.7, 7.6, -0.2],
    [62.0, 3.4, 3.4, 4.4], [63.0, 2.6, 2.6, 2.8],
  ]);
  add_("torso", tube(rings, { sides: 20 }), torsoWeights, M.coat, { group: "torso" });

  // Sash and belt round the waist, with bronze roundels.
  add_("sash", band(rings, [43.0, 44.4, 45.8, 47.4], 0.75), torsoWeights, M.sash, { group: "torso" });
  add_("belt", band(rings, [41.4, 42.4, 43.4], 1.0), "pelvis", M.belt, { group: "torso", prio: 1.3 });
  for (const [x, y] of [[6.6, -0.9], [5.2, -4.9]]) {
    const frame = { o: [x, y, 42.4], x: [0, 1, 0], y: [0, 0, 1], z: [x > 6 ? 1 : 0.7, x > 6 ? 0 : -0.7, 0] };
    add_("roundel", lathe([[1.5, 0], [1.4, 0.5], [0.8, 0.9], [0, 1.0]], { frame, segments: 10 }), "pelvis", M.bronze,
      { group: "torso", prio: 3 });
  }

  // The coat's skirt to the knees, open at the front.
  const coat = skirt([
    [45.0, 5.9, 5.8, 7.1], [41.0, 6.6, 6.6, 7.6], [36.0, 7.5, 7.6, 8.2], [30.5, 8.4, 8.8, 8.8], [25.5, 9.2, 9.8, 9.3],
    [21.4, 9.7, 10.4, 9.6],
  ], { open: 0.95 });
  add_("skirt", coat.mesh, coat.bind, skirtMaterial(coat.length, coat.edge), { group: "skirt", skirt: true });

  // Arms: mail sleeves under the coat's short sleeves, bracers, padded shoulders, fists.
  for (const side of ["N", "F"]) {
    put(`sleeve${side}`, sleeve(side), M.sleeve, { group: `arm${side}` });
    put(`shoulder${side}`, shoulderCap(side), M.shoulder, { group: `arm${side}` });
    put(`fist${side}`, fist(side), M.glove, { group: `arm${side}`, prio: 1.4 });
  }

  // Legs: loose trousers bloused into strap-wound boots.
  for (const side of ["N", "F"]) {
    put(`trousers${side}`, trousers(side), M.trousers, { group: `leg${side}` });
    put(`boot${side}`, bootShaft(side), M.boot, { group: `leg${side}` });
    put(`foot${side}`, foot(side), M.foot, { group: `leg${side}` });
  }

  // Neck and head.
  add_("neck", place(tube([{ c: [0, 0, -0.5], rx: 2.7 }, { c: [0, 0, 4.2], rx: 2.5 }], { sides: 10 }), rest.neck), "neck",
    M.skin, { group: "head" });
  add_("skull", onHead(ellipsoid([-0.3, 0, 5.0], [4.6, 4.1, 5.4])), "head", M.skin, { group: "head" });
  add_("face", onHead(ellipsoid([1.7, 0, 2.7], [3.3, 3.2, 3.3])), "head", M.skin, { group: "head" });
  add_("nose", onHead(ellipsoid([4.4, 0, 4.1], [1.15, 0.8, 1.45], { rings: 6, segments: 8 })), "head", M.skin,
    { group: "head", prio: 1.5 });
  add_("beard", onHead(ellipsoid([2.3, 0, 1.3], [3.1, 3.5, 2.8])), "head", M.beard, { group: "head" });
  add_("moustache", onHead(ellipsoid([4.0, 0, 2.9], [0.9, 1.7, 0.6], { rings: 6, segments: 8 })), "head", M.beard,
    { group: "head", prio: 2 });
  for (const y of [-1.7, 1.7]) {
    add_("eye", onHead(ellipsoid([3.6, y, 5.1], [0.7, 0.55, 0.6], { rings: 6, segments: 8 })), "head", M.eye,
      { group: "head", prio: 5 });
  }
  const helmetFrame = { o: [-0.15, 0, 0], x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  add_("helmet", onHead(lathe([[5.25, 5.6], [5.35, 6.8], [5.1, 8.3], [4.4, 9.9], [3.3, 11.3], [1.9, 12.5], [0.6, 13.3]],
    { frame: helmetFrame, squash: [1, 0.95], segments: 18 })), "head", M.helmet, { group: "head" });
  add_("band", onHead(lathe([[5.55, 5.3], [5.65, 6.2], [5.55, 7.1]], { frame: helmetFrame, squash: [1, 0.96],
    segments: 18, closeBottom: false, closeTop: false })), "head", M.band, { group: "head", prio: 1.4 });
  add_("spike", onHead(lathe([[1.0, 13.0], [0.75, 13.9], [0.45, 15.0], [0.15, 16.3]], { frame: helmetFrame,
    segments: 8 })), "head", M.bronze, { group: "head", prio: 3 });
  add_("nasal", onHead(roundedBox([5.35, 0, 4.3], [0.9, 1.1, 4.6], { roundness: 0.5 })), "head", M.nasal,
    { group: "head", prio: 3 });
  const hood = tube([
    { c: [-0.4, 0, 6.6], rf: 5.0, rb: 5.4, ry: 5.25 }, { c: [-0.6, 0, 3.6], rf: 5.1, rb: 5.9, ry: 5.7 },
    { c: [-0.7, 0, 0.6], rf: 5.4, rb: 6.6, ry: 6.4 }, { c: [-0.8, 0, -2.4], rf: 6.2, rb: 7.4, ry: 7.6 },
  ].map((r) => ({ ...r, c: headPoint(r.c) })), { sides: 18, open: 2.3, front: rest.head.x });
  add_("hood", hood, hangingFromHead(0.55), M.hood, { group: "hood" });

  // The scarf wound at the neck.
  add_("collar", place(lathe([[3.2, 9.6], [6.0, 10.4], [6.5, 11.8], [5.3, 13.2], [3.4, 14.1]], { segments: 18,
    squash: [1, 1.12] }), rest.chest), "chest", M.collar, { group: "torso" });

  // The shield on the far forearm, its boss, and the sword in the near hand.
  add_("shield", place(shieldDisc(10.6, { dome: 2.1, thickness: 1.3 }), rest.shield), "shield", M.shield,
    { group: "shield" });
  add_("boss", place(lathe([[2.7, 2.6], [2.55, 3.5], [1.7, 4.4], [0.4, 4.8], [0, 4.85]], { segments: 14 }), rest.shield),
    "shield", M.boss, { group: "shield", prio: 2 });
  const onSword = (m) => place(m, rest.sword);
  add_("grip", onSword(limb([-3.3, 0, 0], [2.3, 0, 0], 0.85, 0.8, { sides: 8, steps: 2 })), "sword", M.grip,
    { group: "sword", prio: 2 });
  add_("pommel", onSword(ellipsoid([-3.9, 0, 0], [1.0, 1.0, 1.1], { rings: 6, segments: 8 })), "sword", M.gold,
    { group: "sword", prio: 2.5 });
  add_("guard", onSword(roundedBox([2.8, 0, 0], [1.1, 1.3, 7.2], { roundness: 0.6 })), "sword", M.gold,
    { group: "sword", prio: 2.5 });
  // A flask of naphtha held in the sword fist with the grip, its wick alight: shown only while he
  // throws it (the Naft Flask).
  const flask = { o: [-0.4, 0, 4.6], x: [0, 1, 0], y: [1, 0, 0], z: [0, 0, 1] };
  add_("flask", onSword(lathe([[0.6, -3.2], [2.7, -2.4], [3.2, -0.4], [2.8, 1.6], [1.3, 2.6], [1.0, 3.6]],
    { frame: flask, segments: 12 })), "sword", M.clay, { group: "sword", prio: 2.2, optional: true });
  add_("wick", onSword(ellipsoid([-0.4, 0, 9.0], [1.1, 1.1, 1.6], { rings: 4, segments: 6 })), "sword", M.wick,
    { group: "sword", prio: 3, optional: true });
  return parts;
}

export const PARTS = buildParts();

/** The sabre's blade: from the guard along the sword frame's x, curving toward its spine (-z). */
export const BLADE = {
  from: 3.4,
  length: 27,
  curve: 2.3,
  colors: { edge: STEEL[6], flat: STEEL[4], spine: STEEL[3], dark: STEEL[1] },
};

/** Cloth that hangs free: the scarf's tail behind the neck and the sash's two ends. */
export const CHAINS = [
  {
    name: "scarf",
    anchor: (f) => toParent(f.chest, [-5.4, 0.6, 11.0]),
    dir: (f) => sub(toParent(f.chest, [-9, 0.6, 4]), toParent(f.chest, [-5.4, 0.6, 11.0])),
    links: 8,
    length: 30,
    stiffness: 0.22,
    widths: [4.4, 4.8, 4.6, 4.3, 4.0, 3.6, 3.2, 2.8, 2.4],
    material: M.scarf,
    group: "scarf",
    twist: 40,
    catch: 2.2,
    weight: 1.0,
    flutter: 0.7,
  },
  {
    name: "sashEnd",
    anchor: (f) => toParent(f.pelvis, [6.4, -1.6, 3.6]),
    dir: () => [0.15, 0, -1],
    links: 4,
    length: 15,
    stiffness: 0.3,
    widths: [3.4, 3.3, 3.1, 3.0, 2.9],
    material: M.sashEnd,
    group: "sash",
    weight: 1.3,
  },
  {
    name: "sashEnd",
    anchor: (f) => toParent(f.pelvis, [6.2, 1.2, 3.4]),
    dir: () => [0.1, 0, -1],
    links: 4,
    length: 12,
    stiffness: 0.3,
    widths: [3.0, 2.9, 2.8, 2.7, 2.6],
    material: M.sashEnd,
    group: "sash",
    weight: 1.3,
  },
];

/** Capsules the cloth drapes over. */
export const colliders = (f) => bodyColliders(f);

export { ribbonSides };
