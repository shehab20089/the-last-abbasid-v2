// Yusuf's animations, posed on the 3D skeleton (body3d.mjs). A pose sets the hips (position and
// turn), the torso's twist and lean, the head, ankle targets for the feet (the knees solve
// themselves), wrist targets for the hands, the blade's direction and the shield's facing.
//
// Space: x forward, y toward the far side (the near, sword side is negative), z up; pixels; the
// ground is z = 0 and the ankle of a flat foot sits 4.2 above it. Turns: yaw (+ brings the near
// shoulder forward), pitch (+ leans forward), roll. The sword's [angle, yaw]: angle 0 points down,
// 90 forward, 180 up, 270 (or -90) back; keep angles continuous between keys so blends sweep the
// right way round. The shield's [facing, tilt]: degrees from forward toward the camera, then up.
//
// Attacks follow what makes a blow land: a clear anticipation, the strike on one or two frames
// (the game draws its trail), a follow-through past the target, and a settle back to guard.

import { FINISHERS } from "./finisher_timing.mjs";
import { BUILD, solveBody } from "./body3d.mjs";
import { toParent } from "../lib/space.mjs";

const TAU = Math.PI * 2;

// --- Pose helpers ------------------------------------------------------------------------------

const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);

/** Merges overrides onto a base pose (rotation objects merge key by key). */
export function pose(base, overrides = {}) {
  const out = { ...base };
  for (const [k, v] of Object.entries(overrides)) {
    out[k] = isObject(v) && isObject(base[k]) ? { ...base[k], ...v } : v;
  }
  return out;
}

/** Interpolates two poses: numbers, arrays and nested rotation objects. */
export function blend(a, b, t) {
  if (typeof a === "number" && typeof b === "number") return a + (b - a) * t;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((v, i) => blend(v, b[i] ?? v, t));
  if (isObject(a) && isObject(b)) {
    const out = {};
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (key in a && key in b) out[key] = blend(a[key], b[key], t);
      else if (key in b) out[key] = b[key];
      else out[key] = a[key];
    }
    return out;
  }
  return t < 0.5 ? a : b;
}

const smooth = (t) => t * t * (3 - 2 * t);

/**
 * The pose with a hand `length` px from its shoulder along `dir` ([forward, far side, up]): an arm held
 * out straight (or nearly) at the angle a blow needs, wherever the body's turn and lean have put the
 * shoulder. A full arm reaches 25.8 px; 23-24 leaves the elbow a little give.
 */
function armOut(p, dir, length = 23.5, side = "N") {
  const frames = solveBody(p);
  const sign = side === "N" ? -1 : 1;
  const shoulder = toParent(frames.chest, [BUILD.shoulderBack, sign * BUILD.shoulderHalf, BUILD.chest - BUILD.shoulderDrop]);
  const n = Math.hypot(dir[0], dir[1], dir[2]);
  return pose(p, { [`hand${side}`]: shoulder.map((v, i) => Math.round((v + (dir[i] / n) * length) * 10) / 10) });
}

/** The sword's [angle, yaw] for a blade pointing along `d` ([forward, far side, up]). */
function toward(d) {
  const n = Math.hypot(d[0], d[1], d[2]);
  const yaw = (-Math.asin(Math.max(-1, Math.min(1, d[1] / n))) * 180) / Math.PI;
  const angle = (Math.atan2(d[0], -d[2]) * 180) / Math.PI;
  return [Math.round(angle * 10) / 10, Math.round(yaw * 10) / 10];
}

/**
 * Where a blade held straight out from the sword arm points in a turn, for the chest's yaw `theta`: the
 * wheel it sweeps is tilted, up behind his back and down past the camera, so the game's trail draws it
 * as a ring round him rather than a line through him.
 */
function wheel(theta, tilt = 34) {
  const psi = ((theta - 90) * Math.PI) / 180;
  const beta = ((tilt * Math.sin(psi)) * Math.PI) / 180;
  return toward([Math.cos(psi) * Math.cos(beta), Math.sin(psi) * Math.cos(beta), Math.sin(beta)]);
}

/** Adds offsets to a pose's numbers (cycles layered on a stance). */
function nudge(p, d) {
  const r = (base, o = {}) => ({ yaw: (base?.yaw ?? 0) + (o.yaw ?? 0), pitch: (base?.pitch ?? 0) + (o.pitch ?? 0),
    roll: (base?.roll ?? 0) + (o.roll ?? 0) });
  const v = (base, o) => (o ? base.map((x, i) => x + (o[i] ?? 0)) : base);
  return {
    ...p,
    pelvis: v(p.pelvis, d.pelvis),
    hips: r(p.hips, d.hips),
    torso: r(p.torso, d.torso),
    head: r(p.head, d.head),
    handN: v(p.handN, d.handN),
    handF: v(p.handF, d.handF),
    footN: v(p.footN, d.footN),
    footF: v(p.footF, d.footF),
    sword: v(p.sword, d.sword),
    shield: v(p.shield, d.shield),
  };
}

// --- The guard -------------------------------------------------------------------------------

/** The guard every fight starts from: shield up before the chest, the sabre low and forward. */
export const READY = {
  pelvis: [0.4, 37.8],
  hips: { yaw: -18, pitch: 4, roll: 0 },
  torso: { yaw: -2, pitch: 6, roll: 0 },
  head: { yaw: 16, pitch: -6, roll: 0 },
  footN: [-8, -4.6, 4.2],
  footF: [8, 4.8, 4.2],
  toeN: 0,
  toeF: 0,
  footYawN: -36,
  footYawF: -4,
  handN: [10.5, -10, 40.5],
  handF: [7.5, 2.5, 48.5],
  sword: [114, 16],
  shield: [36, 2],
};

const ready = (overrides) => pose(READY, overrides);

// --- Locomotion ------------------------------------------------------------------------------

function idle() {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * TAU;
    const breath = Math.sin(a);
    const sink = (1 - Math.cos(a)) * 0.45;
    return nudge(READY, {
      pelvis: [Math.sin(a) * 0.25, -sink],
      torso: { pitch: breath * 1.4, yaw: Math.sin(a) * 1.0 },
      head: { pitch: -breath * 1.0, yaw: Math.sin(a + 1) * 1.5 },
      handN: [0, 0, -sink * 0.9 + breath * 0.5],
      handF: [0, 0, -sink * 0.8 + breath * 0.6],
      sword: [breath * 3, 0],
      shield: [breath * 1.5, 0],
    });
  });
}

/** Walk: a guarded advance, the weight rolling heel to toe. */
function walk() {
  const FOOT = [
    [10.5, 4.7, 16], [5, 4.2, 0], [-1, 4.2, 0], [-7, 4.6, -16],
    [-11, 6.2, -38], [-5, 9.6, -18], [3.5, 9.2, 2], [9, 6.2, 12],
  ];
  const HEIGHT = [37.8, 37.1, 38.2, 38.7, 37.8, 37.1, 38.2, 38.7];
  const base = pose(READY, { hips: { yaw: -12, pitch: 4 }, footYawN: -10, footYawF: -6 });
  return Array.from({ length: 8 }, (_, i) => {
    const n = FOOT[i];
    const f = FOOT[(i + 4) % 8];
    const swing = Math.cos((i / 8) * TAU);
    const bob = HEIGHT[i] - 37.8;
    return pose(base, {
      pelvis: [0.4, HEIGHT[i]],
      hips: { yaw: -12 + swing * 6, pitch: 4 },
      torso: { yaw: -2 - swing * 6, pitch: 6 },
      head: { yaw: 14 + swing * 1.5, pitch: -6 },
      footN: [n[0], -4.5, n[1]],
      toeN: n[2],
      footF: [f[0], 4.7, f[1]],
      toeF: f[2],
      handN: [10.5 - swing * 2, -10, 40.5 + bob],
      handF: [7.5 + swing * 2.5, 2.5, 48.5 + bob],
      sword: [114 - swing * 4, 16],
      shield: [36 + swing * 3, 2],
    });
  });
}

/** Run: four poses a step (contact, down, passing, flight), the sabre trailing low behind. */
function run() {
  // Near ankle over the cycle: [x, z, toe]; the far foot is half a cycle on.
  const FOOT = [
    [14.4, 4.4, 6], [4.8, 4.2, 0], [-4.8, 4.2, 0], [-10.5, 7.5, -42],
    [-19, 15, -70], [-8, 21, -40], [7, 17, 0], [16, 9.5, 14],
  ];
  const HEIGHT = [37.4, 36.0, 37.6, 39.4, 37.4, 36.0, 37.6, 39.4];
  const base = pose(READY, { footYawN: -8, footYawF: -4 });
  return Array.from({ length: 8 }, (_, i) => {
    const n = FOOT[i];
    const f = FOOT[(i + 4) % 8];
    const swing = Math.cos((i / 8) * TAU); // +1 when the near leg is forward
    const lift = Math.sin((i / 8) * TAU * 2);
    return pose(base, {
      pelvis: [0.6, HEIGHT[i]],
      hips: { yaw: -10 + swing * 9, pitch: 9 },
      torso: { yaw: -swing * 12, pitch: 9 + lift * 1.5 },
      head: { yaw: 8, pitch: -16 },
      footN: [n[0], -4.4, n[1]],
      toeN: n[2],
      footF: [f[0], 4.6, f[1]],
      toeF: f[2],
      // The shield rides before the chest; the sword arm carries the blade low behind.
      handF: [7 + swing * 3, 3.5, 47 + swing * 1 + lift * 0.5],
      shield: [32 + swing * 4, 6],
      handN: [-1 - swing * 6, -10, 40 - Math.abs(swing) * 1.5],
      sword: [242 - swing * 8, 18],
    });
  });
}

/** Into a run from standing: a lean, and a push off the back foot. */
const RUN_START = [
  ready({ pelvis: [0.6, 36.4], hips: { yaw: -14, pitch: 10 }, torso: { yaw: -2, pitch: 12 }, head: { yaw: 12, pitch: -10 },
    footF: [7, 4.8, 5.4], toeF: 8, footN: [-9, -4.6, 4.2], handN: [4, -10, 41], sword: [200, 18], handF: [8, 3, 48],
    shield: [33, 5] }),
  ready({ pelvis: [1.4, 35.8], hips: { yaw: -10, pitch: 14 }, torso: { yaw: 6, pitch: 14 }, head: { yaw: 8, pitch: -14 },
    footF: [12, 4.8, 7.4], toeF: 14, footN: [-10, -4.6, 5.8], toeN: -34, handN: [0, -10, 40], sword: [232, 18],
    handF: [9, 3.5, 47], shield: [33, 6] }),
];

/** Pulling up from a run: the heels dug in, leaning back against the speed, then the guard. */
const SKID = (() => {
  const dig = ready({ pelvis: [-1.6, 34.8], hips: { yaw: -16, pitch: -4 }, torso: { yaw: -4, pitch: -8 }, head: { yaw: 14, pitch: -10 },
    footF: [10, 4.8, 4.2], toeF: 20, footN: [-6.5, -4.6, 4.2], handN: [8, -10, 43], sword: [116, 16], handF: [10, 3, 51],
    shield: [36, 6] });
  return [dig, nudge(dig, { pelvis: [0.6, 0.8], torso: { pitch: 3 }, handN: [0.6, 0, 0.6] }), blend(dig, READY, 0.6)];
})();

/** Turning about on the run (played as he faces the new way): the pivot through facing the camera. */
const TURN = [
  ready({ pelvis: [0, 36.2], hips: { yaw: -70, pitch: 6 }, torso: { yaw: -18, pitch: 6 }, head: { yaw: 40, pitch: -6 },
    footF: [5, 4.8, 4.2], footN: [-5, -4.6, 4.2], footYawN: -70, footYawF: -40, handN: [6, -12, 42], sword: [150, 40],
    handF: [8, 5, 48], shield: [70, 4] }),
  ready({ pelvis: [0.6, 36.4], hips: { yaw: -40, pitch: 8 }, torso: { yaw: -10, pitch: 8 }, head: { yaw: 24, pitch: -10 },
    footF: [8, 4.8, 7.4], toeF: 10, footN: [-7, -4.6, 4.2], handN: [3, -11, 41], sword: [200, 24], handF: [8, 4, 48],
    shield: [50, 5] }),
];

// --- In the air -----------------------------------------------------------------------------

const AIR = pose(READY, { hips: { yaw: -14, pitch: 4 }, torso: { yaw: 0, pitch: 4 }, head: { yaw: 12, pitch: -8 } });

const JUMP = [
  pose(AIR, { pelvis: [0.5, 39.6], footN: [-6, -4.4, 7], toeN: -55, footF: [6, 4.6, 15], toeF: -10,
    torso: { pitch: 2 }, handN: [-3, -10, 47], sword: [238, 22], handF: [9, 3, 53], shield: [30, 14] }),
  pose(AIR, { pelvis: [0.5, 40.2], footN: [-3, -4.4, 15], toeN: -30, footF: [6, 4.6, 20], toeF: 0,
    handN: [1, -10, 49], sword: [200, 20], handF: [9, 3, 54], shield: [32, 12] }),
];

const APEX = [
  pose(AIR, { pelvis: [0.5, 40.4], footN: [-2, -4.4, 17], toeN: -20, footF: [6, 4.6, 19.5], toeF: 0,
    torso: { pitch: 8 }, handN: [6, -10, 50], sword: [160, 18], handF: [9, 3, 54], shield: [34, 10] }),
];

const FALL = [
  pose(AIR, { pelvis: [0.5, 40], footN: [-4, -4.4, 10], toeN: -24, footF: [5, 4.6, 11], toeF: -12,
    torso: { pitch: 2 }, head: { pitch: 2 }, handN: [8, -11, 53], sword: [146, 22], handF: [9, 3.5, 56], shield: [36, 16] }),
  pose(AIR, { pelvis: [0.5, 40], footN: [-4, -4.4, 9], toeN: -20, footF: [5, 4.6, 10], toeF: -8,
    torso: { pitch: 1 }, head: { pitch: 3 }, handN: [8, -11, 54.5], sword: [150, 22], handF: [9, 3.5, 57], shield: [36, 18] }),
];

const LAND = [
  ready({ pelvis: [0.4, 30.5], hips: { yaw: -16, pitch: 12 }, torso: { pitch: 18 }, head: { pitch: 6 },
    footN: [-9, -4.8, 4.2], footF: [9, 5, 4.2], handN: [13, -11, 32], sword: [96, 22], handF: [10, 4, 40], shield: [40, -8] }),
  ready({ pelvis: [0.4, 34.5], hips: { yaw: -17, pitch: 8 }, torso: { pitch: 11 }, head: { pitch: 0 },
    footN: [-8.5, -4.7, 4.2], footF: [8.5, 4.9, 4.2], handN: [11.5, -10.5, 36], sword: [106, 18], handF: [8.5, 3, 44], shield: [38, -2] }),
];

// --- Fighting in the air ---------------------------------------------------------------------

/** The knees drawn up in the air. */
const TUCK = { footN: [-3, -4.4, 15], toeN: -24, footF: [6, 4.6, 18], toeF: -4 };

/** Air slash: a diagonal forehand cut in the air, the knees drawn up. Active on frames 2-3. */
function airAttack() {
  const wound = pose(AIR, { pelvis: [-0.6, 40.2], hips: { yaw: -26, pitch: 2 }, torso: { yaw: -24, pitch: -2, roll: 4 },
    head: { yaw: 24, pitch: -6 }, ...TUCK, handN: [-6, -8.5, 63], sword: [214, 18], handF: [10, 3, 52], shield: [26, 6] });
  const cut = pose(AIR, { pelvis: [1.6, 40], hips: { yaw: 6, pitch: 10 }, torso: { yaw: 16, pitch: 14, roll: -2 },
    head: { yaw: 6, pitch: 2 }, footN: [-6, -4.4, 12], toeN: -30, footF: [9, 4.6, 14], toeF: 6,
    handN: [19, -9, 47], sword: [88, 4], handF: [5, 4, 48], shield: [24, -4] });
  const through = pose(cut, { pelvis: [2, 39.6], hips: { yaw: 12, pitch: 14 }, torso: { yaw: 28, pitch: 20, roll: -3 },
    head: { yaw: 0, pitch: 8 }, handN: [13, -2, 33], sword: [24, -10], handF: [1, 5, 46], shield: [20, -8] });
  const settle = pose(through, { torso: { yaw: 22, pitch: 14 }, handN: [12, -4, 37], sword: [48, -4] });
  return [blend(APEX[0], wound, 0.6), wound, cut, through, settle, blend(settle, FALL[0], 0.6)];
}

