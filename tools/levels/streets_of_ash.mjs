// Level 2, Streets of Ash: the burning lanes of a quarter of houses, from the river wall to the
// gate of the Scholars' Quarter. Twice the street is choked by fallen houses and the way is over
// them; soldiers drive captives through the lanes to a little square, where a man in a saffron
// sash waits, roped among them. The soldiers are about their killing: one strips a body, a
// lookout guards a woman's execution in the lanes, a spearman stabs at the dead by the bathhouse,
// a headsman works at the square while the captors spring, a looter rifles a chest under an
// archer's eye, and at the quarter gate they burn the scholars' books. The dead of the mosque lie
// where they sheltered. Coordinates are tiles of 16 px; the street is the top of row STREET.

/** The pyre at the quarter gate: the prop's centre column (its fire burns 6 px right of it). */
const PYRE = 260.25;

export const STREET = 28;
export const COLS = 280;
export const ROWS = 32;

export const LEVEL = {
  id: "streets_of_ash",
  scene: "res://features/levels/streets_of_ash/streets_of_ash.tscn",
  env: "res://assets/environments/streets",
  look: "smoke",
  // The far city is the concept painting's (docs/concept_art), pixel-converted.
  painting: { source: "docs/concept_art/04_Streets_of_Ash.png", crop: [372, 0, 840, 300], scroll: 0.06 },
  tint: "Color(0.84, 0.78, 0.84, 1)",
  title: "LEVEL_STREETS_OF_ASH",
  music: "streets",
  ambience: "fire_wind",
  next: "res://features/levels/scholars_quarter/scholars_quarter.tscn",
  exitCard: "streets_end",
  exitTitle: "LEVEL_SCHOLARS_QUARTER",
  objectives: [
    ["salim_freed", "OBJ_SCHOLARS_QUARTER", "exit"], ["captors_cleared", "OBJ_SPEAK_SALIM", "npc:salim"],
    ["captors", "OBJ_FREE_CAPTIVES", "group:captors"], ["", "OBJ_FOLLOW_CAPTIVES", "col:190:MARKER_CAPTIVES"],
  ],
  // Booms with hanging cages and carpets over the balconies dress the houses.
  dress: { cranes: true, carpets: true },
  cols: COLS,
  rows: ROWS,
  start: [5, STREET],
  sections: [
    { name: "river_wall", from: 0, to: 18, theme: "wall" },
    { name: "first_lanes", from: 18, to: 46, theme: ["houses", "ruin"] },
    { name: "fallen_house", from: 46, to: 66, theme: "ruin" },
    { name: "lanes", from: 66, to: 92, theme: ["houses", "houses", "ruin"] },
    { name: "bathhouse", from: 92, to: 122, theme: "hammam" },
    { name: "collapse", from: 122, to: 150, theme: "ruin" },
    { name: "mosque", from: 150, to: 162, theme: "mosque" },
    { name: "square", from: 162, to: 224, theme: ["houses", "houses", "ruin"] },
    { name: "ruins", from: 224, to: 252, theme: ["ruin", "houses"] },
    { name: "quarter_gate", from: 252, to: 280, theme: "darb" },
  ],
  // [material, col0, col1, row0, row1] inclusive.
  terrain: [
    ["street", 0, COLS - 1, STREET, ROWS - 1],
    ["brick", 0, 2, 4, STREET - 1],
    ["crate", 24, 25, 27, 27],
    // The first fallen house blocks the lane: up the rubble, over its roof.
    ["crate", 46, 47, 27, 27],
    ["stone", 48, 50, 25, 27],
    ["brick", 51, 62, 22, STREET - 1],
    // Balconies over the lane (the high way holds a page).
    ["plank", 70, 75, 25, 25],
    ["plank", 78, 84, 22, 22],
    ["crate", 112, 113, 26, 27],
    // The second collapse: crates, a beam, then a long heap of masonry.
    ["crate", 126, 127, 25, 27],
    ["plank", 128, 131, 22, 22],
    ["brick", 132, 146, 19, STREET - 1],
    ["stone", 147, 148, 26, 27],
    // The square: a raised paving round the well.
    ["stone", 176, 183, 27, 27],
    ["crate", 236, 237, 25, 27],
    ["plank", 238, 246, 22, 22],
    ["brick", 277, 279, 4, STREET - 1],
  ],
  props: [
    ["cart", 14], ["rubble", 20], ["beam_charred", 40], ["jars_broken", 37], ["banner_fallen", 42],
    ["rubble", 62.5], ["sacks", 68], ["jars", 86], ["beam_charred", 98], ["rubble", 108], ["jars_broken", 118],
    ["rubble", 149], ["banner_fallen", 162], ["sacks", 166], ["well", 180, 27], ["jars", 188],
    ["rope_post", 199], ["rope_post", 211], ["rubble", 224], ["beam_charred", 234], ["jars_broken", 250],
    ["rubble", 255], ["banner_fallen", 265], ["cart", 270, null, true],
    // The dead of the lanes.
    ["corpse_man_front", 16], ["corpse_woman_back", 27], ["corpse_man_arrows", 44], ["corpse_woman_front", 64.5],
    ["corpse_headless", 88.5], ["corpse_guard", 186.5], ["corpse_woman_front", 226.5], ["corpse_man_back", 249],
    ["corpse_headless", 267],
    // The body the first soldier strips, and the one the spearman by the bathhouse stabs at.
    ["corpse_man_back", 35.1], ["corpse_man_back", 104.75],
    // Those who sheltered in the mosque.
    ["corpse_man_front", 152], ["corpse_woman_back", 155.5], ["corpse_man_arrows", 158.5],
    // The chest the looter in the ruins rifles, and the pyre at the quarter gate.
    ["chest_looted", 229.6], ["book_pyre", PYRE],
  ],
  facades: [
    { kind: "tower", col: 0, width: 3, top: 4 },
    { kind: "rubble", col: 51, width: 12, top: 22 },
    { kind: "rubble", col: 132, width: 15, top: 19 },
    { kind: "tower", col: 277, width: 3, top: 4 },
  ],
  // Techniques the hero has learned before he comes here.
  knownTechniques: ["sweep", "low_cut"],
  // Soldiers here are tougher than the market's (health, poise): the hero has grown too.
  toughness: [1.1, 1],
  aggression: 1.1,
  checkpoints: [
    { id: "lane_lamp", col: 90 },
    { id: "square_lamp", col: 164 },
  ],
  // On the balconies over the lane; the Bronze Seal of the Guard on the second collapse's heap; on the
  // ruins' upper floor.
  relics: [
    { id: "token_balcony", col: 72, row: 25 },
    { id: "bronze_seal", col: 138, row: 19, keepsake: "bronze_seal" },
    { id: "token_ruins", col: 239, row: 22 },
  ],
  manuscripts: [
    { id: "recipe", col: 82, row: 22 },
    { id: "letter", col: 144, row: 19 },
    // A leaf of a treatise on the arts of war, by the bathhouse: the shield bash.
    { id: "furusiyya_bash", col: 110, teaches: "bash" },
    // Another, past the square's lamp, before the captors spring: the Storm of Blades (and resolve).
    { id: "furusiyya_storm", col: 172, teaches: "storm" },
  ],
  enemies: [
    // Stripping a body in the first lanes, his back to the river wall.
    { kind: "swordsman", col: 33, face: 1, activity: "loot", patrol: 0 },
    // On the fallen house's roof, watching the lane.
    { kind: "archer", col: 58, row: 22, face: -1, activity: "watch" },
    // The lanes: a lookout, and behind him a woman kneeling under a sabre.
    { kind: "spearman", col: 71, face: -1, patrol: 0 },
    { kind: "swordsman", col: 77, face: 1, activity: "execute", victim: "lanes_captive", delay: 4.0, patrol: 0 },
    // By the bathhouse, stabbing at the dead; a patrol beyond.
    { kind: "spearman", col: 103, face: 1, activity: "stab", patrol: 0 },
    // A Georgian shield-bearer, Hulegu's ally, on the bathhouse street: the bash breaks his wall.
    { kind: "shieldbearer", col: 118, face: -1, patrol: 30 },
    // On the second collapse.
    { kind: "archer", col: 140, row: 19, face: -1, activity: "watch" },
    // Among the mosque's dead, a Kipchak outrider: he will not stand for a heavy blow (quick cuts take him).
    { kind: "skirmisher", col: 158, face: -1, patrol: 0 },
    // The square: a headsman at his work as the captors spring.
    { kind: "swordsman", col: 190, face: 1, activity: "execute", victim: "square_captive", delay: 5.0, patrol: 0 },
    { kind: "swordsman", col: 197, face: -1, dormant: true, group: "captors" },
    { kind: "spearman", col: 214, face: -1, dormant: true, group: "captors" },
    { kind: "veteran", col: 218, face: -1, dormant: true, group: "captors" },
    // The ruins: a looter at a chest under an archer's eye.
    { kind: "swordsman", col: 228, face: 1, activity: "loot", patrol: 0 },
    { kind: "archer", col: 243, row: 22, face: -1, activity: "watch" },
    // At the quarter gate, burning the scholars' books.
    { kind: "swordsman", col: PYRE - 2.25, face: 1, activity: "burn", patrol: 0 },
    { kind: "spearman", col: PYRE + 2, face: -1, activity: "chat", patrol: 0 },
  ],
  npcs: [
    { id: "salim", kind: "salim", col: 205, face: -1, dialogue: "salim", requires: "captors_cleared",
      gives: "salim_freed", notice: "NOTICE_SALIM", teaches: "knives", keepsake: "saffron_sash" },
  ],
  // Others roped beside Salim run once the captors fall; two kneel under a headsman's sabre.
  captives: [
    { kind: "refugee_woman", col: 201, face: 1, freedBy: "captors_cleared", run: -1 },
    { kind: "refugee_man", col: 208, face: -1, freedBy: "captors_cleared", run: -1 },
    { id: "lanes_captive", kind: "refugee_woman", col: 79, face: 1, run: -1, thanks: "SAVED_2" },
    { id: "square_captive", kind: "refugee_man", col: 192, face: 1, run: -1, thanks: "SAVED_3" },
  ],
  triggers: [
    { id: "streets_start", from: 6, to: 9, line: "STREETS_1" },
    // A master's technique: taught only on a journey after the chapter has been finished.
    { id: "lesson_rising_cleave", from: 15, to: 18, teaches: "rising_cleave", requiresFlag: "master" },
    { id: "hint_rooftops", from: 40, to: 45, hint: "HINT_ROOFTOPS" },
    { id: "hint_archers", from: 52, to: 56, hint: "HINT_ARCHERS" },
    { id: "hint_execution", from: 63, to: 65, hint: "HINT_EXECUTION" },
    { id: "hint_shieldbearer", from: 112, to: 114, hint: "HINT_SHIELDBEARER" },
    { id: "lesson_running_slash", from: 126, to: 129, teaches: "running_slash" },
    { id: "hint_skirmisher", from: 145, to: 147, hint: "HINT_SKIRMISHER" },
    { id: "mosque_dead", from: 149, to: 151, speaker: "SPEAKER_YUSUF", line: "MOSQUE_DEAD_1" },
    { id: "captors", from: 186, to: 188, event: "ambush", group: "captors", line: "CAPTORS_1" },
  ],
  exit: { name: "QuarterGate", col: 270, art: "quarter_gate", prompt: "PROMPT_OPEN_QUARTER_GATE",
    lockedPrompt: "PROMPT_QUARTER_GATE", lockedLine: "GATE_LOCKED_2", requires: "salim_freed",
    lockedLines: [["captors_cleared", "GATE_LOCKED_SALIM"], ["", "GATE_LOCKED_2"]] },
  fires: [
    [11, STREET, "large"], [21, STREET, "medium"], [39, STREET, "small"], [53, 22, "small"], [66, STREET, "large"],
    [86, STREET, "medium"], [108, STREET, "small"], [124, STREET, "large"], [138, 19, "medium"], [152, STREET, "small"],
    [172, STREET, "large"], [196, STREET, "small"], [226, STREET, "large"], [248, STREET, "medium"],
    [PYRE - 0.125, STREET, "medium"],
  ],
};
