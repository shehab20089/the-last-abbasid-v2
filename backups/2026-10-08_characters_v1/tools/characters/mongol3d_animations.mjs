// The soldiers' animations, posed on the 3D skeleton (see yusuf_animations.mjs for the conventions).
// Every attack telegraphs: its warning frame (the attack definition's telegraph_frame) is a held,
// clear wind-up, so a player who watches can always answer. Strikes are fast, recoveries open.
import { blend, breathCycle, nudge, pose, runCycle, walkCycle } from "./pose3d.mjs";

// --- Shared reactions --------------------------------------------------------------------------

/** A blow lands: the head snaps back, the body recoils, the arms fly; then he gathers himself. */
function hurt(ready, { sword = 150, shieldFace = 50 } = {}) {
  return [
    pose(ready, { pelvis: [-3.6, ready.pelvis[1] - 0.4], hips: { yaw: -22, pitch: -8 }, torso: { yaw: -16, pitch: -18, roll: 6 },
      head: { yaw: 22, pitch: -24, roll: 8 }, footF: [7, 4.8, 5], toeF: 16, handN: [1, -12.5, 47], sword: [sword, 30],
      handF: [3, 5, 52], shield: [shieldFace, 20] }),
    pose(ready, { pelvis: [-4.6, ready.pelvis[1] - 1.2], hips: { yaw: -24, pitch: -10 }, torso: { yaw: -18, pitch: -22, roll: 7 },
      head: { yaw: 24, pitch: -28, roll: 9 }, footN: [-10.5, -4.6, 4.2], footF: [6, 4.8, 4.2], handN: [-1, -12.5, 46],
      sword: [sword + 12, 32], handF: [1, 5, 51], shield: [shieldFace + 4, 22] }),
    blend(ready, pose(ready, { pelvis: [-3, ready.pelvis[1] - 0.6], torso: { yaw: -8, pitch: -6 }, head: { pitch: -10 } }), 0.6),
    pose(ready, { pelvis: [-1, ready.pelvis[1]] }),
  ];
}

/** Poise broken: he reels, guard down, and stands dazed and open. */
function stagger(ready, { sword = 60, shieldFace = 70 } = {}) {
  const open = pose(ready, {
    pelvis: [-4.4, 35.4], hips: { yaw: -26, pitch: -4 }, torso: { yaw: -20, pitch: -16, roll: 8 },
    head: { yaw: 26, pitch: -18, roll: 10 }, footN: [-11, -4.6, 4.2], footF: [5, 4.8, 4.2],
    handN: [-4, -13, 40], sword: [sword + 60, 40], handF: [-1, 7, 40], shield: [shieldFace, -20],
  });
  const dazed = pose(ready, {
    pelvis: [-3, 33.6], hips: { yaw: -18, pitch: 16 }, torso: { yaw: -6, pitch: 22, roll: -4 },
    head: { yaw: 10, pitch: 26, roll: -8 }, footN: [-10, -4.6, 4.2], footF: [6, 4.8, 4.2],
    handN: [4, -12, 30], sword: [sword, 40], handF: [5, 6, 32], shield: [shieldFace, -40],
  });
  return [open, dazed, nudge(dazed, { pelvis: [0.4, -0.6], torso: { roll: 4, pitch: 2 }, head: { roll: 8 } }),
    blend(dazed, ready, 0.55)];
}