/** The plunge's fall: the knees up, the sabre held point-down below him, the shield thrown wide. */
const PLUNGE_TUCK = { footN: [-1, -4.4, 19], toeN: -40, footF: [5, 4.6, 21], toeF: -24 };
const PLUNGING = pose(AIR, { pelvis: [0.6, 40], hips: { yaw: -12, pitch: 8 }, torso: { yaw: -4, pitch: 10 },
  head: { yaw: 12, pitch: 14 }, ...PLUNGE_TUCK, handN: [7, -8, 37], sword: [6, 4], handF: [4, 7, 50], shield: [50, 30] });

/** The plunge begins: the sabre swung up overhead, then over and down until it points at the man below. */
const PLUNGE = [
  pose(AIR, { pelvis: [0, 40.6], hips: { yaw: -18, pitch: -4 }, torso: { yaw: -12, pitch: -8, roll: 2 },
    head: { yaw: 18, pitch: -10 }, ...TUCK, handN: [2, -9, 66], sword: [178, 14], handF: [9, 3, 55], shield: [30, 12] }),
  pose(AIR, { pelvis: [0.4, 40.4], hips: { yaw: -14, pitch: 6 }, torso: { yaw: -6, pitch: 8 }, head: { yaw: 14, pitch: 6 },
    ...PLUNGE_TUCK, handN: [14, -8.5, 54], sword: [80, 8], handF: [6, 5, 52], shield: [40, 20] }),
  PLUNGING,
];
const PLUNGE_FALL = [PLUNGING, nudge(PLUNGING, { torso: { pitch: 1.5 }, head: { pitch: 1 }, handN: [0, 0, -0.6] })];

/** The plunge lands: the blade driven into the street before him, the body folded over it, then up. */
function plungeLand() {
  const impact = ready({ pelvis: [1.2, 26], hips: { yaw: -12, pitch: 22 }, torso: { yaw: 4, pitch: 32 },
    head: { yaw: 8, pitch: 14 }, footN: [-9, -4.8, 4.2], footF: [9, 5, 4.2], handN: [13, -8, 21], sword: [4, 2],
    handF: [4, 9, 36], shield: [62, 24] });
  const sink = pose(impact, { pelvis: [1.4, 25.2], torso: { pitch: 34 }, handN: [13, -8, 20.4] });
  const pull = pose(impact, { pelvis: [0.8, 30], hips: { pitch: 14 }, torso: { yaw: 0, pitch: 20 }, head: { pitch: 6 },
    handN: [14, -9, 34], sword: [40, 6], handF: [8, 5, 44], shield: [46, 8] });
  const rise = pose(pull, { pelvis: [0.5, 34.5], hips: { yaw: -16, pitch: 8 }, torso: { yaw: -2, pitch: 11 },
    head: { pitch: 0 }, handN: [12, -9.5, 39], sword: [96, 14], handF: [8, 3, 46], shield: [40, 0] });
  return [impact, sink, pull, rise, blend(rise, READY, 0.6), READY];
}

// --- Sword ----------------------------------------------------------------------------------

// Footwork: a stepping foot lifts (ankle at LIFT) on the frame it travels and lands on the next; a
// foot that stays down is held still on the ground by the build while the game's lunge carries the
// body (lib/root_motion.mjs). The front foot steps into the blow and the back foot drags up behind
// it, so by the recovery frame he stands in his guard again, a little further on.
const LIFT = 7.4;
const BACK = [-8, -4.6, 4.2];

/** Light 1: a forehand cut from over the near shoulder. Coiled with the weight back, the front foot steps
 * into the blow and the hips open before the shoulders; at the strike the arm is straight and the shield
 * pulled back to the hip, then the blade follows through past the front knee. Active on frames 4-5. */
function attack1() {
  const wound = ready({ pelvis: [-1.8, 37], hips: { yaw: -30, pitch: 2 }, torso: { yaw: -28, pitch: -2, roll: 4 },
    head: { yaw: 28, pitch: -5 }, handN: [-6, -8.5, 63], sword: [212, 18], handF: [12, 3, 50], shield: [24, 2] });
  const loaded = nudge(wound, { pelvis: [-0.4, -0.3], torso: { yaw: -2, roll: 1 }, handN: [-0.8, 0, 0.5], sword: [5, 0] });
  // The step: the front foot off the street, the hips already turning, the blade coming over the top.
  const step = armOut(ready({ pelvis: [0.4, 36.8], hips: { yaw: -8, pitch: 5 }, torso: { yaw: -14, pitch: 2, roll: 2 },
    head: { yaw: 18, pitch: -4 }, footF: [11, 4.8, LIFT], toeF: 12, sword: [166, 12], handF: [8, 4, 48], shield: [34, 0] }),
    [0.3, -0.25, 0.92], 21);
  const cut = armOut(ready({ pelvis: [2, 36], hips: { yaw: 6, pitch: 9 }, torso: { yaw: 14, pitch: 6, roll: -2 },
    head: { yaw: 6, pitch: -2 }, footF: [13, 4.8, 4.2], sword: [94, 4], handF: [1, 7, 45], shield: [62, -4] }),
    [0.95, -0.1, -0.3], 17);
  const through = armOut(ready({ pelvis: [3, 35], hips: { yaw: 12, pitch: 12 }, torso: { yaw: 20, pitch: 11, roll: -3 },
    head: { yaw: 2, pitch: 0 }, footF: [13.5, 4.8, 4.2], footN: [-6.5, -4.6, 6.8], toeN: 8,
    sword: [24, -12], handF: [-3, 7, 46], shield: [74, -6] }), [0.55, -0.3, -0.78], 18);
  const past = pose(through, { pelvis: [3.4, 34.8], torso: { yaw: 23, pitch: 12, roll: -3 }, sword: [12, -16],
    handN: [through.handN[0] - 1.5, through.handN[1] + 0.5, through.handN[2] - 1] });
  const settle = pose(past, { pelvis: [3.6, 35.6], torso: { yaw: 14, pitch: 8 }, sword: [40, -6],
    handN: [through.handN[0] - 2, through.handN[1], through.handN[2] + 3], footN: [-7, -4.6, LIFT], toeN: 6 });
  return [
    blend(READY, wound, 0.55),
    wound,
    loaded,
    step,
    cut,
    through,
    past,
    settle,
    pose(blend(settle, READY, 0.55), { footF: through.footF, footN: BACK }),
    pose(READY, { footF: through.footF }),
  ];
}

/** Light 2: a rising backhand. The blade swings down and back past his near side, the weight surges onto
 * the front foot and the cut climbs on a diagonal, low behind to high before him, the shield driven out.
 * Active on frames 4-5. */
function attack2() {
  const low = armOut(ready({ pelvis: [0.6, 35.4], hips: { yaw: -22, pitch: 10 }, torso: { yaw: -22, pitch: 11, roll: 2 },
    head: { yaw: 22, pitch: 0 }, footF: [11, 4.8, 4.2], sword: [-50, -8], handF: [12, 3, 48], shield: [28, 2] }),
    [-0.45, -0.25, -0.85]);
  const coiled = nudge(low, { pelvis: [-0.4, -0.4], torso: { yaw: -2, pitch: 1 }, handN: [-0.8, 0, -0.4], sword: [-4, 0] });
  // The drive: the front foot up, the blade swinging through beneath him.
  const drive = armOut(ready({ pelvis: [1.8, 35.2], hips: { yaw: -10, pitch: 10 }, torso: { yaw: -14, pitch: 8, roll: 2 },
    head: { yaw: 18, pitch: -2 }, footF: [12.5, 4.8, LIFT], toeF: 12, sword: [24, 8], handF: [6, 5, 46], shield: [44, -6] }),
    [0.55, -0.3, -0.75], 21);
  const rise = armOut(ready({ pelvis: [2.8, 36], hips: { yaw: -6, pitch: 6 }, torso: { yaw: -10, pitch: 3, roll: 2 },
    head: { yaw: 18, pitch: -6 }, footF: [14, 4.8, 4.2], sword: [112, 16], handF: [0, 6, 44], shield: [58, -10] }),
    [0.95, -0.2, -0.2], 19);
  const high = armOut(ready({ pelvis: [4, 38.2], hips: { yaw: -12, pitch: 0 }, torso: { yaw: -22, pitch: -6, roll: 4 },
    head: { yaw: 24, pitch: -12 }, footF: [14.5, 4.8, 4.2], footN: [-6.5, -4.6, 6.8], toeN: 8,
    sword: [186, 14], handF: [2, 6, 46], shield: [56, -8] }), [0.35, -0.25, 0.9]);
  const over = pose(high, { pelvis: [3.8, 38.4], torso: { yaw: -24, pitch: -8 }, sword: [204, 14],
    handN: [high.handN[0] - 1.5, high.handN[1], high.handN[2] + 0.5] });
  const hold = pose(high, { pelvis: [3.6, 37.6], torso: { yaw: -16, pitch: -2 }, footN: [-7, -4.6, LIFT], toeN: 6,
    handN: [high.handN[0] + 2, high.handN[1], high.handN[2] - 7], sword: [150, 16] });
  return [
    blend(pose(READY, { footF: low.footF }), low, 0.6),
    low,
    coiled,
    drive,
    rise,
    high,
    over,
    hold,
    pose(blend(hold, READY, 0.55), { footF: high.footF, footN: BACK }),
    pose(READY, { footF: high.footF }),
  ];
}

/** Light 3: the thrust. The point drawn back at the hip with the body coiled behind the shield, then an
 * explosive lunge (the back leg straight, the front foot far, arm and blade in one line), a hold, and the
 * back foot drags up. Active on frames 4-6. */
function attack3() {
  const drawn = ready({ pelvis: [-2.4, 36.6], hips: { yaw: -30, pitch: 4 }, torso: { yaw: -30, pitch: 3, roll: 2 },
    head: { yaw: 28, pitch: -4 }, footF: [9, 4.8, 4.2], footN: [-8.5, -4.6, 4.2], handN: [-6, -10, 46], sword: [96, 6],
    handF: [12, 3, 51], shield: [24, 4] });
  const sink = nudge(drawn, { pelvis: [-0.6, -0.8], torso: { pitch: 1.5 }, handN: [-1, 0, -0.4] });
  // The push: the back leg driving, the body launched, the arm starting out.
  const push = ready({ pelvis: [0.2, 35.6], hips: { yaw: -18, pitch: 8 }, torso: { yaw: -14, pitch: 8 }, head: { yaw: 18, pitch: -2 },
    footF: [12, 4.8, LIFT + 1.2], toeF: 16, footN: [-8.5, -4.6, 5], toeN: -20, handN: [4, -9.5, 46], sword: [94, 4],
    handF: [8, 4, 50], shield: [36, 2] });
  const lunge = ready({ pelvis: [5, 34.2], hips: { yaw: 6, pitch: 12 }, torso: { yaw: 20, pitch: 14, roll: -2 },
    head: { yaw: 2, pitch: 2 }, footF: [17, 4.8, LIFT + 0.6], toeF: 18, footN: [-8.5, -4.6, 5.4], toeN: -26,
    handN: [26, -8, 46], sword: [93, 2], handF: [-2, 7, 46], shield: [72, -4] });
  const reach = pose(lunge, { pelvis: [5.6, 32.8], torso: { yaw: 24, pitch: 16 }, footF: [19, 4.8, 4.2], toeF: 0,
    footN: [-8.5, -4.6, 5.6], toeN: -30, handN: [29.5, -7.5, 45.2], sword: [92, 0] });
  const hold = pose(reach, { pelvis: [5.4, 33], footN: [-7, -4.6, 7.0], toeN: 6, handN: [29, -7.5, 45.2] });
  const drag = pose(reach, { pelvis: [5.2, 33.4], footN: [-3, -4.6, 4.2], toeN: 0, handN: [28.5, -7.5, 45.2] });
  return [
    blend(READY, drawn, 0.6),
    drawn,
    sink,
    push,
    lunge,
    reach,
    hold,
    drag,
    pose(blend(reach, READY, 0.5), { footF: reach.footF, footN: [-3, -4.6, 4.2] }),
    pose(blend(reach, READY, 0.8), { footF: reach.footF, footN: [-5, -4.6, LIFT] }),
    pose(READY, { footF: reach.footF }),
  ];
}

/** Heavy: the cleave. The blade raised and drawn far back over the shoulder with the shield flung out before
 * him (the charge holds on frame 2), a step, the blade over the top and down through his centre into a deep
 * landing. Active on frames 5-6. */
function heavy() {
  const lift = ready({ pelvis: [-1.6, 38.6], hips: { yaw: -24, pitch: -2 }, torso: { yaw: -18, pitch: -8, roll: 3 },
    head: { yaw: 22, pitch: -8 }, handN: [-3, -8, 66], sword: [236, 12], handF: [11, 3, 53], shield: [26, 8] });
  const coil = pose(lift, { pelvis: [-2.8, 38.2], torso: { yaw: -26, pitch: -13, roll: 4 }, footF: [9, 4.8, LIFT], toeF: 16,
    handN: [-7.5, -7.5, 67], sword: [264, 10], handF: [14, 3, 52], shield: [22, 6] });
  const loaded = nudge(coil, { pelvis: [-0.3, 0.3], torso: { pitch: -1 }, handN: [-0.6, 0, 0.4], sword: [3, 0] });
  const over = ready({ pelvis: [2, 38.4], hips: { yaw: -6, pitch: 4 }, torso: { yaw: 0, pitch: 2 }, head: { yaw: 12, pitch: -6 },
    footF: [14, 4.8, LIFT + 0.4], toeF: 12, handN: [9, -8, 70], sword: [176, 6], handF: [8, 4, 50], shield: [26, 4] });
  const strike = armOut(ready({ pelvis: [3, 34.8], hips: { yaw: 6, pitch: 12 }, torso: { yaw: 12, pitch: 8, roll: -2 },
    head: { yaw: 6, pitch: -2 }, footF: [16, 4.8, 4.2], footN: [-8, -4.6, 4.6], toeN: -14,
    sword: [86, 0], handF: [2, 6, 46], shield: [52, -2] }), [0.75, -0.05, -0.65], 17);
  // The back foot comes up under him as the blade meets the ground.
  const ground = cleaveLanding({ pelvis: [2.4, 31.4], front: 16, back: -9, sword: [32, -2], arm: [0.5, -0.1, -0.86],
    toeN: 4, backZ: 6.8 });
  const sinkIn = pose(ground, { pelvis: [2.3, 30.9], torso: { pitch: 9 },
    handN: [ground.handN[0], ground.handN[1], ground.handN[2] - 0.6] });
  const hold = pose(ground, { pelvis: [2.2, 31.8], footN: [-8.5, -4.6, 6.8], toeN: 6 });
  return [
    blend(READY, lift, 0.55),
    lift,
    coil,
    loaded,
    blend(loaded, over, 0.5),
    over,
    strike,
    ground,
    sinkIn,
    hold,
    pose(blend(ground, pose(READY, { pelvis: [3, 36.5] }), 0.55), { footF: strike.footF, footN: BACK }),
    pose(blend(ground, READY, 0.85), { footF: strike.footF, footN: BACK }),
    pose(READY, { pelvis: [1.5, 37.4], footF: strike.footF }),
  ];
}

// --- Enders, the delayed cut, the charge and the running thrust -------------------------------

/** The pommel strike, out of the cut: the fist drawn back beside the ear with the blade turned up, then
 * a step in and the fist driven up into his face, the pommel leading and the shield pulled back to the
 * hip. Active on frames 1-2 (the game strikes with a box at head height). */
function pommelStrike() {
  const chamber = ready({ pelvis: [-1.2, 36.6], hips: { yaw: -26, pitch: 6 }, torso: { yaw: -22, pitch: 2, roll: 3 },
    head: { yaw: 24, pitch: -4 }, footN: [-9, -4.6, 4.2], footF: [8, 4.8, 4.2],
    handN: [0, -11, 60], sword: [200, 24], handF: [13, 3, 52], shield: [28, 4] });
  const strike = ready({ pelvis: [4, 35], hips: { yaw: 6, pitch: 10 }, torso: { yaw: 20, pitch: 10, roll: -3 },
    head: { yaw: 2, pitch: -2 }, footF: [14, 4.8, LIFT], toeF: 14, footN: [-9, -4.6, 4.2],
    handN: [35.5, -8, 64.5], sword: [196, 8], handF: [-2, 7, 46], shield: [64, -10] });
  // The front foot lands and the back one drags up behind the blow.
  const impact = pose(strike, { pelvis: [4.6, 35.4], footF: [15.5, 4.8, 4.2], toeF: 0, footN: [-6, -4.6, 6.8], toeN: 8,
    handN: [36, -8, 64.5], sword: [194, 8] });
  const recoil = pose(impact, { pelvis: [4.4, 36.4], torso: { yaw: 10, pitch: 6 }, handN: [26, -9, 57], sword: [168, 12],
    handF: [6, 5, 48], shield: [40, 0], footN: BACK, toeN: 0 });
  return [
    chamber,
    strike,
    impact,
    recoil,
    // The front foot steps back into the guard.
    pose(blend(recoil, READY, 0.6), { footF: [12, 4.8, LIFT], toeF: 10, footN: BACK }),
    READY,
  ];
}

