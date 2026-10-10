// After the Scholars' Quarter: the library burns behind him; before dawn the survivors go to the last gate.
import { FIRE, BLAZE, PREDAWN } from "./grades.mjs";

export default {
  id: "scholars_end",
  shots: [
    {
      painting: "scholars",
      camera: [[0, [820, 40, 850, 356]], [1, [940, 100, 640, 268]]],
      grade: FIRE, gradeTo: BLAZE,
      lines: ["SCHOLARS_END_1"],
      lead: 1.0, tail: 1.0, minimum: 8, fadeIn: 1.0,
      fire: 0.7, smoke: 0.5, smokeArea: [820, 0, 852, 450],
      embers: 70, ash: 40,
      ambience: "fire_wind",
    },
    {
      painting: "gate",
      camera: [[0, [680, 20, 990, 414]], [1, [720, 60, 900, 377]]],
      grade: PREDAWN,
      lines: ["SCHOLARS_END_2"], heading: true,
      lead: 1.0, tail: 1.0, minimum: 8, dissolve: 1.6, fadeOut: 1.0,
      fire: 0.25, sway: 0.5, smoke: 0.25, smokeArea: [680, 0, 992, 300],
      birds: 3, ash: 20,
      ambience: "wind",
    },
  ],
};
