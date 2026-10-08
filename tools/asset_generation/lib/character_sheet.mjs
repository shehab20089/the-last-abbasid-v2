// Review sheets for character animations, and the shared baseline of every sprite canvas.
import { Canvas, grid, hex } from "./canvas.mjs";

/** The ground line of a canvas: four pixels above its bottom. */
export const baselineOf = (height) => height - 4;

/** A review sheet: frames enlarged on a mid-tone background with a ground line. */
export function reviewSheet(canvases, { factor = 4, columns = 8, background = hex("#3b3437") } = {}) {
  const framed = canvases.map((c) => {
    const out = new Canvas(c.width, c.height);
    out.clear(background);
    for (let x = 0; x < c.width; x++) out.set(x, baselineOf(c.height) + 1, hex("#5a4e4a"));
    out.blit(c, 0, 0);
    return out;
  });
  return grid(framed, Math.min(columns, framed.length), { gap: 2, background: hex("#151215") })
    .scaled(factor);
}