/** The turn of a whirl: the chest's yaw (theta: the hips' yaw plus the torso's twist on them; + turns
 * his front away from the camera); the sword arm and the blade point out to his right, the shield
 * hand rides before his chest with the shield's face turned with him. */
function whirlStep(theta, pelvis, extra, reach = 23) {
  const right = ((theta - 90) * Math.PI) / 180;
  const facing = (theta * Math.PI) / 180;
  const left = ((theta + 90) * Math.PI) / 180;
  return ready({
    pelvis, hips: { yaw: theta + 15, pitch: 9 }, torso: { yaw: -15, pitch: 9 },
    handN: [pelvis[0] + reach * Math.cos(right), reach * Math.sin(right), 46], sword: [90, 90 - theta],
    handF: [pelvis[0] + 6 * Math.cos(facing) + 8 * Math.cos(left), 6 * Math.sin(facing) + 8 * Math.sin(left), 46],
    shield: [-theta, 0], ...extra,
  });
}

/**
 * A pose in a turn: the chest's yaw `theta` (+ turns his front away from the camera), the hips leading
 * the chest by 20 degrees, the sword arm held straight out to his right, the shield hand before his
 * chest with its face turned with him. `feet` ([near, far], each [x, y, z]) stand in the hips' own frame
 * and turn with them, so the legs never cross; they point the way the hips do.
 */
function spinPose(theta, { pelvis, sword = wheel(theta), feet, reach = 22,
  height = 47 + 7 * Math.sin(((theta - 90) * Math.PI) / 180), ...extra }) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const hips = theta + 20;
  const c = Math.cos(rad(hips));
  const s = Math.sin(rad(hips));
  const place = ([x, y, z]) => [pelvis[0] + x * c - y * s, x * s + y * c, z];
  const arm = rad(theta - 90);
  const face = rad(theta);
  const left = rad(theta + 90);
  return ready({
    pelvis, hips: { yaw: hips, pitch: 8 }, torso: { yaw: -20, pitch: 8 },
    footN: place(feet[0]), footF: place(feet[1]), footYawN: hips - 18, footYawF: hips + 14,
    toeN: feet[0][2] > 6 ? -40 : 0, toeF: feet[1][2] > 6 ? -30 : 0,
    handN: [pelvis[0] + 3 * Math.cos(face) + reach * Math.cos(arm), 3 * Math.sin(face) + reach * Math.sin(arm), height],
    sword,
    handF: [pelvis[0] + 7 * Math.cos(face) + 7 * Math.sin(face) * 0 + 8 * Math.cos(left), 7 * Math.sin(face) + 8 * Math.sin(left), 46],
    shield: [-theta, 0],
    ...extra,
  });
}

/** In a turn, the near foot pivots on its ball and the far one swings round off the ground. */
const PIVOT_FEET = [[-2, -4.4, 5.2], [4, 4.6, 8.6]];

/** The whirling cut, out of the rising cut: crouched with the blade drawn far behind him, then a full
 * turn on the ball of the foot with the sword arm straight out, the blade going round him like a wheel:
 * up over his back, out before him, down past the camera, and he comes round crouched with it low before
 * him. Active on frames 1-3 (the game strikes all round him). */
function whirlingCut() {
  const coil = pose(spinPose(-90, { pelvis: [-1.6, 33.6], feet: [[0, 0, 0], [0, 0, 0]], sword: [282, 0], reach: 21,
    height: 46, head: { yaw: 62, pitch: 2 } }), { footF: [11, 4.8, 4.2], footN: [-9.5, -4.6, 4.2], footYawN: -40,
    footYawF: -10, toeN: 0, toeF: 0 });
  const behind = spinPose(-180, { pelvis: [0.5, 36.4], feet: PIVOT_FEET, head: { yaw: 40, pitch: -2 } });
  const before = spinPose(-270, { pelvis: [2, 36.8], feet: PIVOT_FEET, sword: [98, 0], head: { yaw: -40, pitch: 0 } });
  const down = spinPose(-360, { pelvis: [3, 34], feet: [[-8, -4.6, 4.2], [8, 4.8, 4.2]], head: { yaw: 18, pitch: 4 } });
  const settle = ready({ pelvis: [3.4, 34.6], hips: { yaw: -358, pitch: 10 }, torso: { yaw: -14, pitch: 10 },
    head: { yaw: 16, pitch: 2 }, footF: [12, 4.8, 4.2], footN: [-8, -4.6, 4.2], handN: [14, -12, 38], sword: [62, 36],
    handF: [8, 4, 48], shield: [26, 0] });
  return [
    coil,
    behind,
    before,
    down,
    settle,
    pose(blend(settle, pose(READY, { hips: { yaw: -378 } }), 0.6), { footF: settle.footF }),
    pose(READY, { footF: settle.footF }),
  ];
}

/** The delayed cut: the blade cocked high behind his head and held there a beat, up on the toes and wound
 * away from the man, then brought over and down in a long diagonal cut with a deep step, the arm carried
 * on down past the front knee. Active on frames 2-3. */
function delayedCut() {
  const cocked = ready({ pelvis: [-2.4, 38.6], hips: { yaw: -34, pitch: -2 }, torso: { yaw: -30, pitch: -8, roll: 6 },
    head: { yaw: 30, pitch: -6 }, footF: [8, 4.8, 4.2], footN: [-9, -4.6, 5.4], toeN: -16,
    handN: [-6, -9, 70], sword: [250, 20], handF: [12, 3, 50], shield: [30, 2] });
  const held = nudge(cocked, { pelvis: [-0.4, 0.4], torso: { pitch: -1.5 }, handN: [-1, 0, 1], sword: [6, 0] });
  const swing = armOut(ready({ pelvis: [2.4, 36.8], hips: { yaw: 0, pitch: 8 }, torso: { yaw: 12, pitch: 6, roll: -2 },
    head: { yaw: 8, pitch: -4 }, footF: [14, 4.8, LIFT], toeF: 16, footN: [-9, -4.6, 4.2],
    sword: [138, 6], handF: [3, 6, 47], shield: [52, -4] }), [0.55, -0.05, 0.85]);
  const cut = armOut(ready({ pelvis: [1.6, 33.4], hips: { yaw: 8, pitch: 12 }, torso: { yaw: 14, pitch: 8, roll: -3 },
    head: { yaw: 4, pitch: -4 }, footF: [17, 4.8, 4.2], footN: [-9, -4.6, 4.8], toeN: -18,
    sword: [50, -2], handF: [-2, 7, 46], shield: [68, -8] }), [0.8, -0.1, -0.6], 18);
  const through = armOut(ready({ pelvis: [4.4, 32.6], hips: { yaw: 12, pitch: 14 }, torso: { yaw: 18, pitch: 8, roll: -4 },
    head: { yaw: 2, pitch: -6 }, footF: [17, 4.8, 4.2], footN: [-7, -4.6, 7], toeN: 6,
    sword: [-24, -18], handF: [-3, 7, 47], shield: [72, -6] }), [0.25, -0.4, -0.9]);
  const settle = pose(through, { pelvis: [4, 33.6], torso: { yaw: 14, pitch: 6 }, footN: BACK, toeN: 0 });
  return [
    cocked,
    held,
    swing,
    cut,
    through,
    pose(blend(settle, READY, 0.5), { footF: settle.footF, footN: BACK }),
    pose(READY, { footF: settle.footF }),
  ];
}

/** The landing of a great downward blow: a deep lunge with the head up, the sword arm driven down
 * before him and the shield flung back behind for balance, so the line runs from the back foot to the
 * point. */
function cleaveLanding({ pelvis, front, back, sword, arm, toeN = -30, backZ = 5.2, reach = 20 }) {
  return armOut(ready({ pelvis, hips: { yaw: 10, pitch: 14 }, torso: { yaw: 14, pitch: 8, roll: -3 },
    head: { yaw: 4, pitch: -12 }, footF: [front, 4.8, 4.2], footN: [back, -4.6, backZ], toeN,
    sword, handF: [-6, 8, 48], shield: [80, 8] }), arm, reach);
}

/** The executioner's cleave, out of the thrust: he crouches and leaps, the blade swung up behind his
 * head, over the top at the height of the leap and down with him as he lands, into the street before
 * him in a deep lunge. Active on frames 3-4. */
function executioner() {
  const gather = ready({ pelvis: [1.6, 33.8], hips: { yaw: -18, pitch: 12 }, torso: { yaw: -16, pitch: 6, roll: 2 },
    head: { yaw: 18, pitch: -8 }, footF: [11, 4.8, 4.2], footN: [-9, -4.6, 4.2], handN: [0, -10, 54], sword: [222, 14],
    handF: [12, 3, 48], shield: [28, 2] });
  const leap = armOut(ready({ pelvis: [3.4, 42.6], hips: { yaw: -22, pitch: -6 }, torso: { yaw: -16, pitch: -10, roll: 4 },
    head: { yaw: 20, pitch: -6 }, footF: [12, 4.8, 13], toeF: -16, footN: [-6, -4.6, 11.5], toeN: -46,
    sword: [256, 12], handF: [14, 3, 58], shield: [24, 12] }), [-0.45, -0.1, 0.9]);
  // Over the top at the height of the leap, the fist just above his brow so the blade comes down close
  // before him.
  const apex = ready({ pelvis: [4.6, 42.4], hips: { yaw: -8, pitch: 0 }, torso: { yaw: 0, pitch: -2 },
    head: { yaw: 12, pitch: -4 }, footF: [15, 4.8, 11], toeF: -6, footN: [-5, -4.6, 12], toeN: -40,
    handN: [9, -8, 67.5], sword: [176, 6], handF: [12, 4, 56], shield: [26, 8] });
  const fall = armOut(ready({ pelvis: [3, 37], hips: { yaw: 4, pitch: 10 }, torso: { yaw: 12, pitch: 8, roll: -2 },
    head: { yaw: 6, pitch: -4 }, footF: [16, 4.8, 4.2], footN: [-6, -4.6, 9.4], toeN: -30,
    sword: [90, 0], handF: [4, 6, 50], shield: [50, 0] }), [0.75, -0.05, -0.65], 15);
  const impact = cleaveLanding({ pelvis: [2.8, 31], front: 16, back: -10, sword: [36, -2], arm: [0.55, -0.1, -0.85] });
  // The back foot drags up under him.
  const hold = pose(impact, { pelvis: [2.8, 30.6], footN: [-8, -4.6, 7], toeN: 6 });
  return [
    gather,
    leap,
    apex,
    fall,
    impact,
    hold,
    pose(blend(hold, pose(READY, { pelvis: [3, 36.5] }), 0.5), { footF: impact.footF, footN: BACK, toeN: 0 }),
    pose(READY, { pelvis: [1.5, 37.4], footF: impact.footF }),
  ];
}

/** The cleave held back: low and wide, the body wound away from the man, the blade hanging behind his
 * back from the raised fist and the shield thrust out before him; he trembles with the weight of it. */
const COIL = ready({ pelvis: [-3.4, 34.4], hips: { yaw: -30, pitch: 6 }, torso: { yaw: -30, pitch: -8, roll: 5 },
  head: { yaw: 30, pitch: -8 }, footF: [11, 4.8, 4.2], footN: [-10.5, -4.6, 4.2], footYawN: -40, handN: [-8, -8, 67],
  sword: [262, 14], handF: [13, 3, 53], shield: [22, 8] });
const CHARGE_HOLD = [
  COIL,
  nudge(COIL, { pelvis: [0.2, -0.4], handN: [0.4, 0, 0.3], sword: [1.5, 0], torso: { pitch: 0.6 } }),
  nudge(COIL, { pelvis: [-0.2, -0.6], torso: { pitch: -0.6 }, handN: [-0.3, 0, -0.3], sword: [-1.5, 0] }),
  nudge(COIL, { pelvis: [0.1, -0.3], handN: [0.3, 0, 0.4], sword: [1, 0] }),
];

/** The charged cleave let go: the blade over the top with a long surging step, down with everything
 * behind it into the street before him, and held there. Active on frames 1-2. */
function cleaveCharged() {
  const over = ready({ pelvis: [2, 37.6], hips: { yaw: -6, pitch: 4 }, torso: { yaw: 0, pitch: 0 },
    head: { yaw: 12, pitch: -6 }, footF: [16, 4.8, LIFT + 1], toeF: 14, footN: [-10, -4.6, 4.2],
    handN: [10, -8, 70.5], sword: [176, 6], handF: [10, 4, 52], shield: [30, 6] });
  const fall = armOut(ready({ pelvis: [2.6, 35.6], hips: { yaw: 6, pitch: 12 }, torso: { yaw: 12, pitch: 8, roll: -2 },
    head: { yaw: 6, pitch: -4 }, footF: [18, 4.8, 4.2], footN: [-9, -4.6, 7.2], toeN: 2,
    sword: [92, 0], handF: [2, 6, 47], shield: [56, -2] }), [0.75, -0.05, -0.65], 17);
  const impact = cleaveLanding({ pelvis: [2.6, 29.8], front: 17, back: -11, sword: [20, -2], arm: [0.45, -0.1, -0.9],
    toeN: -34 });
  const hold = pose(impact, { pelvis: [2.6, 29.4], footN: [-9.5, -4.6, 7], toeN: 6 });
  const up = pose(READY, { pelvis: [3, 36.5] });
  return [
    over,
    fall,
    impact,
    hold,
    pose(blend(hold, up, 0.45), { footF: impact.footF, footN: BACK, toeN: 0 }),
    pose(blend(hold, up, 0.8), { footF: impact.footF, footN: BACK, toeN: 0 }),
    pose(READY, { pelvis: [1.5, 37.4], footF: impact.footF }),
  ];
}

/** The running thrust: out of a run he drops low with the point drawn back at his hip, pushes off the
 * back foot and drives it forward in a long flat lunge, the shield flung back behind him, and skids in
 * behind it. Active on frames 2-4. */
function runningThrust() {
  const launch = ready({ pelvis: [0.4, 34.4], hips: { yaw: -24, pitch: 12 }, torso: { yaw: -20, pitch: 8, roll: 2 },
    head: { yaw: 22, pitch: -11 }, footF: [9, 4.8, 4.2], footN: [-12, -4.6, 6.4], toeN: -34, handN: [-7, -10, 45],
    sword: [94, 6], handF: [12, 3, 49], shield: [26, 0] });
  const push = ready({ pelvis: [3, 34], hips: { yaw: -8, pitch: 14 }, torso: { yaw: 2, pitch: 10 }, head: { yaw: 14, pitch: -10 },
    footF: [15, 4.8, LIFT], toeF: 20, footN: [-13, -4.6, 5.8], toeN: -46, handN: [10, -9, 46], sword: [93, 4],
    handF: [6, 5, 47], shield: [40, -2] });
  const thrust = armOut(ready({ pelvis: [6, 32.6], hips: { yaw: 8, pitch: 14 }, torso: { yaw: 18, pitch: 8, roll: -2 },
    head: { yaw: 2, pitch: -12 }, footF: [21, 4.8, 4.2], footN: [-12, -4.6, 5.6], toeN: -36,
    sword: [92, 0], handF: [-5, 8, 47], shield: [80, 0] }), [1, -0.05, -0.04], 24.5);
  const reach = pose(thrust, { pelvis: [6.6, 32.2], handN: [thrust.handN[0] + 0.8, thrust.handN[1], thrust.handN[2] - 0.2] });
  // The back foot drags up as he skids to a stop on the point.
  const hold = pose(reach, { pelvis: [6.2, 32.8], footN: [-8, -4.6, 7], toeN: 4 });
  return [
    launch,
    push,
    thrust,
    reach,
    hold,
    pose(blend(reach, READY, 0.5), { footF: [16, 4.8, 4.2], footN: BACK, toeN: 0 }),
    pose(blend(reach, READY, 0.8), { footF: [12, 4.8, LIFT], toeF: 10, footN: BACK, toeN: 0 }),
    READY,
  ];
}

