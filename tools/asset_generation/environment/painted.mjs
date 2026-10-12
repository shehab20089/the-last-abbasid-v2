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
 * Quiets a painted layer where it would compete with the fight, as a level asks (its painting's `quiet`): over the
 * whole painting the hottest highlights are compressed above `knee` (linear light) by `highlights`, so its fires still
 * burn but no longer outshine the street; and from `from` (a fraction of its height) down, where it stands behind the
 * fighters' heads, its detail is softened toward a blurred copy (`soft`) and its light lowered to `light`; and the whole
 * of it a little dimmer (`dim`). A level whose sky does not compete asks for none of it.
 */
export function quietPainting(canvas, { from = 0.5, light = 1, soft = 0, knee = 1, highlights = 1, dim = 1 } = {}) {
  const { width, height } = canvas;
  const lin = (v) => (v / 255) ** 2.2;
  const linear = new Float32Array(width * height * 3);
  for (let i = 0; i < width * height; i++) {
    for (let k = 0; k < 3; k++) linear[i * 3 + k] = lin(canvas.data[i * 4 + k]);
  }
  // A soft copy: two passes of a 5-pixel box, across then down.
  const pass = (src, dx, dy) => {
    const out = new Float32Array(src.length);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let k = 0; k < 3; k++) {
          let sum = 0;
          for (let s = -2; s <= 2; s++) {
            const xx = Math.min(width - 1, Math.max(0, x + s * dx));
            const yy = Math.min(height - 1, Math.max(0, y + s * dy));
            sum += src[(yy * width + xx) * 3 + k];
          }
          out[(y * width + x) * 3 + k] = sum / 5;
        }
      }
    }
    return out;
  };
  const blurred = soft > 0 ? pass(pass(linear, 1, 0), 0, 1) : linear;
  for (let y = 0; y < height; y++) {
    const u = Math.min(1, Math.max(0, (y / height - from) / 0.22));
    const t = u * u * (3 - 2 * u);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      let rgb = [0, 1, 2].map((k) => linear[i * 3 + k] + (blurred[i * 3 + k] - linear[i * 3 + k]) * soft * t);
      const top = Math.max(rgb[0], rgb[1], rgb[2]);
      if (top > knee) rgb = rgb.map((v) => v * (knee + (top - knee) * highlights) / top);
      const f = (1 - (1 - light) * t) * dim;
      for (let k = 0; k < 3; k++) canvas.data[i * 4 + k] = Math.round(255 * Math.min(1, rgb[k] * f) ** (1 / 2.2));
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