/** Death: struck, he staggers back, his knees go, and he falls on his back. */
function death(ready, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const onBack = (pitch, z, extra = {}) => pose(ready, {
    pelvis: [-6, z], hips: { yaw: -10, pitch }, torso: { yaw: 0, pitch: 6 }, head: { yaw: 18, pitch: 8 },
    footN: [6, -4.6, 3.2], footF: [10, 4.8, 3.6], toeN: 40, toeF: 30, kneeN: [0.2, -0.3, 1], kneeF: [0.2, 0.3, 1],
    handN: [-18, -13, 6], sword: [210, 60], handF: [-14, 9, 8], shield: [shieldFace + 30, 70], ...arms, ...extra,
  });
  return [
    pose(ready, { pelvis: [-3.6, 37.4], hips: { yaw: -22, pitch: -8 }, torso: { yaw: -14, pitch: -20, roll: 6 },
      head: { yaw: 22, pitch: -28 }, handN: [1, -12.5, 47], sword: [sword, 30], handF: [3, 5, 52], shield: [shieldFace, 20] }),
    pose(ready, { pelvis: [-6, 33], hips: { yaw: -20, pitch: -6 }, torso: { yaw: -10, pitch: -14 }, head: { yaw: 18, pitch: -16 },
      footN: [-12, -4.6, 4.2], footF: [3, 4.8, 4.2], handN: [-2, -13, 42], sword: [sword + 20, 34], handF: [0, 6, 46],
      shield: [shieldFace + 10, 10] }),
    pose(ready, { pelvis: [-7, 25], hips: { yaw: -16, pitch: -18 }, torso: { yaw: -6, pitch: -6 }, head: { yaw: 18, pitch: -6 },
      footN: [-9, -4.6, 4.2], footF: [2, 4.8, 4.2], kneeN: [1, -0.2, 0.4], kneeF: [1, 0.2, 0.4], handN: [-6, -13, 32],
      sword: [sword + 40, 40], handF: [-4, 7, 36], shield: [shieldFace + 20, 30] }),
    onBack(-50, 17, { footN: [0, -4.6, 4.2], footF: [5, 4.8, 4.2], toeN: 0, toeF: 0, kneeN: [1, -0.2, 0.6], kneeF: [1, 0.2, 0.6],
      handN: [-14, -13, 20], handF: [-10, 8, 24] }),
    onBack(-76, 9.5, { handN: [-18, -13, 10], handF: [-14, 9, 13] }),
    onBack(-90, 6.2),
    onBack(-86, 7.2, { head: { yaw: 18, pitch: 2 } }),
    onBack(-90, 6.0, { head: { yaw: 22, pitch: 10, roll: -10 } }),
    onBack(-90, 6.0, { head: { yaw: 24, pitch: 12, roll: -12 } }),
  ];
}

const BODY = [112, 128];
const WIDE = [176, 128];
const LONG = [208, 128];

// --- The swordsman ----------------------------------------------------------------------------

/** Sabre raised by the shoulder, shield forward: an aggressive guard. */
const SWORD_READY = {
  pelvis: [0.2, 37.9],
  hips: { yaw: -16, pitch: 3, roll: 0 },
  torso: { yaw: 0, pitch: 5, roll: 0 },
  head: { yaw: 14, pitch: -4, roll: 0 },
  footN: [-8, -4.6, 4.2],
  footF: [8, 4.8, 4.2],
  toeN: 0,
  toeF: 0,
  footYawN: -34,
  footYawF: -4,
  handN: [5, -10.5, 47],
  handF: [8, 2.5, 47],
  sword: [142, 20],
  shield: [34, 4],
};
const sr = (o) => pose(SWORD_READY, o);

/** The quick cut: a forehand slash from behind the shoulder. Telegraph 1, active 2-3. */
function swordCut() {
  const back = sr({ pelvis: [-2, 37.2], hips: { yaw: -28, pitch: 2 }, torso: { yaw: -26, pitch: -2, roll: 4 },
    head: { yaw: 26, pitch: -4 }, handN: [-5, -8.5, 62], sword: [232, 14], handF: [11, 3, 49], shield: [26, 2] });
  const through = sr({ pelvis: [4.4, 35.2], hips: { yaw: 12, pitch: 12 }, torso: { yaw: 28, pitch: 18, roll: -3 },
    head: { yaw: 2, pitch: 6 }, footF: [12, 4.8, 4.2], handN: [12, -3, 33], sword: [24, -10], handF: [1, 5, 44], shield: [20, -8] });
  return [
    blend(SWORD_READY, back, 0.6),
    back,
    sr({ pelvis: [3.6, 36.2], hips: { yaw: 4, pitch: 9 }, torso: { yaw: 14, pitch: 12, roll: -2 }, head: { yaw: 8 },
      footF: [11.5, 4.8, 4.2], handN: [18, -9, 47], sword: [94, 4], handF: [5, 4, 46], shield: [26, -4] }),
    through,
    blend(through, SWORD_READY, 0.45),
    SWORD_READY,
  ];
}

/** The rising slash: low behind, a step, and the blade climbs to overhead. Telegraph 1, active 3-5. */
function swordRising() {
  const low = sr({ pelvis: [-1.6, 35.2], hips: { yaw: 14, pitch: 12 }, torso: { yaw: 28, pitch: 14, roll: -2 },
    head: { yaw: 0, pitch: 4 }, handN: [-6, -5, 35], sword: [-55, -14], handF: [6, 4, 46], shield: [24, -6] });
  const high = sr({ pelvis: [4.6, 38.8], hips: { yaw: -12, pitch: 0 }, torso: { yaw: -22, pitch: -6, roll: 4 },
    head: { yaw: 24, pitch: -12 }, footF: [13, 4.8, 4.2], footN: [-6, -4.6, 5], toeN: -18, handN: [11, -9, 64],
    sword: [190, 14], handF: [9, 3, 50], shield: [34, 8] });
  return [
    blend(SWORD_READY, low, 0.6),
    low,
    sr({ pelvis: [2.6, 35.8], hips: { yaw: 8, pitch: 10 }, torso: { yaw: 18, pitch: 12 }, footF: [12.5, 4.8, 4.2],
      handN: [5, -6, 37], sword: [8, -10], handF: [6, 4, 46], shield: [24, -6] }),
    sr({ pelvis: [4.2, 37.6], hips: { yaw: -4, pitch: 4 }, torso: { yaw: -8, pitch: 2, roll: 2 }, head: { yaw: 18, pitch: -6 },
      footF: [13, 4.8, 4.2], handN: [17, -10, 50], sword: [116, 16], handF: [8, 3, 50], shield: [32, 6] }),
    high,
    pose(high, { handN: [10, -9, 63], sword: [200, 12] }),
    blend(high, SWORD_READY, 0.5),
    SWORD_READY,
  ];
}