// --- The Arts ---------------------------------------------------------------------------------

/** The Storm of Blades: crouched low with the blade drawn far behind him, then three turns on the ball of
 * the foot with the sword arm straight out and the blade going round him like a wheel, each turn lower and
 * flatter than the last; he comes out of the third with the blade low behind him again, for the rising cut
 * that ends it (`art_storm_burst`). Live on frames 1-12, each a blow of its own all round him; the stick
 * steers him as he turns. */
function artStorm() {
  const coil = pose(spinPose(-90, { pelvis: [-2, 32.8], feet: [[0, 0, 0], [0, 0, 0]], sword: [284, 0], reach: 21, height: 45,
    head: { yaw: 62, pitch: 2 } }), { footF: [12, 4.8, 4.2], footN: [-10, -4.6, 4.2], footYawN: -40, footYawF: -10,
    toeN: 0, toeF: 0 });
  const frames = [coil];
  for (let k = 1; k <= 12; k++) {
    const theta = -90 - 90 * k;
    const turn = Math.floor((k - 1) / 4);
    const tilt = [34, 14, 24][turn];
    const z = [35.6, 34.2, 33.4][turn] + (k % 2 === 0 ? -0.5 : 0.3);
    // Facing the man again at the end of each turn, both feet come down.
    const planted = k % 4 === 3;
    frames.push(spinPose(theta, { pelvis: [0.6 + 0.15 * k, z], feet: planted ? STORM_DOWN : PIVOT_FEET,
      sword: wheel(theta, tilt), head: stormLook(theta), reach: 22.5 }));
  }
  return frames;
}

/** The head turns to keep the man in sight through a turn, as far as the neck allows. */
function stormLook(theta) {
  return { yaw: Math.max(-62, Math.min(62, -(((theta % 360) + 540) % 360 - 180))), pitch: 0 };
}
const STORM_DOWN = [[-8, -4.6, 4.2], [8, 4.8, 4.2]];

/** The Storm's last cut: out of the third turn the blade comes round low behind him, rises through the man
 * before him and up over his head, and he stands up on his toes with it high: every man about him thrown
 * down. Live on frames 3-4. */
function artStormBurst() {
  const gather = pose(spinPose(-90, { pelvis: [1.2, 32.6], feet: [[0, 0, 0], [0, 0, 0]], sword: [296, -8], reach: 21,
    height: 41, head: { yaw: 58, pitch: 4 } }), { footF: [12, 4.8, 4.2], footN: [-10, -4.6, 4.2], footYawN: -40,
    footYawF: -10, toeN: 0, toeF: 0 });
  const through = armOut(ready({ pelvis: [3, 35.6], hips: { yaw: -290, pitch: 8 }, torso: { yaw: -8, pitch: 2 },
    head: { yaw: 8, pitch: -10 }, footF: [12, 4.8, 4.2], footN: [-9, -4.6, 5.8], toeN: -24, sword: toward([1, -0.15, 0.35]),
    handF: [5, 5, 47], shield: [44, -2] }), [0.92, -0.25, 0.3]);
  const crown = armOut(ready({ pelvis: [3.6, 38.8], hips: { yaw: -358, pitch: -2 }, torso: { yaw: -10, pitch: -7, roll: 3 },
    head: { yaw: 14, pitch: -12 }, footF: [10.5, 4.8, 4.2], footN: [-5, -4.6, 6.4], toeN: -36, sword: [172, 10],
    handF: [10, 3, 50], shield: [34, 6] }), [0.3, -0.1, 1]);
  const guard = pose(READY, { hips: { yaw: -378 } });
  // The blade comes round low behind him as the body turns on planted feet (in-betweens of the turn).
  const round = (k, theta) => pose(blend(gather, through, k), { sword: wheel(theta, 8), head: stormLook(theta) });
  return [
    gather,
    round(0.34, -160),
    round(0.67, -225),
    through,
    crown,
    nudge(crown, { pelvis: [0, -0.4], handN: [0, 0, -0.6], sword: [-2, 0] }),
    pose(blend(crown, guard, 0.6), { footF: [12, 4.8, LIFT], toeF: 10, footN: BACK, toeN: 0 }),
    READY,
  ];
}

/** The Piercing Line: crouched very low with the weight back and the blade drawn back along his forearm,
 * held; then he is thrown flat along the street with the point straight out before him and crosses the
 * whole line at once, slides to a stop on one knee with the blade swept out behind him, and flicks it
 * clean: as he does, every wound he left opens. Live on frames 1-3; the wounds open on frame 5. */
function artPierce() {
  const draw = ready({ pelvis: [-3.4, 30.8], hips: { yaw: -34, pitch: 18 }, torso: { yaw: -26, pitch: 16, roll: 2 },
    head: { yaw: 26, pitch: -20 }, footF: [12, 4.8, 4.2], footN: [-14, -4.6, 5.2], toeN: -34,
    handN: [-6, -12, 38], sword: [292, -12], handF: [12, 3, 42], shield: [32, -12] });
  const fly = (dz, tip) => armOut(ready({ pelvis: [7, 30.2 + dz], hips: { yaw: 2, pitch: 26 }, torso: { yaw: 8, pitch: 14 },
    head: { yaw: 6, pitch: -26 }, footF: [19, 4.8, 6.2 + dz], toeF: -10, footN: [-17, -4.6, 7.6 + dz], toeN: -60,
    sword: toward([1, -0.05, tip]), handF: [-6, 8, 42], shield: [84, -8] }), [1, -0.05, -0.12]);
  const slide = armOut(ready({ pelvis: [6, 23.6], hips: { yaw: 8, pitch: 14 }, torso: { yaw: 22, pitch: 10, roll: -3 },
    head: { yaw: -4, pitch: -6 }, footF: [17, 4.8, 4.2], footN: [-12, -4.6, 3.0], toeN: -80, kneeN: [1, -0.15, -0.2],
    sword: toward([-0.7, -0.6, -0.2]), handF: [4, 7, 36], shield: [70, -20] }), [-0.45, -0.85, -0.1]);
  const flick = armOut(pose(slide, { torso: { yaw: 14, pitch: 6, roll: -2 }, head: { yaw: 6, pitch: -10 },
    sword: toward([0.2, -0.75, -0.6]) }), [0.05, -0.95, -0.25]);
  const rise = pose(blend(flick, READY, 0.55), { footF: [14, 4.8, 4.2], footN: BACK, toeN: 0 });
  return [draw, fly(0, -0.06), fly(0.6, -0.04), fly(0.2, -0.06), slide, flick, rise, READY];
}

/** Between the judgments: thrown flat along the street, the point out before him (the Line's flight). */
function artFlit() {
  const line = artPierce();
  return [line[2], line[3]];
}

/** The Naft Flask: a flask of naphtha taken from his belt, its wick alight, swung back over his head and
 * lobbed overhand, the sabre laid back along the forearm. It leaves his hand on frame 2. */
function artNaft() {
  const take = ready({ pelvis: [-0.6, 36.8], hips: { yaw: -24, pitch: 8 }, torso: { yaw: -18, pitch: 8, roll: 2 },
    head: { yaw: 20, pitch: 4 }, handN: [-1, -10, 40], sword: [252, 20], handF: [12, 3, 50], shield: [30, 2],
    show: ["flask", "wick"] });
  const wind = armOut(ready({ pelvis: [-2, 37.6], hips: { yaw: -32, pitch: 0 }, torso: { yaw: -30, pitch: -8, roll: 5 },
    head: { yaw: 30, pitch: -8 }, footF: [9, 4.8, 4.2], footN: [-9, -4.6, 5], toeN: -12,
    sword: [262, 10], handF: [14, 3, 54], shield: [26, 8], show: ["flask", "wick"] }), [-0.55, -0.1, 0.8], 22);
  const lob = armOut(ready({ pelvis: [3, 36.6], hips: { yaw: 0, pitch: 8 }, torso: { yaw: 16, pitch: 4, roll: -3 },
    head: { yaw: 6, pitch: -10 }, footF: [13, 4.8, 4.2], footN: [-8, -4.6, 5.6], toeN: -20,
    sword: [214, 8], handF: [7, 5, 50], shield: [46, -2] }), [0.75, -0.05, 0.65]);
  const follow = armOut(pose(lob, { pelvis: [3.6, 36], torso: { yaw: 20, pitch: 10 }, head: { pitch: -4 }, sword: [232, 8] }),
    [0.85, -0.1, -0.3]);
  return [take, wind, lob, follow, pose(blend(follow, READY, 0.6), { footF: [12, 4.8, 4.2], footN: BACK, toeN: 0 })];
}

/** The Second Wind, the guard's cry: gathered low with the blade down behind him, then up, the sabre raised
 * high and the shield flung wide, the chest out and the head thrown back as he roars; held, and down to his
 * guard. The cry goes out on frame 2. */
function artSecondWind() {
  const gather = armOut(ready({ pelvis: [-1, 33.6], hips: { yaw: -22, pitch: 12 }, torso: { yaw: -16, pitch: 16, roll: 2 },
    head: { yaw: 16, pitch: 16 }, footF: [9, 4.8, 4.2], footN: [-10, -4.6, 4.2], sword: toward([-0.5, -0.2, -0.85]),
    handF: [8, 5, 42], shield: [40, -14] }), [-0.25, -0.35, -0.9], 22);
  const rise = armOut(ready({ pelvis: [0, 37.4], hips: { yaw: -24, pitch: 0 }, torso: { yaw: -14, pitch: -6, roll: 3 },
    head: { yaw: 18, pitch: -8 }, footF: [10, 4.8, 4.2], footN: [-10, -4.6, 4.2], sword: toward([0.15, -0.2, 1]),
    handF: [10, 6, 50], shield: [50, 6] }), [0.1, -0.3, 0.95], 23);
  const cry = armOut(ready({ pelvis: [-1, 37.8], hips: { yaw: -26, pitch: -4 }, torso: { yaw: -20, pitch: -14 },
    head: { yaw: 22, pitch: -26 }, footF: [11, 4.8, 4.2], footN: [-11, -4.6, 4.2],
    sword: toward([-0.35, -0.45, 0.82]), handF: [6, 12, 54], shield: [70, 20] }), [-0.25, -0.55, 0.8], 24);
  const held = nudge(cry, { torso: { pitch: -2 }, head: { pitch: -3 }, pelvis: [0, 0.2] });
  return [gather, rise, cry, held, pose(blend(held, READY, 0.5), { footF: [12, 4.8, 4.2] }), READY];
}

// --- Shield ----------------------------------------------------------------------------------

/** Behind the shield: crouched, the shield's face to the front, the sabre drawn back to answer. */
const GUARD = ready({
  pelvis: [-0.6, 36.4],
  hips: { yaw: -10, pitch: 8 },
  torso: { yaw: 10, pitch: 10 },
  head: { yaw: 6, pitch: 0 },
  handF: [12, 3, 52.5],
  shield: [24, 6],
  handN: [1, -10.5, 47],
  sword: [128, 22],
});

const BLOCK_START = [blend(READY, GUARD, 0.6), GUARD];

/** Shield bash: out of the guard, a step and the shield's face driven into the man before him. Active on frames 2-3. */
function bash() {
  const gather = pose(GUARD, { pelvis: [-1.8, 36.2], hips: { yaw: -4, pitch: 6 }, torso: { yaw: 16, pitch: 8 },
    head: { yaw: 4, pitch: -2 }, handF: [6, 3, 51], shield: [32, 4], handN: [-3, -10.5, 46], sword: [134, 22] });
  const step = pose(gather, { pelvis: [1.4, 36], hips: { yaw: -10, pitch: 10 }, torso: { yaw: 0, pitch: 12 },
    footF: [12, 4.8, LIFT], toeF: 12, handF: [14, 3.5, 52], shield: [18, 2] });
  const impact = pose(step, { pelvis: [5, 34.8], hips: { yaw: -24, pitch: 14 }, torso: { yaw: -36, pitch: 18, roll: 2 },
    head: { yaw: 14, pitch: 4 }, footF: [15.5, 4.8, 4.2], toeF: 0, footN: [-7, -4.6, 5.6], toeN: -14,
    handF: [25, 4, 50], shield: [4, -2], handN: [-4, -10, 44], sword: [140, 22] });
  // The back foot drags up behind him as the shove carries him on.
  const hold = pose(impact, { pelvis: [5.2, 34.8], handF: [25.5, 4, 49.5], footN: [-5, -4.6, 7.0], toeN: 6 });
  return [
    gather,
    step,
    impact,
    hold,
    pose(blend(hold, READY, 0.55), { footF: hold.footF, footN: BACK }),
    pose(READY, { footF: hold.footF }),
  ];
}
const BLOCK = [GUARD, nudge(GUARD, { pelvis: [0, -0.3], handF: [0, 0, -0.3], torso: { pitch: 0.6 } })];

/** Moving behind the shield: a fencer's shuffle, never crossing the feet: the front foot steps out, the back foot
 * follows it; the guard held still above them (the shield before the chest, the sabre drawn back). Planted feet
 * slide back at the body's speed: 17 px a cycle of six frames, 34 px/s at 12 fps (`block_walk_speed`). Stepping
 * back is the same cycle played the other way: the back foot leads, the front foot is drawn after it. */
function guardStep() {
  // Each foot over the cycle: [x, lift, toe (+ toes up)]; the far foot leads, the near foot follows.
  const F = [[4.0, 0, -10], [6.8, 2.6, 8], [9.7, 2.2, 14], [12.5, 0, 6], [9.7, 0, 0], [6.8, 0, -3]];
  const N = [[-4.0, 0, 6], [-6.8, 0, 0], [-9.7, 0, -5], [-12.5, 0, -14], [-9.7, 2.4, 4], [-6.8, 2.0, 10]];
  // Lower as the stance opens, the weight carried a little toward the stepping foot.
  const DROP = [0.2, 0.0, -0.4, -0.7, -0.4, -0.1];
  const LEAN = [0, 0.5, 0.9, 0.7, 0.3, 0.1];
  return F.map((f, i) => {
    const n = N[i];
    return pose(GUARD, {
      pelvis: [GUARD.pelvis[0] + LEAN[i], GUARD.pelvis[1] + DROP[i]],
      torso: { yaw: GUARD.torso.yaw - LEAN[i] * 2, pitch: GUARD.torso.pitch + DROP[i] * -1.2 },
      footF: [f[0], 4.8, 4.2 + f[1]],
      toeF: f[2],
      footN: [n[0], -4.6, 4.2 + n[1]],
      toeN: n[2],
      handF: [GUARD.handF[0] + LEAN[i] * 0.6, GUARD.handF[1], GUARD.handF[2] + DROP[i]],
      handN: [GUARD.handN[0] + LEAN[i] * 0.4, GUARD.handN[1], GUARD.handN[2] + DROP[i]],
    });
  });
}
const GUARD_STEP = guardStep();
const GUARD_BACK = [0, 5, 4, 3, 2, 1].map((i) => GUARD_STEP[i]);
const BLOCK_HIT = [
  pose(GUARD, { pelvis: [-3.2, 36], hips: { pitch: 4 }, torso: { yaw: 6, pitch: 2 }, head: { pitch: -6 },
    handF: [8.5, 3, 53.5], shield: [26, 16], handN: [-2, -10.5, 47], sword: [140, 22], footN: [-9, -4.6, 4.2] }),
  pose(GUARD, { pelvis: [-1.8, 36.2], torso: { yaw: 8, pitch: 6 }, handF: [10.5, 3, 53], shield: [25, 10] }),
];

/** Parry: the shield punched out and up into the blow with the body behind it, the blow beaten aside, and the
 * point already aimed for the riposte. */
const PARRY = [
  pose(GUARD, { pelvis: [1.2, 36.2], hips: { yaw: -14, pitch: 10 }, torso: { yaw: 18, pitch: 12 }, handF: [17, 1, 55],
    shield: [14, 18], handN: [-2, -10.5, 45], sword: [104, 10] }),
  pose(GUARD, { pelvis: [2, 36.6], torso: { yaw: 22, pitch: 8, roll: 3 }, head: { yaw: 2, pitch: -4 }, handF: [18, -2, 60],
    shield: [52, 40], handN: [-5, -10.5, 45], sword: [96, 6] }),
  pose(GUARD, { pelvis: [1.4, 36.8], torso: { yaw: 8, pitch: 6, roll: 2 }, handF: [13, 0, 61], shield: [66, 50],
    handN: [-4, -10.5, 46], sword: [96, 6] }),
  pose(GUARD, { pelvis: [0.8, 37], torso: { yaw: 2, pitch: 6 }, handF: [10, 2, 55], shield: [46, 24], handN: [0, -10, 46],
    sword: [100, 10] }),
  blend(GUARD, READY, 0.6),
  READY,
];

