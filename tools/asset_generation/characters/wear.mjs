// The wear of a sacked city on those who fight in it, laid on a material's colour by its place on the surface (its u
// and v, so it stays where it is through every frame): dust and soot gathered toward a garment's hem and on boots,
// blood spattered where a man has been killing, scratches and dull patches on metal, stains on a shield's face. Kept
// restrained: a few marks in clusters, never a texture over everything.
import { hex, mix } from "../lib/canvas.mjs";
import { P } from "../lib/palette.mjs";

const frac = (x) => x - Math.floor(x);
/** A stable hash of a surface cell. */
export const cell = (a, b, seed = 0) => frac(Math.sin(a * 127.1 + b * 311.7 + seed * 74.7) * 43758.5453);

/** The dust of the streets: ash and brick dust, grey-brown. */
export const DUST = hex("#4e4239");
const SOOT = hex("#120e0f");

/**
 * Dust and soot gathered toward a garment's lower edge: `t` is how far down it the point lies (0 at its top, 1 at its
 * hem); from `from` on it gathers, in patches, thickest at the hem.
 */
export function dusty(color, s, t, { from = 0.6, amount = 0.5, seed = 1 } = {}) {
  if (!color || t < from) return color;
  const k = Math.min(1, (t - from) / (1 - from));
  // In broad patches, each of one tint (dust, or soot where a fire was close), graded toward the hem.
  const cu = Math.floor(s.u / 4);
  const cv = Math.floor(s.v / 3);
  if (cell(cu, cv, seed) > 0.35 + k * 0.55) return color;
  const tint = cell(cu, cv, seed + 1) < 0.2 ? SOOT : DUST;
  return mix(color, tint, amount * 0.6 * (0.4 + 0.6 * k));
}

/**
 * Blood spattered on what faces the viewer: drops in a few clusters over the surface (`density`, the share of its
 * cells that carry any), darker where it has dried.
 */
export function spattered(color, s, { density = 0.06, seed = 3 } = {}) {
  if (!color || density <= 0 || s.n[2] < 0.15) return color;
  if (cell(Math.floor(s.u / 4), Math.floor(s.v / 4), seed) > density) return color;
  const drop = cell(Math.floor(s.u), Math.floor(s.v), seed + 1);
  if (drop > 0.45) return color;
  return drop < 0.15 ? P.blood[2] : drop < 0.3 ? P.blood[1] : mix(color, P.blood[1], 0.6);
}

/** Scratches across worn metal: short strokes, bright where they cut through to clean metal, a dull patch here and
 * there. `ramp` is the metal's. */
export function scratched(color, s, ramp, { density = 0.12, seed = 5 } = {}) {
  if (!color) return color;
  const along = s.u * 0.8 + s.v * 0.45;
  const across = s.v * 0.8 - s.u * 0.45;
  const stroke = cell(Math.floor(along / 4), Math.floor(across / 1.6), seed);
  if (stroke < density && frac(across / 1.6) < 0.4) return ramp[Math.min(ramp.length - 1, 4)];
  if (cell(Math.floor(s.u / 3.5), Math.floor(s.v / 3.5), seed + 2) < density * 0.6) return mix(color, ramp[1], 0.5);
  return color;
}

/** Stains on a painted or hide face: dark, ragged blots. */
export function stained(color, s, { density = 0.12, seed = 7 } = {}) {
  if (!color) return color;
  const blot = cell(Math.floor(s.u / 3), Math.floor(s.v / 3), seed);
  if (blot > density) return color;
  return mix(color, SOOT, cell(Math.floor(s.u), Math.floor(s.v), seed + 1) < 0.5 ? 0.45 : 0.25);
}
