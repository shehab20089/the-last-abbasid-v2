// The chapter's end: the last gate opens at first light; what was lost; what was carried out, and Yusuf at
// the back of the column. After a whole night of fire, the only daylight in the game.
import { FIRE, DAWN, DAWN_START, MEMORY } from "./grades.mjs";
import { PAINTINGS } from "./paintings.mjs";
import { BOOKS } from "./market_end.mjs";

export default {
  id: "ending",
  shots: [
    {
      painting: "gate",
      camera: [[0, [0, 110, 1672, 700]], [1, [60, 140, 1500, 628]]],
      grade: DAWN_START, gradeTo: DAWN,
      lines: ["ENDING_1"],
      lead: 1.4, tail: 1.0, minimum: 9, fadeIn: 1.6,
      fire: 0.3, sway: 0.5, water: 0.4, smoke: 0.3, smokeArea: [380, 0, 500, 330],
      birds: 6, ash: 10,
      ambience: "wind",
      cues: [[0.04, "gate_open"]],
    },
    {
      painting: "river",
      camera: [[0, [0, 440, 1200, 502]], [1, [140, 470, 1000, 418]]],
      grade: MEMORY,
      lines: ["ENDING_2"],
      lead: 1.0, tail: 1.0, minimum: 8, dissolve: 1.4,
      fire: 0.35, water: 0.6,
      ink: { rect: [0, 300, 1672, 641], sources: BOOKS, water: PAINTINGS.river.water },
      inkFrom: 1,
      ambience: "river",
    },
    {
      painting: "road",
      camera: [[0, [0, 120, 1100, 460]], [0.45, [300, 150, 1100, 460]], [1, [740, 250, 900, 377]]],
      grade: DAWN,
      lines: ["ENDING_3", "ENDING_4"],
      lead: 1.0, tail: 2.0, minimum: 16, dissolve: 1.4, fadeOut: 2.0,
      fire: 0.3, sway: 0.5, water: 0.5, smoke: 0.3, smokeArea: [780, 0, 892, 300],
      birds: 6, ash: 8,
    },
  ],
};