// --- Roll, hurt, death ---------------------------------------------------------------------

/**
 * The body curled into a ball and turned `turn` degrees forward (a somersault): knees drawn to
 * the chest, the chin down, the hands at the shins, the sabre laid back along the body. Limbs are
 * placed in the pelvis's own frame so the ball keeps its shape as it turns; the renderer sets it
 * down on the ground.
 */
function tucked(turn, x) {
  const a = (turn * Math.PI) / 180;
  // The ball's centre sits about here in the curled body's own frame.
  const c = [6, 8];
  return {
    ...READY,
    limbSpace: "pelvis",
    ground: true,
    pelvis: [x - (c[0] * Math.cos(a) + c[1] * Math.sin(a)), 13 - (-c[0] * Math.sin(a) + c[1] * Math.cos(a))],
    hips: { yaw: -6, pitch: turn, roll: 0 },
    torso: { yaw: 0, pitch: 60, roll: 0 },
    head: { yaw: 0, pitch: 50, roll: 0 },
    footN: [1.5, -4.6, -2.5],
    footF: [2.5, 4.8, -1.5],
    toeN: -50,
    toeF: -50,
    kneeN: [1, -0.2, 1],
    kneeF: [1, 0.2, 1],
    handN: [13, -8, 9],
    handF: [13, 7, 12],
    elbowN: [-0.2, -1, -0.6],
    elbowF: [-0.2, 1, -0.6],
    sword: [-50, 24],
    shield: [70, 10],
  };
}

const ROLL = [
  ready({ pelvis: [2.4, 30], hips: { yaw: -10, pitch: 34 }, torso: { pitch: 30 }, head: { pitch: 20 },
    footN: [-9, -4.6, 4.8], toeN: -30, footF: [7, 4.8, 4.2], handN: [12, -9, 26], sword: [60, 20],
    handF: [13, 4, 32], shield: [40, -30] }),
  tucked(95, 7),
  tucked(160, 5.5),
  tucked(225, 4),
  tucked(290, 2.5),
  tucked(345, 1),
  ready({ pelvis: [0.4, 29], hips: { yaw: -16, pitch: 22 }, torso: { pitch: 24 }, head: { pitch: 10 },
    footN: [-8, -4.6, 4.2], footF: [7, 4.8, 4.2], handN: [12, -10, 32], sword: [92, 20], handF: [10, 4, 40], shield: [40, -6] }),
  ready({ pelvis: [0.4, 34.4], hips: { yaw: -17, pitch: 10 }, torso: { pitch: 12 }, head: { pitch: 0 },
    handN: [11, -10, 37], sword: [106, 18], handF: [8.5, 3, 45], shield: [38, -2] }),
];

/** The rolling cut: up out of the roll's crouch, a rising cut with a step. Active on frames 1-2. */
function rollCut() {
  const coiled = ready({ pelvis: [0.6, 29.6], hips: { yaw: 12, pitch: 20 }, torso: { yaw: 24, pitch: 22, roll: -2 },
    head: { yaw: 2, pitch: 8 }, footN: [-8, -4.6, 4.2], footF: [7, 4.8, 4.2], handN: [-2, -5, 30], sword: [-40, -14],
    handF: [6, 4, 40], shield: [26, -8] });
  const rise = ready({ pelvis: [3, 34.6], hips: { yaw: -4, pitch: 6 }, torso: { yaw: -8, pitch: 4, roll: 2 },
    head: { yaw: 18, pitch: -4 }, footF: [12, 4.8, LIFT], toeF: 12, handN: [17, -10, 49], sword: [104, 14],
    handF: [8, 3, 48], shield: [32, 4] });
  const high = ready({ pelvis: [3.6, 37.2], hips: { yaw: -12, pitch: 0 }, torso: { yaw: -22, pitch: -6, roll: 4 },
    head: { yaw: 24, pitch: -12 }, footF: [13, 4.8, 4.2], footN: [-6.5, -4.6, 6.8], toeN: 8, handN: [11, -9, 63],
    sword: [190, 14], handF: [9, 3, 50], shield: [34, 8] });
  const hold = pose(high, { pelvis: [3.4, 37.4], footN: BACK, toeN: 0, handN: [11, -9, 61], sword: [180, 14] });
  return [coiled, rise, high, hold, pose(blend(hold, READY, 0.55), { footF: hold.footF, footN: BACK }),
    pose(READY, { footF: hold.footF })];
}

/** The throw: a knife from his belt, flicked from the sword hand, the sabre laid back along the forearm. */
function throwKnife() {
  const draw = ready({ pelvis: [-0.8, 37.4], hips: { yaw: -24, pitch: 4 }, torso: { yaw: -22, pitch: 2, roll: 2 },
    head: { yaw: 22, pitch: -4 }, handN: [-4, -9, 40], sword: [200, 20], handF: [10, 3, 50], shield: [30, 4] });
  const flick = ready({ pelvis: [1.6, 37], hips: { yaw: 0, pitch: 6 }, torso: { yaw: 12, pitch: 8, roll: -2 },
    head: { yaw: 10, pitch: -2 }, footF: [10, 4.8, 4.2], handN: [20, -9, 52], sword: [210, 10], handF: [6, 4, 46],
    shield: [26, -2] });
  const follow = pose(flick, { handN: [18, -6, 46], torso: { yaw: 16, pitch: 10 } });
  return [draw, flick, follow, blend(follow, READY, 0.5), pose(READY, { footF: [10, 4.8, 4.2] })];
}

const HURT = [
  ready({ pelvis: [-3.4, 37.4], hips: { yaw: -22, pitch: -6 }, torso: { yaw: -14, pitch: -16, roll: 5 },
    head: { yaw: 22, pitch: -22, roll: 6 }, footF: [7, 4.8, 4.8], toeF: 14, handN: [3, -12, 47], sword: [150, 30],
    handF: [3, 5, 53], shield: [44, 18] }),
  ready({ pelvis: [-4.4, 36.6], hips: { yaw: -24, pitch: -8 }, torso: { yaw: -16, pitch: -20, roll: 6 },
    head: { yaw: 24, pitch: -26, roll: 8 }, footN: [-10, -4.6, 4.2], footF: [6, 4.8, 4.2], handN: [0, -12, 46],
    sword: [162, 32], handF: [1, 5, 52], shield: [48, 22] }),
  ready({ pelvis: [-3.4, 36.8], hips: { yaw: -22, pitch: -4 }, torso: { yaw: -11, pitch: -12 }, head: { yaw: 21, pitch: -18 },
    footN: [-10, -4.6, 4.2], footF: [6, 4.8, 4.2], handN: [3, -11.5, 45], sword: [146, 26], handF: [3, 5, 51], shield: [44, 14] }),
  ready({ pelvis: [-2.4, 37], hips: { yaw: -20, pitch: 0 }, torso: { yaw: -6, pitch: -4 }, head: { yaw: 18, pitch: -10 },
    handN: [6, -11, 44], sword: [130, 22], handF: [5, 4, 50], shield: [40, 8] }),
  pose(READY, { pelvis: [-0.8, 37.6] }),
];

function death() {
  const kneel = (lean, extra = {}) => ready({
    pelvis: [-1, 21.5],
    hips: { yaw: -14, pitch: lean },
    torso: { yaw: 0, pitch: lean * 0.6 },
    head: { yaw: 10, pitch: lean * 0.4 },
    footN: [-15, -4.6, 3.0],
    footF: [-8, 4.8, 3.6],
    toeN: -78,
    toeF: -70,
    kneeN: [1, -0.15, -0.2],
    kneeF: [1, 0.15, -0.2],
    ...extra,
  });
  return [
    ready({ pelvis: [-3, 37.4], hips: { yaw: -22, pitch: -6 }, torso: { yaw: -14, pitch: -18, roll: 5 },
      head: { yaw: 22, pitch: -26 }, handN: [2, -12, 47], sword: [150, 30], handF: [3, 5, 53], shield: [44, 18] }),
    ready({ pelvis: [-4, 32], hips: { yaw: -20, pitch: 4 }, torso: { yaw: -8, pitch: -4 }, head: { yaw: 16, pitch: -10 },
      footN: [-11, -4.6, 4.2], footF: [5, 4.8, 4.2], handN: [4, -12, 38], sword: [120, 30], handF: [4, 5, 44], shield: [50, 0] }),
    ready({ pelvis: [-3, 27], hips: { yaw: -17, pitch: 4 }, torso: { yaw: -4, pitch: 0 }, head: { yaw: 13, pitch: -4 },
      footN: [-13, -4.6, 3.8], footF: [-3, 4.8, 4.6], toeN: -40, toeF: -30, kneeN: [1, -0.15, -0.1], kneeF: [1, 0.15, -0.1],
      handN: [4, -12, 34], sword: [100, 36], handF: [5, 5, 39], shield: [55, -10] }),
    kneel(4, { handN: [5, -12, 30], sword: [80, 40], handF: [6, 5, 34], shield: [60, -20] }),
    kneel(14, { handN: [8, -12, 22], sword: [40, 40], handF: [8, 6, 28], shield: [64, -30], head: { yaw: 8, pitch: 20 } }),
    kneel(26, { handN: [11, -12, 15], sword: [20, 40], handF: [10, 6, 22], shield: [66, -40], head: { yaw: 6, pitch: 28 } }),
    ready({ pelvis: [-2, 16], hips: { yaw: -10, pitch: 50 }, torso: { pitch: 26 }, head: { pitch: 26 },
      footN: [-18, -4.6, 3], footF: [-15, 4.8, 3.2], toeN: -84, toeF: -84, kneeN: [1, -0.1, -0.5], kneeF: [1, 0.1, -0.5],
      handN: [16, -12, 8], sword: [70, 50], handF: [14, 7, 12], shield: [70, -50] }),
    ready({ pelvis: [-1, 9], hips: { yaw: -8, pitch: 76 }, torso: { pitch: 12 }, head: { pitch: 6, yaw: 20 },
      footN: [-22, -4.6, 3], footF: [-19, 4.8, 3.5], toeN: -88, toeF: -88, kneeN: [0.3, -0.1, -1], kneeF: [0.3, 0.1, -1],
      handN: [20, -13, 4], sword: [96, 60], handF: [17, 8, 5], shield: [80, -70] }),
    ready({ pelvis: [-1, 6.6], hips: { yaw: -8, pitch: 86 }, torso: { pitch: 4 }, head: { pitch: 0, yaw: 26, roll: -10 },
      footN: [-24, -4.6, 3], footF: [-21, 4.8, 3.5], toeN: -90, toeF: -90, kneeN: [0, -0.1, -1], kneeF: [0, 0.1, -1],
      handN: [22, -13, 3], sword: [100, 66], handF: [18, 8, 3.5], shield: [86, -80] }),
    ready({ pelvis: [-1, 6.2], hips: { yaw: -8, pitch: 88 }, torso: { pitch: 2 }, head: { pitch: -2, yaw: 28, roll: -12 },
      footN: [-24, -4.6, 3], footF: [-21, 4.8, 3.5], toeN: -90, toeF: -90, kneeN: [0, -0.1, -1], kneeF: [0, 0.1, -1],
      handN: [22, -13, 2.6], sword: [100, 68], handF: [18, 8, 3.2], shield: [88, -82] }),
  ];
}

// --- Thrown down, and up again ---------------------------------------------------------------

/** On his back on the street: legs out, the sabre and shield flung wide. */
const supine = (pitch, z, extra = {}) => ready({ pelvis: [-6, z], hips: { yaw: -10, pitch }, torso: { yaw: 0, pitch: 6 },
  head: { yaw: 18, pitch: 10 }, footN: [6, -4.6, 3.2], footF: [10, 4.8, 3.6], toeN: 40, toeF: 30, kneeN: [0.2, -0.3, 1],
  kneeF: [0.2, 0.3, 1], handN: [-16, -12, 8], sword: [200, 50], handF: [-12, 9, 10], shield: [70, 60], ground: true, ...extra });

/** A blow no guard turns throws him off his feet: over backwards, onto his back. */
const KNOCKDOWN = (() => {
  const thrown = ready({ pelvis: [-3, 39], hips: { yaw: -20, pitch: -18 }, torso: { yaw: -12, pitch: -26, roll: 6 },
    head: { yaw: 22, pitch: -32 }, footN: [-6, -4.6, 7.6], toeN: -10, footF: [9, 4.8, 12], toeF: 20, handN: [-4, -12, 52],
    sword: [190, 40], handF: [0, 6, 56], shield: [50, 40] });
  const over = ready({ pelvis: [-6, 27], hips: { yaw: -16, pitch: -52 }, torso: { yaw: -6, pitch: -10 }, head: { yaw: 18, pitch: -14 },
    footN: [-2, -4.6, 12], footF: [8, 4.8, 18], toeN: 10, toeF: 20, kneeN: [0.4, -0.3, 1], kneeF: [0.4, 0.3, 1],
    handN: [-12, -12, 34], sword: [200, 50], handF: [-8, 8, 38], shield: [60, 60] });
  const landing = supine(-78, 9, { footN: [4, -4.6, 8], footF: [10, 4.8, 10] });
  return [thrown, blend(thrown, over, 0.5), over, blend(over, landing, 0.5), landing, supine(-92, 6, { head: { yaw: 18, pitch: 16 } }),
    supine(-88, 6.6)];
})();
const DOWN = [supine(-90, 6.2), nudge(supine(-90, 6.2), { torso: { pitch: 2 }, head: { pitch: -4 }, handN: [0, 0, 1] })];

/** Up off the street: on his hands, a knee under him, and into his guard. */
const GETUP = (() => {
  const sit = ready({ pelvis: [-6, 9], hips: { yaw: -10, pitch: -50 }, torso: { yaw: 0, pitch: 30 }, head: { yaw: 14, pitch: 6 },
    footN: [6, -4.6, 4.2], footF: [9, 4.8, 4.2], kneeN: [0.6, -0.3, 1], kneeF: [0.6, 0.3, 1], handN: [-12, -12, 5],
    sword: [240, 40], handF: [-10, 9, 6], shield: [70, 40], ground: true });
  const kneel = ready({ pelvis: [-3, 21], hips: { yaw: -12, pitch: 8 }, torso: { yaw: -4, pitch: 18 }, head: { yaw: 12, pitch: -6 },
    footN: [-14, -4.6, 3], toeN: -78, kneeN: [1, -0.15, -0.2], footF: [6, 4.8, 4.2], handN: [8, -10, 26], sword: [40, 24],
    handF: [8, 6, 32], shield: [40, -10] });
  const rise = ready({ pelvis: [-1, 31], hips: { yaw: -14, pitch: 10 }, torso: { yaw: -2, pitch: 12 }, head: { yaw: 14, pitch: -4 },
    footN: [-9, -4.6, 4.2], footF: [7, 4.8, 4.2], handN: [10, -10, 36], sword: [90, 20], handF: [8, 4, 44], shield: [38, 0] });
  return [sit, kneel, rise, blend(rise, READY, 0.6)];
})();

/** His blade beaten aside by a man behind his shield: thrown open, the arm flung up and back, off balance. */
const PARRIED_OPEN = (() => {
  const flung = ready({ pelvis: [-3, 38], hips: { yaw: -24, pitch: -10 }, torso: { yaw: -26, pitch: -18, roll: 9 },
    head: { yaw: 26, pitch: -18, roll: 7 }, footN: [-11, -4.6, 4.2], footF: [7, 4.8, 5.6], toeF: 18, handN: [-8, -11, 64],
    sword: [226, 20], handF: [10, 4, 50], shield: [44, 10] });
  const wobble = nudge(flung, { pelvis: [-0.6, -0.8], torso: { pitch: 3, roll: -3 }, head: { pitch: 4 }, handN: [1, 0, -2],
    sword: [-6, 0] });
  return [flung, wobble, blend(wobble, READY, 0.35), blend(wobble, READY, 0.7)];
})();

/** The ground stroke: over a man thrown down, the sabre raised point-down high and driven into him. Active
 * on frames 3-4. */
