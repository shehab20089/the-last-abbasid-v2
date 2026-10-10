// After the Streets of Ash: Salim goes west through the smoke; Yusuf goes on to the colleges, where the
// teachers of Baghdad had spent their lives among books (the library at peace, then the quarter burning).
import { FIRE, PEACE } from "./grades.mjs";

export default {
  id: "streets_end",
  shots: [
    {
      painting: "streets",
      camera: [[0, [420, 40, 1100, 460]], [1, [570, 60, 1000, 418]]],
      grade: FIRE,
      lines: ["STREETS_END_1"],
      lead: 1.2, tail: 1.0, minimum: 8, fadeIn: 1.0,
      fire: 0.5, sway: 0.5, smoke: 0.5, smokeArea: [300, 0, 1372, 400],
      embers: 30, ash: 50,
      ambience: "fire_wind",
    },
    {
      painting: "library",
      camera: [[0, [130, 160, 1300, 544]], [1, [330, 220, 1000, 418]]],
      grade: PEACE,
      lines: ["STREETS_END_2"],
      lead: 1.0, tail: 0.3, minimum: 7, dissolve: 1.4,
      fire: 0.3, motes: 20,
    },
    {
      painting: "scholars",
      camera: [[0, [0, 60, 1672, 700]], [1, [100, 100, 1500, 628]]],
      grade: FIRE,
      heading: true,
      lead: 2.0, tail: 0.8, minimum: 5, dissolve: 2.0, fadeOut: 1.0,
      fire: 0.6, smoke: 0.4, smokeArea: [0, 0, 1672, 330],
      embers: 40, ash: 30,
    },
  ],
};
