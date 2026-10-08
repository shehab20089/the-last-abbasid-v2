// A small RGBA pixel canvas with the primitives the generators share. Colours are [r, g, b, a]
// arrays (0-255). Nothing here antialiases: every primitive writes whole pixels.
import { writePng, readPng } from "./png.mjs";

export function hex(code, alpha = 255) {
  const value = code.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
    alpha,
  ];
}

export function toHex(color) {
  return "#" + color.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

export function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round((a[3] ?? 255) + ((b[3] ?? 255) - (a[3] ?? 255)) * t),
  ];
}

export function withAlpha(color, alpha) {
  return [color[0], color[1], color[2], alpha];
}

export function sameColor(a, b) {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

export class Canvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.data = new Uint8ClampedArray(width * height * 4);
  }

  static fromPng(path) {
    const image = readPng(path);
    const canvas = new Canvas(image.width, image.height);
    canvas.data.set(image.data);
    return canvas;
  }

  inside(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  get(x, y) {
    if (!this.inside(x, y)) return [0, 0, 0, 0];
    const i = (y * this.width + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  alpha(x, y) {
    if (!this.inside(x, y)) return 0;
    return this.data[(y * this.width + x) * 4 + 3];
  }

  set(x, y, color) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y) || !color) return;
    const i = (y * this.width + x) * 4;
    this.data[i] = color[0];
    this.data[i + 1] = color[1];
    this.data[i + 2] = color[2];
    this.data[i + 3] = color[3] ?? 255;
  }

  /** Source-over blend of one pixel; `opacity` scales the colour's own alpha. */
  blend(x, y, color, opacity = 1) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (!this.inside(x, y) || !color) return;
    const a = ((color[3] ?? 255) / 255) * opacity;
    if (a <= 0) return;
    const i = (y * this.width + x) * 4;
    const da = this.data[i + 3] / 255;
    const outA = a + da * (1 - a);
    if (outA <= 0) return;
    for (let c = 0; c < 3; c++) {
      this.data[i + c] = Math.round((color[c] * a + this.data[i + c] * da * (1 - a)) / outA);
    }
    this.data[i + 3] = Math.round(outA * 255);
  }

  clear(color = [0, 0, 0, 0]) {
    for (let i = 0; i < this.width * this.height; i++) {
      this.data.set(color, i * 4);
    }
  }

  fillRect(x, y, w, h, color) {
    for (let yy = Math.max(0, y); yy < Math.min(this.height, y + h); yy++) {
      for (let xx = Math.max(0, x); xx < Math.min(this.width, x + w); xx++) this.set(xx, yy, color);
    }
  }

  /** Bresenham line, one pixel wide. */
  line(x0, y0, x1, y1, color) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Fills a polygon (array of [x, y]) by testing pixel centres. */
  polygon(points, color) {
    const ys = points.map((p) => p[1]);
    const minY = Math.max(0, Math.floor(Math.min(...ys)));
    const maxY = Math.min(this.height - 1, Math.ceil(Math.max(...ys)));
    for (let y = minY; y <= maxY; y++) {
      const cy = y + 0.5;
      const xs = [];
      for (let i = 0; i < points.length; i++) {
        const [ax, ay] = points[i];
        const [bx, by] = points[(i + 1) % points.length];
        if ((ay <= cy && by > cy) || (by <= cy && ay > cy)) {
          xs.push(ax + ((cy - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.set(x, y, color);
      }
    }
  }

  ellipse(cx, cy, rx, ry, color) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) {
      for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, color);
      }
    }
  }

  /** Copies `source` onto this canvas at (dx, dy), skipping transparent pixels. */
  blit(source, dx, dy, { flipX = false, opacity = 1, blendMode = "over" } = {}) {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const sx = flipX ? source.width - 1 - x : x;
        const color = source.get(sx, y);
        if (color[3] === 0) continue;
        if (blendMode === "replace") this.set(dx + x, dy + y, color);
        else this.blend(dx + x, dy + y, color, opacity);
      }
    }
  }

  /** Copies a rectangle into a new canvas. */
  crop(x, y, w, h) {
    const out = new Canvas(w, h);
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) out.set(xx, yy, this.get(x + xx, y + yy));
    }
    return out;
  }

  /** Nearest-neighbour enlargement, for review images only. */
  scaled(factor, background = null) {
    const out = new Canvas(this.width * factor, this.height * factor);
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        const color = this.get(Math.floor(x / factor), Math.floor(y / factor));
        if (background && color[3] < 255) {
          out.set(x, y, background);
          out.blend(x, y, color);
        } else {
          out.set(x, y, color);
        }
      }
    }
    return out;
  }

  /** Bounding box of non-transparent pixels, or null. */
  bounds() {
    let minX = this.width, minY = this.height, maxX = -1, maxY = -1;
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.alpha(x, y) > 0) {
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        }
      }
    }
    return maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  }

  save(path) {
    writePng(path, this.width, this.height, this.data);
  }
}

/** Lays canvases out left to right into one strip. */
export function strip(frames) {
  const width = frames.reduce((sum, f) => sum + f.width, 0);
  const height = Math.max(...frames.map((f) => f.height));
  const out = new Canvas(width, height);
  let x = 0;
  for (const frame of frames) {
    out.blit(frame, x, 0, { blendMode: "replace" });
    x += frame.width;
  }
  return out;
}

/** Arranges canvases in a grid with a gap and background, for review sheets. */
export function grid(frames, columns, { gap = 2, background = [0, 0, 0, 0] } = {}) {
  const cw = Math.max(...frames.map((f) => f.width));
  const ch = Math.max(...frames.map((f) => f.height));
  const rows = Math.ceil(frames.length / columns);
  const out = new Canvas(columns * (cw + gap) + gap, rows * (ch + gap) + gap);
  out.clear(background);
  frames.forEach((frame, i) => {
    const x = gap + (i % columns) * (cw + gap);
    const y = gap + Math.floor(i / columns) * (ch + gap);
    out.blit(frame, x, y);
  });
  return out;
}