function groundStab() {
  const lift = ready({ pelvis: [1.5, 38.6], hips: { yaw: -12, pitch: 2 }, torso: { yaw: -6, pitch: -2 }, head: { yaw: 10, pitch: 22 },
    footF: [13, 4.8, LIFT], toeF: 12, handN: [12, -9, 68], sword: [10, 6], handF: [6, 5, 52], shield: [40, 10] });
  // The front foot lands; the back one drags up behind the step.
  const high = pose(lift, { pelvis: [2.4, 37.2], torso: { pitch: -6 }, footF: [14, 4.8, 4.2], toeF: 0, footN: [-5, -4.6, 6.8],
    toeN: 6, handN: [11, -9, 71], sword: [8, 6] });
  const drive = ready({ pelvis: [4, 30.6], hips: { yaw: 4, pitch: 18 }, torso: { yaw: 8, pitch: 22 }, head: { yaw: 4, pitch: 26 },
    footF: [15, 4.8, 4.2], footN: [-6, -4.6, 4.2], handN: [19, -8, 27], sword: [4, 4], handF: [-4, 7, 44], shield: [70, -10] });
  const deep = pose(drive, { pelvis: [4, 29.8], handN: [19, -8, 24.5] });
  const free = pose(drive, { pelvis: [3, 33.4], torso: { pitch: 12 }, head: { pitch: 10 }, handN: [17, -8, 40], sword: [24, 6] });
  return [blend(READY, lift, 0.55), lift, high, drive, deep, free,
    pose(blend(free, READY, 0.6), { footF: [12, 4.8, LIFT], toeF: 10, footN: [-6, -4.6, 4.2] }),
    pose(READY, { footN: [-6, -4.6, 4.2], footF: [10, 4.8, 4.2] })];
}

// --- Interacting and healing -----------------------------------------------------------------

const INTERACT = [
  ready({ pelvis: [0.8, 37], hips: { yaw: -10, pitch: 8 }, torso: { yaw: 8, pitch: 10 }, handF: [13, 3, 46],
    shield: [10, -10], handN: [6, -10.5, 40], sword: [70, 26] }),
  ready({ pelvis: [1.8, 35.8], hips: { yaw: -6, pitch: 14 }, torso: { yaw: 14, pitch: 18 }, head: { pitch: 6 },
    footF: [9.5, 4.8, 4.2], handF: [20, 2, 43], shield: [0, -30], handN: [5, -10.5, 38], sword: [56, 26] }),
  ready({ pelvis: [2, 35.6], hips: { yaw: -6, pitch: 14 }, torso: { yaw: 15, pitch: 19 }, head: { pitch: 7 },
    footF: [9.5, 4.8, 4.2], handF: [21.5, 2, 42.5], shield: [0, -34], handN: [5, -10.5, 38], sword: [56, 26] }),
  blend(READY, ready({ pelvis: [1, 36.8], torso: { yaw: 8, pitch: 10 }, handF: [13, 3, 46], shield: [10, -10] }), 0.5),
];

const HEAL_BASE = ready({ hips: { yaw: -16, pitch: 2 }, torso: { yaw: -4, pitch: 2 }, handF: [5, 4, 44], shield: [50, -14] });
const HEAL = [
  pose(HEAL_BASE, { handN: [8, -9, 50], sword: [200, 30], flask: true }),
  pose(HEAL_BASE, { head: { yaw: 14, pitch: -14 }, handN: [6, -6, 62], sword: [210, 40], flask: true }),
  pose(HEAL_BASE, { torso: { pitch: -6 }, head: { yaw: 12, pitch: -32 }, handN: [5.5, -4.5, 66.5], sword: [216, 44],
    flask: true }),
  pose(HEAL_BASE, { torso: { pitch: -7 }, head: { yaw: 12, pitch: -34 }, handN: [5.5, -4.5, 67], sword: [218, 44],
    flask: true }),
  pose(HEAL_BASE, { head: { yaw: 14, pitch: -8 }, handN: [8, -8, 52], sword: [196, 32], flask: true }),
  blend(HEAL_BASE, READY, 0.6),
];

// --- Exports ---------------------------------------------------------------------------------

// --- Finishers ----------------------------------------------------------------------------------
// Yusuf's half of each scripted kill on a staggered soldier, who stands `distance` px before him
// (finisher_timing.mjs holds the shared timing; mongol3d_animations.mjs the soldier's half). The
// blade meets him where his own animation puts him on the cut frames.

/** The flick that sheds the blood from the blade, then the guard. */
const FLICK = ready({ pelvis: [0.6, 37.6], handN: [16, -10, 40], sword: [58, 22], head: { yaw: 14, pitch: 2 } });

/** Out of a lunge: settling, the blood flicked off as the front foot steps back, and the guard. */
const recover = (from) => [
  pose(blend(from, READY, 0.5), { footF: from.footF }),
  pose(FLICK, { footF: [(from.footF[0] + READY.footF[0]) / 2, READY.footF[1], LIFT * 0.6], toeF: 10 }),
  READY,
];

/** Kicked to his knees, then his head. Cut on 4. */
function finishBehead() {
  const raise = ready({ pelvis: [-1, 38.8], hips: { yaw: -22, pitch: -2 }, torso: { yaw: -18, pitch: -8, roll: 3 },
    head: { yaw: 14, pitch: 6 }, footF: [10, 4.8, 4.2], handN: [-4, -8, 70], sword: [222, 10], handF: [9, 4, 48],
    shield: [30, 6] });
  const chop = ready({ pelvis: [3.6, 35], hips: { yaw: 6, pitch: 14 }, torso: { yaw: 18, pitch: 22, roll: -2 },
    head: { yaw: 4, pitch: 14 }, footF: [14, 4.8, 4.2], handN: [22, -9, 40], sword: [72, -6], handF: [5, 4, 44], shield: [24, -6] });
  const through = ready({ pelvis: [4, 34.4], hips: { yaw: 12, pitch: 16 }, torso: { yaw: 28, pitch: 24, roll: -3 },
    head: { yaw: 2, pitch: 10 }, footF: [14, 4.8, 4.2], footN: [-6, -4.6, 6], toeN: 8, handN: [14, -4, 30], sword: [22, -12],
    handF: [2, 5, 42], shield: [20, -8] });
  return [
    ready({ pelvis: [2, 37.4], hips: { yaw: -10 }, footF: [11, 4.8, 4.2], handN: [12, -10, 44], sword: [110, 10] }),
    // The push kick, the shield drawn in.
    ready({ pelvis: [-1.6, 39.4], hips: { yaw: -6, pitch: -14 }, torso: { yaw: 0, pitch: -8 }, head: { yaw: 10, pitch: 0 },
      footF: [24, 4.8, 22], toeF: 40, footN: [-6, -4.6, 4.2], handN: [2, -10, 48], sword: [150, 10], handF: [6, 4, 52], shield: [30, 10] }),
    ready({ pelvis: [0.6, 37.8], footF: [10, 4.8, LIFT], toeF: 10, handN: [4, -9, 52], sword: [160, 10] }),
    raise,
    chop,
    through,
    ...recover(through),
  ];
}

/** The blade through his belly, lifted on it, kicked off it. Bursts on 1, 2 and 5. */
function finishImpale() {
  const thrust = ready({ pelvis: [5, 34.4], hips: { yaw: 6, pitch: 12 }, torso: { yaw: 20, pitch: 14, roll: -2 },
    head: { yaw: 2, pitch: 2 }, footF: [17, 4.8, 4.2], footN: [-8.5, -4.6, 5.2], toeN: -24, handN: [23, -8, 40], sword: [92, 2],
    handF: [1, 5, 45], shield: [18, -6] });
  const deep = pose(thrust, { pelvis: [6.4, 34], footF: [19, 4.8, 4.2], handN: [26, -8, 41] });
  const lift = pose(deep, { pelvis: [5.6, 35.2], torso: { pitch: 6 }, head: { pitch: -4 }, handN: [25, -8, 48], sword: [104, 2] });
  return [
    ready({ pelvis: [-2.4, 36.8], hips: { yaw: -30, pitch: 3 }, torso: { yaw: -30, pitch: 2, roll: 2 }, head: { yaw: 28, pitch: -4 },
      footF: [7.5, 4.8, 4.2], footN: [-8.5, -4.6, 4.2], handN: [-5, -10, 42], sword: [94, 6], handF: [11, 3, 51], shield: [26, 4] }),
    thrust,
    deep,
    lift,
    nudge(lift, { handN: [0, 0, 1.2], torso: { pitch: -1 }, sword: [3, 0] }),
    // Kicked off the blade as it comes free.
    ready({ pelvis: [1.6, 38.6], hips: { yaw: -4, pitch: -12 }, torso: { yaw: 6, pitch: -4 }, head: { yaw: 8, pitch: 0 },
      footF: [24, 4.8, 22], toeF: 34, footN: [-6, -4.6, 4.2], handN: [12, -9, 44], sword: [98, 8], handF: [6, 4, 50], shield: [28, 8] }),
    ready({ pelvis: [0.8, 37.8], footF: [10, 4.8, LIFT], toeF: 10, handN: [10, -10, 42], sword: [104, 10] }),
    FLICK,
    READY,
  ];
}

/** A full turn, and the blade through his waist. Cut on 3. */
function finishSpin() {
  const coil = ready({ pelvis: [-1, 33.8], hips: { yaw: -40, pitch: 14 }, torso: { yaw: -40, pitch: 12, roll: 2 },
    head: { yaw: 30, pitch: 0 }, footF: [10, 4.8, 4.2], footN: [-10, -4.6, 4.2], handN: [-12, -9, 34], sword: [250, 0],
    handF: [8, 4, 44], shield: [30, -6] });
  const cut = ready({ pelvis: [4, 34.6], hips: { yaw: 10, pitch: 10 }, torso: { yaw: 24, pitch: 14, roll: -2 },
    head: { yaw: 4, pitch: 4 }, footF: [15, 4.8, 4.2], footN: [-8, -4.6, 5], toeN: -10, handN: [24, -9, 41], sword: [90, -30],
    handF: [4, 5, 44], shield: [22, -6] });
  const through = pose(cut, { pelvis: [5, 34.2], hips: { yaw: 22 }, torso: { yaw: 42, pitch: 14 }, handN: [15, -1, 40],
    sword: [62, -72] });
  return [
    coil,
    // The turn: his back to the camera, then round.
    ready({ pelvis: [1, 35], hips: { yaw: -120, pitch: 8 }, torso: { yaw: -110, pitch: 8 }, head: { yaw: -30, pitch: 0 },
      footF: [6, 4.8, LIFT], footN: [-6, -4.6, 4.2], handN: [-4, 6, 42], sword: [200, -60], handF: [-6, -4, 44], shield: [200, 0] }),
    ready({ pelvis: [2, 35], hips: { yaw: -240, pitch: 8 }, torso: { yaw: -230, pitch: 10 }, head: { yaw: -200, pitch: 0 },
      footF: [10, 4.8, 4.2], footN: [-4, -4.6, LIFT], handN: [4, 8, 42], sword: [160, -120], handF: [-4, -6, 44], shield: [210, 0] }),
    cut,
    through,
    ...recover(through),
  ];
}

/** His sword arm on the rising cut; his head on the backhand. Cuts on 1 and 4. */
function finishDisarm() {
  const rise = ready({ pelvis: [3, 38], hips: { yaw: -4, pitch: 4 }, torso: { yaw: -8, pitch: 2, roll: 2 }, head: { yaw: 16, pitch: -6 },
    footF: [14, 4.8, LIFT], toeF: 12, handN: [18, -10, 52], sword: [132, 14], handF: [8, 3, 50], shield: [32, 6] });
  const back = ready({ pelvis: [1, 37.8], hips: { yaw: -30, pitch: 2 }, torso: { yaw: -40, pitch: 0, roll: 3 },
    head: { yaw: 26, pitch: -4 }, footF: [15, 4.8, 4.2], handN: [-8, -6, 56], sword: [252, -30], handF: [10, 3, 50], shield: [28, 4] });
  const backhand = ready({ pelvis: [4, 36.4], hips: { yaw: 10, pitch: 8 }, torso: { yaw: 30, pitch: 10, roll: -2 },
    head: { yaw: 4, pitch: 0 }, footF: [16, 4.8, 4.2], footN: [-7, -4.6, 5.6], toeN: -12, handN: [23, -6, 53], sword: [96, -40],
    handF: [4, 5, 46], shield: [22, -6] });
  return [
    ready({ pelvis: [-1.6, 35.2], hips: { yaw: 14, pitch: 12 }, torso: { yaw: 28, pitch: 14, roll: -2 }, head: { yaw: 0, pitch: 4 },
      handN: [-6, -5, 35], sword: [-55, -14], handF: [6, 4, 46], shield: [24, -6] }),
    rise,
    pose(rise, { pelvis: [2.6, 37.6], torso: { yaw: -22, pitch: -6 }, head: { yaw: 24, pitch: -10 }, footF: [15, 4.8, 4.2],
      handN: [10, -9, 64], sword: [196, 14] }),
    back,
    backhand,
    pose(backhand, { pelvis: [4.6, 36], torso: { yaw: 44, pitch: 12 }, handN: [13, 2, 50], sword: [44, -84] }),
    ...recover(backhand),
  ];
}

/** Over a man thrown down: steps in, the sabre raised point-down, driven into his chest (burst on 3),
 * leant on, wrenched out (burst on 5), the blood flicked off. */
function finishGround() {
  const over = ready({ pelvis: [1.5, 38], hips: { yaw: -12, pitch: 6 }, torso: { yaw: -6, pitch: 6 }, head: { yaw: 10, pitch: 24 },
    footF: [10, 4.8, LIFT], toeF: 10, handN: [12, -9, 52], sword: [16, 6], handF: [8, 4, 48], shield: [40, 0] });
  const raise = ready({ pelvis: [1, 38.4], hips: { yaw: -14, pitch: -2 }, torso: { yaw: -8, pitch: -6 }, head: { yaw: 10, pitch: 20 },
    footF: [11, 4.8, 4.2], handN: [10, -9, 71], sword: [8, 6], handF: [6, 5, 54], shield: [44, 12] });
  const peak = pose(raise, { pelvis: [0.8, 38.6], torso: { pitch: -8 }, handN: [9.5, -9, 72] });
  const stab = ready({ pelvis: [3, 31.6], hips: { yaw: 4, pitch: 16 }, torso: { yaw: 8, pitch: 18 }, head: { yaw: 4, pitch: 22 },
    footF: [12, 4.8, 4.2], footN: [-8, -4.6, 4.2], handN: [17, -8, 25], sword: [4, 4], handF: [1, 6, 47], shield: [60, -6] });
  const lean = pose(stab, { pelvis: [3.4, 30.6], torso: { pitch: 22 }, handN: [17, -8, 23] });
  const wrench = pose(stab, { pelvis: [2.4, 33.6], torso: { pitch: 12 }, head: { pitch: 14 }, handN: [15, -8, 42], sword: [30, 6] });
  return [over, raise, peak, stab, lean, wrench, pose(blend(wrench, FLICK, 0.6), { footF: [9, 4.8, 4.2] }), READY];
}

// --- The second move set ----------------------------------------------------------------------
// The kick that ends the light string, the low cut and the reaping sweep, the heavy string, the running
// slash, the guarded thrust, the riposte, the backhand air slash, the down-stab, and the glance off a
// raised shield.

/** Light 4: the kick, after the thrust. The weight onto the front foot, the back knee drawn up, the sole
 * driven into the man's middle with the body leaning back off it and both arms out; the foot is pulled back
 * and set down where it was. Active on frames 3-4 (a box at the foot). */
