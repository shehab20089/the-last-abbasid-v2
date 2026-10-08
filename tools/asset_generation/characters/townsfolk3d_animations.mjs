// The townsfolk's animations on the 3D skeleton (conventions in yusuf_animations.mjs): standing,
// talking with the near hand, sitting wounded, crouching in hiding, kneeling bound as captives and
// running from the fires; and how the soldiers kill them: beheaded where they knelt, shot in the
// back as they ran. The dead of the streets (CORPSES) are drawn as props.
import { blend, breathCycle, nudge, pose, runCycle } from "./pose3d.mjs";
import { toParent } from "../lib/space.mjs";

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

/** An old scholar: upright for his years, the satchel held close, unhurried. */
const SCHOLAR = pose(STAND, { torso: { pitch: 7 }, head: { yaw: 6, pitch: 2 }, handF: [5, 8, 37], handN: [5, -9, 41],
  sword: [120, 20] });

/** He speaks with measured gestures and a slow nod; the satchel never leaves his hand. */
function scholarTalk() {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    return pose(SCHOLAR, {
      handN: [10 + Math.sin(a) * 2, -10, 45 + Math.max(0, Math.sin(a)) * 3],
      sword: [104 + Math.sin(a) * 12, 12],
      head: { yaw: 4, pitch: 2 + Math.sin(a * 2) * 3 },
      torso: { pitch: 7 + Math.sin(a) * 0.8 },
    });
  });
}

export const SCHOLAR_ANIMATIONS = {
  idle: { size: BODY, fps: 5, loop: true, poses: breathCycle(SCHOLAR, 6) },
  talk: { size: BODY, fps: 6, loop: true, poses: scholarTalk() },
  give: { size: WIDE, fps: 6, loop: false, poses: [
    pose(SCHOLAR, { handF: [9, 6, 41], shield: [0, 30] }),
    pose(SCHOLAR, { torso: { pitch: 12 }, handF: [15, 4, 44], shield: [0, 50] }),
    pose(SCHOLAR, { torso: { pitch: 16 }, head: { pitch: 10 }, handF: [19, 3, 45], shield: [0, 60] }),
    pose(SCHOLAR, { torso: { pitch: 16 }, head: { pitch: 10 }, handF: [19, 3, 45], shield: [0, 60],
      hide: ["satchel", "satchelFlap", "buckle"] }),
  ] },
  idle_empty: { size: BODY, fps: 5, loop: true, poses: breathCycle(pose(SCHOLAR, { handF: [6, 9.5, 38], handN: [3, -10, 37],
    hide: ["satchel", "satchelFlap", "buckle"] }), 6) },
};

// --- Hamid, the wounded guardsman ---------------------------------------------------------------

/** Sat against a wall, legs out before him, a hand pressed to the wound in his side. */
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
  handF: [2, 6, 21],
});

/** He breathes hard and shallow; the hand on his side presses with each breath. */
function laboured(base, count = 6) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2;
    const breath = Math.sin(a);
    return pose(base, {
      torso: { ...base.torso, pitch: (base.torso?.pitch ?? 0) - breath * 3 },
      head: { ...base.head, pitch: (base.head?.pitch ?? 0) - breath * 4 },
      handF: [base.handF[0] + breath * 0.6, base.handF[1], base.handF[2] + breath * 0.8],
    });
  });
}

