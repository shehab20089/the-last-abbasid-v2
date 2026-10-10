// The soldiers' animations, posed on the 3D skeleton (see yusuf_animations.mjs for the conventions).
// Every attack telegraphs: its warning frame (the attack definition's telegraph_frame) is a held,
// clear wind-up, so a player who watches can always answer. Strikes are fast, recoveries open.
import { blend, breathCycle, nudge, pose, runCycle, walkCycle } from "./pose3d.mjs";
import { toParent } from "../lib/space.mjs";
import { FINISHERS } from "./finisher_timing.mjs";

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
  ].flatMap((p, i, all) => (i === 1 ? [p, blend(p, ready, 0.35), blend(p, ready, 0.7)] : [p]))
    .concat([pose(ready, { pelvis: [-1, ready.pelvis[1]] })]);
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
  // From thrown back to slumped over through a frame between, the head lagging behind the body.
  const slumping = pose(blend(open, dazed, 0.5), { head: { yaw: 18, pitch: -2, roll: 2 } });
  return [open, slumping, dazed, nudge(dazed, { pelvis: [0.4, -0.6], torso: { roll: 4, pitch: 2 }, head: { roll: 8 } }),
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
    onBack(-34, 21, { footN: [-3, -4.6, 4.2], footF: [3, 4.8, 4.2], toeN: 0, toeF: 0, kneeN: [1, -0.2, 0.5], kneeF: [1, 0.2, 0.5],
      handN: [-11, -13, 26], handF: [-8, 8, 30] }),
    onBack(-50, 17, { footN: [0, -4.6, 4.2], footF: [5, 4.8, 4.2], toeN: 0, toeF: 0, kneeN: [1, -0.2, 0.6], kneeF: [1, 0.2, 0.6],
      handN: [-14, -13, 20], handF: [-10, 8, 24] }),
    onBack(-64, 13, { footN: [3, -4.6, 3.8], footF: [7.5, 4.8, 4.0], toeN: 20, toeF: 15, handN: [-16, -13, 15], handF: [-12, 9, 18] }),
    onBack(-76, 9.5, { handN: [-18, -13, 10], handF: [-14, 9, 13] }),
    onBack(-85, 7.4, { handN: [-18, -13, 8], handF: [-14, 9, 10] }),
    onBack(-90, 6.2),
    onBack(-86, 7.2, { head: { yaw: 18, pitch: 2 } }),
    onBack(-90, 6.0, { head: { yaw: 22, pitch: 10, roll: -10 } }),
    onBack(-90, 6.0, { head: { yaw: 24, pitch: 12, roll: -12 } }),
  ];
}

// --- Weight: a second flinch, reeling, thrown open, thrown down, getting up ----------------------

/** On his back on the street, legs out, arms flung wide (the fall's last pose). */
function supine(ready, { shieldFace = 50, arms = {} } = {}, pitch = -90, z = 6.2, extra = {}) {
  return pose(ready, {
    pelvis: [-6, z], hips: { yaw: -10, pitch }, torso: { yaw: 0, pitch: 6 }, head: { yaw: 18, pitch: 8 },
    footN: [6, -4.6, 3.2], footF: [10, 4.8, 3.6], toeN: 40, toeF: 30, kneeN: [0.2, -0.3, 1], kneeF: [0.2, 0.3, 1],
    handN: [-18, -13, 6], sword: [210, 60], handF: [-14, 9, 8], shield: [shieldFace + 30, 70], ground: true, ...arms, ...extra,
  });
}

/** A second flinch, so a string of blows does not repeat one pose: struck in the body, he doubles over it. */
function hurtLow(ready, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const z = ready.pelvis[1];
  const struck = pose(ready, { pelvis: [-2.4, z - 1.6], hips: { yaw: -10, pitch: 12 }, torso: { yaw: 12, pitch: 18, roll: -8 },
    head: { yaw: -4, pitch: 24, roll: -10 }, footN: [-9.5, -4.6, 4.2], footF: [5, 4.8, 6.4], toeF: 14,
    handN: [9, -12, 36], sword: [sword - 50, 26], handF: [8, 7, 38], shield: [shieldFace + 24, -30], ...arms });
  const doubled = pose(struck, { pelvis: [-3.2, z - 2.6], torso: { yaw: 14, pitch: 24, roll: -6 }, head: { pitch: 28 },
    footF: [5, 4.8, 4.2], toeF: 0, handN: [9, -12, 33] });
  return [struck, doubled, blend(doubled, ready, 0.4), blend(doubled, ready, 0.75), pose(ready, { pelvis: [-1, z] })];
}

/** A great blow that does not floor him: thrown back, he reels two steps to keep his feet. */
function reelBack(ready, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const z = ready.pelvis[1];
  const thrown = pose(ready, { pelvis: [-3, z + 0.3], hips: { yaw: -26, pitch: -12 }, torso: { yaw: -18, pitch: -24, roll: 8 },
    head: { yaw: 24, pitch: -30, roll: 10 }, footN: [-9, -4.6, 4.2], footF: [8, 4.8, LIFT], toeF: 22,
    handN: [-4, -13, 50], sword: [sword + 24, 34], handF: [0, 7, 54], shield: [shieldFace + 10, 30], ...arms });
  const back1 = pose(thrown, { pelvis: [-4, z - 0.8], torso: { pitch: -16, roll: 6 }, head: { pitch: -18 },
    footF: [-1, 4.8, 4.2], toeF: 0, footN: [-12, -4.6, LIFT], toeN: -16 });
  const back2 = pose(back1, { pelvis: [-4.4, z - 1.8], torso: { pitch: -6, roll: 3 }, head: { pitch: -6 },
    footN: [-13, -4.6, 4.2], toeN: 0 });
  return [thrown, back1, back2, blend(back2, ready, 0.5), pose(ready, { pelvis: [-1, z] })];
}

/** Parried: his blade beaten up and away, he is thrown open, off balance, and stands so a moment. */
function thrownOpen(ready, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const z = ready.pelvis[1];
  const flung = pose(ready, { pelvis: [-3, z + 0.2], hips: { yaw: -24, pitch: -10 }, torso: { yaw: -26, pitch: -20, roll: 10 },
    head: { yaw: 26, pitch: -20, roll: 8 }, footN: [-11, -4.6, 4.2], footF: [7, 4.8, 5.6], toeF: 18,
    handN: [-8, -12, 64], sword: [sword + 70, 20], handF: [6, 7, 46], shield: [shieldFace + 30, 10], ...arms });
  const wobble = nudge(flung, { pelvis: [-0.6, -0.8], torso: { pitch: 3, roll: -3 }, head: { pitch: 4 }, handN: [1, 0, -2],
    sword: [-6, 0] });
  return [flung, wobble, nudge(wobble, { torso: { roll: 3 }, head: { roll: 4 }, handN: [0.6, 0, 1] }), blend(wobble, ready, 0.3),
    blend(wobble, ready, 0.65)];
}

/** Thrown off his feet by a great blow: over backwards, onto his back on the street. */
function thrownDown(ready, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const z = ready.pelvis[1];
  const lie = (pitch, height, extra) => supine(ready, { shieldFace, arms }, pitch, height, extra);
  const thrown = pose(ready, { pelvis: [-3, z + 1.2], hips: { yaw: -20, pitch: -18 }, torso: { yaw: -12, pitch: -26, roll: 6 },
    head: { yaw: 22, pitch: -32 }, footN: [-6, -4.6, 7.6], toeN: -10, footF: [9, 4.8, 12], toeF: 20,
    handN: [-6, -13, 52], sword: [sword + 34, 40], handF: [-2, 7, 56], shield: [shieldFace + 20, 40], ...arms });
  const over = pose(ready, { pelvis: [-6, 27], hips: { yaw: -16, pitch: -52 }, torso: { yaw: -6, pitch: -10 },
    head: { yaw: 18, pitch: -14 }, footN: [-2, -4.6, 12], footF: [8, 4.8, 18], toeN: 10, toeF: 20, kneeN: [0.4, -0.3, 1],
    kneeF: [0.4, 0.3, 1], handN: [-14, -13, 34], sword: [sword + 50, 50], handF: [-10, 8, 38], shield: [shieldFace + 30, 60],
    ...arms });
  const landing = lie(-78, 9, { footN: [4, -4.6, 8], footF: [10, 4.8, 10] });
  return [thrown, blend(thrown, over, 0.5), over, blend(over, landing, 0.5), landing,
    lie(-92, 6, { head: { yaw: 18, pitch: 14 } }), lie(-88, 6.6, {})];
}

/** Down on the street, breathing. */
function lyingDown(ready, { shieldFace = 50, arms = {} } = {}) {
  const flat = supine(ready, { shieldFace, arms });
  return [flat, nudge(flat, { torso: { pitch: 2 }, head: { pitch: -4, roll: 6 }, handN: [0, 0, 1] })];
}

/** Up off the street: he sits up on his hands, gets a knee under him, and rises into his guard. */
function gettingUp(ready, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const flat = supine(ready, { shieldFace, arms });
  const sit = pose(ready, { pelvis: [-6, 9], hips: { yaw: -10, pitch: -50 }, torso: { yaw: 0, pitch: 30 }, head: { yaw: 14, pitch: 10 },
    footN: [6, -4.6, 4.2], footF: [9, 4.8, 4.2], kneeN: [0.6, -0.3, 1], kneeF: [0.6, 0.3, 1],
    handN: [-14, -12, 5], sword: [250, 40], handF: [-8, 9, 8], shield: [shieldFace + 30, 50], ground: true, ...arms });
  const kneel = pose(ready, { pelvis: [-3, 21], hips: { yaw: -12, pitch: 8 }, torso: { yaw: -4, pitch: 18 }, head: { yaw: 12, pitch: -6 },
    footN: [-14, -4.6, 3], toeN: -78, kneeN: [1, -0.15, -0.2], footF: [6, 4.8, 4.2],
    handN: [8, -12, 24], sword: [sword - 120, 30], handF: [3, 8, 26], shield: [shieldFace + 10, -20], ...arms });
  const rise = pose(ready, { pelvis: [-2, 31], hips: { yaw: -14, pitch: 10 }, torso: { yaw: -2, pitch: 12 }, head: { yaw: 14, pitch: -4 },
    footN: [-10, -4.6, 4.2], footF: [6, 4.8, 4.2], handN: [8, -12, 36], sword: [sword - 40, 24], handF: [6, 6, 42],
    shield: [shieldFace, 0], ...arms });
  return [flat, blend(flat, sit, 0.4), blend(flat, sit, 0.75), sit, blend(sit, kneel, 0.33), blend(sit, kneel, 0.66), kneel,
    blend(kneel, rise, 0.5), rise, blend(rise, ready, 0.6), ready];
}

/** Killed where he lies: a last heave, and still. */
function deathOnGround(ready, { shieldFace = 50, arms = {} } = {}) {
  const flat = supine(ready, { shieldFace, arms });
  return [
    pose(flat, { torso: { pitch: -8 }, head: { pitch: -16, roll: 8 }, handN: [-16, -13, 12], handF: [-12, 9, 14] }),
    pose(flat, { torso: { pitch: 4 }, head: { pitch: 10 } }),
    pose(flat, { head: { yaw: 22, pitch: 14, roll: -12 } }),
  ];
}

/** Where the ground stroke goes in: the chest of a man on his back. */
const CHEST = (f) => toParent(f.chest, [3, 0, 4]);

/**
 * The reactions every soldier shares, for his stance: a second flinch (`hurt_b`), reeling from a great
 * blow (`reel`), thrown open by a parry (`parried`), and (unless `steadfast`, a man no blow floors) thrown
 * down (`knockdown`), lying (`down`), getting up (`getup`), killed where he lies (`death_down`).
 */
function reactions(ready, size, { sword = 150, shieldFace = 50, arms = {}, steadfast = false } = {}) {
  const opts = { sword, shieldFace, arms };
  const out = {
    hurt_b: { size, fps: 12, loop: false, poses: hurtLow(ready, opts), durations: [1, 1.2, 0.8, 0.8, 1], motion: [-60, 0, 0] },
    reel: { size, fps: 10, loop: false, poses: reelBack(ready, opts), durations: [1, 1.2, 1.2, 1, 1], motion: [-90, 0, 0] },
    parried: { size, fps: 8, loop: false, poses: thrownOpen(ready, opts), durations: [1, 1.6, 1.6, 0.6, 0.6], motion: [-30, 0, 0] },
  };
  if (steadfast) return out;
  return {
    ...out,
    knockdown: { size, fps: 14, loop: false, poses: thrownDown(ready, opts), durations: [1, 0.8, 0.8, 0.7, 0.8, 1, 1.4],
      motion: [-140, 0, 0], wind: [-10, 0, -6] },
    down: { size, fps: 3, loop: true, poses: lyingDown(ready, opts), limp: 0.6 },
    getup: { size, fps: 14, loop: false, poses: gettingUp(ready, opts), durations: [0.8, 0.7, 0.7, 1.2, 0.8, 0.8, 1.2, 0.8, 1, 1, 1] },
    death_down: { size, fps: 8, loop: false, poses: deathOnGround(ready, opts), durations: [1, 1.4, 2.4], wound: CHEST,
      limp: 0.9 },
  };
}

// --- Cut down ------------------------------------------------------------------------------------
// A killing blow can take a man's head, his sword arm, a leg, or cut him through at the waist. Each
// way of falling hides what was cut away and shows the wound's raw cap; the piece itself is drawn
// apart (PIECES) and thrown by the game, which spurts blood from `wound` frame by frame.

const HEAD = ["skull", "face", "nose", "eye", "mask", "moustache", "beard", "helmet", "helmetBand", "brim", "finial",
  "neckGuard", "plume"];
const WEAPON_N = ["grip", "pommel", "guard", "book", "shaft", "socket", "tassel", "maceHead", "axeHead", "axeBlade", "pot", "wick"];
const ARM_N = ["sleeveN", "fistN"];
const LEG_N = ["trousersN", "bootN", "footN"];
const UPPER = ["torso", "cuirass", "chestDisc", "collar", "sleeveN", "sleeveF", "shoulderN", "shoulderF", "fistN", "fistF",
  "neck", ...HEAD, "shield", "boss", "bow", ...WEAPON_N, "dagger", "daggerGrip", "daggerGuard"];

/** What each cut takes away and the wound it leaves. */
const CUTS = {
  head: { hide: HEAD, show: ["stumpNeck"] },
  arm: { hide: [...ARM_N, ...WEAPON_N], show: ["stumpShoulderN"], noBlade: true },
  leg: { hide: LEG_N, show: ["stumpHipN"] },
  waist: { hide: UPPER, show: ["stumpWaist"], noBlade: true },
};

/** Where each wound is on the skeleton. */
const WOUNDS = {
  head: (f) => toParent(f.neck, [0, 0, 4.2]),
  arm: (f) => f.upperArmN.o,
  leg: (f) => f.thighN.o,
  waist: (f) => toParent(f.pelvis, [0.3, 0, 5.2]),
};

/** Dresses a fall for a cut. */
const cutAway = (poses, cut) => poses.map((p) => ({ ...p, hide: [...(p.hide ?? []), ...CUTS[cut].hide],
  show: [...(p.show ?? []), ...CUTS[cut].show], noBlade: p.noBlade || CUTS[cut].noBlade }));