const SWORD_GUARD = sr({ pelvis: [-0.6, 36.4], hips: { yaw: -10, pitch: 8 }, torso: { yaw: 10, pitch: 10 }, head: { yaw: 6 },
  handF: [12, 3, 52.5], shield: [24, 6], handN: [1, -10.5, 48], sword: [140, 22] });

function swordAlert() {
  return [
    sr({ pelvis: [-1, 38.8], torso: { pitch: -4 }, head: { yaw: 20, pitch: -10 }, handN: [2, -11, 44], sword: [120, 20] }),
    sr({ pelvis: [0.6, 37.4], torso: { yaw: 8, pitch: 6 }, head: { yaw: 10, pitch: -14 }, handN: [16, -10, 54], sword: [102, 6],
      handF: [6, 3, 46] }),
    SWORD_READY,
  ];
}

export const SWORDSMAN = {
  idle: { size: BODY, fps: 7, loop: true, poses: breathCycle(SWORD_READY, 8, (i, breath) => ({ sword: [breath * 3, 0] })) },
  walk: { size: BODY, fps: 10, loop: true, motion: [46, 0, 0], poses: walkCycle(SWORD_READY, (i, swing, bob) => ({
    handN: [5 - swing * 2, -10.5, 47 + bob], handF: [8 + swing * 2.5, 2.5, 47 + bob], sword: [142 - swing * 4, 20],
    shield: [34 + swing * 3, 4] })) },
  run: { size: BODY, fps: 13, loop: true, motion: [104, 0, 0], poses: runCycle(SWORD_READY, (i, swing, lift) => ({
    handF: [7 + swing * 3, 3.5, 47 + swing + lift * 0.5], shield: [32 + swing * 4, 6],
    handN: [-1 - swing * 6, -10, 40 - Math.abs(swing) * 1.5], sword: [242 - swing * 8, 18] })) },
  alert: { size: BODY, fps: 8, loop: false, poses: swordAlert(), durations: [1, 2, 1] },
  attack: { size: WIDE, fps: 12, loop: false, poses: swordRising(), smear: [3, 4],
    durations: [1.2, 2.2, 0.8, 0.8, 1, 1, 1.4, 1.2], motion: [60, 0, 0] },
  cut: { size: WIDE, fps: 14, loop: false, poses: swordCut(), smear: [2, 3], durations: [1.4, 1.8, 0.8, 1, 1.4, 1.2],
    motion: [40, 0, 0] },
  block: { size: WIDE, fps: 3, loop: true, poses: [SWORD_GUARD, nudge(SWORD_GUARD, { pelvis: [0, -0.3], torso: { pitch: 0.6 } })] },
  block_hit: { size: WIDE, fps: 12, loop: false, motion: [-60, 0, 0], poses: [
    pose(SWORD_GUARD, { pelvis: [-3.2, 36], torso: { yaw: 6, pitch: 2 }, head: { pitch: -6 }, handF: [8.5, 3, 53.5],
      shield: [26, 16], handN: [-2, -10.5, 48] }),
    SWORD_GUARD] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(SWORD_READY), durations: [1, 1.2, 1, 1], motion: [-80, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(SWORD_READY), durations: [0.8, 1.6, 1.6, 1], motion: [-40, 0, 0] },
  death: { size: WIDE, fps: 10, loop: false, poses: death(SWORD_READY), durations: [1, 1, 1, 1, 0.8, 0.8, 1, 1.2, 2],
    motion: [-50, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
};

// --- The spearman -----------------------------------------------------------------------------

/** The spear levelled low over the shield, its point at the enemy's chest. */
const SPEAR_READY = {
  ...SWORD_READY,
  handN: [2, -10, 44],
  sword: [100, 8],
  handF: [9, 3, 47],
  shield: [30, 4],
};
const spr = (o) => pose(SPEAR_READY, o);

/** The thrust: drawn back, a coiled pause, then the whole body drives the point. Telegraph 1, active 3-4. */
function spearThrust() {
  const coil = spr({ pelvis: [-2.6, 36.6], hips: { yaw: -30, pitch: 3 }, torso: { yaw: -28, pitch: 2, roll: 2 },
    head: { yaw: 28, pitch: -4 }, footF: [7, 4.8, 4.2], handN: [-9, -10, 47], sword: [94, 4], handF: [11, 3, 50], shield: [26, 4] });
  const lunge = spr({ pelvis: [6, 34.4], hips: { yaw: 6, pitch: 12 }, torso: { yaw: 20, pitch: 12, roll: -2 }, head: { yaw: 2 },
    footF: [18, 4.8, 4.2], footN: [-8, -4.6, 5.2], toeN: -24, handN: [23, -9, 45.5], sword: [92, 1], handF: [1, 5, 45],
    shield: [18, -6] });
  return [
    blend(SPEAR_READY, coil, 0.6),
    coil,
    pose(coil, { pelvis: [-1.6, 36.2], footF: [9, 4.8, 4.2], handN: [-6, -10, 46.5] }),
    lunge,
    pose(lunge, { pelvis: [6.8, 34], handN: [25, -9, 45.4] }),
    blend(lunge, pose(SPEAR_READY, { pelvis: [2, 36.8], footF: [12, 4.8, 4.2] }), 0.55),
    SPEAR_READY,
  ];
}

/** The sweep: the shaft swung low at the legs. Telegraph 1, active 2-3. */
function spearSweep() {
  const wind = spr({ pelvis: [-1.6, 34.6], hips: { yaw: -26, pitch: 10 }, torso: { yaw: -30, pitch: 14, roll: 3 },
    head: { yaw: 26, pitch: 2 }, handN: [-8, -10, 40], sword: [-58, 10], handF: [10, 3, 48], shield: [28, 4] });
  return [
    blend(SPEAR_READY, wind, 0.6),
    wind,
    spr({ pelvis: [3, 33.4], hips: { yaw: 6, pitch: 16 }, torso: { yaw: 14, pitch: 20 }, head: { yaw: 6, pitch: 10 },
      footF: [12, 4.8, 4.2], handN: [12, -9, 36], sword: [62, -6], handF: [3, 5, 44], shield: [22, -6] }),
    spr({ pelvis: [3.6, 33.6], hips: { yaw: 14, pitch: 16 }, torso: { yaw: 28, pitch: 20, roll: -3 }, head: { yaw: 2, pitch: 10 },
      footF: [12, 4.8, 4.2], handN: [11, -4, 34], sword: [34, -20], handF: [1, 5, 44], shield: [20, -8] }),
    blend(spr({ pelvis: [3.6, 33.6], hips: { yaw: 14, pitch: 16 }, torso: { yaw: 28, pitch: 20 }, footF: [12, 4.8, 4.2],
      handN: [11, -4, 34], sword: [34, -20] }), SPEAR_READY, 0.5),
    SPEAR_READY,
  ];
}

function spearAlert() {
  return [
    spr({ pelvis: [-1, 38.8], torso: { pitch: -4 }, head: { yaw: 20, pitch: -10 }, handN: [0, -11, 46], sword: [128, 10] }),
    spr({ pelvis: [0.6, 37.4], torso: { yaw: 6, pitch: 6 }, head: { yaw: 10, pitch: -12 }, handN: [8, -10, 48], sword: [96, 4] }),
    SPEAR_READY,
  ];
}

export const SPEARMAN = {
  idle: { size: LONG, fps: 7, loop: true, poses: breathCycle(SPEAR_READY, 8, (i, breath) => ({ sword: [breath * 2, 0] })) },
  walk: { size: LONG, fps: 10, loop: true, motion: [42, 0, 0], poses: walkCycle(SPEAR_READY, (i, swing, bob) => ({
    handN: [2 - swing * 1.5, -10, 44 + bob], handF: [9 + swing * 2.5, 3, 47 + bob], sword: [100 - swing * 3, 8],
    shield: [30 + swing * 3, 4] })) },
  run: { size: LONG, fps: 13, loop: true, motion: [96, 0, 0], poses: runCycle(SPEAR_READY, (i, swing, lift) => ({
    handF: [7 + swing * 3, 3.5, 47 + swing + lift * 0.5], shield: [32 + swing * 4, 6],
    handN: [1 - swing * 4, -10, 43 - Math.abs(swing)], sword: [104 - swing * 5, 10] })) },
  alert: { size: LONG, fps: 8, loop: false, poses: spearAlert(), durations: [1, 2, 1] },
  thrust: { size: LONG, fps: 12, loop: false, poses: spearThrust(), smear: [3], smearMin: 0.1,
    durations: [1.2, 2.2, 0.8, 0.8, 1.4, 1.2, 1.2], motion: [80, 0, 0] },
  sweep: { size: LONG, fps: 12, loop: false, poses: spearSweep(), smear: [2, 3], durations: [1.2, 2, 0.8, 1, 1.2, 1.2] },
  hurt: { size: LONG, fps: 12, loop: false, poses: hurt(SPEAR_READY, { sword: 130 }), durations: [1, 1.2, 1, 1],
    motion: [-80, 0, 0] },
  stagger: { size: LONG, fps: 6, loop: false, poses: stagger(SPEAR_READY, { sword: 40 }), durations: [0.8, 1.6, 1.6, 1],
    motion: [-40, 0, 0] },
  death: { size: LONG, fps: 10, loop: false, poses: death(SPEAR_READY, { sword: 130 }),
    durations: [1, 1, 1, 1, 0.8, 0.8, 1, 1.2, 2], motion: [-50, 0, 0] },
};

// --- The archer -------------------------------------------------------------------------------

/** The bow held low and forward, the drawing hand by the quiver. */
const BOW_READY = {
  ...SWORD_READY,
  hips: { yaw: -12, pitch: 3, roll: 0 },
  torso: { yaw: -2, pitch: 4, roll: 0 },
  handN: [0, -9.5, 41],
  sword: [70, 10],
  handF: [9, 3.5, 42],
  shield: [0, -40],
};
const br = (o) => pose(BOW_READY, o);

/** The shot: an arrow from the quiver, the draw, a held aim, the loose. Telegraph 1, arrow on 4. */
function shoot() {
  const aim = br({ pelvis: [-0.4, 37.6], hips: { yaw: -26, pitch: 1 }, torso: { yaw: -30, pitch: -2, roll: 1 },
    head: { yaw: 30, pitch: -2 }, handF: [18, 2.5, 55], shield: [0, 0], handN: [1, -7, 57.5], sword: [80, 0],
    arrow: true, draw: 1 });
  return [
    br({ hips: { yaw: -16 }, torso: { yaw: -12, pitch: 6 }, head: { yaw: 18 }, handN: [-5, -9.5, 41], sword: [180, 0],
      handF: [12, 3.5, 48], shield: [0, -14] }),
    br({ pelvis: [-0.2, 37.8], hips: { yaw: -22, pitch: 2 }, torso: { yaw: -22, pitch: 0 }, head: { yaw: 26, pitch: -2 },
      handF: [17, 2.5, 54], shield: [0, -2], handN: [11, -7.5, 54], sword: [90, 0], arrow: true, draw: 0.4 }),
    aim,
    nudge(aim, { handN: [-0.6, 0, 0], torso: { yaw: -1 } }),
    pose(aim, { handN: [-4, -8, 59], arrow: false, draw: 0, torso: { yaw: -26 } }),
    pose(aim, { handN: [-3, -9, 55], handF: [16, 2.5, 52], shield: [0, -6], arrow: false, draw: 0 }),
    blend(pose(aim, { arrow: false, draw: 0 }), BOW_READY, 0.6),
  ];
}

function bowAlert() {
  return [
    br({ pelvis: [-1, 38.8], torso: { pitch: -4 }, head: { yaw: 20, pitch: -10 }, handF: [12, 3.5, 48], shield: [0, -14] }),
    br({ pelvis: [0.4, 37.6], torso: { yaw: -6, pitch: 4 }, head: { yaw: 18, pitch: -8 }, handF: [16, 3, 52], shield: [0, -4],
      handN: [-5, -9.5, 41], sword: [180, 0] }),
    BOW_READY,
  ];
}

export const ARCHER = {
  idle: { size: BODY, fps: 7, loop: true, poses: breathCycle(BOW_READY, 8) },
  walk: { size: BODY, fps: 10, loop: true, motion: [52, 0, 0], poses: walkCycle(BOW_READY, (i, swing, bob) => ({
    handN: [-swing * 3, -9.5, 41 + bob], handF: [9 + swing * 3, 3.5, 42 + bob], shield: [0, -40] })) },
  run: { size: BODY, fps: 13, loop: true, motion: [112, 0, 0], poses: runCycle(BOW_READY, (i, swing, lift) => ({
    handF: [8 + swing * 5, 3.5, 44 + swing * 1.5 + lift * 0.5], shield: [0, -30],
    handN: [-1 - swing * 6, -10, 41 - Math.abs(swing) * 1.5], sword: [70, 10] })) },
  alert: { size: BODY, fps: 8, loop: false, poses: bowAlert(), durations: [1, 2, 1] },
  shoot: { size: WIDE, fps: 9, loop: false, poses: shoot(), durations: [1, 1.4, 1.2, 1.6, 0.6, 1.2, 1.2] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(BOW_READY, { sword: 100, shieldFace: 0 }).map((p) => ({ ...p,
    shield: [0, -20] })), durations: [1, 1.2, 1, 1], motion: [-80, 0, 0] },
  death: { size: WIDE, fps: 10, loop: false, poses: death(BOW_READY, { sword: 100, shieldFace: 0,
    arms: { shield: [0, 60] } }), durations: [1, 1, 1, 1, 0.8, 0.8, 1, 1.2, 2], motion: [-50, 0, 0] },
};

// --- The captain ------------------------------------------------------------------------------

/** Heavier, lower, the sabre held back and the great shield forward. */
const CAP_READY = {
  ...SWORD_READY,
  pelvis: [0, 37.4],
  hips: { yaw: -18, pitch: 4, roll: 0 },
  torso: { yaw: -2, pitch: 6, roll: 0 },
  head: { yaw: 16, pitch: -2, roll: 0 },
  footN: [-9, -4.8, 4.2],
  footF: [9, 5, 4.2],
  handN: [3, -11, 45],
  sword: [150, 22],
  handF: [9, 3, 46],
  shield: [32, 2],
};
const cr = (o) => pose(CAP_READY, o);

/** Slash A: a heavy forehand from the shoulder. Telegraph 1, active 2-3. */
function slashA() {
  const back = cr({ pelvis: [-2.4, 36.4], hips: { yaw: -30, pitch: 2 }, torso: { yaw: -28, pitch: -3, roll: 4 },
    head: { yaw: 28, pitch: -4 }, handN: [-6, -8.5, 63], sword: [236, 14], handF: [12, 3, 49], shield: [24, 2] });
  const through = cr({ pelvis: [5, 34.4], hips: { yaw: 12, pitch: 13 }, torso: { yaw: 28, pitch: 19, roll: -3 },
    head: { yaw: 2, pitch: 6 }, footF: [13, 5, 4.2], handN: [12, -3, 32], sword: [22, -10], handF: [1, 5, 43], shield: [18, -8] });
  return [
    blend(CAP_READY, back, 0.6), back,
    cr({ pelvis: [4, 35.6], hips: { yaw: 4, pitch: 9 }, torso: { yaw: 14, pitch: 12 }, head: { yaw: 8 }, footF: [12.5, 5, 4.2],
      handN: [18, -9, 47], sword: [94, 4], handF: [5, 4, 45], shield: [24, -4] }),
    through, blend(through, CAP_READY, 0.45), CAP_READY,
  ];
}

/** Slash B: the backhand answer, rising. Active 2-3 (it follows A in a chain). */
function slashB() {
  const low = cr({ pelvis: [1.4, 34.8], hips: { yaw: 14, pitch: 11 }, torso: { yaw: 26, pitch: 15, roll: -2 },
    handN: [-2, -5, 35], sword: [-36, -14], handF: [3, 4, 44], shield: [22, -6] });
  const high = cr({ pelvis: [4.6, 38], hips: { yaw: -12, pitch: 0 }, torso: { yaw: -22, pitch: -6, roll: 4 },
    head: { yaw: 24, pitch: -12 }, footF: [13, 5, 4.2], handN: [11, -9, 63], sword: [190, 14], handF: [9, 3, 50], shield: [34, 8] });
  return [
    blend(CAP_READY, low, 0.7), low,
    cr({ pelvis: [4, 37], hips: { yaw: -4, pitch: 4 }, torso: { yaw: -10, pitch: 2 }, footF: [13, 5, 4.2], handN: [17, -10, 50],
      sword: [118, 16], handF: [8, 3, 50], shield: [32, 6] }),
    high, blend(high, CAP_READY, 0.5), CAP_READY,
  ];
}

/** Slash C: the cleave that ends the chain, overhead and down with a step. Telegraph 1, active 3-5. */
function slashC() {
  const lift = cr({ pelvis: [-2, 38], hips: { yaw: -24, pitch: -2 }, torso: { yaw: -18, pitch: -10, roll: 3 },
    head: { yaw: 22, pitch: -8 }, handN: [-5, -8, 67], sword: [250, 12], handF: [11, 3, 52], shield: [26, 8] });
  const strike = cr({ pelvis: [6.4, 34], hips: { yaw: 8, pitch: 14 }, torso: { yaw: 14, pitch: 22, roll: -2 },
    head: { yaw: 4, pitch: 8 }, footF: [17, 5, 4.2], footN: [-8, -4.8, 4.6], toeN: -14, handN: [22, -8, 45], sword: [84, 0],
    handF: [2, 5, 44], shield: [20, -8] });
  const ground = pose(strike, { pelvis: [7, 30.6], hips: { pitch: 18 }, torso: { yaw: 18, pitch: 30 }, head: { pitch: 14 },
    handN: [21, -6, 26], sword: [36, -6], footN: [-8, -4.8, 5.2], toeN: -26 });
  return [
    blend(CAP_READY, lift, 0.55), lift, pose(lift, { torso: { yaw: -22, pitch: -12 }, handN: [-6, -7.5, 68], sword: [262, 10] }),
    strike, ground, pose(ground, { pelvis: [6.8, 31.2], handN: [21, -6, 27], sword: [40, -6] }),
    blend(ground, CAP_READY, 0.5), CAP_READY,
  ];
}

/** The falling blow: he leaps and brings the sabre down two-handed weight; nothing stops it.
 * Telegraph 2, active 5-6. */
function smash() {
  const crouch = cr({ pelvis: [-1, 31.6], hips: { yaw: -16, pitch: 14 }, torso: { yaw: -10, pitch: 16 }, head: { pitch: 0 },
    footN: [-9, -4.8, 4.2], footF: [9, 5, 4.2], handN: [-4, -10, 40], sword: [230, 20], handF: [8, 4, 40], shield: [40, -10] });
  const rise = cr({ pelvis: [1, 41], hips: { yaw: -14, pitch: -4 }, torso: { yaw: -16, pitch: -12, roll: 3 },
    head: { yaw: 18, pitch: -10 }, footN: [-6, -4.8, 9], toeN: -40, footF: [8, 5, 11], toeF: -20, handN: [-2, -8, 70],
    sword: [244, 12], handF: [10, 3, 54], shield: [30, 10] });
  const air = pose(rise, { pelvis: [3, 45], footN: [-3, -4.8, 18], footF: [9, 5, 20], toeN: -20, toeF: 0, handN: [0, -8, 74],
    sword: [256, 10], torso: { yaw: -18, pitch: -16 } });
  const down = cr({ pelvis: [7, 38], hips: { yaw: 4, pitch: 10 }, torso: { yaw: 8, pitch: 16 }, head: { yaw: 6, pitch: 4 },
    footN: [-2, -4.8, 10], footF: [14, 5, 8], toeN: -20, handN: [20, -8, 62], sword: [140, 4], handF: [4, 5, 48], shield: [24, -4] });
  const impact = cr({ pelvis: [8, 28], hips: { yaw: 8, pitch: 22 }, torso: { yaw: 16, pitch: 30 }, head: { yaw: 4, pitch: 14 },
    footN: [-6, -4.8, 4.2], footF: [16, 5, 4.2], handN: [24, -7, 24], sword: [28, -4], handF: [2, 5, 38], shield: [20, -14] });
  return [
    blend(CAP_READY, crouch, 0.6), crouch, pose(crouch, { pelvis: [-1.4, 30.8], torso: { pitch: 18 } }),
    rise, air, down, impact, pose(impact, { pelvis: [8, 28.6], handN: [24, -7, 25] }),
    blend(impact, pose(CAP_READY, { pelvis: [5, 36], footF: [14, 5, 4.2] }), 0.5),
    pose(CAP_READY, { pelvis: [3, 37], footF: [12, 5, 4.2] }),
  ];
}

/** The shield charge: lowered behind the great shield, he drives forward. Telegraph 1, active 2-4. */
function bash() {
  const set = cr({ pelvis: [-2.6, 34.4], hips: { yaw: -6, pitch: 14 }, torso: { yaw: 12, pitch: 16 }, head: { yaw: 4, pitch: 6 },
    footN: [-11, -4.8, 4.2], footF: [7, 5, 4.2], handF: [11, 3, 48], shield: [14, 4], handN: [-4, -11, 44], sword: [210, 26] });
  const drive = cr({ pelvis: [5, 34.8], hips: { yaw: -4, pitch: 18 }, torso: { yaw: 14, pitch: 20 }, head: { yaw: 4, pitch: 8 },
    footN: [-10, -4.8, 6], toeN: -40, footF: [14, 5, 4.2], handF: [20, 2, 50], shield: [10, 4], handN: [0, -11, 44], sword: [206, 26] });
  return [
    blend(CAP_READY, set, 0.6), set, drive,
    pose(drive, { pelvis: [5.6, 35.4], footN: [-4, -4.8, 9], toeN: -30, footF: [14, 5, 4.2] }),
    pose(drive, { pelvis: [5, 34.6], footN: [-9, -4.8, 5], footF: [15, 5, 4.2] }),
    blend(drive, CAP_READY, 0.4), blend(drive, CAP_READY, 0.75), CAP_READY,
  ];
}

/** The roar: chest out, sabre and shield flung wide. */
function roar() {
  const wide = cr({ pelvis: [-1, 37.6], hips: { yaw: -26, pitch: -4 }, torso: { yaw: -20, pitch: -14 }, head: { yaw: 20, pitch: -24 },
    footN: [-10, -4.8, 4.2], footF: [10, 5, 4.2], handN: [-10, -15, 54], sword: [230, 50], handF: [6, 12, 54], shield: [70, 20] });
  return [
    blend(CAP_READY, wide, 0.35), blend(CAP_READY, wide, 0.75), wide, nudge(wide, { torso: { pitch: -2 }, head: { pitch: -3 } }),
    wide, nudge(wide, { torso: { pitch: -2 }, head: { pitch: -3 } }), blend(wide, CAP_READY, 0.5), CAP_READY,
  ];
}

const CAP_GUARD = cr({ pelvis: [-0.8, 35.8], hips: { yaw: -10, pitch: 8 }, torso: { yaw: 10, pitch: 10 }, head: { yaw: 6 },
  handF: [12, 3, 52], shield: [24, 6], handN: [0, -11, 47], sword: [146, 24] });

export const CAPTAIN = {
  idle: { size: BODY, fps: 6, loop: true, poses: breathCycle(CAP_READY, 8, (i, breath) => ({ sword: [breath * 2, 0] })) },
  walk: { size: BODY, fps: 9, loop: true, motion: [44, 0, 0], poses: walkCycle(CAP_READY, (i, swing, bob) => ({
    handN: [3 - swing * 2, -11, 45 + bob], handF: [9 + swing * 2.5, 3, 46 + bob], sword: [150 - swing * 4, 22],
    shield: [32 + swing * 3, 2] })) },
  run: { size: BODY, fps: 12, loop: true, motion: [120, 0, 0], poses: runCycle(CAP_READY, (i, swing, lift) => ({
    handF: [8 + swing * 3, 3.5, 47 + swing + lift * 0.5], shield: [30 + swing * 4, 4],
    handN: [-2 - swing * 6, -11, 40 - Math.abs(swing) * 1.5], sword: [242 - swing * 8, 20] })) },
  roar: { size: WIDE, fps: 8, loop: false, poses: roar(), durations: [1, 1, 1.6, 1.2, 1.6, 1, 1, 1] },
  slash_a: { size: WIDE, fps: 13, loop: false, poses: slashA(), smear: [2, 3], durations: [1.2, 1.8, 0.8, 1, 1.2, 1],
    motion: [60, 0, 0] },
  slash_b: { size: WIDE, fps: 13, loop: false, poses: slashB(), smear: [2, 3], durations: [1, 1.4, 0.8, 1, 1.2, 1],
    motion: [50, 0, 0] },
  slash_c: { size: WIDE, fps: 12, loop: false, poses: slashC(), smear: [3, 4, 5],
    durations: [1.2, 1.6, 1.8, 0.8, 0.9, 1.2, 1.6, 1.2], motion: [80, 0, 0] },
  smash: { size: WIDE, fps: 12, loop: false, poses: smash(), smear: [5, 6],
    durations: [1.2, 1.8, 2.4, 1, 1.2, 0.7, 1.2, 2.4, 1.8, 1.2], motion: [60, 0, 0] },
  bash: { size: WIDE, fps: 12, loop: false, poses: bash(), durations: [1.4, 3, 0.8, 0.8, 1, 1.8, 1.4, 1], motion: [300, 0, 0] },
  block: { size: WIDE, fps: 3, loop: true, poses: [CAP_GUARD, nudge(CAP_GUARD, { pelvis: [0, -0.3], torso: { pitch: 0.6 } })] },
  block_hit: { size: WIDE, fps: 12, loop: false, motion: [-50, 0, 0], poses: [
    pose(CAP_GUARD, { pelvis: [-3, 35.4], torso: { yaw: 6, pitch: 3 }, head: { pitch: -6 }, handF: [9, 3, 53], shield: [26, 14] }),
    CAP_GUARD] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(CAP_READY), durations: [1, 1.2, 1, 1], motion: [-60, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(CAP_READY), durations: [0.8, 1.8, 1.8, 1], motion: [-30, 0, 0] },
  death: { size: WIDE, fps: 8, loop: false, poses: death(CAP_READY), durations: [1, 1.2, 1.2, 1, 1, 0.8, 1, 1.4, 2.4],
    motion: [-40, 0, 0] },
};