export const GUARD_ANIMATIONS = {
  sit: { size: BODY, fps: 6, loop: true, poses: laboured(SIT) },
  talk: { size: BODY, fps: 5, loop: true, poses: laboured(pose(SIT, { head: { yaw: 14, pitch: -6 }, torso: { pitch: 8 },
    handN: [12, -10, 24] }), 4).map((p, i) => pose(p, { handN: [12 + (i % 2), -10, 24 + (i % 2) * 2.5] })) },
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

/** Fleeing: hunched low, running flat out, glancing back over the shoulder at the soldiers. */
const RUNNER = pose(STAND, { hips: { yaw: -8, pitch: 16 }, torso: { pitch: 14 }, head: { yaw: 8, pitch: -10 } });

/** The man runs with his arms up about his head against the arrows. */
function fleeMan() {
  return runCycle(RUNNER, (i, swing, lift) => ({
    handN: [6 - swing * 2, -8.5, 58 + lift],
    handF: [7 + swing * 2, 7.5, 59 - lift],
    elbowN: [0.2, -1, 0.3],
    elbowF: [0.2, 1, 0.3],
    sword: [150, 0],
    // A look back on the second step of each stride.
    head: { yaw: i >= 2 && i <= 4 ? -55 : 8, pitch: i >= 2 && i <= 4 ? -4 : -10 },
  }), { lean: 17 });
}

/** The woman gathers her robe in one hand and swings the other, looking back as she goes. */
function fleeWoman() {
  return runCycle(RUNNER, (i, swing, lift) => ({
    handN: [3 - swing * 8, -9.5, 42 - Math.abs(swing) + lift * 0.5],
    handF: [9, 7, 34],
    sword: [60 - swing * 30, 0],
    head: { yaw: i >= 5 && i <= 7 ? -50 : 8, pitch: -8 },
  }), { lean: 15 });
}

// --- Killed ------------------------------------------------------------------------------------

/** Everything above the neck: hidden when the head is cut off, drawn apart as the piece. */
const HEAD = ["skull", "face", "nose", "eye", "beard", "moustache", "turban", "cap", "hair", "scarfTop", "scarf",
  "bandage", "turbanTail"];
const headless = (poses) => poses.map((p) => ({ ...p, hide: [...(p.hide ?? []), ...HEAD],
  show: [...(p.show ?? []), "stumpNeck"] }));
const NECK = (f) => toParent(f.neck, [0, 0, 4.2]);
/** Lying face down on the street, the feet behind. */
const PRONE = { toeN: -88, toeF: -88, kneeN: [0.6, -0.1, -0.4], kneeF: [0.6, 0.1, -0.4], ground: true };

/** Beheaded where he knelt, hands still bound: the body jerks, sways, and pitches forward. */
function executed(kneeling) {
  // The bound hands stay at the small of his back as he falls.
  const bound = { handN: (f) => toParent(f.pelvis, [-7, -3.2, 10]), handF: (f) => toParent(f.pelvis, [-7, 3.2, 10]) };
  return headless([
    pose(kneeling, { ...bound, pelvis: [-1, 22.4], hips: { pitch: 2 }, torso: { pitch: 0 } }),
    pose(kneeling, { ...bound, pelvis: [-0.8, 22], hips: { pitch: 6 }, torso: { pitch: 8 } }),
    pose(kneeling, { ...bound, pelvis: [-0.4, 21.4], hips: { pitch: 12 }, torso: { pitch: 14 } }),
    pose(kneeling, { ...bound, pelvis: [1, 19.5], hips: { pitch: 34 }, torso: { pitch: 22 } }),
    pose(kneeling, { ...bound, pelvis: [3, 13.5], hips: { pitch: 60 }, torso: { pitch: 16 }, footN: [-21, -4.6, 3], footF: [-18, 4.8, 3.2],
      ...PRONE }),
    pose(kneeling, { ...bound, pelvis: [5, 8.5], hips: { pitch: 80 }, torso: { pitch: 6 }, footN: [-29, -4.6, 3.4], footF: [-27, 4.8, 3.6],
      ...PRONE }),
    pose(kneeling, { ...bound, pelvis: [5, 7.6], hips: { pitch: 86 }, torso: { pitch: 4 }, footN: [-30, -4.6, 3.4], footF: [-28, 4.8, 3.6],
      ...PRONE }),
  ]);
}

/** Shot in the back as he ran: he arches, stumbles a step, and pitches forward onto his face. */
function shot(running) {
  return [
    pose(running, { arrows: 1, hips: { pitch: 2 }, torso: { pitch: -16, roll: 4 }, head: { yaw: 6, pitch: -24 },
      handN: [-4, -12, 50], handF: [-2, 10, 50], elbowN: [-0.4, -1, 0], elbowF: [-0.4, 1, 0] }),
    pose(running, { arrows: 1, pelvis: [3, 35], hips: { pitch: 16 }, torso: { pitch: 8 }, head: { yaw: 6, pitch: -6 },
      footN: [10, -4.6, 4.2], footF: [-8, 4.8, 6], handN: [8, -12, 40], handF: [10, 10, 40] }),
    pose(running, { arrows: 1, pelvis: [7, 27], hips: { pitch: 40 }, torso: { pitch: 24 }, head: { yaw: 6, pitch: 0 },
      footN: [6, -4.6, 4.2], footF: [-10, 4.8, 4.2], kneeN: [1, -0.2, 0.2], kneeF: [1, 0.2, 0.2], handN: [22, -12, 26],
      handF: [22, 10, 26] }),
    pose(running, { arrows: 1, pelvis: [10, 16], hips: { pitch: 64 }, torso: { pitch: 18 }, head: { yaw: 6, pitch: 10 },
      footN: [-12, -4.6, 3.6], footF: [-16, 4.8, 3.6], ...PRONE, handN: [30, -12, 8], handF: [30, 10, 8] }),
    pose(running, { arrows: 1, pelvis: [12, 8], hips: { pitch: 84 }, torso: { pitch: 6 }, head: { yaw: 30, pitch: 10, roll: -20 },
      footN: [-21.5, -4.6, 3.4], footF: [-22.5, 4.8, 3.6], ...PRONE, handN: [34, -13, 4], handF: [33, 10, 5] }),
    pose(running, { arrows: 1, pelvis: [12, 7.4], hips: { pitch: 86 }, torso: { pitch: 4 },
      head: { yaw: 34, pitch: 12, roll: -24 }, footN: [-22.5, -4.6, 3.4], footF: [-23, 4.8, 3.6], ...PRONE, handN: [35, -13, 3],
      handF: [33, 10, 4] }),
  ];
}

const KILLED = (kneeling, running) => ({
  executed: { size: WIDE, fps: 9, loop: false, poses: executed(kneeling), durations: [1, 1.4, 1.6, 1, 0.8, 0.8, 2],
    wind: [-10, 0, -6], limp: 0.9, wound: NECK },
  shot: { size: WIDE, fps: 10, loop: false, poses: shot(running), durations: [1.2, 1, 1, 0.8, 0.8, 2], motion: [70, 0, 0],
    wind: [-10, 0, -6], limp: 0.9 },
});

export const REFUGEE_MAN_ANIMATIONS = {
  run: { size: BODY, fps: 16, loop: true, poses: fleeMan(), motion: [150, 0, 0] },
  kneel: { size: BODY, fps: 4, loop: true, poses: kneel() },
  ...KILLED(KNEEL, fleeMan()[1]),
};
export const REFUGEE_WOMAN_ANIMATIONS = {
  run: { size: BODY, fps: 16, loop: true, poses: fleeWoman(), motion: [150, 0, 0] },
  kneel: { size: BODY, fps: 4, loop: true, poses: kneel({ head: { yaw: 6, pitch: 26 } }) },
  ...KILLED(pose(KNEEL, { head: { yaw: 6, pitch: 26 } }), fleeWoman()[1]),
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

/** Hiding, he trembles: a small shiver through the shoulders and hands. */
function tremble(base, count = 6) {
  const shiver = [0, 0.5, -0.3, 0.6, -0.5, 0.2];
  return Array.from({ length: count }, (_, i) => pose(base, {
    pelvis: [base.pelvis[0] + shiver[i] * 0.3, base.pelvis[1]],
    torso: { ...base.torso, roll: shiver[i] * 2 },
    handN: [base.handN[0], base.handN[1], base.handN[2] + shiver[i] * 0.6],
    handF: [base.handF[0], base.handF[1], base.handF[2] - shiver[i] * 0.6],
  }));
}

export const COPYIST_ANIMATIONS = {
  crouch: { size: BODY, fps: 10, loop: true, poses: tremble(HIDE) },
  talk: { size: BODY, fps: 5, loop: true, poses: talk(pose(HIDE, { torso: { pitch: 10 }, head: { yaw: 12, pitch: 0 } })) },
};

export const TOWNSFOLK_ANIMATIONS = {
  scholar: SCHOLAR_ANIMATIONS,
  guard: GUARD_ANIMATIONS,
  mother: MOTHER_ANIMATIONS,
  refugee_man: REFUGEE_MAN_ANIMATIONS,
  refugee_woman: REFUGEE_WOMAN_ANIMATIONS,
  salim: SALIM_ANIMATIONS,
  librarian: LIBRARIAN_ANIMATIONS,
  copyist: COPYIST_ANIMATIONS,
};

/** The head a beheading takes, drawn tumbling (build_characters.mjs makes each victim's gore set). */
const HEAD_PIECE = { head: { pose: STAND, parts: [...HEAD.filter((n) => n !== "turbanTail"), "stumpNeck"],
  pivot: (f) => toParent(f.head, [0.4, 0, 5.4]), size: [32, 32] } };
export const TOWNSFOLK_PIECES = { refugee_man: HEAD_PIECE, refugee_woman: HEAD_PIECE };

// --- The dead of the streets ---------------------------------------------------------------------
// Drawn as props (environment/props3d.mjs), with the blood beneath them.

const ON_BACK = pose(STAND, { pelvis: [-6, 6.2], hips: { yaw: -10, pitch: -90 }, torso: { yaw: 0, pitch: 6 },
  head: { yaw: 22, pitch: 10, roll: -10 }, footN: [28, -4.6, 3.6], footF: [27, 4.8, 3.8], toeN: 70, toeF: 60,
  kneeN: [0.1, -0.2, 1], kneeF: [0.1, 0.2, 1], handN: [-18, -13, 6], handF: [-14, 9, 8], ground: true });
const FACE_DOWN = shot(fleeMan()[1])[5];

export const CORPSES = {
  corpse_man_back: { kind: "refugee_man", pose: ON_BACK },
  corpse_man_front: { kind: "refugee_man", pose: { ...FACE_DOWN, arrows: 0 } },
  corpse_man_arrows: { kind: "refugee_man", pose: { ...FACE_DOWN, arrows: 2 } },
  corpse_woman_back: { kind: "refugee_woman", pose: pose(ON_BACK, { head: { yaw: 30, pitch: 14, roll: -16 },
    handN: [2, -12, 14], handF: [-4, 9, 12], footN: [26, -4.6, 3.6], footF: [24, 4.8, 4.2] }) },
  corpse_woman_front: { kind: "refugee_woman", pose: { ...shot(fleeWoman()[1])[5], arrows: 0 } },
  corpse_headless: { kind: "refugee_man", pose: executed(KNEEL)[6], head: true },
  corpse_scholar: { kind: "scholar", pose: pose(ON_BACK, { hide: ["satchel", "satchelFlap", "buckle"] }) },
  corpse_guard: { kind: "guard", pose: { ...FACE_DOWN, arrows: 1 } },
};

export { blend, nudge };
