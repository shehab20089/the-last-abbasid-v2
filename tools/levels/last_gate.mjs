// Level 4, The Last Gate: first light along the southern wall. Past the people waiting by the wall
// road and the Mongols' camp in a square, up the rampart and along its walk under the archers'
// eyes, down through the wreck of the siege to the gate square, where Toqto Noyan, captain of a
// thousand, holds the last gate. Even here they are killing: a man kneels under a sabre on the
// wall road; in the camp they talk round a brazier, sort plunder and stab at their prisoners; in
// the siege wreck a woman waits for the stroke. The gate's defenders lie where they fell. Tiles
// of 16 px; the street is the top of row STREET.

export const STREET = 28;
export const COLS = 240;
export const ROWS = 32;

const ENEMIES = [
  // On the wall road, a man kneels under a sabre.
  { kind: "swordsman", col: 36, face: 1, activity: "execute", victim: "road_captive", delay: 3.0, patrol: 0 },
  // The camp: talking round a brazier, sorting plunder, an archer on the wagon, stabbing at prisoners.
  { kind: "spearman", col: 51, face: 1, activity: "chat", patrol: 0 },
  { kind: "spearman", col: 57, face: -1, activity: "chat", patrol: 0 },
  { kind: "swordsman", col: 63, face: 1, activity: "loot", patrol: 0 },
  { kind: "archer", col: 72, row: 25, face: -1, activity: "watch" },
  { kind: "spearman", col: 88, face: 1, activity: "stab", patrol: 0 },
  // On the wall walk.
  { kind: "archer", col: 121, row: 22, face: -1, activity: "watch" },
  // A mace-bearer holds the wall walk between the archers.
  { kind: "maceman", col: 128, row: 22, face: -1 },
  { kind: "archer", col: 136, row: 22, face: -1, activity: "watch" },
  // In the wreck of the siege: a sentry, a woman under a sabre, a patrol.
  { kind: "shieldbearer", col: 156, face: -1, patrol: 0 },
  { kind: "swordsman", col: 168, face: 1, activity: "execute", victim: "siege_captive", delay: 3.0, patrol: 0 },
  { kind: "maceman", col: 178, face: -1, patrol: 20 },
  // The captain at his gate.
  { kind: "captain", col: 222, face: -1, dormant: true, group: "captain" },
];

