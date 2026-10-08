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
// with a smear, a follow-through past the target, and a settle back to guard.

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
    [15, 4.8, 18], [6, 4.2, 0], [-5, 4.4, -6], [-15, 7.5, -42],
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

// --- Sword ----------------------------------------------------------------------------------

/** Light 1: a diagonal forehand cut from over the near shoulder. Active on frames 2-3. */
function attack1() {
  const wound = ready({
    pelvis: [-1.8, 37],
    hips: { yaw: -30, pitch: 2 },
    torso: { yaw: -26, pitch: -1, roll: 4 },
    head: { yaw: 26, pitch: -5 },
    handN: [-6, -8.5, 63],
    sword: [212, 18],
    handF: [11, 3, 50],
    shield: [26, 2],
  });
  const cut = ready({
    pelvis: [3.6, 36.2],
    hips: { yaw: 4, pitch: 9 },
    torso: { yaw: 14, pitch: 12, roll: -2 },
    head: { yaw: 8, pitch: 0 },
    footF: [12, 4.8, 4.2],
    handN: [18, -9, 48],
    sword: [92, 4],
    handF: [5, 4, 46],
    shield: [26, -4],
  });
  const through = ready({
    pelvis: [4.6, 35],
    hips: { yaw: 12, pitch: 13 },
    torso: { yaw: 28, pitch: 19, roll: -3 },
    head: { yaw: 0, pitch: 7 },
    footF: [12.5, 4.8, 4.2],
    footN: [-7, -4.6, 4.6],
    toeN: -12,
    handN: [12, -2, 32],
    sword: [22, -10],
    handF: [0, 5, 44],
    shield: [20, -8],
  });
  const settle = pose(through, { pelvis: [4.2, 35.5], torso: { yaw: 24, pitch: 16 }, handN: [12.5, -3, 34],
    sword: [34, -6] });
  return [
    blend(READY, wound, 0.6),
    wound,
    cut,
    through,
    settle,
    blend(settle, pose(READY, { footF: [10, 4.8, 4.2] }), 0.55),
    pose(READY, { footF: [8.5, 4.8, 4.2] }),
  ];
}

/** Light 2: a rising backhand cut, low behind to high in front. Active on frames 2-3. */
function attack2() {
  const low = ready({
    pelvis: [1.4, 35.4],
    hips: { yaw: 14, pitch: 10 },
    torso: { yaw: 26, pitch: 14, roll: -2 },
    head: { yaw: 0, pitch: 4 },
    footF: [10.5, 4.8, 4.2],
    handN: [-1, -5, 36],
    sword: [-34, -14],
    handF: [3, 4, 45],
    shield: [22, -6],
  });
  const rise = ready({
    pelvis: [4, 37.6],
    hips: { yaw: -4, pitch: 4 },
    torso: { yaw: -10, pitch: 2, roll: 2 },
    head: { yaw: 18, pitch: -6 },
    footF: [12.5, 4.8, 4.2],
    handN: [17, -10, 50],
    sword: [118, 16],
    handF: [8, 3, 50],
    shield: [32, 6],
  });
  const high = ready({
    pelvis: [4.4, 38.6],
    hips: { yaw: -12, pitch: 0 },
    torso: { yaw: -22, pitch: -6, roll: 4 },
    head: { yaw: 24, pitch: -12 },
    footF: [12.5, 4.8, 4.2],
    footN: [-6, -4.6, 5],
    toeN: -18,
    handN: [11, -9, 64],
    sword: [190, 14],
    handF: [9, 3, 50],
    shield: [34, 8],
  });
  const hold = pose(high, { pelvis: [4, 38.2], torso: { pitch: -4 }, handN: [11, -9, 62], sword: [178, 14] });
  return [
    blend(READY, low, 0.65),
    low,
    rise,
    high,
    hold,
    blend(hold, pose(READY, { footF: [10.5, 4.8, 4.2] }), 0.55),
    pose(READY, { footF: [9, 4.8, 4.2] }),
  ];
}

/** Light 3: a lunging thrust that ends the combo. Active on frames 2-4. */
function attack3() {
  const drawn = ready({
    pelvis: [-2.4, 36.8],
    hips: { yaw: -30, pitch: 3 },
    torso: { yaw: -30, pitch: 2, roll: 2 },
    head: { yaw: 28, pitch: -4 },
    footF: [7, 4.8, 4.2],
    footN: [-9, -4.6, 4.2],
    handN: [-5, -10, 47],
    sword: [96, 6],
    handF: [11, 3, 51],
    shield: [26, 4],
  });
  const lunge = ready({
    pelvis: [6, 34.4],
    hips: { yaw: 6, pitch: 12 },
    torso: { yaw: 20, pitch: 14, roll: -2 },
    head: { yaw: 2, pitch: 2 },
    footF: [19, 4.8, 4.2],
    footN: [-8, -4.6, 5.2],
    toeN: -24,
    handN: [27, -8, 46],
    sword: [93, 2],
    handF: [1, 5, 45],
    shield: [18, -6],
  });
  const reach = pose(lunge, { pelvis: [7.4, 33.4], torso: { yaw: 24, pitch: 16 }, handN: [30.5, -7.5, 45.5],
    sword: [92, 0], footN: [-7, -4.6, 5.6], toeN: -30 });
  return [
    blend(READY, drawn, 0.6),
    drawn,
    lunge,
    reach,
    pose(reach, { pelvis: [7, 33.8], handN: [29.5, -7.5, 45.5] }),
    blend(reach, pose(READY, { pelvis: [3, 37], footF: [14, 4.8, 4.2] }), 0.5),
    pose(READY, { pelvis: [2, 37.4], footF: [12, 4.8, 4.2] }),
    pose(READY, { footF: [9.5, 4.8, 4.2] }),
  ];
}