function kick() {
  const front = [13, 4.8, 4.2];
  const shift = ready({ pelvis: [4.4, 37.2], hips: { yaw: -14, pitch: 4 }, torso: { yaw: -6, pitch: 4 }, head: { yaw: 16, pitch: -6 },
    footF: front, footN: [-6, -4.6, 6.8], toeN: -20, handN: [8, -11, 45], sword: [140, 20], handF: [14, 3, 50],
    shield: [30, 4] });
  const chamber = ready({ pelvis: [6.4, 37.6], hips: { yaw: -10, pitch: -12 }, torso: { yaw: -4, pitch: -6 },
    head: { yaw: 14, pitch: -8 }, footF: front, footN: [12, -4.6, 25], toeN: 30, kneeN: [1, -0.1, 0.6],
    handN: [-4, -11, 47], sword: [214, 24], handF: [15, 3, 52], shield: [24, 6] });
  const strike = ready({ pelvis: [6.4, 37.6], hips: { yaw: -6, pitch: -28 }, torso: { yaw: -2, pitch: -10 },
    head: { yaw: 12, pitch: 2 }, footF: front, footN: [37, -4.6, 35], toeN: 80, handN: [-7, -12, 49], sword: [232, 24],
    handF: [15, 2, 54], shield: [20, 8] });
  const hold = nudge(strike, { footN: [1, 0, 0.4], torso: { pitch: -1 }, head: { pitch: 1 } });
  const retract = ready({ pelvis: [5.4, 37.4], hips: { yaw: -10, pitch: -8 }, torso: { yaw: -4, pitch: -2 },
    footF: front, footN: [10, -4.6, 20], toeN: 10, handN: [0, -11, 47], sword: [196, 22], handF: [13, 3, 51],
    shield: [26, 4] });
  const down = ready({ pelvis: [2.6, 37], footF: front, footN: [-6, -4.6, 4.2], handN: [8, -10.5, 43], sword: [150, 18] });
  const lift = pose(blend(shift, chamber, 0.5), { footN: [3, -4.6, 15], toeN: 10 });
  const pull = pose(blend(hold, retract, 0.5), { footN: [24, -4.6, 29], toeN: 40 });
  const lower = pose(blend(retract, down, 0.5), { footN: [2, -4.6, 11], toeN: 0 });
  return [shift, lift, chamber, nudge(chamber, { footN: [2, 0, 1] }), strike, hold, pull, retract, lower, down,
    pose(blend(down, READY, 0.6), { footF: front }), pose(READY, { footF: front })];
}

/** The low cut: down into a crouch with the blade drawn back low and the shield held up over the head,
 * then a cut across at the shins, under a raised shield. Active on frames 2-3. */
function lowCut() {
  const drop = ready({ pelvis: [-0.6, 33], hips: { yaw: -24, pitch: 12 }, torso: { yaw: -16, pitch: 14, roll: 2 },
    head: { yaw: 18, pitch: -6 }, footF: [9, 4.8, 4.2], footN: [-9, -4.6, 4.2], handN: [-2, -10, 36], sword: [240, 10],
    handF: [12, 3, 47], shield: [22, 8] });
  const coil = ready({ pelvis: [-1.6, 29.6], hips: { yaw: -30, pitch: 16 }, torso: { yaw: -24, pitch: 18, roll: 3 },
    head: { yaw: 22, pitch: -10 }, footF: [10, 4.8, 4.2], footN: [-10, -4.6, 4.2], handN: [-9, -9.5, 29],
    sword: [262, 6], handF: [13, 3, 45], shield: [18, 14] });
  const cut = armOut(ready({ pelvis: [2, 28.6], hips: { yaw: 4, pitch: 18 }, torso: { yaw: 14, pitch: 16, roll: -2 },
    head: { yaw: 8, pitch: -8 }, footF: [14, 4.8, LIFT], toeF: 10, footN: [-10, -4.6, 4.2], sword: [86, 2],
    handF: [8, 4, 46], shield: [26, 16] }), [0.9, -0.15, -0.42], 21);
  const through = armOut(ready({ pelvis: [3, 28.4], hips: { yaw: 12, pitch: 18 }, torso: { yaw: 26, pitch: 16, roll: -3 },
    head: { yaw: 4, pitch: -6 }, footF: [15, 4.8, 4.2], toeF: 0, footN: [-9, -4.6, 4.2], sword: [76, -54],
    handF: [4, 5, 46], shield: [34, 14] }), [0.6, 0.35, -0.72], 21);
  const hold = nudge(through, { pelvis: [0.2, -0.2], torso: { yaw: 1.5 }, sword: [-3, -4] });
  return [
    drop,
    coil,
    cut,
    through,
    hold,
    pose(blend(through, READY, 0.45), { footF: through.footF, footN: [-7.5, -4.6, LIFT], toeN: 6 }),
    pose(blend(through, READY, 0.8), { footF: through.footF, footN: BACK }),
    pose(READY, { footF: through.footF }),
  ];
}

/** Where a blade held out low from the sword arm points in a low turn: its wheel leans down all round, at
 * the shins (see wheel). */
function lowWheel(theta, drop = 24) {
  const psi = ((theta - 90) * Math.PI) / 180;
  const beta = (-drop * Math.PI) / 180;
  return toward([Math.cos(psi) * Math.cos(beta), Math.sin(psi) * Math.cos(beta), Math.sin(beta)]);
}

/** The reaping sweep: down in a crouch with the blade drawn back low, then a whole turn on the ball of the
 * foot with the blade at the shins all round him: behind, out past his far side, before him, past the
 * camera and behind again; he comes up out of it. Active on frames 2-5 (strikes all round, throws men down). */
function reapingSweep() {
  const low = { pelvis: [0, 29.4], reach: 19, height: 30, head: { yaw: 20, pitch: 4 } };
  const crouch = ready({ pelvis: [-0.8, 31.6], hips: { yaw: -30, pitch: 14 }, torso: { yaw: -22, pitch: 14, roll: 2 },
    head: { yaw: 20, pitch: -8 }, footF: [10, 4.8, 4.2], footN: [-10, -4.6, 4.2], handN: [-8, -10, 33], sword: [258, 14],
    handF: [12, 3, 46], shield: [20, 10] });
  const coil = pose(spinPose(-90, { ...low, feet: [[0, 0, 0], [0, 0, 0]], sword: lowWheel(-90), head: { yaw: 58, pitch: 4 } }),
    { footF: [11, 4.8, 4.2], footN: [-10, -4.6, 4.2], footYawN: -40, footYawF: -10, toeN: 0, toeF: 0 });
  const far = spinPose(-180, { ...low, feet: PIVOT_FEET, sword: lowWheel(-180), head: { yaw: 40, pitch: 6 } });
  const fore = spinPose(-270, { ...low, feet: PIVOT_FEET, sword: lowWheel(-270), head: { yaw: -30, pitch: 6 } });
  const near = spinPose(-360, { ...low, feet: PIVOT_FEET, sword: lowWheel(-360), head: { yaw: 10, pitch: 6 } });
  const back = spinPose(-450, { ...low, feet: [[-8, -4.6, 4.2], [8, 4.8, 4.2]], sword: lowWheel(-450),
    head: { yaw: 50, pitch: 4 } });
  const rise = ready({ pelvis: [0.6, 33.4], hips: { yaw: -378, pitch: 10 }, torso: { yaw: -12, pitch: 10 },
    head: { yaw: 16, pitch: -2 }, footF: [9, 4.8, 4.2], footN: [-8, -4.6, 4.2], handN: [6, -11, 38], sword: [150, 30],
    handF: [10, 4, 47], shield: [30, 2] });
  return [crouch, coil, far, fore, near, back, rise, pose(blend(rise, pose(READY, { hips: { yaw: -378 } }), 0.6)),
    pose(READY, { hips: { yaw: -378 } })];
}

/** The second heavy blow, out of the cleave: from the blade in the street before him, the back foot steps
 * up and the blade is ripped up through the man in front to overhead, the shield flung back. Active on
 * frames 2-3. */
function heavyRise() {
  const gather = cleaveLanding({ pelvis: [1.2, 30.6], front: 15, back: -9, sword: [26, -2], arm: [0.45, -0.1, -0.88],
    toeN: 0, backZ: 4.2, reach: 19 });
  const step = pose(gather, { pelvis: [2, 30.4], footN: [-5, -4.6, LIFT], toeN: 8, torso: { yaw: 10, pitch: 12 },
    sword: [18, -4] });
  const rip = armOut(ready({ pelvis: [4, 35.8], hips: { yaw: -4, pitch: 8 }, torso: { yaw: -6, pitch: 2, roll: 2 },
    head: { yaw: 16, pitch: -10 }, footF: [15, 4.8, 4.2], footN: [-3, -4.6, 4.2], sword: [104, 10],
    handF: [-2, 7, 47], shield: [70, -4] }), [0.85, -0.15, 0.45], 22);
  const high = armOut(ready({ pelvis: [4.4, 38.6], hips: { yaw: -10, pitch: 0 }, torso: { yaw: -18, pitch: -8, roll: 4 },
    head: { yaw: 22, pitch: -14 }, footF: [15, 4.8, 4.2], footN: [-3, -4.6, 6.8], toeN: 10, sword: [178, 12],
    handF: [0, 7, 47], shield: [64, -6] }), [0.2, -0.2, 0.96], 22);
  const over = pose(high, { pelvis: [4, 38.8], torso: { yaw: -20, pitch: -11 }, sword: [198, 12],
    handN: [high.handN[0] - 2, high.handN[1], high.handN[2] + 0.4] });
  return [
    gather,
    step,
    rip,
    high,
    over,
    pose(blend(over, READY, 0.45), { footF: high.footF, footN: [-5, -4.6, LIFT], toeN: 6 }),
    pose(blend(over, READY, 0.8), { footF: high.footF, footN: BACK }),
    pose(READY, { footF: high.footF }),
  ];
}

/** The third heavy blow, the windmill: from the blade overhead, it goes on round behind him and down past
 * his near side, up through the man before him, over the top and down into the street in a deep landing:
 * one long circle with the whole body in it. Active on frames 3-7 (it strikes each time it passes). */
function windmill() {
  const back = armOut(ready({ pelvis: [3, 38], hips: { yaw: -20, pitch: -2 }, torso: { yaw: -26, pitch: -8, roll: 4 },
    head: { yaw: 24, pitch: -8 }, footF: [15, 4.8, 4.2], footN: [-6, -4.6, 4.2], sword: [240, 26],
    handF: [12, 3, 52], shield: [24, 6] }), [-0.55, -0.35, 0.75], 21);
  const behind = armOut(ready({ pelvis: [2.4, 35.6], hips: { yaw: -26, pitch: 8 }, torso: { yaw: -30, pitch: 6, roll: 2 },
    head: { yaw: 28, pitch: -4 }, footF: [15, 4.8, 4.2], footN: [-6, -4.6, 4.2], sword: [300, 40],
    handF: [13, 3, 50], shield: [24, 6] }), [-0.7, -0.6, -0.35], 21);
  const under = armOut(ready({ pelvis: [3.2, 34.2], hips: { yaw: -16, pitch: 12 }, torso: { yaw: -14, pitch: 10 },
    head: { yaw: 18, pitch: -2 }, footF: [15, 4.8, 4.2], footN: [-6, -4.6, 4.2], sword: [384, 36],
    handF: [12, 3, 49], shield: [26, 4] }), [0.2, -0.75, -0.6], 21);
  const up = armOut(ready({ pelvis: [4.4, 36.2], hips: { yaw: -6, pitch: 8 }, torso: { yaw: -6, pitch: 4, roll: 2 },
    head: { yaw: 16, pitch: -8 }, footF: [16, 4.8, 4.2], footN: [-5, -4.6, 6.8], toeN: 8, sword: [458, 14],
    handF: [6, 5, 48], shield: [48, -4] }), [0.85, -0.2, 0.45], 22);
  const top = armOut(ready({ pelvis: [5, 38], hips: { yaw: -12, pitch: -2 }, torso: { yaw: -16, pitch: -10, roll: 3 },
    head: { yaw: 20, pitch: -14 }, footF: [16, 4.8, 4.2], footN: [-4, -4.6, 7.2], toeN: 10, sword: [540, 10],
    handF: [10, 4, 52], shield: [30, 6] }), [0.15, -0.2, 0.97], 22);
  const crest = pose(top, { pelvis: [4.8, 38.2], torso: { yaw: -18, pitch: -13 }, sword: [556, 10], footN: [-4, -4.6, 4.2],
    toeN: 0, handN: [top.handN[0] - 2, top.handN[1], top.handN[2] + 0.5] });
  const smash = armOut(ready({ pelvis: [5, 35], hips: { yaw: 6, pitch: 12 }, torso: { yaw: 12, pitch: 8, roll: -2 },
    head: { yaw: 6, pitch: -2 }, footF: [18, 4.8, LIFT], toeF: 12, footN: [-4, -4.6, 4.6], toeN: -14,
    sword: [450, 0], handF: [2, 6, 46], shield: [56, -2] }), [0.75, -0.05, -0.65], 17);
  const ground = cleaveLanding({ pelvis: [4.6, 30.6], front: 19, back: -6, sword: [392, -2], arm: [0.5, -0.1, -0.86],
    toeN: 4, backZ: 6.8 });
  const hold = pose(ground, { pelvis: [4.4, 30.2], torso: { pitch: 9 }, footN: [-6, -4.6, 6.8], toeN: 6 });
  return [
    back,
    behind,
    under,
    up,
    top,
    crest,
    smash,
    ground,
    hold,
    pose(blend(ground, pose(READY, { pelvis: [5, 36.5], sword: [474, 16] }), 0.55), { footF: ground.footF, footN: BACK }),
    pose(blend(ground, pose(READY, { sword: [474, 16] }), 0.85), { footF: ground.footF, footN: BACK }),
    pose(READY, { footF: ground.footF, sword: [474, 16] }),
  ];
}

/** The running slash: off the run, a spring forward low with the blade drawn back at the hip, then a flat
 * cut across at the chest as he lands, carried on by his speed. Active on frames 2-3. */
function runningSlash() {
  const spring = ready({ pelvis: [1.4, 35], hips: { yaw: -24, pitch: 14 }, torso: { yaw: -22, pitch: 14, roll: 2 },
    head: { yaw: 22, pitch: -10 }, footF: [12, 4.8, 9], toeF: 10, footN: [-10, -4.6, 6.8], toeN: -40,
    handN: [-8, -10, 42], sword: [262, 26], handF: [13, 3, 49], shield: [24, 4] });
  const flight = ready({ pelvis: [3, 37.4], hips: { yaw: -16, pitch: 12 }, torso: { yaw: -12, pitch: 12 },
    head: { yaw: 18, pitch: -8 }, footF: [14, 4.8, 12], toeF: 14, footN: [-7, -4.6, 13], toeN: -30,
    handN: [-6, -11, 44], sword: [282, 34], handF: [14, 3, 50], shield: [24, 6] });
  const slash = armOut(ready({ pelvis: [4, 35.4], hips: { yaw: 8, pitch: 12 }, torso: { yaw: 18, pitch: 10, roll: -2 },
    head: { yaw: 4, pitch: -4 }, footF: [16, 4.8, 4.2], footN: [-6, -4.6, 9], toeN: -20, sword: [92, 10],
    handF: [0, 7, 46], shield: [66, -4] }), [0.98, -0.1, -0.12], 22);
  const across = armOut(ready({ pelvis: [4.6, 34.6], hips: { yaw: 16, pitch: 12 }, torso: { yaw: 30, pitch: 10, roll: -3 },
    head: { yaw: 0, pitch: -2 }, footF: [16, 4.8, 4.2], footN: [-5, -4.6, 6.6], toeN: 4, sword: [94, -62],
    handF: [-4, 7, 46], shield: [74, -6] }), [0.55, 0.75, -0.1], 21);
  const skid = pose(across, { pelvis: [4.4, 34.2], torso: { yaw: 26, pitch: 12 }, footN: [-6, -4.6, 4.2], toeN: 0,
    sword: [80, -50] });
  return [spring, flight, slash, across, skid, pose(blend(skid, READY, 0.5), { footF: skid.footF, footN: BACK }),
    pose(READY, { pelvis: [3, 37.6], footF: [14.5, 4.8, 4.2] })];
}

/** The guarded thrust: from behind the raised shield, the sabre lifted overhand beside the head and its point
 * driven forward over the shield's rim; the shield never moves. Active on frames 1-2. */
function guardedThrust() {
  const chamber = pose(GUARD, { handN: [-3, -10, 59], sword: [100, 4], torso: { yaw: 6, pitch: 8 }, head: { yaw: 8, pitch: -2 } });
  const stab = pose(GUARD, { pelvis: [1.6, 36.2], hips: { yaw: -6, pitch: 9 }, torso: { yaw: 18, pitch: 10 },
    head: { yaw: 2, pitch: -2 }, footF: [11, 4.8, LIFT], toeF: 10, handN: [21, -9, 61], sword: [100, 2] });
  const home = pose(stab, { pelvis: [2, 36], footF: [12, 4.8, 4.2], toeF: 0, handN: [23, -9, 60.5] });
  return [chamber, stab, home, pose(blend(home, GUARD, 0.5), { footF: home.footF }), pose(GUARD, { footF: home.footF })];
}

