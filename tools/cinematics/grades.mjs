// The cinematics' grades: [saturation, contrast, exposure, tint red, green, blue], applied to a painting
// before its palette, by the shader in play (features/cinematics/cinematic.gdshader) and here when the
// palette is chosen. The fire grade is the title screen's (more saturation and contrast, so the fire keeps
// its heat through the palette).
export const FIRE = [1.22, 1.06, 1.0, 1.0, 1.0, 1.0];
// The city before the war: a little darker and less saturated than the paintings, to sit with the pack.
export const PEACE = [0.9, 1.0, 0.9, 1.0, 1.0, 1.0];
// The march in the snow: a touch of contrast, a little darker.
export const COLD = [0.95, 1.04, 0.97, 1.0, 1.0, 1.0];
// The map by lamplight.
export const LAMP = [1.0, 1.04, 0.98, 1.0, 0.98, 0.94];
// Before dawn: drained, cold and dim.
export const PREDAWN = [0.7, 1.1, 0.86, 0.7, 0.82, 1.1];
// First light, and the light warming.
export const DAWN_START = [0.85, 1.05, 0.82, 0.86, 0.9, 1.0];
export const DAWN = [1.08, 1.03, 1.02, 1.0, 0.98, 0.95];

/** Grades an sRGB colour (0-255) as the shader does. */
export function grade([r, g, b], [saturation, contrast, exposure, tr, tg, tb]) {
  const c = [r / 255, g / 255, b / 255];
  const l = 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  const tint = [tr, tg, tb];
  return c.map((v, i) => {
    const s = l + (v - l) * saturation;
    const k = (s - 0.5) * contrast + 0.5;
    return Math.round(Math.max(0, Math.min(1, k * exposure * tint[i])) * 255);
  });
}

// The library as the fire takes it: hotter and brighter.
export const BLAZE = [1.3, 1.1, 1.16, 1.1, 0.88, 0.74];
// What was lost, remembered: drained and cool.
export const MEMORY = [0.72, 1.05, 0.86, 0.94, 0.96, 1.02];
