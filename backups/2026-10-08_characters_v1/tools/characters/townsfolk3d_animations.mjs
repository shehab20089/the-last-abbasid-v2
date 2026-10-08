// The townsfolk's animations on the 3D skeleton (conventions in yusuf_animations.mjs): standing,
// talking with the near hand, sitting wounded, crouching in hiding, kneeling bound as captives and
// running from the fires.
import { blend, breathCycle, nudge, pose, runCycle } from "./pose3d.mjs";

const BODY = [96, 128];
const WIDE = [128, 128];

/** Standing at ease, the near hand free, the far hand low (carrying, or at rest). */
const STAND = {
  pelvis: [0, 39.2],
  hips: { yaw: -10, pitch: 2, roll: 0 },
  torso: { yaw: 0, pitch: 4, roll: 0 },
  head: { yaw: 6, pitch: 0, roll: 0 },
  footN: [-3, -4.4, 4.2],
  footF: [4, 4.6, 4.2],
  toeN: 0,
  toeF: 0,
  footYawN: -16,
  footYawF: -6,
  handN: [3, -10, 37],
  handF: [4, 9.5, 37],
  sword: [80, 0],
  shield: [0, 0],
};

/** Talking: the near hand opens toward the listener and rises with the words. */
function talk(base, count = 4) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    return pose(base, {
      handN: [11 + Math.sin(a) * 1.5, -10, 46 + Math.sin(a) * 2.5],
      sword: [100 + Math.sin(a) * 10, 10],
      head: { ...base.head, pitch: (base.head?.pitch ?? 0) - 4 + Math.sin(a + 1) * 2.5, yaw: (base.head?.yaw ?? 0) - 2 },
      torso: { ...base.torso, pitch: (base.torso?.pitch ?? 0) + Math.sin(a) * 1 },
    });
  });
}

/** Kneeling on both knees, hands bound behind the back, head bowed: a captive of the soldiers. */
const KNEEL = pose(STAND, {
  pelvis: [-1, 21.6],
  hips: { yaw: -10, pitch: 6 },
  torso: { yaw: 0, pitch: 8 },
  head: { yaw: 4, pitch: 22 },
  footN: [-15, -4.6, 3.0],
  footF: [-12, 4.8, 3.2],
  toeN: -80,
  toeF: -80,
  kneeN: [1, -0.15, -0.2],
  kneeF: [1, 0.15, -0.2],
  handN: [-8, -3.5, 35],
  handF: [-8, 3.5, 35],
  elbowN: [-0.2, -1, -0.4],
  elbowF: [-0.2, 1, -0.4],
});
const kneel = (o = {}) => breathCycle(pose(KNEEL, o), 4, (i, breath) => ({ head: { pitch: breath * 2 } }));

// --- Shaykh Ibrahim ---------------------------------------------------------------------------

const SCHOLAR = pose(STAND, { torso: { pitch: 10 }, head: { yaw: 6, pitch: 4 }, handF: [5, 8, 37] });

export const SCHOLAR_ANIMATIONS = {
  idle: { size: BODY, fps: 5, loop: true, poses: breathCycle(SCHOLAR, 6) },
  talk: { size: BODY, fps: 6, loop: true, poses: talk(SCHOLAR) },
  give: { size: WIDE, fps: 6, loop: false, poses: [
    pose(SCHOLAR, { handF: [9, 6, 41], shield: [0, 30] }),
    pose(SCHOLAR, { torso: { pitch: 14 }, handF: [15, 4, 44], shield: [0, 50] }),
    pose(SCHOLAR, { torso: { pitch: 18 }, head: { pitch: 8 }, handF: [19, 3, 45], shield: [0, 60] }),
    pose(SCHOLAR, { torso: { pitch: 18 }, head: { pitch: 8 }, handF: [19, 3, 45], shield: [0, 60],
      hide: ["satchel", "satchelFlap", "buckle"] }),
  ] },
  idle_empty: { size: BODY, fps: 5, loop: true, poses: breathCycle(pose(SCHOLAR, { handF: [6, 9.5, 38],
    hide: ["satchel", "satchelFlap", "buckle"] }), 6) },
};

// --- Hamid, the wounded guardsman ---------------------------------------------------------------

/** Sat against a wall, legs out before him, a hand pressed to his side. */
const SIT = pose(STAND, {
  skirtFollow: 0.35,
  pelvis: [-6, 6.4],
  hips: { yaw: -8, pitch: -32 },
  torso: { yaw: 0, pitch: 12 },
  head: { yaw: 10, pitch: 6 },
  footN: [26, -4.6, 3.6],
  footF: [21, 4.8, 5.6],
  toeN: 60,
  toeF: 40,
  kneeN: [0.2, -0.2, 1],
  kneeF: [0.2, 0.2, 1],
  handN: [8, -9, 12],
  handF: [0, 7, 20],
});

