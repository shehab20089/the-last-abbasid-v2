// The finishers' shared choreography: each is a pair of animations, the hero's (yusuf_animations.mjs)
// and the staggered soldier's (mongol3d_animations.mjs), played frame-locked with the soldier
// `distance` px before the hero. Both take their frame timing from here, so they cannot drift
// apart, and build_characters.mjs writes each as a FinisherDefinition for the game: which frames
// cut what off (cuts), which burst blood out of him (bursts), when time runs slow, when he dies.
// `strikes` names the other frames a blow lands on or the blade whirls through (a kick, the turn): with
// the cuts and bursts, the frames the animation lint lets snap, as it does an attack's live frames.

export const FINISHERS = {
  // Kicked to his knees, then his head.
  behead: {
    name: "Headsman", distance: 36, fps: 12,
    durations: [1.2, 1, 1.4, 2.4, 0.8, 1.4, 1.2, 1.2, 2.4],
    cuts: { 4: "head" }, bursts: [], strikes: [1], slow: [3, 6], death: 4,
  },
  // The blade through his belly, lifted on it, kicked off it.
  impale: {
    name: "Run Through", distance: 30, fps: 12,
    durations: [1.4, 0.8, 1.6, 2.0, 1.2, 1.0, 1.0, 1.2, 2.4],
    cuts: {}, bursts: [1, 2, 5], slow: [1, 4], death: 5,
  },
  // A spinning cut through the waist.
  spin: {
    name: "Spin Cleave", distance: 36, fps: 14,
    durations: [1.4, 1, 1, 0.8, 1.6, 1.2, 1.2, 2.4],
    cuts: { 3: "waist" }, bursts: [], strikes: [1, 2], slow: [3, 5], death: 3,
  },
  // Pinned where he lies: a man thrown to the ground, the blade driven down into his chest and wrenched
  // out. Played on a man down (`ground`), not on one standing.
  ground: {
    name: "Pinned", distance: 2, fps: 12, ground: true,
    durations: [1.0, 1.2, 1.0, 2.2, 1.2, 1.2, 1.4, 2.4],
    cuts: {}, bursts: [3, 5], slow: [3, 4], death: 4,
  },
  // His sword arm, then, as he reels, his head.
  disarm: {
    name: "Disarm", distance: 34, fps: 12,
    durations: [1.2, 0.8, 1.8, 1.6, 0.8, 1.2, 1.0, 1.2, 2.4],
    cuts: { 1: "arm", 4: "head" }, bursts: [], slow: [4, 6], death: 4,
  },
};
