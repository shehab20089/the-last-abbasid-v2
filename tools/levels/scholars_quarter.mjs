// Level 3, The Scholars' Quarter: in through the college's great portal, across its courtyard and
// fountain to the library, where soldiers are tearing down the shelves and the old keeper will not
// leave; then along the river wall, where the Tigris runs dark with ink and pages, through a
// lecture hall to the garden door. The hour before dawn. At the portal the soldiers are burning the
// college's books; by the fountain one waits to behead a scholar under an archer's eye; in the
// library the ambushers are at their work (rifling the shelves, stabbing at a dead scholar,
// standing over the old keeper); on the river wall another execution, covered from the mooring
// steps; in the hall a looter at a chest. Tiles of 16 px; the street is row STREET.

/** The pyre at the portal: the prop's centre column (its fire burns 6 px right of it). */
const PYRE = 19;

export const STREET = 28;
export const COLS = 300;
export const ROWS = 32;

export const LEVEL = {
  id: "scholars_quarter",
  scene: "res://features/levels/scholars_quarter/scholars_quarter.tscn",
  env: "res://assets/environments/scholars",
  look: "predawn",
  // The far city and the Tigris are the gameplay mockup's (docs/concept_art), pixel-converted.
  painting: { source: "docs/concept_art/10_Pixel_Art_Gameplay_Mockup.png", crop: [384, 112, 1000, 354], scroll: 0.06 },
  tint: "Color(0.8, 0.82, 0.94, 1)",
  title: "LEVEL_SCHOLARS_QUARTER",
  music: "scholars",
  ambience: "river",
  next: "res://features/levels/last_gate/last_gate.tscn",
  exitCard: "scholars_end",
  exitTitle: "LEVEL_LAST_GATE",
  objectives: [
    ["codex", "OBJ_LAST_GATE"], ["library_cleared", "OBJ_SPEAK_LIBRARIAN"], ["library", "OBJ_SAVE_LIBRARY"],
    ["", "OBJ_FIND_LIBRARIAN"],
  ],
  // The river and its far bank, seen over the river wall.
  river: { height: 150 },
  dress: { carpets: true },
  cols: COLS,
  rows: ROWS,
  start: [5, STREET],
  sections: [
    { name: "portal", from: 0, to: 26, theme: "portal" },
    { name: "courtyard", from: 26, to: 82, theme: "madrasa" },
    { name: "library", from: 82, to: 152, theme: "library" },
    { name: "river_wall", from: 152, to: 216, theme: "river" },
    { name: "hall", from: 216, to: 262, theme: ["library", "madrasa"] },
    { name: "garden_wall", from: 262, to: 300, theme: "houses" },
  ],
  terrain: [
    ["street", 0, COLS - 1, STREET, ROWS - 1],
    ["brick", 0, 2, 4, STREET - 1],
    ["stone", 52, 53, 27, 27],
    // A raised walk along the courtyard arcade.
    ["stone", 70, 78, 25, STREET - 1],
    // The library's gallery, reached up a stack of book crates.
    ["crate", 100, 101, 25, 27],
    ["plank", 102, 122, 22, 22],
    ["crate", 134, 135, 26, 27],
    // Mooring steps on the river wall.
    ["crate", 176, 177, 26, 27],
    ["stone", 190, 197, 25, STREET - 1],
    // The lecture hall's balcony.
    ["crate", 226, 227, 25, 27],
    ["plank", 228, 238, 22, 22],
    ["stone", 246, 255, 25, STREET - 1],
    ["brick", 297, 299, 4, STREET - 1],
  ],
  props: [
    ["pages", 9], ["lectern", 31], ["scroll_rack", 36], ["cypress", 46], ["fountain", 60],
    ["cypress", 66], ["jars", 80], ["shelf_fallen", 94.1], ["book_pile", 98.5], ["ink_spill", 106], ["lectern", 110],
    ["pages", 118], ["scroll_rack", 126], ["armillary", 141], ["shelf_fallen", 148, null, true], ["pages", 156],
    ["book_pile", 164], ["pages", 168], ["rubble", 188], ["pages", 203], ["lectern", 209], ["book_pile", 214.5],
    // The pyre at the portal, and the chest in the lecture hall.
    ["book_pyre", PYRE], ["chest_looted", 233.6],
    // The college's dead.
    ["corpse_scholar", 28], ["corpse_man_front", 47.5], ["corpse_scholar", 64.5], ["corpse_scholar", 101.5],
    ["corpse_woman_back", 150.5], ["corpse_scholar", 205.5], ["corpse_headless", 217], ["corpse_man_arrows", 243],
    ["corpse_woman_front", 266], ["corpse_scholar", 284.5],
    // The scholar the spearman in the library stabs at, and the body on the river wall.
    ["corpse_scholar", 129.75], ["corpse_man_back", 171.75],
    ["ink_spill", 222], ["scroll_rack", 233, 22], ["shelf_fallen", 242], ["pages", 252, 25], ["cypress", 268],
    ["jars", 274], ["cypress", 286],
  ],
  facades: [
    { kind: "tower", col: 0, width: 3, top: 4 },
    { kind: "tower", col: 297, width: 3, top: 4 },
  ],
  knownTechniques: ["bash", "knives"],
  checkpoints: [
    { id: "courtyard_lamp", col: 84 },
    { id: "river_lamp", col: 160 },
    { id: "hall_lamp", col: 220 },
  ],
  manuscripts: [
    { id: "astronomy", col: 120, row: 22 },
    // At the top of the library's crates, over the soldiers at their work below: the plunge.
    { id: "furusiyya_plunge", col: 103, row: 22, teaches: "plunge" },
    { id: "poem", col: 207 },
    { id: "algebra", col: 236, row: 22 },
  ],
  enemies: [
    // Burning the college's books inside the portal.
    { kind: "swordsman", col: PYRE - 2.625, face: 1, activity: "burn", patrol: 0 },
    { kind: "spearman", col: PYRE + 2, face: -1, activity: "chat", patrol: 0 },
    // By the fountain, a scholar kneels under a sabre; an archer watches from the arcade.
    { kind: "swordsman", col: 54, face: 1, activity: "execute", victim: "fountain_captive", delay: 3.5, patrol: 0 },
    { kind: "archer", col: 76, row: 25, face: -1, activity: "watch" },
    // Rifling a fallen shelf at the library door.
    { kind: "swordsman", col: 92, face: 1, activity: "loot", patrol: 0 },
    // In the library, at their work until the hero walks in.
    { kind: "swordsman", col: 112, face: -1, dormant: true, group: "library", activity: "loot" },
    { kind: "archer", col: 117, row: 22, face: -1, dormant: true, group: "library", activity: "watch" },
    { kind: "spearman", col: 128, face: 1, dormant: true, group: "library", activity: "stab" },
    { kind: "swordsman", col: 144, face: 1, dormant: true, group: "library", activity: "menace" },
    // On the river wall: stabbing at a body; then an execution, covered from the mooring steps.
    { kind: "spearman", col: 170, face: 1, activity: "stab", patrol: 0 },
    { kind: "swordsman", col: 183, face: 1, activity: "execute", victim: "river_captive", delay: 3.0, patrol: 0 },
    // A siege engineer on the mooring steps, lobbing fire to cover the execution.
    { kind: "engineer", col: 195, row: 25, face: -1 },
    // The lecture hall's chest; the far end of the hall; the garden wall.
    { kind: "swordsman", col: 232, face: 1, activity: "loot", patrol: 0 },
    // An engineer on the hall's balcony; a shield-bearer at the hall's far end; a veteran at the garden wall.
    { kind: "engineer", col: 236, row: 22, face: -1 },
    { kind: "shieldbearer", col: 258, face: -1, patrol: 20 },
    { kind: "veteran", col: 280, face: -1, patrol: 24 },
  ],
  // Those kneeling under a headsman's sabre.
  captives: [
    { id: "fountain_captive", kind: "refugee_man", col: 56, face: 1, run: -1, thanks: "SAVED_4" },
    { id: "river_captive", kind: "refugee_woman", col: 185, face: 1, run: -1, thanks: "SAVED_5" },
  ],
  npcs: [
    { id: "copyist", kind: "copyist", col: 40, face: 1, dialogue: "copyist" },
    { id: "librarian", kind: "librarian", col: 146, face: -1, dialogue: "librarian", requires: "library_cleared",
      gives: "codex", notice: "NOTICE_CODEX" },
  ],
  triggers: [
    { id: "library", from: 102, to: 104, event: "ambush", group: "library", line: "LIBRARY_1" },
    { id: "river", from: 154, to: 157, line: "RIVER_1" },
    { id: "hint_engineer", from: 172, to: 175, hint: "HINT_ENGINEER" },
  ],
  exit: { name: "GardenDoor", col: 292, art: "garden_door", prompt: "PROMPT_OPEN_GARDEN_DOOR",
    lockedPrompt: "PROMPT_GARDEN_DOOR", lockedLine: "GATE_LOCKED_3", requires: "codex" },
  fires: [
    [12, STREET, "medium"], [44, STREET, "small"], [97, STREET, "large"], [124, STREET, "medium"],
    [PYRE - 0.125, STREET, "medium"],
    [140, STREET, "large"], [166, STREET, "small"], [200, STREET, "medium"], [224, STREET, "large"],
    [259, STREET, "small"], [276, STREET, "medium"],
  ],
};