/** Beheaded: the body jerks, stands a heartbeat, its knees give, and it pitches forward on its face. */
function headlessFall(ready, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const knees = { footN: [-15, -4.6, 3.0], footF: [-12, 4.8, 3.2], toeN: -80, toeF: -80, kneeN: [1, -0.15, -0.2],
    kneeF: [1, 0.15, -0.2] };
  const flat = { toeN: -88, toeF: -88, kneeN: [0.3, -0.1, -1], kneeF: [0.3, 0.1, -1], ground: true };
  const buckle = pose(ready, { pelvis: [0, 30], hips: { yaw: -10, pitch: 10 }, torso: { yaw: -4, pitch: 8 },
    footN: [-9, -4.6, 4.2], footF: [7, 4.8, 4.2], kneeN: [1, -0.2, 0.2], kneeF: [1, 0.2, 0.2], handN: [6, -12, 30],
    sword: [sword - 40, 40], handF: [10, 6, 32], shield: [shieldFace + 10, -20], ...arms });
  const kneeling = pose(ready, { pelvis: [-1, 21.6], hips: { yaw: -10, pitch: 8 }, torso: { yaw: 0, pitch: 12 }, ...knees,
    handN: [7, -12, 22], sword: [70, 40], handF: [9, 6, 24], shield: [shieldFace + 20, -40], ...arms });
  // The knees go over three frames: the front foot drawn back under him as the toes turn down, not slid.
  const going = (t, footF, toeF) => pose(blend(buckle, kneeling, t), { footN: blend(buckle.footN, knees.footN, t), footF,
    toeN: -80 * t, toeF });
  return [
    pose(ready, { pelvis: [-1.6, ready.pelvis[1] + 0.3], hips: { yaw: -16, pitch: -4 }, torso: { yaw: -10, pitch: -10, roll: 4 },
      handN: [6, -13, 54], sword: [sword + 20, 30], handF: [13, 6, 54], shield: [shieldFace, 20], ...arms }),
    pose(ready, { pelvis: [-1, ready.pelvis[1] - 0.4], hips: { yaw: -12, pitch: 2 }, torso: { yaw: -6, pitch: 2, roll: -3 },
      handN: [4, -12, 42], sword: [sword - 10, 30], handF: [10, 6, 42], shield: [shieldFace + 10, 0], ...arms }),
    pose(ready, { pelvis: [-0.5, 36.4], hips: { yaw: -12, pitch: 4 }, torso: { yaw: -4, pitch: 4, roll: 3 },
      handN: [4, -12, 38], sword: [sword - 20, 34], handF: [10, 6, 38], shield: [shieldFace + 10, -10], ...arms }),
    buckle,
    going(0.33, [0.8, 4.8, 4.1], -26),
    going(0.66, [-5.6, 4.8, 3.6], -53),
    kneeling,
    pose(ready, { pelvis: [-0.5, 21.2], hips: { yaw: -10, pitch: 14 }, torso: { yaw: 0, pitch: 18 }, ...knees,
      handN: [9, -12, 18], sword: [60, 40], handF: [10, 6, 20], shield: [shieldFace + 20, -46], ...arms }),
    pose(ready, { pelvis: [1, 19], hips: { yaw: -10, pitch: 36 }, torso: { yaw: 0, pitch: 26 }, ...knees,
      handN: [17, -12, 12], sword: [50, 50], handF: [17, 6, 14], shield: [shieldFace + 30, -60], ...arms }),
    pose(ready, { pelvis: [3, 13], hips: { yaw: -8, pitch: 60 }, torso: { yaw: 0, pitch: 22 }, footN: [-21, -4.6, 3],
      footF: [-18, 4.8, 3.2], ...flat, handN: [25, -12, 6], sword: [80, 60], handF: [24, 7, 7], shield: [shieldFace + 40, -80],
      ...arms }),
    pose(ready, { pelvis: [5, 8], hips: { yaw: -6, pitch: 80 }, torso: { yaw: 0, pitch: 8 }, footN: [-26, -4.6, 3],
      footF: [-24, 4.8, 3.4], ...flat, handN: [29, -13, 4], sword: [90, 70], handF: [27, 8, 5], shield: [shieldFace + 40, -88],
      ...arms }),
    pose(ready, { pelvis: [5, 7.4], hips: { yaw: -6, pitch: 84 }, torso: { yaw: 0, pitch: 4 }, footN: [-27, -4.6, 3],
      footF: [-25, 4.8, 3.4], ...flat, handN: [30, -13, 3], sword: [90, 72], handF: [28, 8, 4], shield: [shieldFace + 40, -90],
      ...arms }),
  ];
}

/** Cut through at the waist: the legs stand a moment, fold, and fall back. */
function legsFall(ready) {
  // The arms are gone with the upper body; their targets just ride along with it.
  const gone = { handN: (f) => toParent(f.chest, [3, -9, -4]), handF: (f) => toParent(f.chest, [3, 9, -4]) };
  return [
    pose(ready, { ...gone, pelvis: [-1, ready.pelvis[1] + 0.4], hips: { yaw: -16, pitch: -6 } }),
    pose(ready, { ...gone, pelvis: [-1.6, ready.pelvis[1] - 0.6], hips: { yaw: -14, pitch: -10 } }),
    pose(ready, { ...gone, pelvis: [-2.4, 33], hips: { yaw: -12, pitch: -14 }, footN: [-6, -4.6, 4.2], footF: [7, 4.8, 4.2],
      kneeN: [1, -0.2, 0.3], kneeF: [1, 0.2, 0.3] }),
    pose(ready, { ...gone, pelvis: [-3.4, 25], hips: { yaw: -12, pitch: -22 }, footN: [-4, -4.6, 4.2], footF: [6, 4.8, 4.2],
      kneeN: [1, -0.2, 0.5], kneeF: [1, 0.2, 0.5] }),
    pose(ready, { ...gone, pelvis: [-6, 17], hips: { yaw: -10, pitch: -48 }, footN: [0, -4.6, 4.2], footF: [5, 4.8, 4.2],
      kneeN: [0.6, -0.2, 0.8], kneeF: [0.6, 0.2, 0.8] }),
    pose(ready, { ...gone, pelvis: [-8, 10], hips: { yaw: -10, pitch: -74 }, footN: [3, -4.6, 3.8], footF: [8, 4.8, 4.0], toeN: 20,
      toeF: 15, kneeN: [0.2, -0.3, 1], kneeF: [0.2, 0.3, 1], ground: true }),
    pose(ready, { ...gone, pelvis: [-9, 7], hips: { yaw: -10, pitch: -88 }, footN: [5, -4.6, 3.6], footF: [10, 4.8, 3.8], toeN: 40,
      toeF: 30, kneeN: [0.2, -0.3, 1], kneeF: [0.2, 0.3, 1], ground: true }),
    pose(ready, { ...gone, pelvis: [-9, 6.6], hips: { yaw: -10, pitch: -90 }, footN: [7, -4.6, 3.4], footF: [12, 4.8, 3.6], toeN: 50,
      toeF: 40, kneeN: [0.2, -0.3, 1], kneeF: [0.2, 0.3, 1], ground: true }),
  ];
}

/**
 * The four ways a soldier can be cut down, for a stance (`ready`) and its death's options. The arm
 * and leg falls are his ordinary fall without the limb.
 */
function cutDown(ready, size, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const fall = death(ready, { sword, shieldFace, arms });
  const timing = { size, fps: 10, loop: false, wind: [-10, 0, -6], limp: 0.9 };
  return {
    death_head: { ...timing, poses: cutAway(headlessFall(ready, { sword, shieldFace, arms }), "head"),
      durations: [0.8, 1.4, 1.2, 0.6, 0.45, 0.45, 1.4, 1.2, 0.8, 0.7, 1, 2.4], motion: [-30, 0, 0], wound: WOUNDS.head },
    death_arm: { ...timing, poses: cutAway(fall, "arm"), durations: [1, 1.4, 1.2, 0.7, 0.7, 0.6, 0.6, 0.6, 0.8, 1, 1.2, 2],
      motion: [-50, 0, 0], wound: WOUNDS.arm },
    death_leg: { ...timing, poses: cutAway(fall, "leg"), durations: [1, 1, 1, 0.7, 0.7, 0.6, 0.6, 0.6, 0.8, 1, 1.2, 2],
      motion: [-40, 0, 0], wound: WOUNDS.leg },
    death_waist: { ...timing, poses: cutAway(legsFall(ready), "waist"), durations: [1.2, 1.6, 1, 0.9, 0.8, 0.7, 1, 2.4],
      motion: [-20, 0, 0], wound: WOUNDS.waist },
  };
}

// --- Finished -----------------------------------------------------------------------------------
// A staggered soldier's half of each finisher (the hero's in yusuf_animations.mjs; the timing, the
// distance and what each frame does in finisher_timing.mjs). He faces the hero, who stands
// `distance` px before him; his parts come away on the cut frames.

/** Where a thrust went in, for the blood that comes out after. */
const BELLY = (f) => toParent(f.spine, [5, 0, 2]);

function finishedSet(ready, size, { sword = 150, shieldFace = 50, arms = {} } = {}) {
  const [, , dazed] = stagger(ready, { sword: sword - 90, shieldFace: shieldFace + 20 });
  const fall = death(ready, { sword, shieldFace, arms });
  const legs = legsFall(ready);
  const knees = { footN: [-15, -4.6, 3.0], footF: [-12, 4.8, 3.2], toeN: -80, toeF: -80, kneeN: [1, -0.15, -0.2],
    kneeF: [1, 0.15, -0.2] };
  const kneel = pose(ready, { pelvis: [-1, 21.8], hips: { yaw: -10, pitch: 4 }, torso: { yaw: 0, pitch: 0 },
    head: { yaw: 4, pitch: -16 }, ...knees, handN: [3, -13, 22], sword: [30, 40], handF: [4, 8, 24],
    shield: [shieldFace + 40, -70], ...arms });
  // Thrown back from his knees: on his back, the legs folded under him.
  const back = (pelvis, pitch, extra = {}) => pose(kneel, { pelvis, hips: { yaw: -10, pitch }, torso: { yaw: 0, pitch: 4 },
    head: { yaw: 16, pitch: 6 }, footN: [-6, -4.6, 3.4], footF: [-3, 4.8, 3.6], toeN: -40, toeF: -40,
    kneeN: [1, -0.2, 0.4], kneeF: [1, 0.2, 0.4], handN: [-14, -13, 8], handF: [-10, 9, 10], sword: [210, 60],
    shield: [shieldFace + 30, 70], ground: true, ...arms, ...extra });
  const timed = (name, poses, extra = {}) => ({ size, fps: FINISHERS[name].fps, loop: false, poses,
    durations: FINISHERS[name].durations, wind: [-10, 0, -6], limp: 0.6, ...extra });
  const from = (poses, at, cut) => poses.map((p, i) => (i >= at ? cutAway([p], cut)[0] : p));
  /** The whole pose carried back along the street by dx: a man thrown off his feet lands behind where he stood. */
  const carried = (p, dx) => nudge(p, { pelvis: [dx, 0], footN: [dx, 0, 0], footF: [dx, 0, 0], handN: [dx, 0, 0],
    handF: [dx, 0, 0] });

  // Kicked to his knees, then his head (cut on 4); he falls back, the legs and arms following the body down.
  const behead = [
    dazed,
    pose(ready, { pelvis: [-4, 33], hips: { yaw: -10, pitch: 30 }, torso: { yaw: 0, pitch: 34 }, head: { yaw: 6, pitch: 24 },
      footN: [-12, -4.6, 4.2], footF: [-2, 4.8, 6], handN: [6, -13, 30], sword: [sword - 60, 40], handF: [8, 7, 30],
      shield: [shieldFace + 20, -40], ...arms }),
    pose(ready, { pelvis: [-3, 26], hips: { yaw: -10, pitch: 16 }, torso: { yaw: 0, pitch: 18 }, head: { yaw: 4, pitch: 10 },
      footN: [-14, -4.6, 3.4], footF: [-7, 4.8, 3.8], toeN: -60, toeF: -36, kneeN: [1, -0.15, -0.2], kneeF: [1, 0.15, -0.2],
      handN: [4, -13, 24], sword: [60, 40], handF: [6, 8, 26], shield: [shieldFace + 30, -60], ...arms }),
    kneel,
    pose(kneel, { pelvis: [-1.6, 22.6], torso: { pitch: -10, roll: 4 }, handN: [2, -13, 30], handF: [4, 9, 32] }),
    pose(kneel, { pelvis: [-2, 21.6], torso: { pitch: -2, roll: -4 }, handN: [-2, -13, 24], handF: [0, 9, 26] }),
    back([-4, 17], -34, { sword: [120, 50], handN: [-6, -13, 20], handF: [-5, 9, 18], footN: [-11, -4.6, 3.2],
      footF: [-8, 4.8, 3.4], toeN: -60, toeF: -60 }),
    back([-7, 11], -66, { sword: [180, 60], handN: [-12, -13, 12] }),
    back([-8, 9], -86),
  ];

  // Run through (bursts on 1, 2, 5), lifted on the blade, kicked off it: thrown back with his hands to the
  // wound, he goes over and lands on his back a stride behind where he stood.
  const pierced = pose(ready, { pelvis: [-1, 36], hips: { yaw: -6, pitch: 18 }, torso: { yaw: 0, pitch: 28 },
    head: { yaw: 6, pitch: 30 }, handN: [10, -12, 40], sword: [sword - 40, 40], handF: [10, 8, 40], shield: [shieldFace + 20, -30],
    ...arms });
  const agony = pose(pierced, { torso: { pitch: 6 }, head: { pitch: -24 }, handN: [8, -13, 42], handF: [8, 9, 44] });
  const lifted = pose(agony, { pelvis: [0, 40.5], footN: [-3, -4.6, 7], footF: [4, 4.8, 8], toeN: -40, toeF: -40,
    head: { pitch: -30 } });
  const impale = [
    dazed,
    pierced,
    agony,
    lifted,
    nudge(lifted, { torso: { roll: 3, pitch: 2 }, head: { roll: 6 }, handN: [0, 0, -1.5] }),
    pose(ready, { pelvis: [-10, 34], hips: { yaw: -10, pitch: -22 }, torso: { yaw: -4, pitch: -6 }, head: { yaw: 10, pitch: 16 },
      footN: [-8, -4.6, 6], toeN: -10, footF: [0, 4.8, 9], toeF: 24, handN: [-2, -10, 40], sword: [sword - 30, 40],
      handF: [1, 7, 39], shield: [shieldFace + 30, -10], ...arms }),
    carried(pose(fall[3], { handN: [-4, -13, 32], handF: [-2, 8, 34] }), -7),
    carried(pose(fall[5], { handN: [-10, -13, 22], handF: [-7, 9, 25] }), -9),
    carried(pose(fall[8], { handN: [-16, -13, 9], handF: [-12, 9, 11] }), -9),
  ];

  // Through the waist on 3: the upper body is gone; the legs stand a moment, then fold and fall.
  const spin = [
    dazed,
    nudge(dazed, { pelvis: [0.6, -0.4], torso: { roll: 5, pitch: 3 }, head: { roll: 8 } }),
    nudge(dazed, { pelvis: [-0.4, -0.2], torso: { roll: -3 }, head: { roll: -5 } }),
    ...cutAway([legs[0], legs[1], legs[3], legs[5], legs[7]], "waist"),
  ];

  // His sword arm on 1 (he reels, clutching at the stump), his head on 4; the body stands a heartbeat, its knees
  // go, and it falls back, the hand dropping from the stump as it goes.
  const reel = pose(ready, { pelvis: [-2, 37], hips: { yaw: -22, pitch: -6 }, torso: { yaw: -16, pitch: -10, roll: 6 },
    head: { yaw: 20, pitch: -20, roll: 8 }, handF: [6, 6, 50], shield: [shieldFace + 30, 10], ...arms });
  const clutch = pose(reel, { pelvis: [-4, 36], torso: { yaw: -10, pitch: 10, roll: 2 }, head: { yaw: 14, pitch: 10 },
    handF: [2, -2, 52], shield: [shieldFace + 80, 0] });
  const staggerBack = pose(clutch, { pelvis: [-6, 36.5], footN: [-13, -4.6, 4.2], footF: [3, 4.8, 4.2], torso: { pitch: -2 },
    head: { yaw: 18, pitch: -8 } });
  const disarmed = [
    pose(dazed, { handN: [10, -12, 52], sword: [140, 20] }),
    reel,
    clutch,
    staggerBack,
    pose(staggerBack, { torso: { pitch: -12, roll: 5 }, handF: [4, 4, 56] }),
    pose(staggerBack, { pelvis: [-7, 35], torso: { pitch: -16, roll: -3 } }),
    pose(fall[2], { handF: [0, 1, 44] }),
    pose(fall[4], { handF: [-6, 6, 30], footN: [-3, -4.6, 4.2] }),
    pose(fall[7], { handF: [-11, 8, 16], footN: [3, -4.6, 3.6] }),
  ];
  const lostArm = from(disarmed, 1, "arm");
  const lostHead = lostArm.map((p, i) => (i >= 4 ? { ...cutAway([p], "head")[0], woundAt: WOUNDS.head } : p));

  // Pinned where he lies (bursts on 3 and 5): the blade goes in, his back arches, he sinks, and is still.
  const flat = supine(ready, { shieldFace, arms });
  const arch = pose(flat, { torso: { pitch: -10 }, head: { pitch: -6, roll: 5 }, handN: [-13, -13, 13], handF: [-10, 9, 15] });
  const pinned = [
    flat,
    nudge(flat, { torso: { pitch: 2 }, head: { pitch: -4, roll: 6 } }),
    flat,
    arch,
    pose(arch, { torso: { pitch: -10 }, head: { pitch: -12 }, handN: [-14, -13, 12], handF: [-10, 9, 14] }),
    pose(flat, { torso: { pitch: -6 }, head: { pitch: -8, roll: -6 }, handN: [-16, -13, 10] }),
    pose(flat, { head: { yaw: 22, pitch: 14, roll: -12 } }),
    pose(flat, { head: { yaw: 22, pitch: 14, roll: -12 } }),
  ];

  return {
    finished_ground: timed("ground", pinned, { wound: CHEST }),
    finished_behead: timed("behead", from(behead, 4, "head"), { wound: WOUNDS.head }),
    finished_impale: timed("impale", impale, { wound: BELLY }),
    finished_spin: timed("spin", spin, { wound: WOUNDS.waist }),
    finished_disarm: timed("disarm", lostHead, { wound: WOUNDS.arm }),
  };
}