export const GUARD_ANIMATIONS = {
  sit: { size: BODY, fps: 4, loop: true, poses: breathCycle(SIT, 4, (i, breath) => ({ head: { pitch: breath * 2 } })) },
  talk: { size: BODY, fps: 5, loop: true, poses: talk(pose(SIT, { head: { yaw: 14, pitch: -6 }, torso: { pitch: 8 } })).map(
    (p, i) => pose(p, { handN: [12 + i % 2, -10, 24 + (i % 2) * 2] })) },
};

// --- The mother sheltering her child -----------------------------------------------------------

const CROUCH = pose(STAND, {
  pelvis: [-2, 19],
  hips: { yaw: -12, pitch: 30 },
  torso: { yaw: 0, pitch: 12 },
  head: { yaw: 8, pitch: 18 },
  footN: [-9, -4.6, 5.2],
  footF: [6, 4.8, 4.2],
  toeN: -46,
  handN: [8, -6, 38],
  handF: [8, 4, 40],
});

export const MOTHER_ANIMATIONS = {
  crouch: { size: BODY, fps: 4, loop: true, poses: breathCycle(CROUCH, 4) },
  talk: { size: BODY, fps: 5, loop: true, poses: breathCycle(pose(CROUCH, { head: { yaw: 14, pitch: -4 }, torso: { pitch: 6 } }), 4) },
};

// --- Townspeople fleeing, or held captive ------------------------------------------------------

const RUNNER = pose(STAND, { hips: { yaw: -8, pitch: 12 }, torso: { pitch: 10 }, head: { yaw: 8, pitch: -10 } });
const flee = () => runCycle(RUNNER, (i, swing, lift) => ({
  handN: [3 - swing * 8, -9.5, 42 - Math.abs(swing) + lift * 0.5],
  handF: [5 + swing * 8, 9, 44 + swing * 1.5],
  sword: [60 - swing * 30, 0],
}), { lean: 14 });

export const REFUGEE_ANIMATIONS = {
  run: { size: BODY, fps: 16, loop: true, poses: flee(), motion: [150, 0, 0] },
  kneel: { size: BODY, fps: 4, loop: true, poses: kneel() },
};

// --- Salim -------------------------------------------------------------------------------------

const SALIM = pose(STAND, { torso: { pitch: 3 }, head: { yaw: 8, pitch: -2 } });

export const SALIM_ANIMATIONS = {
  kneel: { size: BODY, fps: 4, loop: true, poses: kneel({ head: { yaw: 6, pitch: 24 } }) },
  stand: { size: BODY, fps: 5, loop: true, poses: breathCycle(SALIM, 6) },
  talk: { size: BODY, fps: 6, loop: true, poses: talk(SALIM) },
};

// --- The keeper of the library --------------------------------------------------------------------

const KEEPER = pose(STAND, { pelvis: [0, 38.8], torso: { pitch: 14 }, head: { yaw: 6, pitch: 6 }, handF: [5, 8, 37] });

export const LIBRARIAN_ANIMATIONS = {
  idle: { size: BODY, fps: 5, loop: true, poses: breathCycle(KEEPER, 6) },
  talk: { size: BODY, fps: 6, loop: true, poses: talk(KEEPER) },
};

// --- The young copyist ------------------------------------------------------------------------

const HIDE = pose(CROUCH, { hips: { pitch: 34 }, torso: { pitch: 18 }, head: { pitch: 24 }, handN: [9, -7, 30],
  handF: [8, 5, 32] });

export const COPYIST_ANIMATIONS = {
  crouch: { size: BODY, fps: 4, loop: true, poses: breathCycle(HIDE, 4) },
  talk: { size: BODY, fps: 5, loop: true, poses: talk(pose(HIDE, { torso: { pitch: 10 }, head: { yaw: 12, pitch: 0 } })) },
};

export const TOWNSFOLK_ANIMATIONS = {
  scholar: SCHOLAR_ANIMATIONS,
  guard: GUARD_ANIMATIONS,
  mother: MOTHER_ANIMATIONS,
  refugee_man: REFUGEE_ANIMATIONS,
  refugee_woman: REFUGEE_ANIMATIONS,
  salim: SALIM_ANIMATIONS,
  librarian: LIBRARIAN_ANIMATIONS,
  copyist: COPYIST_ANIMATIONS,
};

export { blend, nudge };