export const LEVEL = {
  id: "last_gate",
  scene: "res://features/levels/last_gate/last_gate.tscn",
  env: "res://assets/environments/gate",
  look: "dawn",
  // The far city, the river and the low sun are the concept painting's (docs/concept_art).
  painting: { source: "docs/concept_art/06_The_Last_Gate.png", crop: [232, 300, 624, 234], scroll: 0.06 },
  tint: "Color(0.93, 0.89, 0.9, 1)",
  title: "LEVEL_LAST_GATE",
  music: "gate",
  ambience: "wind",
  next: "",
  exitCard: "ending",
  exitTitle: "",
  objectives: [["captain_cleared", "OBJ_OPEN_GATE"], ["", "OBJ_REACH_GATE"]],
  cols: COLS,
  rows: ROWS,
  start: [5, STREET],
  sections: [
    { name: "wall_road", from: 0, to: 40, theme: ["houses", "ruin", "houses"] },
    { name: "camp", from: 40, to: 96, theme: "camp" },
    { name: "rampart", from: 96, to: 148, theme: "rampart" },
    { name: "siege", from: 148, to: 186, theme: ["ruin", "houses"] },
    { name: "gate_square", from: 186, to: 240, theme: "gatehouse" },
  ],
  terrain: [
    ["street", 0, COLS - 1, STREET, ROWS - 1],
    ["brick", 0, 2, 4, STREET - 1],
    ["crate", 44, 45, 27, 27],
    // A wagon of the camp, an archer on its load.
    ["crate", 71, 74, 25, 27],
    // Steps up to the rampart and the wall walk.
    ["stone", 104, 105, 27, 27],
    ["stone", 106, 107, 26, 27],
    ["stone", 108, 109, 25, 27],
    ["brick", 110, 140, 22, STREET - 1],
    ["crate", 160, 161, 26, 27],
    ["brick", 237, 239, 4, STREET - 1],
  ],
  props: [
    ["sacks", 9], ["jars", 24], ["rubble", 32], ["standard", 42], ["brazier", 54], ["standard", 68],
    ["brazier", 80], ["standard", 92], ["stone_ball", 146], ["ladder_broken", 152], ["rubble", 164],
    ["stone_ball", 174.5], ["beam_charred", 182], ["standard", 200], ["brazier", 206], ["stone_ball", 212],
    ["brazier", 234], ["standard", 236, null, true],
    // The plunder being sorted in the camp.
    ["chest_looted", 65.1],
    // The dead: townspeople on the road, prisoners in the camp, the gate's defenders.
    ["corpse_guard", 6.5], ["corpse_man_front", 29], ["corpse_woman_back", 47.5], ["corpse_man_arrows", 76.5],
    ["corpse_guard", 150], ["corpse_guard", 158.5], ["corpse_man_back", 177], ["corpse_headless", 184.5],
    ["corpse_guard", 203], ["corpse_guard", 215.5],
    // The prisoner the spearman in the camp stabs at.
    ["corpse_man_front", 89.75],
  ],
  facades: [
    { kind: "tower", col: 0, width: 3, top: 4 },
    { kind: "rampart", col: 110, width: 31, top: 22 },
    { kind: "tower", col: 237, width: 3, top: 4 },
  ],
  knownTechniques: ["bash", "plunge", "knives"],
  checkpoints: [
    { id: "camp_lamp", col: 98 },
    { id: "gate_lamp", col: 186 },
  ],
  manuscripts: [
    { id: "route", col: 26 },
    { id: "oath", col: 132, row: 22 },
    // By the camp lamp, before the rampart: the rolling cut.
    { id: "furusiyya_roll", col: 101, teaches: "roll_cut" },
  ],
  enemies: ENEMIES,
  npcs: [
    { id: "hamid", kind: "guard", col: 14, face: 1, dialogue: "hamid" },
  ],
  // People waiting by the wall road for the gate to open; two kneel under a headsman's sabre.
  captives: [
    { kind: "refugee_woman", col: 18, face: -1, freedBy: "captain_cleared", run: 1 },
    { kind: "refugee_man", col: 21, face: -1, freedBy: "captain_cleared", run: 1 },
    { id: "road_captive", kind: "refugee_man", col: 38, face: 1, run: -1, thanks: "SAVED_6" },
    { id: "siege_captive", kind: "refugee_woman", col: 170, face: 1, run: -1, thanks: "SAVED_2" },
  ],
  triggers: [
    { id: "hint_maceman", from: 112, to: 115, above: 80, height: 120, hint: "HINT_MACEMAN" },
    { id: "boss", from: 196, to: 198, event: "boss", hint: "HINT_BOSS", speaker: "SPEAKER_TOQTO", line: "TOQTO_INTRO" },
  ],
  // The gate square: burning barricades close behind the hero, and the camera keeps to the square.
  arena: { from: 191, to: 240, boss: ENEMIES.findIndex((e) => e.kind === "captain"), barriers: [192] },
  exit: { name: "LastGate", col: 228, art: "last_gate", prompt: "PROMPT_OPEN_LAST_GATE",
    lockedPrompt: "PROMPT_LAST_GATE", lockedLine: "GATE_LOCKED_4", requires: "captain_cleared" },
  fires: [
    [8, STREET, "small"], [33, STREET, "medium"], [58, STREET, "small"], [94, STREET, "large"],
    [146, STREET, "medium"], [163, STREET, "large"], [183, STREET, "small"],
  ],
};