// --- The pieces --------------------------------------------------------------------------------
// What a cut throws off, drawn tumbling through eight turns (each frame a 45° turn in the picture).

const TURNS = [0, 45, 90, 135, 180, 225, 270, 315];
const STAND = { pelvis: [0, 39.9], footN: [0, -4.4, 4.2], footF: [0, 4.4, 4.2] };
/** The torso's parts are cut at the waist: the piece keeps only what lay above it. */
const ABOVE_WAIST = (p, name) => !["torso", "cuirass"].includes(name) || p[2] >= 43.5;
/** A long weapon's parts (spear, mace, axe): a piece of its own when its bearer is cut down. */
const LONG_ARM = ["shaft", "socket", "tassel", "maceHead", "axeHead", "axeBlade", "pommel"];

function piecesFor(ready, { arm = true, armBlade = true, upperBlade = true, spear = false, headSize = 32 } = {}) {
  const pieces = {
    // The plume stays on the helmet (drawn as it hangs at rest).
    head: { pose: pose(ready, { head: { yaw: 0, pitch: 0, roll: 0 } }), parts: [...HEAD, "stumpNeck"], chains: ["plume"],
      pivot: (f) => toParent(f.head, [0.4, 0, 5.6]), size: [headSize, headSize] },
    leg: { pose: pose(ready, STAND), parts: [...LEG_N, "stumpHipN"], pivot: (f) => f.shinN.o, size: [56, 56] },
    upper: { pose: ready, parts: [...UPPER.filter((n) => !spear || !LONG_ARM.includes(n)), "stumpChest"],
      pivot: (f) => toParent(f.chest, [0, 0, 2]), clip: ABOVE_WAIST, blade: upperBlade, size: [96, 96] },
  };
  if (arm) {
    pieces.arm = { pose: pose(ready, { handN: [12, -10, 36], sword: [100, 0] }),
      parts: [...ARM_N, ...(armBlade ? ["grip", "pommel", "guard"] : []), "stumpShoulderN"],
      pivot: (f) => f.forearmN.o, blade: armBlade, size: [80, 80] };
  }
  if (spear) {
    pieces.spear = { pose: pose(ready, { sword: [90, 0] }), parts: LONG_ARM.filter((n) => n !== "tassel"),
      pivot: (f) => toParent(f.sword, [12, 0, 0]), blade: true, size: [104, 104] };
  }
  return pieces;
}

const BODY = [112, 128];
const WIDE = [176, 128];
const LONG = [208, 128];

// Footwork: a stepping foot lifts (ankle at LIFT) on the frame it travels and lands on the next; a
// foot left down is held still by the build while the game's lunge carries the body.
const LIFT = 7.4;
const BACK = [-8, -4.6, 4.2];
const CAP_BACK = [-9, -4.8, 4.2];

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
  const strike = sr({ pelvis: [3.2, 36.2], hips: { yaw: 4, pitch: 9 }, torso: { yaw: 14, pitch: 12, roll: -2 }, head: { yaw: 8 },
    footF: [13, 4.8, LIFT], toeF: 14, handN: [18, -9, 47], sword: [94, 4], handF: [5, 4, 46], shield: [26, -4] });
  const through = sr({ pelvis: [4, 35.2], hips: { yaw: 12, pitch: 12 }, torso: { yaw: 28, pitch: 18, roll: -3 },
    head: { yaw: 2, pitch: 6 }, footF: [15, 4.8, 4.2], footN: [-6.5, -4.6, 6.8], toeN: 8, handN: [12, -3, 33], sword: [24, -10],
    handF: [1, 5, 44], shield: [20, -8] });
  return [
    blend(SWORD_READY, back, 0.6),
    back,
    strike,
    through,
    pose(blend(through, SWORD_READY, 0.45), { footF: through.footF, footN: BACK }),
    pose(SWORD_READY, { footF: through.footF }),
  ];
}

