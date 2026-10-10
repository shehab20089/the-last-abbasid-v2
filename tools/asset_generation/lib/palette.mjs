// The game's master palette. Every ramp runs darkest to lightest and shifts hue as it goes
// (shadows cool toward violet, lights warm toward the firelight), so characters, props and
// architecture all read as one dark, burning world.
import { hex } from "./canvas.mjs";

const ramp = (...codes) => codes.map((c) => hex(c));

export const P = {
  // The hero: charcoal padded coat, teal cloth, umber trousers, worn leather, bronze and steel.
  skin: ramp("#2a1712", "#4f2c1f", "#7a4630", "#a2663f", "#c48d5e"),
  hair: ramp("#0f0b0b", "#1d1513", "#2f231e", "#43322a"),
  coat: ramp("#0d0c0f", "#17151a", "#232026", "#312c35", "#443e49"),
  teal: ramp("#0a1c1f", "#11302f", "#1a4645", "#265f5c", "#3a7d76"),
  trousers: ramp("#140e0a", "#22180f", "#332417", "#463322"),
  leather: ramp("#170f0a", "#2b1b11", "#42291a", "#5b3c26", "#775436"),
  bronze: ramp("#2b1a0d", "#533313", "#835822", "#b2833c", "#dab36a"),
  steel: ramp("#121519", "#272d34", "#46505b", "#727e8a", "#adb9c4", "#e1eaf0"),
  mail: ramp("#15181c", "#2a2f36", "#454d57", "#6b7581"),
  shieldFace: ramp("#1d0f0c", "#33191a", "#4b2522", "#63332b"),

  // Mongol soldiers: rust, indigo and ochre wool, lacquered lamellar, fur and felt.
  mongolSkin: ramp("#28170f", "#4e301f", "#775034", "#9c6f4c", "#bb8f69"),
  rust: ramp("#1b0b0a", "#361412", "#561f18", "#773022", "#95492f"),
  indigo: ramp("#0c0f1b", "#161c30", "#232c47", "#334061", "#4a5a80"),
  ochre: ramp("#24180b", "#423014", "#64481d", "#876329", "#a9813a"),
  lamellar: ramp("#13100e", "#27211d", "#3f362f", "#5b4e43", "#7a6a5a"),
  lacing: ramp("#2c0c0a", "#4f1712", "#74241a"),
  fur: ramp("#1d140d", "#352617", "#523c27", "#715539", "#917050"),
  felt: ramp("#1a1715", "#2f2a26", "#47403a", "#615850"),
  iron: ramp("#101215", "#22262c", "#3a4048", "#5a636d", "#8a949f", "#c4ccd3"),
  gold: ramp("#3a2410", "#6b4419", "#a07028", "#d0a548", "#f0d58c"),

  // Civilians and scholars.
  linen: ramp("#2b261f", "#4a4237", "#6e6454", "#948871", "#b8ab90"),
  wool: ramp("#1c1714", "#2f2722", "#463b33", "#5f5146"),
  madder: ramp("#2a0b0a", "#4c1512", "#71211a", "#963224", "#b44b30"),
  saffron: ramp("#3a2608", "#6a4510", "#9a6a18", "#c99428", "#e8bd52"),
  whiteBeard: ramp("#4a4440", "#76706a", "#a39d95", "#cfc9bf"),

  // Architecture and the city.
  brick: ramp("#16110e", "#271d17", "#3b2c21", "#53402e", "#6d553c", "#8b6e4c", "#ab8b62"),
  plaster: ramp("#1d1714", "#30261f", "#463a2e", "#5f4f3e", "#7a6650", "#998265"),
  stone: ramp("#141215", "#232026", "#353037", "#4a434a", "#625960", "#7c7277"),
  wood: ramp("#120c09", "#20150e", "#321f14", "#47301d", "#5f4127", "#7b5631"),
  tile: ramp("#0a2326", "#0f3a3e", "#175458", "#227276", "#3a9592", "#6cbcae"),
  awning: ramp("#2a0d0b", "#4a1814", "#6c241b", "#8e3424"),
  awningAlt: ramp("#14182a", "#212844", "#2f3a5e", "#435078"),

  // Sky, smoke and fire.
  night: ramp("#06050a", "#0b0912", "#110e1b", "#191425", "#221b30", "#2e2339"),
  glow: ramp("#2d1219", "#4a1a1a", "#6e2518", "#9a3916", "#c4561b", "#e5812c"),
  smoke: ramp("#141114", "#1f1a1e", "#2b2429", "#382f34", "#463b40", "#55494c"),
  fire: ramp("#3a0a06", "#6e1608", "#a82b0b", "#d8501a", "#f28526", "#ffc24a", "#fff0b4"),
  ash: ramp("#4c4643", "#6e6662", "#958b85", "#bdb2aa"),

  // Interface.
  panel: ramp("#08070a", "#0f0d12", "#17141b", "#211c26", "#2c2532"),
  brass: ramp("#33220f", "#5c3f19", "#8c672b", "#bb9346", "#e2c682"),
  parchment: ramp("#5c5040", "#8a7b62", "#b8a888", "#ddd0b2", "#f1e8d2"),
  blood: ramp("#2a0808", "#4e0f0e", "#7d1916", "#ad2a22", "#d6463a"),
  jade: ramp("#0e2a24", "#16443a", "#226452", "#34896e", "#5fb393"),

  outline: hex("#08070a"),
  transparent: [0, 0, 0, 0],
};