/** Heavy: an overhead cleave with a step, the whole body behind it. Active on frames 4-5. */
function heavy() {
  const lift = ready({
    pelvis: [-1.6, 38.6],
    hips: { yaw: -24, pitch: -2 },
    torso: { yaw: -18, pitch: -8, roll: 3 },
    head: { yaw: 22, pitch: -8 },
    handN: [-3, -8, 66],
    sword: [236, 12],
    handF: [10, 3, 53],
    shield: [26, 8],
  });
  const coil = pose(lift, {
    pelvis: [-2.6, 38.2],
    torso: { yaw: -24, pitch: -12, roll: 4 },
    footF: [9, 4.8, 6.5],
    toeF: 16,
    handN: [-7, -7.5, 67],
    sword: [262, 10],
  });
  const over = ready({
    pelvis: [2, 38.4],
    hips: { yaw: -6, pitch: 4 },
    torso: { yaw: 0, pitch: 2, roll: 0 },
    head: { yaw: 12, pitch: -6 },
    footF: [14, 4.8, 6.2],
    toeF: 12,
    handN: [9, -8, 70],
    sword: [176, 6],
    handF: [8, 4, 50],
    shield: [26, 4],
  });
  const strike = ready({
    pelvis: [6, 34.6],
    hips: { yaw: 8, pitch: 14 },
    torso: { yaw: 14, pitch: 22, roll: -2 },
    head: { yaw: 4, pitch: 8 },
    footF: [16, 4.8, 4.2],
    footN: [-8, -4.6, 4.6],
    toeN: -14,
    handN: [22, -8, 45],
    sword: [84, 0],
    handF: [2, 5, 44],
    shield: [20, -8],
  });
  const ground = pose(strike, {
    pelvis: [6.6, 31],
    hips: { pitch: 18 },
    torso: { yaw: 18, pitch: 30 },
    head: { pitch: 14 },
    handN: [21, -6, 26],
    sword: [36, -6],
    footN: [-8, -4.6, 5.2],
    toeN: -26,
  });
  return [
    blend(READY, lift, 0.55),
    lift,
    coil,
    over,
    strike,
    ground,
    pose(ground, { pelvis: [6.4, 31.6], handN: [21, -6, 27], sword: [40, -6] }),
    blend(ground, pose(READY, { pelvis: [3, 36.5], footF: [14, 4.8, 4.2] }), 0.55),
    pose(READY, { pelvis: [1.5, 37.4], footF: [11, 4.8, 4.2] }),
  ];
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
const BLOCK = [GUARD, nudge(GUARD, { pelvis: [0, -0.3], handF: [0, 0, -0.3], torso: { pitch: 0.6 } })];
const BLOCK_HIT = [
  pose(GUARD, { pelvis: [-3.2, 36], hips: { pitch: 4 }, torso: { yaw: 6, pitch: 2 }, head: { pitch: -6 },
    handF: [8.5, 3, 53.5], shield: [26, 16], handN: [-2, -10.5, 47], sword: [140, 22], footN: [-9, -4.6, 4.2] }),
  pose(GUARD, { pelvis: [-1.8, 36.2], torso: { yaw: 8, pitch: 6 }, handF: [10.5, 3, 53], shield: [25, 10] }),
];

/** Parry: the shield beats the blow aside, then the sabre is ready to punish. */
const PARRY = [
  pose(GUARD, { pelvis: [0.6, 36.4], torso: { yaw: 14, pitch: 12 }, handF: [15, 1, 54], shield: [16, 14] }),
  pose(GUARD, { pelvis: [1.6, 36.6], torso: { yaw: 18, pitch: 10, roll: 3 }, head: { yaw: 2 }, handF: [16.5, -2, 58],
    shield: [48, 36] }),
  pose(GUARD, { pelvis: [1.2, 36.8], torso: { yaw: 6, pitch: 6, roll: 2 }, handF: [12, 0, 59], shield: [62, 46],
    handN: [3, -10.5, 47], sword: [120, 22] }),
  pose(GUARD, { pelvis: [0.6, 37], torso: { yaw: 0, pitch: 6 }, handF: [10, 2, 54], shield: [44, 22], handN: [6, -10, 45],
    sword: [116, 20] }),
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

const HURT = [
  ready({ pelvis: [-3.4, 37.4], hips: { yaw: -22, pitch: -6 }, torso: { yaw: -14, pitch: -16, roll: 5 },
    head: { yaw: 22, pitch: -22, roll: 6 }, footF: [7, 4.8, 4.8], toeF: 14, handN: [3, -12, 47], sword: [150, 30],
    handF: [3, 5, 53], shield: [44, 18] }),
  ready({ pelvis: [-4.4, 36.6], hips: { yaw: -24, pitch: -8 }, torso: { yaw: -16, pitch: -20, roll: 6 },
    head: { yaw: 24, pitch: -26, roll: 8 }, footN: [-10, -4.6, 4.2], footF: [6, 4.8, 4.2], handN: [0, -12, 46],
    sword: [162, 32], handF: [1, 5, 52], shield: [48, 22] }),
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
    footF: [-12, 4.8, 3.2],
    toeN: -78,
    toeF: -78,
    kneeN: [1, -0.15, -0.2],
    kneeF: [1, 0.15, -0.2],
    ...extra,
  });
  return [
    ready({ pelvis: [-3, 37.4], hips: { yaw: -22, pitch: -6 }, torso: { yaw: -14, pitch: -18, roll: 5 },
      head: { yaw: 22, pitch: -26 }, handN: [2, -12, 47], sword: [150, 30], handF: [3, 5, 53], shield: [44, 18] }),
    ready({ pelvis: [-4, 32], hips: { yaw: -20, pitch: 4 }, torso: { yaw: -8, pitch: -4 }, head: { yaw: 16, pitch: -10 },
      footN: [-11, -4.6, 4.2], footF: [5, 4.8, 4.2], handN: [4, -12, 38], sword: [120, 30], handF: [4, 5, 44], shield: [50, 0] }),
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

const BODY = [96, 128];
const WIDE = [160, 128];

export const ANIMATIONS = {
  idle: { size: BODY, fps: 8, loop: true, poses: idle() },
  walk: { size: BODY, fps: 10, loop: true, poses: walk(), motion: [62, 0, 0] },
  run: { size: BODY, fps: 14, loop: true, poses: run(), motion: [150, 0, 0] },
  jump: { size: BODY, fps: 10, loop: false, poses: JUMP, motion: [60, 0, 280] },
  apex: { size: BODY, fps: 8, loop: false, poses: APEX, motion: [60, 0, 20] },
  fall: { size: BODY, fps: 8, loop: true, poses: FALL, motion: [50, 0, -130] },
  land: { size: BODY, fps: 14, loop: false, poses: LAND, motion: [0, 0, -80] },
  attack_1: { size: WIDE, fps: 20, loop: false, poses: attack1(), smear: [2, 3],
    durations: [1, 1.6, 0.8, 1, 1.6, 1.4, 1.2], motion: [40, 0, 0] },
  attack_2: { size: WIDE, fps: 20, loop: false, poses: attack2(), smear: [2, 3],
    durations: [1, 1.4, 0.8, 1, 1.6, 1.4, 1.2], motion: [40, 0, 0] },
  attack_3: { size: WIDE, fps: 20, loop: false, poses: attack3(), smear: [2, 3], smearMin: 0.15,
    durations: [1, 1.8, 0.8, 1, 1.6, 1.4, 1.2, 1.2], motion: [110, 0, 0] },
  heavy: { size: WIDE, fps: 18, loop: false, poses: heavy(), smear: [3, 4, 5],
    durations: [1, 1.4, 1.8, 0.8, 0.8, 1.2, 1.6, 1.4, 1.4], motion: [60, 0, 0] },
  block_start: { size: WIDE, fps: 20, loop: false, poses: BLOCK_START },
  block: { size: WIDE, fps: 3, loop: true, poses: BLOCK },
  block_hit: { size: WIDE, fps: 14, loop: false, poses: BLOCK_HIT, motion: [-60, 0, 0] },
  parry: { size: WIDE, fps: 16, loop: false, poses: PARRY, durations: [0.8, 1, 1.4, 1.2, 1, 1] },
  roll: { size: WIDE, fps: 18, loop: false, poses: ROLL, motion: [200, 0, 0] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: HURT, durations: [1, 1.2, 1, 1], motion: [-70, 0, 0] },
  death: { size: WIDE, fps: 9, loop: false, poses: death(), durations: [1, 1, 1.4, 1.2, 1.2, 0.8, 0.8, 1, 2],
    wind: [-14, 0, -6], limp: 0.9 },
  interact: { size: BODY, fps: 8, loop: false, poses: INTERACT, durations: [1, 1, 1.6, 1] },
  heal: { size: BODY, fps: 8, loop: false, poses: HEAL, durations: [1, 1, 1.4, 1.4, 1, 1] },
};

export { smooth };