/** The rising slash: low behind, a step, and the blade climbs to overhead. Telegraph 1, active 3-5. */
function swordRising() {
  const low = sr({ pelvis: [-1.6, 35.2], hips: { yaw: 14, pitch: 12 }, torso: { yaw: 28, pitch: 14, roll: -2 },
    head: { yaw: 0, pitch: 4 }, handN: [-6, -5, 35], sword: [-55, -14], handF: [6, 4, 46], shield: [24, -6] });
  // A hop-step into the cut: both feet leave the ground as the blade starts to climb.
  const rise = sr({ pelvis: [3, 38.4], hips: { yaw: -4, pitch: 4 }, torso: { yaw: -8, pitch: 2, roll: 2 }, head: { yaw: 18, pitch: -6 },
    footF: [15, 4.8, LIFT], toeF: 12, footN: [-5, -4.6, 7.0], toeN: 4, handN: [17, -10, 50], sword: [116, 16], handF: [8, 3, 50],
    shield: [32, 6] });
  const high = sr({ pelvis: [2.6, 37.6], hips: { yaw: -12, pitch: 0 }, torso: { yaw: -22, pitch: -6, roll: 4 },
    head: { yaw: 24, pitch: -12 }, footF: [16.5, 4.8, 4.2], footN: [-6, -4.6, 5.2], toeN: -20, handN: [11, -9, 64],
    sword: [190, 14], handF: [9, 3, 50], shield: [34, 8] });
  return [
    blend(SWORD_READY, low, 0.6),
    low,
    sr({ pelvis: [0.6, 35.6], hips: { yaw: 8, pitch: 10 }, torso: { yaw: 18, pitch: 12 }, handN: [2, -6, 37], sword: [8, -10],
      handF: [6, 4, 46], shield: [24, -6] }),
    rise,
    high,
    pose(high, { handN: [10, -9, 63], sword: [200, 12] }),
    pose(blend(high, SWORD_READY, 0.5), { footF: high.footF, footN: [-6, -4.6, LIFT], toeN: 8 }),
    pose(SWORD_READY, { footF: high.footF }),
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

// --- At their business --------------------------------------------------------------------------
// What a soldier is doing when the hero comes upon him (the level gives him an activity). He keeps
// at it until he notices the hero, then the alert brings him to his guard. Hands busy with plunder
// have put the sabre away; it is out again with the alert.

const UNARMED = { hide: ["grip", "pommel", "guard"], noBlade: true };

/** Looting: down on one knee at a chest before him, rummaging, holding something up, tossing it. */
function loot() {
  const kneel = sr({
    ...UNARMED,
    pelvis: [-1, 21.8],
    hips: { yaw: -10, pitch: 14 },
    torso: { yaw: 6, pitch: 22 },
    head: { yaw: 4, pitch: 18 },
    footN: [-15, -4.6, 3.0],
    toeN: -80,
    kneeN: [1, -0.15, -0.2],
    footF: [15, 4.8, 4.2],
    footYawN: -20,
    // The shield hangs out at his far side, off the work.
    handF: [6, 10, 26],
    shield: [-70, -10],
    sword: [90, 0],
  });
  const dig = (x, z, extra = {}) => pose(kneel, { handN: [x, -6, z], ...extra });
  const frames = [
    dig(18, 17),
    dig(18, 15, { torso: { yaw: 8, pitch: 28 }, head: { pitch: 24 } }),
    dig(17, 16.5, { torso: { yaw: 5, pitch: 25 } }),
    dig(12, 34, { torso: { yaw: -2, pitch: 12 }, head: { yaw: 10, pitch: 2 }, sword: [160, 10] }),
    dig(10, 36, { torso: { yaw: -4, pitch: 10 }, head: { yaw: 12, pitch: -2 }, sword: [170, 10] }),
    dig(-3, 30, { torso: { yaw: -14, pitch: 14 }, head: { yaw: 6, pitch: 10 }, sword: [230, 20] }),
  ];
  return frames.concat([blend(frames[5], frames[0], 0.5)]);
}

/** Feeding a pyre: a book from the heap at his feet, drawn back, and flung into the fire ahead. */
function burn() {
  const stand = sr({ ...UNARMED, hips: { yaw: -8, pitch: 4 }, torso: { yaw: 0, pitch: 6 }, head: { yaw: 6, pitch: 6 },
    handF: [6, 5, 42], shield: [40, -10], handN: [6, -9, 40], sword: [90, 0] });
  const book = { show: ["book"] };
  // Down on bent knees to the heap, a book taken, drawn back past the shoulder, flung.
  const reach = pose(stand, { pelvis: [0, 26], hips: { yaw: -12, pitch: 32 }, torso: { yaw: -6, pitch: 34 },
    head: { yaw: 6, pitch: 24 }, handN: [13, -8, 15], sword: [90, 0], handF: [9, 5, 30] });
  const grab = pose(stand, { ...book, pelvis: [0, 28.5], hips: { yaw: -12, pitch: 28 }, torso: { yaw: -8, pitch: 26 },
    head: { yaw: 6, pitch: 18 }, handN: [11, -8, 18], sword: [100, 0], handF: [9, 5, 32] });
  const windup = pose(stand, { ...book, pelvis: [-1.6, 37.4], hips: { yaw: -22, pitch: 2 },
    torso: { yaw: -24, pitch: -2, roll: 3 }, head: { yaw: 12, pitch: 0 }, handN: [-8, -9, 58], sword: [200, 10],
    footF: [8, 4.8, 4.2] });
  return [
    stand,
    blend(stand, reach, 0.5),
    reach,
    grab,
    pose(blend(grab, windup, 0.5), book),
    windup,
    pose(stand, { ...book, pelvis: [2, 37], hips: { yaw: 4, pitch: 8 }, torso: { yaw: 16, pitch: 10, roll: -2 },
      head: { yaw: 6, pitch: 4 }, handN: [18, -8, 52], sword: [120, 0], footF: [10, 4.8, 4.2] }),
    pose(stand, { pelvis: [2.4, 36.6], hips: { yaw: 6, pitch: 10 }, torso: { yaw: 20, pitch: 14 }, head: { yaw: 2, pitch: 6 },
      handN: [18, -7, 40], sword: [80, 0], footF: [10, 4.8, 4.2] }),
    pose(stand, { pelvis: [1, 37.6], torso: { yaw: 8, pitch: 6 }, head: { yaw: 6, pitch: 10 }, handN: [10, -9, 40],
      footF: [9, 4.8, 4.2] }),
  ];
}

/** The stroke that takes a kneeling captive's head: higher still, then down through the neck. Strike on 2. */
function behead() {
  const raised = sr({ pelvis: [-0.6, 38.6], hips: { yaw: -8, pitch: 0 }, torso: { yaw: -16, pitch: -8, roll: 3 },
    head: { yaw: 6, pitch: 20 }, handN: [-6, -9, 72], sword: [214, 12], handF: [14, 4, 46], shield: [40, -30] });
  const through = sr({ pelvis: [3.4, 34.8], hips: { yaw: 4, pitch: 14 }, torso: { yaw: 16, pitch: 24, roll: -2 },
    head: { yaw: 2, pitch: 26 }, footF: [13, 4.8, 4.2], handN: [20, -9, 32], sword: [40, -8], handF: [6, 5, 40],
    shield: [30, -20] });
  return [
    raised,
    pose(raised, { handN: [-7, -9, 73], torso: { yaw: -18, pitch: -10 } }),
    sr({ pelvis: [2, 36.2], hips: { yaw: -2, pitch: 8 }, torso: { yaw: 6, pitch: 12 }, head: { yaw: 4, pitch: 24 },
      footF: [12, 4.8, LIFT], handN: [16, -9, 46], sword: [100, -4], handF: [10, 4, 44], shield: [34, -24] }),
    through,
    pose(through, { handN: [18, -8, 30], sword: [30, -10] }),
    pose(blend(through, SWORD_READY, 0.5), { footF: through.footF }),
    pose(SWORD_READY, { footF: through.footF, head: { yaw: 10, pitch: 6 } }),
  ];
}

/** Stabbing down into a body on the street before him, again and again. Strike on 1. */
function stabDown(ready, { up, down, sword, grip = [0, 0, 0] }) {
  const over = pose(ready, { pelvis: [0.4, 36.8], hips: { yaw: -6, pitch: 10 }, torso: { yaw: 4, pitch: 18 },
    head: { yaw: 4, pitch: 28 }, handN: up, sword, handF: [8, 5, 38], shield: [40, -40] });
  const driven = pose(over, { pelvis: [1.4, 34], hips: { pitch: 20 }, torso: { yaw: 8, pitch: 30 }, head: { pitch: 34 },
    handN: down });
  return [
    over,
    driven,
    pose(driven, { handN: [down[0], down[1], down[2] + grip[2]], torso: { pitch: 28 } }),
    pose(blend(driven, over, 0.6), {}),
    over,
  ];
}

/** Over a captive kneeling before him, sabre raised to cut her down, shouting at her. */
function menace() {
  const over = sr({ pelvis: [0.6, 38.4], hips: { yaw: -6, pitch: 2 }, torso: { yaw: -12, pitch: -4, roll: 2 },
    head: { yaw: 6, pitch: 18 }, handN: [-4, -9, 70], sword: [204, 12], handF: [14, 4, 44], shield: [40, -30] });
  return [
    over,
    pose(over, { torso: { yaw: -14, pitch: 0 }, head: { pitch: 24 }, handN: [-5, -9, 71], handF: [16, 4, 42] }),
    pose(over, { torso: { yaw: -13, pitch: -2 }, head: { pitch: 20 }, handN: [-4.5, -9, 70.5] }),
    pose(over, { head: { pitch: 16 }, handN: [-3.5, -9, 69.5] }),
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
  attack: { size: WIDE, fps: 12, loop: false, poses: swordRising(),
    durations: [1.2, 2.2, 0.8, 0.8, 1, 1, 1.4, 1.2], motion: [60, 0, 0] },
  cut: { size: WIDE, fps: 14, loop: false, poses: swordCut(), durations: [1.4, 1.8, 0.8, 1, 1.4, 1.2],
    motion: [40, 0, 0] },
  block: { size: WIDE, fps: 3, loop: true, poses: [SWORD_GUARD, nudge(SWORD_GUARD, { pelvis: [0, -0.3], torso: { pitch: 0.6 } })] },
  block_hit: { size: WIDE, fps: 12, loop: false, motion: [-60, 0, 0], poses: [
    pose(SWORD_GUARD, { pelvis: [-3.2, 36], torso: { yaw: 6, pitch: 2 }, head: { pitch: -6 }, handF: [8.5, 3, 53.5],
      shield: [26, 16], handN: [-2, -10.5, 48] }),
    SWORD_GUARD] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(SWORD_READY), durations: [1, 1.2, 0.8, 0.8, 1], motion: [-80, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(SWORD_READY), durations: [0.7, 0.6, 1.2, 1.5, 1], motion: [-40, 0, 0] },
  death: { size: WIDE, fps: 10, loop: false, poses: death(SWORD_READY), durations: [1, 1, 1, 0.7, 0.7, 0.6, 0.6, 0.6, 0.8, 1, 1.2, 2],
    motion: [-50, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
  loot: { size: BODY, fps: 6, loop: true, poses: loot(), durations: [1.6, 1, 1.4, 1, 2.2, 1, 0.8] },
  burn: { size: BODY, fps: 7, loop: true, poses: burn(), durations: [3, 0.8, 1.2, 1, 0.8, 1.4, 0.8, 1.4, 2.4] },
  menace: { size: BODY, fps: 5, loop: true, poses: menace(), durations: [2, 1, 1, 1.5] },
  // At an execution: the sabre held over a kneeling captive until the stroke (behead).
  execute: { size: BODY, fps: 5, loop: true, poses: menace(), durations: [2.4, 1, 1, 1.8] },
  behead: { size: WIDE, fps: 10, loop: false, poses: behead(), durations: [1.4, 1.2, 0.6, 1, 1.2, 1.2, 1.4] },
  stab: { size: WIDE, fps: 8, loop: true, durations: [2, 0.6, 1.2, 1, 1.4],
    poses: stabDown(SWORD_READY, { up: [14, -9, 58], down: [18, -9, 32], sword: [8, 6], grip: [0, 0, 2] }) },
  ...cutDown(SWORD_READY, WIDE),
  ...finishedSet(SWORD_READY, WIDE),
  ...reactions(SWORD_READY, WIDE),
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
  // The front foot reaches as the point drives; the back foot follows once the arm is out.
  const lunge = spr({ pelvis: [4.6, 34.6], hips: { yaw: 6, pitch: 12 }, torso: { yaw: 20, pitch: 12, roll: -2 }, head: { yaw: 2 },
    footF: [16, 4.8, LIFT + 0.4], toeF: 16, footN: [-8, -4.6, 5.2], toeN: -24, handN: [23, -9, 45.5], sword: [92, 1],
    handF: [1, 5, 45], shield: [18, -6] });
  const reach = pose(lunge, { pelvis: [5.2, 34], footF: [15, 4.8, 4.2], toeF: 0, footN: [-5.5, -4.6, 7.0], toeN: 6,
    handN: [25, -9, 45.4] });
  return [
    blend(SPEAR_READY, coil, 0.6),
    coil,
    pose(coil, { pelvis: [-1.6, 36.2], handN: [-6, -10, 46.5] }),
    lunge,
    reach,
    pose(blend(lunge, SPEAR_READY, 0.55), { footF: reach.footF, footN: BACK }),
    pose(SPEAR_READY, { footF: reach.footF }),
  ];
}

/**
 * The running lunge (spearman_lunge: 320 px/s on frames 2-3): from a crouched coil he bounds off the back foot,
 * flies with the point levelled, and lands on the front foot driving it home, skidding on that foot as the rush
 * spends itself. A strip of its own: the thrust's planted feet would skate at this speed. Telegraph 1, active
 * 3-4, as the thrust.
 */
function spearLunge() {
  const coil = spr({ pelvis: [-3.4, 33.4], hips: { yaw: -30, pitch: 12 }, torso: { yaw: -26, pitch: 10, roll: 2 },
    head: { yaw: 28, pitch: -8 }, footN: [-12, -4.6, 4.2], footF: [7, 4.8, 4.2], handN: [-9, -10, 44], sword: [94, 4],
    handF: [11, 3, 48], shield: [26, 4] });
  const bound = spr({ pelvis: [2.4, 37.6], hips: { yaw: -16, pitch: 10 }, torso: { yaw: -10, pitch: 8 },
    head: { yaw: 22, pitch: -6 }, footF: [12, 4.8, 10], toeF: 20, footN: [-11, -4.6, 7.4], toeN: -40, handN: [-4, -10, 46],
    sword: [93, 3], handF: [12, 3, 50], shield: [24, 4] });
  const flight = spr({ pelvis: [5.4, 37], hips: { yaw: 4, pitch: 12 }, torso: { yaw: 16, pitch: 12, roll: -2 },
    head: { yaw: 4, pitch: -2 }, footF: [17, 4.8, 9], toeF: 18, footN: [-9, -4.6, 9.6], toeN: -30, handN: [23, -9, 46],
    sword: [92, 1], handF: [2, 5, 46], shield: [18, -6] });
  const land = spr({ pelvis: [5.6, 33.4], hips: { yaw: 6, pitch: 14 }, torso: { yaw: 20, pitch: 12, roll: -2 }, head: { yaw: 2 },
    footF: [17, 4.8, 4.2], toeF: 0, footN: [-6, -4.6, 6.4], toeN: -8, handN: [26, -9, 45.4], sword: [92, 1],
    handF: [1, 5, 45], shield: [18, -6] });
  return [
    blend(SPEAR_READY, coil, 0.6),
    coil,
    bound,
    flight,
    land,
    pose(blend(land, SPEAR_READY, 0.55), { footF: [16, 4.8, 4.2], footN: [-8, -4.6, LIFT], toeN: 6 }),
    // The skid spent, the front foot drawn in under him into his guard.
    pose(SPEAR_READY, { footF: [13, 4.8, 4.2] }),
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

/** At ease, the spear upright at his side, talking with a comrade; a joke, a laugh. */
function chat() {
  const ease = spr({ pelvis: [-0.6, 38.6], hips: { yaw: -4, pitch: 0, roll: 2 }, torso: { yaw: 4, pitch: 2 },
    head: { yaw: 10, pitch: -2 }, footN: [-6, -4.6, 4.2], footF: [6, 4.8, 4.2], handN: [6, -10, 44], sword: [176, 4],
    handF: [6, 5, 40], shield: [40, -20] });
  return [
    ease,
    pose(ease, { handF: [11, 4, 46], shield: [30, -6], head: { yaw: 8, pitch: -4 } }),
    pose(ease, { handF: [12, 4, 48], shield: [28, -2], head: { yaw: 6, pitch: -6 }, torso: { yaw: 6, pitch: 0 } }),
    pose(ease, { handF: [9, 4, 44], shield: [34, -10], head: { yaw: 8, pitch: -2 } }),
    pose(ease, { pelvis: [-1, 38.2], torso: { yaw: 0, pitch: -6 }, head: { yaw: 12, pitch: -16 } }),
    pose(ease, { pelvis: [-0.8, 38.4], torso: { yaw: 2, pitch: -3 }, head: { yaw: 12, pitch: -10 } }),
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
  thrust: { size: LONG, fps: 12, loop: false, poses: spearThrust(),
    durations: [1.2, 2.2, 0.8, 0.8, 1.4, 1.2, 1.2], motion: [80, 0, 0] },
  lunge: { size: LONG, fps: 12, loop: false, poses: spearLunge(), durations: [1.2, 2.2, 0.8, 0.8, 1.4, 1.2, 1.2],
    motion: [200, 0, 0], skid: true },
  sweep: { size: LONG, fps: 12, loop: false, poses: spearSweep(), durations: [1.2, 2, 0.8, 1, 1.2, 1.2] },
  hurt: { size: LONG, fps: 12, loop: false, poses: hurt(SPEAR_READY, { sword: 130 }), durations: [1, 1.2, 0.8, 0.8, 1],
    motion: [-80, 0, 0] },
  stagger: { size: LONG, fps: 6, loop: false, poses: stagger(SPEAR_READY, { sword: 40 }), durations: [0.7, 0.6, 1.2, 1.5, 1],
    motion: [-40, 0, 0] },
  death: { size: LONG, fps: 10, loop: false, poses: death(SPEAR_READY, { sword: 130 }),
    durations: [1, 1, 1, 0.7, 0.7, 0.6, 0.6, 0.6, 0.8, 1, 1.2, 2], motion: [-50, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
  chat: { size: LONG, fps: 5, loop: true, poses: chat(), durations: [2.4, 1, 1.4, 1, 1.4, 1.2] },
  stab: { size: LONG, fps: 8, loop: true, durations: [2, 0.6, 1.2, 1, 1.4],
    poses: stabDown(SPEAR_READY, { up: [12, -9, 72], down: [16, -9, 60], sword: [6, 4], grip: [0, 0, 2] }) },
  ...cutDown(SPEAR_READY, LONG, { sword: 130 }),
  ...finishedSet(SPEAR_READY, LONG, { sword: 130 }),
  ...reactions(SPEAR_READY, LONG, { sword: 130 }),
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

/** A push kick to drive off a man who has closed on him: the knee up, the sole driven into the belly,
 * leaning back with the bow held wide, and the foot set down. Telegraph 0, the kick live on 1-2. */
function kick() {
  const chamber = br({ pelvis: [-1.6, 38.4], hips: { yaw: -16, pitch: -6 }, torso: { yaw: -10, pitch: -6, roll: 3 },
    head: { yaw: 20, pitch: -6 }, footN: [-8, -4.6, 4.2], footF: [7, 4.8, 18], toeF: 20, kneeF: [1, 0.2, 0.4],
    handF: [12, 4, 52], shield: [0, -10], handN: [-6, -9.5, 44] });
  const thrust = br({ pelvis: [-2.6, 38.8], hips: { yaw: -10, pitch: -16 }, torso: { yaw: -6, pitch: -12, roll: 2 },
    head: { yaw: 16, pitch: 4 }, footN: [-9, -4.6, 4.2], footF: [24, 4.8, 24], toeF: 70,
    handF: [6, 6, 56], shield: [0, 10], handN: [-10, -10, 48] });
  return [chamber, thrust, nudge(thrust, { footF: [0.8, 0, -0.4] }), pose(blend(thrust, BOW_READY, 0.45), { footF: [10, 4.8, 9] }),
    pose(blend(thrust, BOW_READY, 0.8), { footF: [8, 4.8, 4.2], toeF: 0 }), BOW_READY];
}

function bowAlert() {
  return [
    br({ pelvis: [-1, 38.8], torso: { pitch: -4 }, head: { yaw: 20, pitch: -10 }, handF: [12, 3.5, 48], shield: [0, -14] }),
    br({ pelvis: [0.4, 37.6], torso: { yaw: -6, pitch: 4 }, head: { yaw: 18, pitch: -8 }, handF: [16, 3, 52], shield: [0, -4],
      handN: [-5, -9.5, 41], sword: [180, 0] }),
    BOW_READY,
  ];
}

/** On watch: an arrow nocked, the bow held low, his eyes going up and down the street below. */
function watch() {
  const look = br({ torso: { yaw: -6, pitch: 3 }, head: { yaw: 12, pitch: 2 }, handF: [13, 3, 42], shield: [0, -36],
    handN: [5, -6, 39], sword: [80, 0], arrow: true, draw: 0.1 });
  return [
    look,
    pose(look, { head: { yaw: 20, pitch: 6 }, torso: { yaw: -2 } }),
    pose(look, { head: { yaw: 24, pitch: 8 }, torso: { yaw: 0 } }),
    pose(look, { head: { yaw: 4, pitch: 0 }, torso: { yaw: -10 } }),
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
  kick: { size: WIDE, fps: 10, loop: false, poses: kick(), durations: [2.4, 0.8, 1, 1, 1, 1], motion: [20, 0, 0] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(BOW_READY, { sword: 100, shieldFace: 0 }).map((p) => ({ ...p,
    shield: [0, -20] })), durations: [1, 1.2, 0.8, 0.8, 1], motion: [-80, 0, 0] },
  death: { size: WIDE, fps: 10, loop: false, poses: death(BOW_READY, { sword: 100, shieldFace: 0,
    arms: { shield: [0, 60] } }), durations: [1, 1, 1, 0.7, 0.7, 0.6, 0.6, 0.6, 0.8, 1, 1.2, 2], motion: [-50, 0, 0],
    wind: [-10, 0, -6], limp: 0.9 },
  watch: { size: BODY, fps: 4, loop: true, poses: watch(), durations: [2, 1.2, 2.4, 2] },
  ...cutDown(BOW_READY, WIDE, { sword: 100, shieldFace: 0, arms: { shield: [0, 60] } }),
  ...finishedSet(BOW_READY, WIDE, { sword: 100, shieldFace: 0, arms: { shield: [0, 60] } }),
  ...reactions(BOW_READY, WIDE, { sword: 100, shieldFace: 0, arms: { shield: [0, 60] } }),
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
  const strike = cr({ pelvis: [3.6, 35.6], hips: { yaw: 4, pitch: 9 }, torso: { yaw: 14, pitch: 12 }, head: { yaw: 8 },
    footF: [15, 5, LIFT], toeF: 14, handN: [18, -9, 47], sword: [94, 4], handF: [5, 4, 45], shield: [24, -4] });
  const through = cr({ pelvis: [4.4, 34.6], hips: { yaw: 12, pitch: 13 }, torso: { yaw: 28, pitch: 19, roll: -3 },
    head: { yaw: 2, pitch: 6 }, footF: [17, 5, 4.2], footN: [-7, -4.8, 6.8], toeN: 8, handN: [12, -3, 32], sword: [22, -10],
    handF: [1, 5, 43], shield: [18, -8] });
  return [
    blend(CAP_READY, back, 0.6), back, strike, through,
    pose(blend(through, CAP_READY, 0.45), { footF: through.footF, footN: CAP_BACK }),
    pose(CAP_READY, { footF: through.footF }),
  ];
}

/** Slash B: the backhand answer, rising. Active 2-3 (it follows A in a chain). */
function slashB() {
  const low = cr({ pelvis: [1.2, 34.8], hips: { yaw: 14, pitch: 11 }, torso: { yaw: 26, pitch: 15, roll: -2 },
    handN: [-2, -5, 35], sword: [-36, -14], handF: [3, 4, 44], shield: [22, -6] });
  const rise = cr({ pelvis: [3.4, 36.8], hips: { yaw: -4, pitch: 4 }, torso: { yaw: -10, pitch: 2 }, footF: [14, 5, LIFT], toeF: 12,
    handN: [17, -10, 50], sword: [118, 16], handF: [8, 3, 50], shield: [32, 6] });
  const high = cr({ pelvis: [3.4, 37.4], hips: { yaw: -12, pitch: 0 }, torso: { yaw: -22, pitch: -6, roll: 4 },
    head: { yaw: 24, pitch: -12 }, footF: [15.5, 5, 4.2], footN: [-7, -4.8, 6.8], toeN: 8, handN: [11, -9, 63], sword: [190, 14],
    handF: [9, 3, 50], shield: [34, 8] });
  return [
    blend(CAP_READY, low, 0.7), low, rise, high,
    pose(blend(high, CAP_READY, 0.5), { footF: high.footF, footN: CAP_BACK }),
    pose(CAP_READY, { footF: high.footF }),
  ];
}

/** Slash C: the cleave that ends the chain, overhead and down with a step. Telegraph 1, active 3-5. */
function slashC() {
  const lift = cr({ pelvis: [-2, 38], hips: { yaw: -24, pitch: -2 }, torso: { yaw: -18, pitch: -10, roll: 3 },
    head: { yaw: 22, pitch: -8 }, handN: [-5, -8, 67], sword: [250, 12], handF: [11, 3, 52], shield: [26, 8] });
  const coil = pose(lift, { torso: { yaw: -22, pitch: -12 }, footF: [10, 5, LIFT], toeF: 16, handN: [-6, -7.5, 68], sword: [262, 10] });
  const strike = cr({ pelvis: [5.6, 34], hips: { yaw: 8, pitch: 14 }, torso: { yaw: 14, pitch: 22, roll: -2 },
    head: { yaw: 4, pitch: 8 }, footF: [19, 5, 4.2], footN: [-9, -4.8, 4.6], toeN: -14, handN: [22, -8, 45], sword: [84, 0],
    handF: [2, 5, 44], shield: [20, -8] });
  const ground = pose(strike, { pelvis: [5.6, 30.8], hips: { pitch: 18 }, torso: { yaw: 18, pitch: 30 }, head: { pitch: 14 },
    handN: [21, -6, 26], sword: [36, -6], footN: [-6.5, -4.8, 7.0], toeN: 6 });
  return [
    blend(CAP_READY, lift, 0.55), lift, coil,
    strike, ground, pose(ground, { pelvis: [5.6, 31.4], footN: CAP_BACK, toeN: 0, handN: [21, -6, 27], sword: [40, -6] }),
    pose(blend(ground, CAP_READY, 0.5), { footF: strike.footF, footN: CAP_BACK }),
    pose(CAP_READY, { footF: strike.footF }),
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
  // Set behind the shield, then a leaping charge: both feet leave the ground for the two frames
  // the shield drives forward, and he lands in a skid that the game's slide carries.
  const set = cr({ pelvis: [-2.6, 34.4], hips: { yaw: -6, pitch: 14 }, torso: { yaw: 12, pitch: 16 }, head: { yaw: 4, pitch: 6 },
    footN: [-11, -4.8, 4.2], footF: [7, 5, 4.2], handF: [11, 3, 48], shield: [14, 4], handN: [-4, -11, 44], sword: [210, 26] });
  const launch = cr({ pelvis: [4, 37.4], hips: { yaw: -4, pitch: 20 }, torso: { yaw: 14, pitch: 20 }, head: { yaw: 4, pitch: 8 },
    footN: [-10, -4.8, 9], toeN: -50, footF: [12, 5, 14], toeF: 10, handF: [20, 2, 50], shield: [10, 4], handN: [0, -11, 44],
    sword: [206, 26] });
  const flight = pose(launch, { pelvis: [5, 38.4], footN: [-6, -4.8, 13], toeN: -30, footF: [13, 5, 11], toeF: 0 });
  const land = pose(launch, { pelvis: [5, 34.6], hips: { pitch: 16 }, footN: [-9, -4.8, LIFT], toeN: -10, footF: [14, 5, 4.2],
    toeF: 0 });
  const skid = pose(land, { pelvis: [4, 33.8], hips: { pitch: 14 }, torso: { pitch: 16 }, footN: [-10, -4.8, 4.2], toeN: 0 });
  return [
    blend(CAP_READY, set, 0.6), set, launch, flight, land, skid,
    pose(blend(skid, CAP_READY, 0.6), { footF: skid.footF, footN: skid.footN }),
    pose(CAP_READY, { footF: skid.footF, footN: skid.footN }),
  ];
}

/**
 * The sweep (his second phase): dropped low behind the shield, the sabre drawn back along the ground, then
 * swung flat across the shins with his whole turn behind it, the shield flung out for balance. Amber: no
 * standing guard stops it (jump it or roll). Telegraph 1 (held on 2), active 3-4.
 */
function capSweep() {
  const coil = cr({ pelvis: [-2.6, 32.6], hips: { yaw: -30, pitch: 14 }, torso: { yaw: -30, pitch: 18, roll: 3 },
    head: { yaw: 30, pitch: 6 }, footN: [-12, -4.8, 4.2], footF: [10, 5, 4.2], handN: [-9, -9, 32], sword: [-56, 12],
    handF: [12, 3, 44], shield: [26, 6] });
  const held = pose(coil, { pelvis: [-2.9, 32.3], torso: { yaw: -32, pitch: 18.5, roll: 3 }, handN: [-10, -9, 31.6] });
  // He steps into it: the front foot travels lifted as the blade crosses, and lands for the follow-through.
  const across = cr({ pelvis: [3.8, 31.2], hips: { yaw: 6, pitch: 18 }, torso: { yaw: 16, pitch: 24 }, head: { yaw: 6, pitch: 10 },
    footN: [-11, -4.8, 4.2], footF: [14, 5, 6.6], toeF: 10, handN: [18, -9, 26], sword: [76, -6], handF: [4, 6, 42],
    shield: [44, -14] });
  const through = cr({ pelvis: [4.6, 31], hips: { yaw: 18, pitch: 18 }, torso: { yaw: 32, pitch: 24, roll: -3 },
    head: { yaw: 2, pitch: 10 }, footF: [17, 5, 4.2], footN: [-8, -4.8, 6.4], toeN: 6, handN: [13, -2, 24], sword: [52, -36],
    handF: [1, 6, 41], shield: [40, -16] });
  return [
    blend(CAP_READY, coil, 0.55), coil, held, across, through,
    pose(blend(through, CAP_READY, 0.45), { footF: through.footF, footN: CAP_BACK }),
    pose(CAP_READY, { pelvis: [3, 37], footF: [15.5, 5, 4.2] }),
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

/** Beaten: down on one knee, propped on his sabre, the shield hanging, head low, heaving for breath. */
function beaten() {
  const kneel = cr({
    pelvis: [-1, 22.8], hips: { yaw: -10, pitch: 12 }, torso: { yaw: 4, pitch: 24 }, head: { yaw: 4, pitch: 28 },
    footN: [-15, -4.8, 3.0], toeN: -80, kneeN: [1, -0.15, -0.2], footF: [14, 5, 4.2],
    handN: [17, -10, 36], sword: [6, 4], handF: [6, 10, 30], shield: [70, -50],
  });
  return [
    kneel,
    nudge(kneel, { pelvis: [0, 0.4], torso: { pitch: -3 }, head: { pitch: -5 } }),
    nudge(kneel, { pelvis: [0, 0.7], torso: { pitch: -5 }, head: { pitch: -8 } }),
    nudge(kneel, { pelvis: [0, 0.3], torso: { pitch: -2 }, head: { pitch: -3 } }),
  ];
}

/** Beheaded where he knelt: the body jerks upright, sways, and pitches forward over his sabre. */
function kneelingBeheaded() {
  const [kneel] = beaten();
  const flat = { toeN: -88, toeF: -88, kneeN: [0.6, -0.1, -0.4], kneeF: [0.6, 0.1, -0.4], ground: true };
  return [
    pose(kneel, { pelvis: [-1.6, 23.6], hips: { pitch: 4 }, torso: { yaw: -4, pitch: 2, roll: 4 }, handN: [12, -12, 40],
      sword: [40, 20], handF: [4, 11, 40], shield: [80, -20] }),
    pose(kneel, { pelvis: [-1.2, 23.2], hips: { pitch: 8 }, torso: { yaw: 0, pitch: 10, roll: -3 }, handN: [14, -12, 30],
      sword: [60, 30], handF: [6, 11, 32], shield: [80, -40] }),
    pose(kneel, { pelvis: [-0.6, 22.6], hips: { pitch: 16 }, torso: { yaw: 2, pitch: 18, roll: 2 }, handN: [16, -12, 22],
      sword: [80, 40], handF: [8, 10, 24], shield: [80, -60] }),
    pose(kneel, { pelvis: [1, 20], hips: { pitch: 36 }, torso: { pitch: 24 }, footF: [10, 5, 4.2], handN: [22, -12, 12],
      sword: [90, 50], handF: [16, 10, 14], shield: [80, -70] }),
    // Over onto his face: the body goes forward over the front foot, which turns and draws back only as its knee
    // goes down; he lies with that leg bent under him.
    pose(kneel, { pelvis: [4, 14], hips: { pitch: 60 }, torso: { pitch: 18 }, footN: [-22, -4.8, 3.4], footF: [4, 5, 3.8],
      ...flat, toeF: -40, handN: [29, -13, 6], sword: [90, 60], handF: [25, 10, 7], shield: [80, -86] }),
    pose(kneel, { pelvis: [7, 9], hips: { pitch: 80 }, torso: { pitch: 6 }, footN: [-27, -4.8, 3.4], footF: [-3, 5, 3.6],
      ...flat, toeF: -70, handN: [34, -13, 4], sword: [90, 70], handF: [30, 10, 5], shield: [80, -90] }),
    pose(kneel, { pelvis: [8, 8.2], hips: { pitch: 86 }, torso: { pitch: 4 }, footN: [-28, -4.8, 3.4], footF: [-10, 5, 3.6],
      ...flat, handN: [35, -13, 3], sword: [90, 72], handF: [31, 10, 4], shield: [80, -90] }),
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
  slash_a: { size: WIDE, fps: 13, loop: false, poses: slashA(), durations: [1.2, 1.8, 0.8, 1, 1.2, 1],
    motion: [60, 0, 0] },
  slash_b: { size: WIDE, fps: 13, loop: false, poses: slashB(), durations: [1, 1.4, 0.8, 1, 1.2, 1],
    motion: [50, 0, 0] },
  slash_c: { size: WIDE, fps: 12, loop: false, poses: slashC(),
    durations: [1.2, 1.6, 1.8, 0.8, 0.9, 1.2, 1.6, 1.2], motion: [80, 0, 0] },
  smash: { size: WIDE, fps: 12, loop: false, poses: smash(),
    durations: [1.2, 1.8, 2.4, 1, 1.2, 0.7, 1.2, 2.4, 1.8, 1.2], motion: [60, 0, 0] },
  bash: { size: WIDE, fps: 12, loop: false, poses: bash(), durations: [1.4, 3, 0.8, 0.8, 1, 1.8, 1.4, 1], motion: [300, 0, 0],
    skid: true },
  sweep: { size: WIDE, fps: 13, loop: false, poses: capSweep(), durations: [1, 1.5, 1.7, 0.8, 1, 1.2, 1.2],
    motion: [50, 0, 0] },
  block: { size: WIDE, fps: 3, loop: true, poses: [CAP_GUARD, nudge(CAP_GUARD, { pelvis: [0, -0.3], torso: { pitch: 0.6 } })] },
  block_hit: { size: WIDE, fps: 12, loop: false, motion: [-50, 0, 0], poses: [
    pose(CAP_GUARD, { pelvis: [-3, 35.4], torso: { yaw: 6, pitch: 3 }, head: { pitch: -6 }, handF: [9, 3, 53], shield: [26, 14] }),
    CAP_GUARD] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(CAP_READY), durations: [1, 1.2, 0.8, 0.8, 1], motion: [-60, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(CAP_READY), durations: [0.7, 0.6, 1.4, 1.7, 1], motion: [-30, 0, 0] },
  death: { size: WIDE, fps: 8, loop: false, poses: death(CAP_READY), durations: [1, 1.2, 1.2, 0.8, 0.8, 0.7, 0.7, 0.6, 0.8, 1, 1.4, 2.4],
    motion: [-40, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
  // His end: beaten to his knee, then beheaded where he kneels.
  beaten: { size: WIDE, fps: 5, loop: true, poses: beaten(), durations: [1.4, 1, 1, 1.2] },
  executed: { size: WIDE, fps: 9, loop: false, poses: cutAway(kneelingBeheaded(), "head"),
    durations: [1.2, 1.6, 1.6, 1.2, 0.8, 0.8, 2.6], wind: [-10, 0, -6], limp: 0.9, wound: WOUNDS.head },
  ...cutDown(CAP_READY, WIDE),
  ...reactions(CAP_READY, WIDE, { steadfast: true }),
};

// --- The keshig veteran ------------------------------------------------------------------------
// A swordsman of the khan's guard, masked, a white plume: he fights as the swordsman does, but his
// quick cut is the first of two. The second comes after a held beat, rising from low behind.

/** The second cut: a held beat low behind, then the backhand climbs. Active 2-3 (chained after the cut). */
function swordCutB() {
  const low = sr({ pelvis: [1.6, 35.2], hips: { yaw: 14, pitch: 11 }, torso: { yaw: 26, pitch: 15, roll: -2 },
    head: { yaw: 2, pitch: 4 }, footF: [15, 4.8, 4.2], handN: [-2, -5, 35], sword: [-36, -14], handF: [3, 4, 44],
    shield: [22, -6] });
  const rise = sr({ pelvis: [3.6, 37], hips: { yaw: -4, pitch: 4 }, torso: { yaw: -10, pitch: 2 }, head: { yaw: 18, pitch: -6 },
    footF: [17, 4.8, LIFT], toeF: 12, handN: [17, -10, 50], sword: [118, 16], handF: [8, 3, 50], shield: [32, 6] });
  const high = sr({ pelvis: [3.8, 37.6], hips: { yaw: -12, pitch: 0 }, torso: { yaw: -22, pitch: -6, roll: 4 },
    head: { yaw: 24, pitch: -12 }, footF: [18, 4.8, 4.2], footN: [-6, -4.6, 6.8], toeN: 8, handN: [11, -9, 63],
    sword: [190, 14], handF: [9, 3, 50], shield: [34, 8] });
  return [
    low,
    nudge(low, { pelvis: [-0.3, -0.3], torso: { yaw: 2 }, handN: [-0.6, 0, -0.4] }),
    rise,
    high,
    pose(blend(high, SWORD_READY, 0.5), { footF: high.footF, footN: BACK }),
    pose(SWORD_READY, { footF: high.footF }),
  ];
}

export const VETERAN = {
  ...SWORDSMAN,
  cut_b: { size: WIDE, fps: 13, loop: false, poses: swordCutB(), durations: [1.4, 2.0, 0.8, 1, 1.2, 1], motion: [50, 0, 0] },
};

// --- The mace-bearer -------------------------------------------------------------------------
// Armoured to the collar, masked, a flanged mace in both hands. Slow, and light blows do not stop
// him: the overhead blow breaks a raised shield (parry it or roll), the sweep is merely heavy.

/** The far hand on the haft, `along` px from the near hand (negative: toward the pommel). */
const haft = (hand, [angle], along = -6) => {
  const a = (angle * Math.PI) / 180;
  return [hand[0] + along * Math.sin(a), 2.5, hand[2] - along * Math.cos(a)];
};
const MACE_READY = {
  ...SWORD_READY,
  pelvis: [0, 37.2],
  hips: { yaw: -20, pitch: 5, roll: 0 },
  torso: { yaw: -6, pitch: 7, roll: 0 },
  head: { yaw: 18, pitch: -2, roll: 0 },
  footN: [-9, -4.8, 4.2],
  footF: [9, 5, 4.2],
  handN: [4, -10, 48],
  sword: [140, 16],
  handF: haft([4, -10, 48], [140, 16]),
  shield: [0, -40],
};
/** A mace pose: the far hand follows the near one on the haft. */
const mr = (o) => {
  const p = pose(MACE_READY, o);
  return o.handF ? p : { ...p, handF: haft(p.handN, p.sword) };
};

/** The overhead blow: raised high behind, held, then down into the street. Telegraph 1, active 3-4. */
function maceSmash() {
  const raised = mr({ pelvis: [-2, 38.6], hips: { yaw: -22, pitch: -2 }, torso: { yaw: -16, pitch: -10, roll: 3 },
    head: { yaw: 20, pitch: -8 }, handN: [-2, -9, 70], sword: [204, 10] });
  const over = mr({ pelvis: [4, 36.4], hips: { yaw: -2, pitch: 10 }, torso: { yaw: 4, pitch: 14 }, head: { yaw: 8, pitch: 4 },
    footF: [14, 5, LIFT], toeF: 12, handN: [18, -9, 56], sword: [112, 4] });
  const impact = mr({ pelvis: [6, 30.4], hips: { yaw: 4, pitch: 22 }, torso: { yaw: 10, pitch: 32 }, head: { yaw: 4, pitch: 16 },
    footF: [16, 5, 4.2], footN: [-6.5, -4.8, 7.0], toeN: 6, handN: [23, -8, 27], sword: [26, -4] });
  return [
    blend(MACE_READY, raised, 0.6),
    raised,
    nudge(raised, { torso: { pitch: -1.5 }, handN: [-0.6, 0, 0.8], sword: [3, 0] }),
    over,
    impact,
    nudge(impact, { pelvis: [0, -0.4], torso: { pitch: 1 } }),
    pose(blend(impact, MACE_READY, 0.5), { footF: impact.footF, footN: CAP_BACK, handF: haft(blend(impact, MACE_READY, 0.5).handN,
      blend(impact, MACE_READY, 0.5).sword) }),
    pose(MACE_READY, { footF: impact.footF }),
  ];
}

/** The sweep: coiled back at the shoulder, then across at the body. Telegraph 1, active 3-4. */
function maceSwing() {
  const coiled = mr({ pelvis: [-2.4, 36.6], hips: { yaw: -34, pitch: 4 }, torso: { yaw: -36, pitch: 2, roll: 3 },
    head: { yaw: 30, pitch: -4 }, handN: [-8, -10, 52], sword: [244, 20] });
  const across = mr({ pelvis: [3.6, 35.6], hips: { yaw: 4, pitch: 10 }, torso: { yaw: 12, pitch: 12, roll: -2 },
    head: { yaw: 8, pitch: 0 }, footF: [13, 5, LIFT], toeF: 12, handN: [17, -9, 46], sword: [94, 4] });
  const through = mr({ pelvis: [4.4, 35], hips: { yaw: 14, pitch: 12 }, torso: { yaw: 32, pitch: 16, roll: -3 },
    head: { yaw: 2, pitch: 4 }, footF: [15, 5, 4.2], footN: [-7, -4.8, 6.4], toeN: 6, handN: [11, -2, 40], sword: [56, -40] });
  return [
    blend(MACE_READY, coiled, 0.6),
    coiled,
    nudge(coiled, { torso: { yaw: -1.5 }, handN: [-0.6, 0, 0.3] }),
    across,
    through,
    pose(through, { footN: CAP_BACK, toeN: 0 }),
    pose(blend(through, MACE_READY, 0.5), { footF: through.footF, footN: CAP_BACK }),
    pose(MACE_READY, { footF: through.footF }),
  ];
}

function maceAlert() {
  return [
    mr({ pelvis: [-1, 38.6], torso: { pitch: -4 }, head: { yaw: 22, pitch: -10 }, handN: [2, -10, 52], sword: [160, 16] }),
    mr({ pelvis: [0.6, 37.2], torso: { yaw: 0, pitch: 8 }, head: { yaw: 12, pitch: -12 }, handN: [8, -10, 56], sword: [120, 10] }),
    MACE_READY,
  ];
}

export const MACEMAN = {
  idle: { size: BODY, fps: 6, loop: true, poses: breathCycle(MACE_READY, 8).map((p) => ({ ...p, handF: haft(p.handN, p.sword) })) },
  walk: { size: BODY, fps: 8, loop: true, motion: [38, 0, 0], poses: walkCycle(MACE_READY, (i, swing, bob) => ({
    handN: [4 - swing * 1.5, -10, 48 + bob], sword: [140 - swing * 3, 16] })).map((p) => ({ ...p, handF: haft(p.handN, p.sword) })) },
  run: { size: BODY, fps: 11, loop: true, motion: [84, 0, 0], poses: runCycle(MACE_READY, (i, swing, lift) => ({
    handN: [2 - swing * 3, -10, 47 - Math.abs(swing)], sword: [148 - swing * 5, 16] })).map((p) => ({ ...p,
    handF: haft(p.handN, p.sword) })) },
  alert: { size: BODY, fps: 8, loop: false, poses: maceAlert(), durations: [1, 2, 1] },
  mace_smash: { size: WIDE, fps: 12, loop: false, poses: maceSmash(), durations: [1.2, 2.2, 1.2, 0.8, 1, 2.2, 1.4, 1.2],
    motion: [50, 0, 0] },
  mace_swing: { size: WIDE, fps: 12, loop: false, poses: maceSwing(), durations: [1.2, 1.8, 1, 0.8, 1, 1.6, 1.4, 1.2],
    motion: [50, 0, 0] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(MACE_READY, { sword: 150, shieldFace: 0 }), durations: [1, 1.2, 0.8, 0.8, 1],
    motion: [-60, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(MACE_READY, { sword: 60, shieldFace: 0 }), durations: [0.7, 0.6, 1.4, 1.7, 1],
    motion: [-30, 0, 0] },
  death: { size: WIDE, fps: 9, loop: false, poses: death(MACE_READY, { sword: 140, shieldFace: 0, arms: { shield: [0, 60] } }),
    durations: [1, 1.2, 1.2, 0.8, 0.8, 0.7, 0.7, 0.6, 0.8, 1, 1.4, 2.4], motion: [-40, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
  ...cutDown(MACE_READY, WIDE, { sword: 140, shieldFace: 0, arms: { shield: [0, 60] } }),
  ...finishedSet(MACE_READY, WIDE, { sword: 140, shieldFace: 0, arms: { shield: [0, 60] } }),
  ...reactions(MACE_READY, WIDE, { sword: 140, shieldFace: 0, arms: { shield: [0, 60] }, steadfast: true }),
};

// --- The Georgian shield-bearer ------------------------------------------------------------------
// Behind a tall shield, a short spear held overhand above its rim. His shield turns every blow from
// the front; he jabs over it, and shoves with it.

const WALL_READY = {
  ...SWORD_READY,
  pelvis: [-0.6, 36.6],
  hips: { yaw: -12, pitch: 8, roll: 0 },
  torso: { yaw: 6, pitch: 10, roll: 0 },
  head: { yaw: 10, pitch: 0, roll: 0 },
  footN: [-9, -4.6, 4.2],
  footF: [8, 4.8, 4.2],
  handF: [13, 3, 46],
  shield: [26, 2],
  handN: [3, -10, 60],
  sword: [100, 6],
};
const wr = (o) => pose(WALL_READY, o);

/** The jab over the shield's rim. Telegraph 1, active 3-4. */
function wallJab() {
  const drawn = wr({ pelvis: [-1.6, 36.4], torso: { yaw: -4, pitch: 8 }, handN: [-5, -10, 62], sword: [100, 6] });
  const jab = wr({ pelvis: [2.6, 35.8], hips: { yaw: -4, pitch: 10 }, torso: { yaw: 14, pitch: 12 }, footF: [11, 4.8, LIFT],
    toeF: 10, handN: [22, -9, 58], sword: [98, 4], handF: [15, 3, 46] });
  const reach = pose(jab, { pelvis: [3, 35.6], footF: [12, 4.8, 4.2], toeF: 0, handN: [25, -9, 57.5] });
  return [
    blend(WALL_READY, drawn, 0.6),
    drawn,
    nudge(drawn, { handN: [-0.6, 0, 0.3] }),
    jab,
    reach,
    pose(blend(reach, WALL_READY, 0.5), { footF: reach.footF, footN: BACK }),
    pose(WALL_READY, { footF: reach.footF }),
  ];
}

/** The shove: set behind the shield, then driven into the man before him. Telegraph 1, active 2-3. */
function wallShove() {
  const set = wr({ pelvis: [-3, 35], hips: { yaw: -8, pitch: 12 }, torso: { yaw: 4, pitch: 14 }, head: { yaw: 8, pitch: 4 },
    footN: [-11, -4.6, 4.2], handF: [9, 3, 45], handN: [-2, -10, 58] });
  const shove = wr({ pelvis: [4.4, 35.4], hips: { yaw: -16, pitch: 14 }, torso: { yaw: -10, pitch: 16 }, head: { yaw: 10, pitch: 6 },
    footF: [13, 4.8, LIFT], toeF: 10, footN: [-6, -4.6, 6.6], toeN: 6, handF: [22, 3, 47], handN: [6, -10, 58] });
  return [
    blend(WALL_READY, set, 0.6),
    set,
    shove,
    pose(shove, { pelvis: [4.8, 35.2], footF: [14, 4.8, 4.2], toeF: 0, handF: [23, 3, 47] }),
    pose(blend(shove, WALL_READY, 0.5), { footF: shove.footF, footN: BACK }),
    pose(WALL_READY, { footF: shove.footF }),
  ];
}

function wallAlert() {
  return [
    wr({ pelvis: [-1, 38], torso: { pitch: 2 }, head: { yaw: 18, pitch: -8 }, handF: [9, 3, 44], shield: [30, -10] }),
    wr({ pelvis: [-0.4, 37], head: { yaw: 12, pitch: -6 }, handF: [12, 3, 46] }),
    WALL_READY,
  ];
}

const WALL_HIT = [
  wr({ pelvis: [-3, 36.2], torso: { yaw: 2, pitch: 4 }, head: { pitch: -6 }, handF: [10, 3, 47], shield: [32, 8] }),
  WALL_READY,
];

export const SHIELDBEARER = {
  idle: { size: WIDE, fps: 6, loop: true, poses: breathCycle(WALL_READY, 8, (i, breath) => ({ sword: [breath * 2, 0] })) },
  walk: { size: WIDE, fps: 8, loop: true, motion: [34, 0, 0], poses: walkCycle(WALL_READY, (i, swing, bob) => ({
    handN: [3 - swing, -10, 60 + bob], handF: [13 + swing * 0.8, 3, 46 + bob], sword: [100 - swing * 2, 6] })) },
  run: { size: WIDE, fps: 11, loop: true, motion: [70, 0, 0], poses: runCycle(WALL_READY, (i, swing, lift) => ({
    handN: [3 - swing * 2, -10, 59], handF: [12 + swing, 3, 46 + lift * 0.4], sword: [100 - swing * 3, 6] })) },
  alert: { size: WIDE, fps: 8, loop: false, poses: wallAlert(), durations: [1, 2, 1] },
  wall_jab: { size: WIDE, fps: 12, loop: false, poses: wallJab(), durations: [1, 2, 1, 0.8, 1, 1.4, 1.2], motion: [40, 0, 0] },
  wall_shove: { size: WIDE, fps: 12, loop: false, poses: wallShove(), durations: [1, 2.8, 0.8, 1, 1.4, 1.2], motion: [60, 0, 0] },
  block: { size: WIDE, fps: 3, loop: true, poses: [WALL_READY, nudge(WALL_READY, { pelvis: [0, -0.3], torso: { pitch: 0.6 } })] },
  block_hit: { size: WIDE, fps: 12, loop: false, motion: [-50, 0, 0], poses: WALL_HIT },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(WALL_READY, { sword: 120, shieldFace: 30 }), durations: [1, 1.2, 0.8, 0.8, 1],
    motion: [-70, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(WALL_READY, { sword: 40, shieldFace: 70 }), durations: [0.7, 0.6, 1.2, 1.5, 1],
    motion: [-40, 0, 0] },
  death: { size: WIDE, fps: 10, loop: false, poses: death(WALL_READY, { sword: 130 }),
    durations: [1, 1, 1, 0.7, 0.7, 0.6, 0.6, 0.6, 0.8, 1, 1.2, 2], motion: [-50, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
  ...cutDown(WALL_READY, WIDE, { sword: 130 }),
  ...finishedSet(WALL_READY, WIDE, { sword: 130 }),
  ...reactions(WALL_READY, WIDE, { sword: 130 }),
};

// --- The siege engineer --------------------------------------------------------------------------
// One of Hulegu's engineers, in a felt cap and no armour, a pot of burning naphtha in his hand and
// more at his hip. He keeps his distance and lobs them; they burst into fire where they land.

const POTS = ["pot", "wick"];
const POT_READY = {
  ...SWORD_READY,
  hips: { yaw: -12, pitch: 3, roll: 0 },
  torso: { yaw: -4, pitch: 4, roll: 0 },
  head: { yaw: 14, pitch: -4, roll: 0 },
  handN: [5, -9, 42],
  sword: [90, 0],
  handF: [9, 4, 44],
  shield: [0, -40],
  show: POTS,
};
const pr = (o) => pose(POT_READY, o);
/** His stance without a pot in hand (it is thrown, or it fell with him). */
const EMPTY_HANDED = { ...POT_READY, show: [] };

/** The lob: the pot drawn back high, held, then thrown overhand. Telegraph 1, the pot leaves on 3. */
function throwPot() {
  const wind = pr({ pelvis: [-2, 38], hips: { yaw: -26, pitch: 0 }, torso: { yaw: -28, pitch: -8, roll: 3 },
    head: { yaw: 26, pitch: -12 }, handN: [-10, -9, 62], sword: [200, 10], handF: [15, 4, 54], shield: [0, 0] });
  const loose = pr({ show: [], pelvis: [3, 36.6], hips: { yaw: 4, pitch: 8 }, torso: { yaw: 16, pitch: 14, roll: -2 },
    head: { yaw: 8, pitch: -4 }, footF: [12, 4.8, LIFT], toeF: 10, handN: [17, -9, 58], sword: [110, 0], handF: [4, 4, 42] });
  const follow = pose(loose, { pelvis: [3.6, 35.8], footF: [13, 4.8, 4.2], toeF: 0, torso: { yaw: 24, pitch: 18 },
    handN: [14, -4, 38], sword: [40, -10] });
  return [
    blend(POT_READY, wind, 0.6),
    wind,
    nudge(wind, { torso: { yaw: -1 }, handN: [-0.5, 0, 0.4] }),
    loose,
    follow,
    pose(blend(follow, EMPTY_HANDED, 0.5), { show: [], footF: follow.footF, footN: BACK }),
    // A fresh pot from the strap at his hip.
    pr({ show: [], hips: { yaw: -16, pitch: 6 }, torso: { yaw: -14, pitch: 10 }, head: { yaw: 10, pitch: 10 }, footF: follow.footF,
      handN: [-4, -9, 36], sword: [180, 0] }),
    pose(POT_READY, { footF: follow.footF }),
  ];
}

function potAlert() {
  return [
    pr({ pelvis: [-1, 38.6], torso: { pitch: -4 }, head: { yaw: 20, pitch: -10 }, handN: [2, -9, 46] }),
    pr({ pelvis: [0.4, 37.6], torso: { yaw: -8, pitch: 4 }, head: { yaw: 16, pitch: -8 }, handN: [-2, -9, 50] }),
    POT_READY,
  ];
}

const POT_ARMS = { sword: 100, shieldFace: 0, arms: { shield: [0, 60] } };
export const ENGINEER = {
  idle: { size: BODY, fps: 7, loop: true, poses: breathCycle(POT_READY, 8) },
  walk: { size: BODY, fps: 10, loop: true, motion: [50, 0, 0], poses: walkCycle(POT_READY, (i, swing, bob) => ({
    handN: [5 - swing * 2, -9, 42 + bob], handF: [9 + swing * 3, 4, 44 + bob] })) },
  run: { size: BODY, fps: 13, loop: true, motion: [110, 0, 0], poses: runCycle(POT_READY, (i, swing, lift) => ({
    handN: [3 - swing * 5, -9, 42 - Math.abs(swing)], handF: [8 + swing * 5, 4, 44 + swing * 1.5 + lift * 0.5] })) },
  alert: { size: BODY, fps: 8, loop: false, poses: potAlert(), durations: [1, 2, 1] },
  throw_pot: { size: WIDE, fps: 10, loop: false, poses: throwPot(), durations: [1, 2.2, 1, 0.8, 1, 1.2, 1.2, 1] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(EMPTY_HANDED, POT_ARMS).map((p) => ({ ...p, shield: [0, -20] })),
    durations: [1, 1.2, 0.8, 0.8, 1], motion: [-80, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(EMPTY_HANDED, { sword: 40, shieldFace: 0 }), durations: [0.7, 0.6, 1.2, 1.5, 1],
    motion: [-40, 0, 0] },
  death: { size: WIDE, fps: 10, loop: false, poses: death(EMPTY_HANDED, POT_ARMS),
    durations: [1, 1, 1, 0.7, 0.7, 0.6, 0.6, 0.6, 0.8, 1, 1.2, 2], motion: [-50, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
  ...cutDown(EMPTY_HANDED, WIDE, POT_ARMS),
  ...finishedSet(EMPTY_HANDED, WIDE, POT_ARMS),
  ...reactions(EMPTY_HANDED, WIDE, POT_ARMS),
};

// --- The Kipchak skirmisher ----------------------------------------------------------------------
// A horseman of the steppe fighting on foot: no armour and no shield, a short sabre and a long
// knife. Light on his feet, he hangs at the edge of reach, dashes in with a cut (the knife may
// follow it at once), and springs back out of reach of a heavy blow.

const KNIFE = ["dagger", "daggerGrip", "daggerGuard"];
/** The knife hand's face: up and a little away, so the blade shows its width along the arm. */
const KNIFE_FACE = [-30, 60];
const SKIRM_READY = {
  ...SWORD_READY,
  pelvis: [0.4, 35.6],
  hips: { yaw: -22, pitch: 9, roll: 0 },
  torso: { yaw: 8, pitch: 10, roll: 0 },
  head: { yaw: 10, pitch: -8, roll: 0 },
  footN: [-10, -4.8, 4.2],
  footF: [9, 5, 4.2],
  footYawN: -36,
  footYawF: -8,
  handN: [10, -10, 44],
  sword: [124, 14],
  handF: [11, 8, 40],
  // The knife arm's elbow kept down at his side, so the blade runs on along the forearm toward the enemy.
  elbowF: [-0.4, 0.15, -1],
  shield: KNIFE_FACE,
};
const kr = (o) => pose(SKIRM_READY, o);
const SKIRM_BACK = [-10, -4.8, 4.2];

/** The dash: crouched low, the sabre trailing behind; a spring across the street and the blade rising
 * through the man before him. Telegraph 1, the lunge on 2-3, active 3-4. */
function dashCut() {
  const coil = kr({ pelvis: [-3, 31.4], hips: { yaw: -30, pitch: 16 }, torso: { yaw: -18, pitch: 16, roll: 2 },
    head: { yaw: 38, pitch: -12 }, footN: [-13, -4.8, 4.2], footF: [7, 5, 4.2], handN: [-9, -9, 33], sword: [-66, -8],
    handF: [13, 5, 41] });
  const launch = kr({ pelvis: [3, 34.2], hips: { yaw: -22, pitch: 14 }, torso: { yaw: -12, pitch: 16 }, head: { yaw: 34, pitch: -10 },
    footF: [13.4, 5, LIFT + 1], toeF: 16, footN: [-9, -4.8, 5.8], toeN: -24, handN: [-10, -9, 35], sword: [-78, -6],
    handF: [15, 5, 44] });
  const strike = kr({ pelvis: [6, 31.8], hips: { yaw: 6, pitch: 16 }, torso: { yaw: 22, pitch: 14, roll: -3 },
    head: { yaw: 4, pitch: -4 }, footF: [17, 5, 4.2], toeF: 0, footN: [-7, -4.8, 6.2], toeN: -10, handN: [22, -10, 44],
    sword: [96, 6], handF: [6, 11, 41], elbowF: [-1, 0.3, -0.4] });
  const through = kr({ pelvis: [6.6, 32.6], hips: { yaw: 10, pitch: 10 }, torso: { yaw: 26, pitch: 6, roll: -4 },
    head: { yaw: 2, pitch: -10 }, footF: [17, 5, 4.2], footN: [-6, -4.8, 6.6], toeN: -6, handN: [16, -9, 60],
    sword: [172, 12], handF: [5, 11, 43], elbowF: [-1, 0.3, -0.4] });
  return [
    blend(SKIRM_READY, coil, 0.6),
    coil,
    launch,
    strike,
    through,
    pose(blend(through, SKIRM_READY, 0.5), { footF: through.footF, footN: [-8, -4.8, LIFT], toeN: 6 }),
    pose(SKIRM_READY, { footF: through.footF }),
  ];
}

/** The quick cut, close in: a forehand from behind the shoulder. Telegraph 1, active 2-3. */
function skirmCut() {
  const back = kr({ pelvis: [-2, 35], hips: { yaw: -30, pitch: 6 }, torso: { yaw: -24, pitch: 2, roll: 4 },
    head: { yaw: 32, pitch: -6 }, handN: [-4, -8.5, 60], sword: [228, 14], handF: [13, 5, 44] });
  const strike = kr({ pelvis: [3.4, 34.2], hips: { yaw: 4, pitch: 12 }, torso: { yaw: 16, pitch: 14, roll: -2 }, head: { yaw: 8 },
    footF: [13, 5, LIFT], toeF: 12, handN: [19, -9, 45], sword: [92, 4], handF: [6, 11, 41], elbowF: [-1, 0.3, -0.4] });
  const through = kr({ pelvis: [4.2, 33.2], hips: { yaw: 12, pitch: 14 }, torso: { yaw: 28, pitch: 20, roll: -3 },
    head: { yaw: 2, pitch: 6 }, footF: [15, 5, 4.2], footN: [-8, -4.8, 6.6], toeN: 8, handN: [12, -3, 31], sword: [22, -10],
    handF: [4, 11, 40], elbowF: [-1, 0.3, -0.4] });
  return [
    blend(SKIRM_READY, back, 0.6),
    back,
    strike,
    through,
    pose(blend(through, SKIRM_READY, 0.45), { footF: through.footF, footN: SKIRM_BACK }),
    pose(SKIRM_READY, { footF: through.footF }),
  ];
}

/** The knife after the cut: the sabre lifted clear, the far shoulder driven round, the point at the
 * belly. Chained (it comes at once): active 1-2. */
function knifeStab() {
  const draw = kr({ pelvis: [-1, 34.4], hips: { yaw: -10, pitch: 10 }, torso: { yaw: 18, pitch: 12 }, head: { yaw: 6 },
    handF: [3, 10, 42], elbowF: [-1, 0.3, -0.4], handN: [6, -10, 50], sword: [150, 16] });
  const stab = kr({ pelvis: [4, 33.6], hips: { yaw: -30, pitch: 12 }, torso: { yaw: -26, pitch: 14 }, head: { yaw: 34, pitch: -4 },
    footF: [14, 5, LIFT], toeF: 12, handF: [33, 3, 45], elbowF: [-1, 0, -0.35], handN: [0, -10, 47], sword: [200, 16] });
  const home = pose(stab, { pelvis: [4.4, 33.4], footF: [15, 5, 4.2], toeF: 0, handF: [35, 3, 44.5] });
  return [
    draw,
    stab,
    home,
    pose(blend(home, SKIRM_READY, 0.5), { footF: home.footF, footN: [-8, -4.8, LIFT], toeN: 6 }),
    pose(SKIRM_READY, { footF: home.footF }),
  ];
}

/** Out of reach in one spring: crouched, off both feet and thrown back with the knees drawn up and both
 * blades kept toward the enemy, down again in a crouch. Untouchable in the air (the game plays it). */
function backLeap() {
  const crouch = kr({ pelvis: [0.6, 30.4], hips: { yaw: -18, pitch: 16 }, torso: { yaw: 4, pitch: 12 }, head: { yaw: 10, pitch: -10 },
    footN: [-9, -4.8, 4.2], footF: [8, 5, 4.2], handN: [12, -10, 38], sword: [118, 14], handF: [12, 8, 36] });
  const spring = kr({ pelvis: [-2.4, 37.6], hips: { yaw: -16, pitch: -8 }, torso: { yaw: 2, pitch: 4 }, head: { yaw: 10, pitch: -12 },
    footN: [-6, -4.8, 8.4], toeN: -34, footF: [7, 5, 10.6], toeF: 6, handN: [10, -10, 46], sword: [112, 14], handF: [10, 8, 44] });
  const apex = kr({ pelvis: [-4.4, 42.6], hips: { yaw: -16, pitch: -12 }, torso: { yaw: 2, pitch: 10 }, head: { yaw: 10, pitch: -10 },
    footN: [-3.6, -4.8, 14.8], toeN: 8, footF: [8, 5, 17.6], toeF: 16, handN: [9, -10, 50], sword: [116, 14], handF: [9, 8, 48] });
  const fall = kr({ pelvis: [-4, 39], hips: { yaw: -18, pitch: -6 }, torso: { yaw: 4, pitch: 8 }, head: { yaw: 10, pitch: -8 },
    footN: [-6, -4.8, 10], toeN: -18, footF: [5, 5, 11.6], toeF: -8, handN: [10, -10, 47], sword: [118, 14], handF: [10, 8, 45] });
  const land = kr({ pelvis: [-1.4, 29.8], hips: { yaw: -18, pitch: 20 }, torso: { yaw: 6, pitch: 16 }, head: { yaw: 10, pitch: -12 },
    footN: [-10, -4.8, 4.2], footF: [7, 5, 4.2], handN: [12, -10, 38], sword: [116, 12], handF: [12, 8, 36] });
  return [crouch, blend(crouch, spring, 0.5), spring, apex, fall, blend(fall, land, 0.5), land, blend(land, SKIRM_READY, 0.55),
    SKIRM_READY];
}

function skirmAlert() {
  return [
    kr({ pelvis: [-1, 37.4], torso: { pitch: -2 }, head: { yaw: 20, pitch: -12 }, handN: [6, -10, 44], sword: [130, 14] }),
    kr({ pelvis: [0.6, 35], torso: { yaw: 12, pitch: 10 }, head: { yaw: 10, pitch: -12 }, handN: [14, -10, 46], sword: [104, 8],
      handF: [11, 5, 47] }),
    SKIRM_READY,
  ];
}

const SKIRM_ARMS = { sword: 140, shieldFace: -30, arms: { shield: KNIFE_FACE } };
/** Looting, the sabre and the knife both put away. */
const SKIRM_LOOT = () => loot().map((p) => ({ ...p, hide: [...(p.hide ?? []), ...KNIFE] }));

export const SKIRMISHER = {
  idle: { size: BODY, fps: 8, loop: true, poses: breathCycle(SKIRM_READY, 8, (i, breath) => ({ sword: [breath * 3, 0] })) },
  walk: { size: BODY, fps: 11, loop: true, motion: [52, 0, 0], poses: walkCycle(SKIRM_READY, (i, swing, bob) => ({
    handN: [10 - swing * 2, -10, 44 + bob], handF: [11 + swing * 2, 8, 40 + bob], sword: [124 - swing * 4, 14] })) },
  run: { size: BODY, fps: 14, loop: true, motion: [124, 0, 0], poses: runCycle(SKIRM_READY, (i, swing, lift) => ({
    handF: [9 + swing * 3, 8, 41 + swing + lift * 0.5], handN: [2 - swing * 6, -10, 38 - Math.abs(swing) * 1.5],
    sword: [236 - swing * 8, 16] }), { lean: 12 }) },
  alert: { size: BODY, fps: 9, loop: false, poses: skirmAlert(), durations: [1, 2, 1] },
  // He lands the dash on his front foot and skids on it: the feet travel with him.
  dash_cut: { size: WIDE, fps: 12, loop: false, poses: dashCut(), durations: [1, 2.8, 0.8, 0.8, 1, 1.2, 1.2],
    motion: [60, 0, 0], skid: true },
  quick_cut: { size: WIDE, fps: 12, loop: false, poses: skirmCut(), durations: [1, 2.8, 0.8, 1, 1.4, 1.2],
    motion: [40, 0, 0] },
  knife_stab: { size: WIDE, fps: 12, loop: false, poses: knifeStab(), durations: [1, 0.8, 1.2, 1.2, 1.2], motion: [40, 0, 0] },
  evade: { size: WIDE, fps: 16, loop: false, poses: backLeap(), durations: [1, 0.6, 0.8, 1.2, 0.8, 0.6, 1.2, 1, 1],
    motion: [-120, 0, 0] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(SKIRM_READY, SKIRM_ARMS), durations: [1, 1.2, 0.8, 0.8, 1],
    motion: [-90, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(SKIRM_READY, { sword: 60, shieldFace: -30 }),
    durations: [0.7, 0.6, 1.2, 1.5, 1], motion: [-40, 0, 0] },
  death: { size: WIDE, fps: 10, loop: false, poses: death(SKIRM_READY, SKIRM_ARMS),
    durations: [1, 1, 1, 0.7, 0.7, 0.6, 0.6, 0.6, 0.8, 1, 1.2, 2], motion: [-50, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
  loot: { size: BODY, fps: 6, loop: true, poses: SKIRM_LOOT(), durations: [1.6, 1, 1.4, 1, 2.2, 1, 0.8] },
  ...cutDown(SKIRM_READY, WIDE, SKIRM_ARMS),
  ...finishedSet(SKIRM_READY, WIDE, SKIRM_ARMS),
  ...reactions(SKIRM_READY, WIDE, SKIRM_ARMS),
};

// --- The Georgian axeman --------------------------------------------------------------------------
// Mail to the knee, a conical helm, a long bearded axe in both hands. He fights for the distance:
// the hook drags a man in from beyond a sword's reach (and tears a raised shield aside), the butt
// drives off one who crowds him, and between them the chop (it breaks a guard and floors a man) and
// the low sweep (amber: jump it or roll).

/** The far hand on the axe's haft, \`along\` px from the near hand (negative: toward the butt). */
const axeGrip = (hand, [angle], along = -10) => haft(hand, [angle], along);
/** Which way the axe's edge faces: leading a blow whose angle falls (overhand) or rises (underhand). */
const overhand = (angle) => { const a = (angle * Math.PI) / 180; return [-Math.cos(a), 0, -Math.sin(a)]; };
const underhand = (angle) => { const a = (angle * Math.PI) / 180; return [Math.cos(a), 0, Math.sin(a)]; };
const AXE_READY = {
  ...SWORD_READY,
  pelvis: [0, 37],
  hips: { yaw: -22, pitch: 5, roll: 0 },
  torso: { yaw: -4, pitch: 7, roll: 0 },
  head: { yaw: 18, pitch: -2, roll: 0 },
  footN: [-10, -4.8, 4.2],
  footF: [9, 5, 4.2],
  handN: [7, -10, 45],
  sword: [124, 16],
  edge: overhand(124),
  handF: axeGrip([7, -10, 45], [124, 16]),
  shield: [0, -40],
};
/** An axe pose: the far hand follows the near one down the haft, the edge leads an overhand blow. */
const ar = (o, along = -10) => {
  const p = pose(AXE_READY, o);
  return { ...p, handF: o.handF ?? axeGrip(p.handN, p.sword, along), edge: o.edge ?? overhand(p.sword[0]) };
};

/** The chop: the axe raised high behind, held, then over and down into the street before him, where
 * it bites and stays a moment. Telegraph 1, active 3-4. */
function axeChop() {
  const raised = ar({ pelvis: [-2.4, 38.6], hips: { yaw: -20, pitch: -4 }, torso: { yaw: -12, pitch: -12, roll: 3 },
    head: { yaw: 18, pitch: -8 }, handN: [-3, -9, 71], sword: [214, 10] });
  const over = ar({ pelvis: [4, 36.4], hips: { yaw: -2, pitch: 10 }, torso: { yaw: 4, pitch: 14 }, head: { yaw: 8, pitch: 4 },
    footF: [14, 5, LIFT], toeF: 12, handN: [19, -9, 58], sword: [112, 4] });
  const impact = ar({ pelvis: [5.6, 28.6], hips: { yaw: 4, pitch: 12 }, torso: { yaw: 10, pitch: 18 }, head: { yaw: 4, pitch: 6 },
    footF: [18, 5, 4.2], footN: [-6.5, -4.8, 7], toeN: 6, handN: [22, -8, 28], sword: [44, -4] });
  const wrench = ar({ pelvis: [3, 33.2], hips: { yaw: -8, pitch: 10 }, torso: { yaw: -6, pitch: 12 }, head: { yaw: 12, pitch: 4 },
    footF: impact.footF, footN: [-6, -4.8, LIFT], toeN: 6, handN: [14, -9, 38], sword: [86, 8] });
  return [
    blend(AXE_READY, raised, 0.6),
    raised,
    ar({ ...raised, handN: [-3.6, -9, 72], sword: [218, 10], torso: { yaw: -13, pitch: -13.5, roll: 3 } }),
    over,
    impact,
    ar({ ...impact, pelvis: [5.6, 28.2], torso: { yaw: 10, pitch: 19 } }),
    wrench,
    pose(AXE_READY, { footF: impact.footF }),
  ];
}

/** The hook: the axe reached out level past a man's guard, its beard turned down, and wrenched back
 * toward him (dragging what it caught). Telegraph 1, the reach on 2, active 3-4. */
function axeHook() {
  const down = [0, 0, -1];
  const cock = ar({ pelvis: [-2.4, 37], hips: { yaw: -28, pitch: 2 }, torso: { yaw: -20, pitch: 0, roll: 2 },
    head: { yaw: 28, pitch: -4 }, footN: [-12, -4.8, 4.2], handN: [0, -10, 51], sword: [94, 10], edge: down });
  const reach = ar({ pelvis: [4, 36.2], hips: { yaw: -8, pitch: 9 }, torso: { yaw: 4, pitch: 10 }, head: { yaw: 12 },
    footF: [15, 5, LIFT], toeF: 12, footN: [-8, -4.8, LIFT], toeN: 4, handN: [18, -9, 52], sword: [98, 6], edge: down });
  const hooked = ar({ pelvis: [1.4, 35.4], hips: { yaw: -20, pitch: 8 }, torso: { yaw: -18, pitch: 6, roll: 2 },
    head: { yaw: 22, pitch: -2 }, footF: [15, 5, 4.2], toeF: 0, footN: [-11, -4.8, 4.2], handN: [8, -9, 47], sword: [104, 8],
    edge: down });
  return [
    blend(AXE_READY, cock, 0.6),
    cock,
    blend(cock, reach, 0.45),
    reach,
    hooked,
    ar({ ...hooked, pelvis: [0.6, 35.6], handN: [5, -9, 47], sword: [108, 8], edge: down }),
    pose(blend(hooked, AXE_READY, 0.5), { footF: hooked.footF }),
    pose(AXE_READY, { footF: hooked.footF }),
  ];
}

/** The butt, for a man pressed too close for the head: the haft turned, its end driven into his chest.
 * Telegraph 0, active 1-2. */
function axeJab() {
  const turned = ar({ pelvis: [-1.4, 36.6], hips: { yaw: -14, pitch: 6 }, torso: { yaw: -6, pitch: 6 }, head: { yaw: 18 },
    handN: [4, -9, 48], sword: [250, 12], edge: [0, 0, 1] }, 10);
  const jab = ar({ pelvis: [3.4, 35.8], hips: { yaw: -4, pitch: 10 }, torso: { yaw: 8, pitch: 10 }, head: { yaw: 10 },
    footF: [13, 5, LIFT], toeF: 10, footN: [-8, -4.8, LIFT], toeN: 4, handN: [18, -9, 50], sword: [264, 8],
    edge: [0, 0, 1] }, 10);
  const home = ar({ ...jab, footF: [14, 5, 4.2], toeF: 0, footN: [-8, -4.8, 4.2], toeN: 0, handN: [20, -9, 50],
    edge: [0, 0, 1] }, 10);
  return [
    turned,
    jab,
    home,
    pose(blend(home, AXE_READY, 0.5), { footF: home.footF, footN: CAP_BACK, handF: axeGrip(blend(home, AXE_READY, 0.5).handN,
      blend(home, AXE_READY, 0.5).sword) }),
    pose(AXE_READY, { footF: home.footF }),
  ];
}

/** The low sweep: drawn back low behind, held, then round at the shins. Telegraph 1, active 3-4. */
function axeSweep() {
  const coiled = ar({ pelvis: [-3, 33], hips: { yaw: -36, pitch: 10 }, torso: { yaw: -30, pitch: 12, roll: 3 },
    head: { yaw: 36, pitch: 0 }, footN: [-12, -4.8, 4.2], handN: [-8, -10, 34], sword: [262, 30], edge: underhand(262) });
  const across = ar({ pelvis: [3.6, 31], hips: { yaw: 6, pitch: 16 }, torso: { yaw: 16, pitch: 20 }, head: { yaw: 6, pitch: 8 },
    footF: [14, 5, LIFT], toeF: 12, handN: [16, -9, 30], sword: [56, -12], edge: underhand(56) });
  const through = ar({ pelvis: [4.4, 31], hips: { yaw: 18, pitch: 16 }, torso: { yaw: 34, pitch: 20 }, head: { yaw: 2, pitch: 8 },
    footF: [15, 5, 4.2], toeF: 0, footN: [-7, -4.8, 6.4], toeN: 6, handN: [12, -2, 27], sword: [74, -60], edge: underhand(74) });
  return [
    blend(AXE_READY, coiled, 0.6),
    coiled,
    ar({ ...coiled, torso: { yaw: -31.5, pitch: 12, roll: 3 }, handN: [-8.6, -10, 34.3], edge: underhand(262) }),
    across,
    through,
    pose(through, { footN: CAP_BACK, toeN: 0 }),
    ...[0.42, 0.78].map((k) => {
      const b = blend(through, AXE_READY, k);
      return pose(b, { footF: through.footF, footN: CAP_BACK, handF: axeGrip(b.handN, b.sword), edge: overhand(b.sword[0]) });
    }),
    pose(AXE_READY, { footF: through.footF }),
  ];
}

function axeAlert() {
  return [
    ar({ pelvis: [-1, 38.4], torso: { pitch: -4 }, head: { yaw: 22, pitch: -10 }, handN: [3, -10, 50], sword: [158, 16] }),
    ar({ pelvis: [0.6, 37.2], torso: { yaw: 0, pitch: 8 }, head: { yaw: 12, pitch: -12 }, handN: [9, -10, 50], sword: [118, 10] }),
    AXE_READY,
  ];
}

const AXE_ARMS = { sword: 140, shieldFace: 0, arms: { shield: [0, 60] } };
const withGrip = (poses) => poses.map((p) => ({ ...p, handF: axeGrip(p.handN, p.sword), edge: overhand(p.sword[0]) }));

export const AXEMAN = {
  idle: { size: BODY, fps: 6, loop: true, poses: withGrip(breathCycle(AXE_READY, 8, (i, breath) => ({ sword: [breath * 2, 0] }))) },
  walk: { size: BODY, fps: 8, loop: true, motion: [36, 0, 0], poses: withGrip(walkCycle(AXE_READY, (i, swing, bob) => ({
    handN: [7 - swing * 1.5, -10, 45 + bob], sword: [124 - swing * 3, 16] }))) },
  run: { size: BODY, fps: 11, loop: true, motion: [82, 0, 0], poses: withGrip(runCycle(AXE_READY, (i, swing, lift) => ({
    handN: [5 - swing * 3, -10, 45 - Math.abs(swing)], sword: [132 - swing * 5, 16] }))) },
  alert: { size: BODY, fps: 8, loop: false, poses: axeAlert(), durations: [1, 2, 1] },
  axe_chop: { size: LONG, fps: 12, loop: false, poses: axeChop(), durations: [1.2, 2.4, 1.4, 0.8, 1, 2.6, 1.6, 1.2],
    motion: [50, 0, 0] },
  axe_hook: { size: LONG, fps: 12, loop: false, poses: axeHook(), durations: [1.2, 2.2, 0.6, 0.6, 0.8, 1, 1.4, 1.2],
    motion: [50, 0, 0] },
  axe_jab: { size: WIDE, fps: 12, loop: false, poses: axeJab(), durations: [2.8, 0.8, 1, 1.4, 1.2], motion: [40, 0, 0] },
  axe_sweep: { size: LONG, fps: 12, loop: false, poses: axeSweep(), durations: [1.2, 2.0, 1.2, 0.8, 1, 1.4, 1, 1, 1],
    motion: [50, 0, 0] },
  hurt: { size: WIDE, fps: 12, loop: false, poses: hurt(AXE_READY, { sword: 150, shieldFace: 0 }), durations: [1, 1.2, 0.8, 0.8, 1],
    motion: [-60, 0, 0] },
  stagger: { size: WIDE, fps: 6, loop: false, poses: stagger(AXE_READY, { sword: 60, shieldFace: 0 }), durations: [0.7, 0.6, 1.4, 1.7, 1],
    motion: [-30, 0, 0] },
  death: { size: WIDE, fps: 9, loop: false, poses: death(AXE_READY, AXE_ARMS),
    durations: [1, 1.2, 1.2, 0.8, 0.8, 0.7, 0.7, 0.6, 0.8, 1, 1.4, 2.4], motion: [-40, 0, 0], wind: [-10, 0, -6], limp: 0.9 },
  ...cutDown(AXE_READY, WIDE, AXE_ARMS),
  ...finishedSet(AXE_READY, WIDE, AXE_ARMS),
  ...reactions(AXE_READY, WIDE, AXE_ARMS),
};

/** The pieces each soldier's cuts throw off (build_characters.mjs renders them into his gore set). */
export const PIECES = {
  swordsman: piecesFor(SWORD_READY),
  spearman: piecesFor(SPEAR_READY, { armBlade: false, upperBlade: false, spear: true }),
  archer: piecesFor(BOW_READY, { armBlade: false, upperBlade: false }),
  captain: piecesFor(CAP_READY, { headSize: 48 }),
  veteran: piecesFor(SWORD_READY),
  maceman: piecesFor(MACE_READY, { armBlade: false, upperBlade: false, spear: true, headSize: 36 }),
  shieldbearer: piecesFor(WALL_READY, { armBlade: false, upperBlade: false, spear: true, headSize: 36 }),
  engineer: piecesFor(EMPTY_HANDED, { armBlade: false, upperBlade: false }),
  skirmisher: piecesFor(SKIRM_READY),
  axeman: piecesFor(AXE_READY, { armBlade: false, upperBlade: false, spear: true, headSize: 36 }),
};
