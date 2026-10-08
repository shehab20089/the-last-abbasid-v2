// Distant layers made from the user's concept paintings (docs/concept_art): a region of a painting
// (the sky, the smoke and the burning skyline, clear of figures and near structures) resampled to the
// game's pixel grid by averaging in linear light, then reduced to a limited palette, so the far
// city of each level is the painted one, as pixel art. The palette is also returned, so nearer layers
// can be drawn in the same colours.
import { Canvas } from "../lib/canvas.mjs";
import { quantize } from "../lib/quantize.mjs";

const toLinear = (c) => (c / 255) ** 2.2;
const toByte = (v) => Math.round(255 * Math.max(0, Math.min(1, v)) ** (1 / 2.2));

/** Resamples [x, y, w, h] of `painting` to `width` x `height` (area average in linear light). */
export function resample(painting, [cx, cy, cw, ch], width, height) {
  const out = new Canvas(width, height);
  const sx = cw / width;
  const sy = ch / height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = cx + x * sx;
      const y0 = cy + y * sy;
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let yy = Math.floor(y0); yy < Math.max(Math.floor(y0) + 1, Math.floor(y0 + sy)); yy++) {
        for (let xx = Math.floor(x0); xx < Math.max(Math.floor(x0) + 1, Math.floor(x0 + sx)); xx++) {
          const c = painting.get(xx, yy);
          r += toLinear(c[0]);
          g += toLinear(c[1]);
          b += toLinear(c[2]);
          n++;
        }
      }
      out.set(x, y, [toByte(r / n), toByte(g / n), toByte(b / n), 255]);
    }
  }
  return out;
}

/**
 * Paints out a rectangle (in layer pixels) by blending, row by row, between the colours just left and
 * right of it: for removing a near post or a figure from a distant view.
 */
export function paintOut(canvas, [x0, y0, x1, y1]) {
  for (let y = y0; y <= y1; y++) {
    const a = canvas.get(x0 - 1, y);
    const b = canvas.get(x1 + 1, y);
    for (let x = x0; x <= x1; x++) {
      const t = (x - x0 + 1) / (x1 - x0 + 2);
      canvas.set(x, y, [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, 255].map(Math.round));
    }
  }
}

/**
 * A distant layer from a painting. options: crop [x, y, w, h] in the painting, the layer's width
 * and height, colors (palette size), patches (rectangles to paint out, in layer pixels), grade(rgb)
 * -> rgb applied before the palette. Returns { canvas, palette }.
 */
export function paintedLayer(source, { crop, width, height, colors = 96, grade = null, patches = [] }) {
  const painting = Canvas.fromPng(source);
  const canvas = resample(painting, crop, width, height);
  for (const patch of patches) paintOut(canvas, patch);
  if (grade) {
    for (let i = 0; i < width * height; i++) {
      const graded = grade([canvas.data[i * 4], canvas.data[i * 4 + 1], canvas.data[i * 4 + 2]]);
      canvas.data[i * 4] = Math.round(Math.max(0, Math.min(255, graded[0])));
      canvas.data[i * 4 + 1] = Math.round(Math.max(0, Math.min(255, graded[1])));
      canvas.data[i * 4 + 2] = Math.round(Math.max(0, Math.min(255, graded[2])));
    }
  }
  const palette = quantize([canvas], colors);
  return { canvas, palette };
}
