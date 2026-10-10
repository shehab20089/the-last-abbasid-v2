// After the Fallen Market: the satchel goes down the river of ink, and Yusuf turns back to the streets.
import { FIRE } from "./grades.mjs";
import { PAINTINGS } from "./paintings.mjs";

// Where the books lie in the water of 16_River_of_Ink: the ink blooms from them.
export const BOOKS = [[1270, 570], [1220, 640], [1480, 600], [1430, 710], [380, 560], [500, 660], [520, 790],
  [750, 820], [1100, 850], [1350, 900], [1180, 470], [1540, 500], [1640, 660], [300, 520], [900, 640]];

export default {
  id: "market_end",
  shots: [
    {
      painting: "river",
      camera: [[0, [440, 290, 780, 326]], [1, [0, 100, 1672, 700]]],
      grade: FIRE,
      lines: ["MARKET_END_1", "MARKET_END_2"],
      lead: 1.2, tail: 1.0, minimum: 12, fadeIn: 1.0,
      fire: 0.45, water: 0.8, drift: [6, -10], smoke: 0.35, smokeArea: [0, 0, 1672, 260],
      embers: 30, ash: 18,
      ink: { rect: [0, 300, 1672, 641], sources: BOOKS, water: PAINTINGS.river.water },
      washLine: 1,
      ambience: "river",
    },
    {
      painting: "streets",
      camera: [[0, [0, 120, 1000, 418]], [1, [80, 170, 620, 259]]],
      grade: FIRE,
      lines: ["MARKET_END_3"], heading: true,
      lead: 1.0, tail: 1.2, minimum: 9, dissolve: 1.2, fadeOut: 1.0,
      fire: 0.5, sway: 0.6, smoke: 0.4, smokeArea: [300, 0, 1000, 350],
      embers: 40, ash: 40,
      ambience: "fire_wind",
    },
  ],
};