/** The riposte: out of the parry the point is already aimed; a lightning lunge at the throat of the man
 * thrown open, held in him a beat, then the blade wrenched out. Active on frames 1-2. */
function riposte() {
  const aim = ready({ pelvis: [-1.4, 36.6], hips: { yaw: -28, pitch: 6 }, torso: { yaw: -26, pitch: 4, roll: 2 },
    head: { yaw: 26, pitch: -6 }, footF: [8, 4.8, 4.2], footN: [-8.5, -4.6, 4.2], handN: [-6, -10, 48], sword: [96, 6],
    handF: [13, 1, 57], shield: [56, 34] });
  const lunge = ready({ pelvis: [5.4, 34.6], hips: { yaw: 6, pitch: 12 }, torso: { yaw: 22, pitch: 12, roll: -2 },
    head: { yaw: 2, pitch: -2 }, footF: [18, 4.8, LIFT], toeF: 16, footN: [-8.5, -4.6, 5.4], toeN: -26,
    handN: [28, -8, 51], sword: [97, 2], handF: [-3, 7, 48], shield: [74, -2] });
  const deep = pose(lunge, { pelvis: [6, 33.6], footF: [19.5, 4.8, 4.2], toeF: 0, footN: [-7, -4.6, 7], toeN: 6,
    handN: [30.5, -7.6, 51.5], sword: [96, 0] });
  const wrench = pose(deep, { pelvis: [5, 34.4], torso: { yaw: 14, pitch: 8 }, handN: [24, -9, 50], sword: [116, 24],
    footN: [-6, -4.6, 7], toeN: 6 });
  return [aim, lunge, deep, wrench, pose(blend(wrench, READY, 0.5), { footF: deep.footF, footN: BACK }),
    pose(blend(wrench, READY, 0.85), { footF: deep.footF, footN: BACK }), pose(READY, { footF: deep.footF })];
}

/** The second air slash: a backhand rising from low behind to high before him, the knees drawn up. Active on
 * frames 1-2. */
function airBackhand() {
  const low = armOut(pose(AIR, { pelvis: [0, 40.2], hips: { yaw: -22, pitch: 8 }, torso: { yaw: -20, pitch: 10, roll: 2 },
    head: { yaw: 20, pitch: 0 }, ...TUCK, sword: [-52, -8], handF: [11, 3, 50], shield: [28, 2] }), [-0.45, -0.25, -0.85]);
  const rise = armOut(pose(AIR, { pelvis: [1.6, 40.4], hips: { yaw: -4, pitch: 4 }, torso: { yaw: -8, pitch: 2, roll: 2 },
    head: { yaw: 16, pitch: -8 }, footN: [-5, -4.4, 12], toeN: -30, footF: [8, 4.6, 15], toeF: 6, sword: [112, 16],
    handF: [1, 6, 47], shield: [58, -8] }), [0.95, -0.2, -0.15], 20);
  const high = armOut(pose(AIR, { pelvis: [2, 40.6], hips: { yaw: -12, pitch: -2 }, torso: { yaw: -20, pitch: -8, roll: 4 },
    head: { yaw: 22, pitch: -12 }, footN: [-6, -4.4, 11], toeN: -30, footF: [8, 4.6, 13], toeF: 4, sword: [188, 14],
    handF: [2, 6, 48], shield: [56, -6] }), [0.35, -0.25, 0.9]);
  const settle = pose(high, { torso: { pitch: -4 }, sword: [168, 14] });
  return [low, rise, high, settle, blend(settle, FALL[0], 0.6)];
}

/** The down-stab: in the air, the sabre turned point-down beneath him with the knees drawn up out of its way;
 * the point stays down until it strikes (he springs off what it struck) or he lands. Active on frames 1-5. */
function downStab() {
  const tucked = { footN: [-2, -4.4, 20], toeN: -40, footF: [5, 4.6, 22], toeF: -24 };
  const turn = pose(AIR, { pelvis: [0.4, 40.6], hips: { yaw: -14, pitch: 2 }, torso: { yaw: -6, pitch: 2 },
    head: { yaw: 14, pitch: 4 }, ...TUCK, handN: [9, -9, 56], sword: [150, 10], handF: [7, 4, 52], shield: [36, 14] });
  const point = pose(AIR, { pelvis: [0.6, 40.6], hips: { yaw: -12, pitch: 10 }, torso: { yaw: -4, pitch: 12 },
    head: { yaw: 12, pitch: 18 }, ...tucked, handN: [8, -8, 38], sword: [4, 4], handF: [3, 7, 50], shield: [52, 30] });
  const press = nudge(point, { handN: [0, 0, -0.8], torso: { pitch: 1 } });
  return [turn, point, press, point, press, point];
}

/** A light blow glances off a raised shield: the sword arm thrown back up, the body knocked back on its heels
 * a moment. */
const GLANCE = (() => {
  const thrown = ready({ pelvis: [-1.8, 37.6], hips: { yaw: -26, pitch: -6 }, torso: { yaw: -24, pitch: -10, roll: 6 },
    head: { yaw: 24, pitch: -10, roll: 4 }, footF: [8, 4.8, 5.6], toeF: 14, handN: [-6, -11, 62], sword: [214, 26],
    handF: [11, 3, 52], shield: [30, 8] });
  const back = nudge(thrown, { pelvis: [-0.6, -0.4], torso: { pitch: 2, roll: -2 }, handN: [1, 0, -2], sword: [-8, 0] });
  return [thrown, back, blend(back, READY, 0.5), blend(back, READY, 0.85)];
})();

const BODY = [96, 128];
const WIDE = [160, 128];
/** An animation for a finisher, timed from finisher_timing.mjs. */
const finisher = (name, poses) => ({ size: WIDE, fps: FINISHERS[name].fps, loop: false, poses,
  durations: FINISHERS[name].durations });

export const ANIMATIONS = {
  idle: { size: BODY, fps: 8, loop: true, poses: idle() },
  walk: { size: BODY, fps: 10, loop: true, poses: walk(), motion: [62, 0, 0] },
  run: { size: BODY, fps: 14, loop: true, poses: run(), motion: [150, 0, 0] },
  run_start: { size: BODY, fps: 14, loop: false, poses: RUN_START, durations: [1, 1], motion: [90, 0, 0] },
  skid: { size: BODY, fps: 12, loop: false, poses: SKID, durations: [1.4, 1.2, 1.2], motion: [60, 0, 0] },
  turn: { size: BODY, fps: 14, loop: false, poses: TURN, durations: [1, 1], motion: [40, 0, 0] },
  jump: { size: BODY, fps: 10, loop: false, poses: JUMP, motion: [60, 0, 280] },
  apex: { size: BODY, fps: 8, loop: false, poses: APEX, motion: [60, 0, 20] },
  fall: { size: BODY, fps: 8, loop: true, poses: FALL, motion: [50, 0, -130] },
  land: { size: BODY, fps: 14, loop: false, poses: LAND, motion: [0, 0, -80] },
  attack_1: { size: WIDE, fps: 24, loop: false, poses: attack1(),
    durations: [0.8, 1, 0.6, 0.7, 0.8, 1, 1.2, 1.2, 1.2, 1.2], motion: [40, 0, 0] },
  attack_2: { size: WIDE, fps: 24, loop: false, poses: attack2(),
    durations: [0.8, 1, 0.6, 0.7, 0.8, 1, 0.9, 1.2, 1.2, 1.2], motion: [40, 0, 0] },
  attack_3: { size: WIDE, fps: 24, loop: false, poses: attack3(),
    durations: [0.8, 1.2, 0.6, 0.8, 0.8, 1, 1.8, 1.2, 1.2, 1.2, 1.2], motion: [110, 0, 0] },
  // A skip-step into the kick: the standing foot slides in with him.
  attack_4: { size: WIDE, fps: 24, loop: false, poses: kick(), durations: [0.8, 0.6, 0.8, 0.6, 0.8, 1.4, 0.7, 0.7, 0.8, 1, 1.2, 1.2],
    motion: [60, 0, 0], skid: true },
  heavy: { size: WIDE, fps: 24, loop: false, poses: heavy(),
    durations: [1.2, 1.4, 2, 0.6, 0.7, 0.7, 0.9, 1.1, 1.4, 1.4, 1.2, 1.2, 1.2], motion: [60, 0, 0] },
  heavy_2: { size: WIDE, fps: 24, loop: false, poses: heavyRise(), durations: [1, 1.2, 0.9, 1.1, 1.2, 1.2, 1.2, 1.2],
    motion: [50, 0, 0] },
  heavy_3: { size: WIDE, fps: 24, loop: false, poses: windmill(),
    durations: [1, 0.8, 0.8, 0.8, 0.9, 1.6, 0.8, 1, 1.6, 1.4, 1.2, 1.2], motion: [50, 0, 0] },
  low_cut: { size: WIDE, fps: 24, loop: false, poses: lowCut(), durations: [0.8, 1.4, 0.8, 1, 1.2, 1.2, 1.2, 1.2],
    motion: [40, 0, 0] },
  sweep: { size: WIDE, fps: 24, loop: false, poses: reapingSweep(), allRound: true, durations: [1.2, 1.6, 0.8, 0.8, 0.8, 0.8, 1.4, 1.4, 1.2],
    motion: [10, 0, 0] },
  running_slash: { size: WIDE, fps: 24, loop: false, poses: runningSlash(), durations: [0.8, 1, 0.8, 1, 1.4, 1.2, 1.2],
    motion: [200, 0, 0], skid: true },
  guarded_thrust: { size: WIDE, fps: 24, loop: false, poses: guardedThrust(), durations: [1.4, 0.9, 1.1, 1, 1],
    motion: [20, 0, 0] },
  riposte: { size: WIDE, fps: 24, loop: false, poses: riposte(), durations: [0.8, 0.8, 1.8, 1.4, 1.2, 1.2, 1.2],
    motion: [120, 0, 0] },
  air_attack_2: { size: WIDE, fps: 24, loop: false, poses: airBackhand(), durations: [1.4, 0.8, 1, 1.4, 1.4],
    motion: [60, 0, 0] },
  down_stab: { size: WIDE, fps: 20, loop: false, poses: downStab(), durations: [1, 1, 1.4, 1.4, 1.4, 1.4],
    motion: [0, 0, -200] },
  glance: { size: WIDE, fps: 16, loop: false, poses: GLANCE, durations: [1, 1.2, 1, 1], motion: [-40, 0, 0] },
  block_start: { size: WIDE, fps: 20, loop: false, poses: BLOCK_START },
  block: { size: WIDE, fps: 3, loop: true, poses: BLOCK },
  block_walk: { size: WIDE, fps: 12, loop: true, poses: GUARD_STEP, motion: [34, 0, 0] },
  block_back: { size: WIDE, fps: 12, loop: true, poses: GUARD_BACK, motion: [-34, 0, 0] },
  block_hit: { size: WIDE, fps: 14, loop: false, poses: BLOCK_HIT, motion: [-60, 0, 0] },
  parry: { size: WIDE, fps: 16, loop: false, poses: PARRY, durations: [0.8, 1, 1.4, 1.2, 1, 1] },
  roll: { size: WIDE, fps: 18, loop: false, poses: ROLL, motion: [200, 0, 0] },
  throw: { size: WIDE, fps: 20, loop: false, poses: throwKnife(), durations: [1, 0.8, 1.2, 1.4, 1.2], motion: [20, 0, 0] },
  roll_cut: { size: WIDE, fps: 20, loop: false, poses: rollCut(), durations: [1, 0.8, 1, 1.4, 1.4, 1.2], motion: [60, 0, 0] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: HURT, durations: [1, 1.2, 0.8, 1, 1], motion: [-70, 0, 0] },
  death: { size: WIDE, fps: 9, loop: false, poses: death(), durations: [1, 1, 0.7, 1, 1.2, 1.2, 0.8, 0.8, 1, 2],
    wind: [-14, 0, -6], limp: 0.9 },
  interact: { size: BODY, fps: 8, loop: false, poses: INTERACT, durations: [1, 1, 1.6, 1] },
  heal: { size: BODY, fps: 8, loop: false, poses: HEAL, durations: [1, 1, 1.4, 1.4, 1, 1] },
  air_attack: { size: WIDE, fps: 20, loop: false, poses: airAttack(), durations: [1, 1.3, 0.8, 1, 1.4, 1.4],
    motion: [60, 0, 0] },
  plunge: { size: WIDE, fps: 16, loop: false, poses: PLUNGE, durations: [1, 1.2, 0.8], motion: [0, 0, 60] },
  plunge_fall: { size: WIDE, fps: 10, loop: true, poses: PLUNGE_FALL, motion: [0, 0, -540] },
  plunge_land: { size: WIDE, fps: 16, loop: false, poses: plungeLand(), durations: [0.8, 1.4, 1.4, 1.2, 1, 1] },
  bash: { size: WIDE, fps: 20, loop: false, poses: bash(), durations: [1, 1, 0.8, 1.2, 1.4, 1.4], motion: [80, 0, 0] },
  pommel_strike: { size: WIDE, fps: 20, loop: false, poses: pommelStrike(), durations: [1.8, 0.8, 1, 1.4, 1.4, 1.2],
    motion: [60, 0, 0] },
  whirling_cut: { size: WIDE, fps: 20, loop: false, poses: whirlingCut(), allRound: true, durations: [2.6, 0.8, 0.8, 1, 1.6, 1.4, 1.4],
    motion: [20, 0, 0] },
  delayed_cut: { size: WIDE, fps: 20, loop: false, poses: delayedCut(), durations: [2, 1.6, 0.8, 1, 1.6, 1.4, 1.2],
    motion: [50, 0, 0] },
  executioner: { size: WIDE, fps: 18, loop: false, poses: executioner(), durations: [1.4, 1.6, 1, 0.8, 1.2, 1.6, 1.4, 1.4],
    motion: [160, 0, 0], skid: true },
  charge_hold: { size: WIDE, fps: 10, loop: true, poses: CHARGE_HOLD },
  cleave_charged: { size: WIDE, fps: 18, loop: false, poses: cleaveCharged(), durations: [1.8, 0.8, 1.2, 1.8, 1.4, 1.4, 1.4],
    motion: [70, 0, 0] },
  running_thrust: { size: WIDE, fps: 20, loop: false, poses: runningThrust(), durations: [1.4, 1, 1, 1, 1.6, 1.4, 1.2, 1.2],
    motion: [240, 0, 0], skid: true },
  art_storm: { size: WIDE, fps: 20, loop: false, poses: artStorm(), allRound: true,
    durations: [2.4, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1, 1.1], motion: [20, 0, 0] },
  art_storm_burst: { size: WIDE, fps: 20, loop: false, poses: artStormBurst(), allRound: true,
    durations: [1, 0.8, 0.8, 1.2, 1.8, 1.6, 1.4, 1.2] },
  art_pierce: { size: WIDE, fps: 20, loop: false, poses: artPierce(), durations: [3.4, 1, 1, 1, 2.4, 2.2, 1.6, 1.2],
    motion: [600, 0, 0], skid: true },
  art_flit: { size: WIDE, fps: 20, loop: true, poses: artFlit(), skid: true },
  art_naft: { size: WIDE, fps: 16, loop: false, poses: artNaft(), durations: [1.2, 1.2, 0.8, 1.4, 1.4], motion: [10, 0, 0] },
  art_second_wind: { size: WIDE, fps: 12, loop: false, poses: artSecondWind(), durations: [1.4, 1, 3, 2.2, 1.4, 1] },
  finish_behead: finisher("behead", finishBehead()),
  finish_impale: finisher("impale", finishImpale()),
  finish_spin: finisher("spin", finishSpin()),
  finish_disarm: finisher("disarm", finishDisarm()),
  finish_ground: finisher("ground", finishGround()),
  parried: { size: WIDE, fps: 9, loop: false, poses: PARRIED_OPEN, durations: [1, 1.6, 1, 1], motion: [-40, 0, 0] },
  knockdown: { size: WIDE, fps: 14, loop: false, poses: KNOCKDOWN, durations: [1, 0.8, 0.8, 0.7, 0.8, 1, 1.4], motion: [-140, 0, 0] },
  down: { size: WIDE, fps: 3, loop: true, poses: DOWN, limp: 0.6 },
  getup: { size: WIDE, fps: 12, loop: false, poses: GETUP, durations: [1.2, 1.2, 1, 1] },
  ground_stab: { size: WIDE, fps: 18, loop: false, poses: groundStab(), durations: [1, 1.2, 1.4, 0.8, 1.4, 1.2, 1.2, 1] },
};

export { smooth };
