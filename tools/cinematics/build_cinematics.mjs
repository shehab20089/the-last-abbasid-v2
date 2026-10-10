// Builds the cinematics that replace the story cards (docs/cinematics_plan.md): for every painting they use
// (tools/cinematics/paintings.mjs), the painting kept, its depth (red; green: what drifts) and its masks (red
// fire, green water, blue cloth); for every shot of every cinematic (tools/cinematics/<id>.mjs) its palette
// as a colour lookup, chosen from the painting as its camera frames it, graded; the map's ink and times for
// the opening; and each cinematic's CinematicDefinition. Everything it writes is generated.
//   node tools/cinematics/build_cinematics.mjs [--only intro,ending]
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { Canvas } from "../asset_generation/lib/canvas.mjs";
import { writePng } from "../asset_generation/lib/png.mjs";
import { quantize } from "../asset_generation/lib/quantize.mjs";
import { resample } from "../asset_generation/environment/painted.mjs";
import { grade } from "./grades.mjs";
import { PAINTINGS } from "./paintings.mjs";
import { buildMap, buildInk } from "./map.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const OUT = join(ROOT, "assets", "cinematics");
const CINEMATICS = ["intro", "market_end", "streets_end", "scholars_end", "ending"];
const args = process.argv.slice(2);
const onlyAt = args.indexOf("--only");
const only = onlyAt >= 0 ? args[onlyAt + 1].split(",") : null;
const PICTURE = [640, 268];
const PALETTE_SIZE = 128;
const res = (path) => "res://" + path.slice(ROOT.length + 1).replace(/\\/g, "/");

// --- Helpers ------------------------------------------------------------------------------------------
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;

function inside(poly, x, y) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/** A box blur of a w x h field, `passes` times, radius r (cells). */
function blur(field, w, h, r, passes = 2) {
  if (r < 1) return field;
  let a = field;
  let b = new Float32Array(w * h);
  for (let pass = 0; pass < passes; pass++) {
    for (let y = 0; y < h; y++) {
      let sum = 0;
      for (let x = -r; x <= r; x++) sum += a[y * w + Math.max(0, Math.min(w - 1, x))];
      for (let x = 0; x < w; x++) {
        b[y * w + x] = sum / (2 * r + 1);
        sum += a[y * w + Math.min(w - 1, x + r + 1)] - a[y * w + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let y = -r; y <= r; y++) sum += b[Math.max(0, Math.min(h - 1, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = sum / (2 * r + 1);
        sum += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

function crop(canvas, [x, y, w, h]) {
  const out = new Canvas(w, h);
  for (let yy = 0; yy < h; yy++) {
    const from = ((y + yy) * canvas.width + x) * 4;
    out.data.set(canvas.data.subarray(from, from + w * 4), yy * w * 4);
  }
  return out;
}

/** The mean luminance (0-1) and colour of a cell of the painting. */
function cell(canvas, x0, y0, size) {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = y0; y < Math.min(canvas.height, y0 + size); y++) {
    for (let x = x0; x < Math.min(canvas.width, x0 + size); x++) {
      const i = (y * canvas.width + x) * 4;
      r += canvas.data[i];
      g += canvas.data[i + 1];
      b += canvas.data[i + 2];
      n++;
    }
  }
  r /= n * 255;
  g /= n * 255;
  b /= n * 255;
  return { r, g, b, l: 0.3 * r + 0.59 * g + 0.11 * b };
}

/** A field (0-1 per cell) as an image's channel: fields = [red, green, blue], each null for 0. */
function fieldsImage(path, w, h, fields) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    for (let c = 0; c < 3; c++) data[i * 4 + c] = fields[c] ? Math.round(clamp01(fields[c][i]) * 255) : 0;
    data[i * 4 + 3] = 255;
  }
  writePng(path, w, h, data);
}

// A painting as an RGB PNG, each row filtered as suits it best: a third the size of the plain RGBA writer's.
const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buffer) {
  let c = -1;
  for (const byte of buffer) c = CRC[(c ^ byte) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}
function writeRgbPng(path, w, h, rgba) {
  const stride = w * 3;
  const rows = Buffer.alloc((stride + 1) * h);
  const previous = Buffer.alloc(stride);
  const line = Buffer.alloc(stride);
  const filtered = [0, 1, 2, 3, 4].map(() => Buffer.alloc(stride));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) line[x * 3 + c] = rgba[(y * w + x) * 4 + c];
    let best = 0;
    let bestSum = Infinity;
    for (let f = 0; f < 5; f++) {
      const out = filtered[f];
      let sum = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= 3 ? line[i - 3] : 0;
        const b = previous[i];
        const c = i >= 3 ? previous[i - 3] : 0;
        let predicted = 0;
        if (f === 1) predicted = a;
        else if (f === 2) predicted = b;
        else if (f === 3) predicted = (a + b) >> 1;
        else if (f === 4) {
          const pa = Math.abs(b - c);
          const pb = Math.abs(a - c);
          const pc = Math.abs(a + b - 2 * c);
          predicted = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
        }
        const r = (line[i] - predicted) & 255;
        out[i] = r;
        sum += r < 128 ? r : 256 - r;
      }
      if (sum < bestSum) { bestSum = sum; best = f; }
    }
    rows[y * (stride + 1)] = best;
    filtered[best].copy(rows, y * (stride + 1) + 1);
    line.copy(previous);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header[8] = 8;
  header[9] = 2;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })), chunk("IEND", Buffer.alloc(0))]));
}

/** Godot's import settings for a painting: compressed lossily (the palette hides it), no mipmaps. */
function writePaintingImport(path) {
  const importPath = path + ".import";
  if (existsSync(importPath)) return;
  writeFileSync(importPath, [
    "[remap]", "", 'importer="texture"', 'type="CompressedTexture2D"', "", "[deps]", "",
    `source_file="${res(path)}"`, "", "[params]", "",
    "compress/mode=1", "compress/high_quality=false", "compress/lossy_quality=0.88", "compress/uastc_level=0",
    "compress/rdo_quality_loss=0.0", "compress/hdr_compression=1", "compress/normal_map=0", "compress/channel_pack=0",
    "mipmaps/generate=false", "mipmaps/limit=-1", "roughness/mode=0", 'roughness/src_normal=""',
    "process/channel_remap/red=0", "process/channel_remap/green=1", "process/channel_remap/blue=2",
    "process/channel_remap/alpha=3", "process/fix_alpha_border=true", "process/premult_alpha=false",
    "process/normal_map_invert_y=false", "process/hdr_as_srgb=false", "process/hdr_clamp_exposure=false",
    "process/size_limit=0", "detect_3d/compress_to=1", "",
  ].join("\n"));
}

// --- Paintings ------------------------------------------------------------------------------------------
const paintings = new Map();

function painting(key) {
  if (paintings.has(key)) return paintings.get(key);
  const spec = PAINTINGS[key];
  if (!spec) throw new Error(`no painting "${key}" in paintings.mjs`);
  const source = Canvas.fromPng(join(ROOT, "docs", "concept_art", spec.file + ".png"));
  const keep = spec.keep ?? [0, 0, source.width, source.height];
  const dir = join(OUT, "paintings");
  mkdirSync(dir, { recursive: true });
  const stored = crop(source, keep);
  const paintingPath = join(dir, `${key}.png`);
  writeRgbPng(paintingPath, stored.width, stored.height, stored.data);
  writePaintingImport(paintingPath);

  // Depth (and what drifts) at a quarter of the painting's size.
  const dw = Math.ceil(keep[2] / 4);
  const dh = Math.ceil(keep[3] / 4);
  const depth = new Float32Array(dw * dh);
  const drift = new Float32Array(dw * dh);
  const base = spec.depth?.base ?? [[0, 0.5], [source.height, 0.5]];
  for (let j = 0; j < dh; j++) {
    for (let i = 0; i < dw; i++) {
      const x = keep[0] + i * 4 + 2;
      const y = keep[1] + j * 4 + 2;
      let d = base[base.length - 1][1];
      for (let k = 1; k < base.length; k++) {
        if (y <= base[k][0]) {
          d = lerp(base[k - 1][1], base[k][1], clamp01((y - base[k - 1][0]) / Math.max(1, base[k][0] - base[k - 1][0])));
          break;
        }
      }
      const { l } = cell(source, keep[0] + i * 4, keep[1] + j * 4, 4);
      for (const shape of spec.depth?.shapes ?? []) {
        if (!inside(shape.poly, x, y)) continue;
        if (shape.darker !== undefined && l >= shape.darker) continue;
        if (shape.brighter !== undefined && l <= shape.brighter) continue;
        d = shape.set ? shape.depth : Math.max(d, shape.depth);
      }
      depth[j * dw + i] = d;
      for (const poly of spec.drift ?? []) if (inside(poly, x, y)) drift[j * dw + i] = 1;
    }
  }
  blur(depth, dw, dh, Math.round((spec.depth?.blur ?? 8) / 4));
  blur(drift, dw, dh, 2);
  const depthPath = join(dir, `${key}_depth.png`);
  fieldsImage(depthPath, dw, dh, [depth, drift, null]);

  // Fire, water and cloth at half the painting's size.
  const mw = Math.ceil(keep[2] / 2);
  const mh = Math.ceil(keep[3] / 2);
  const fire = new Float32Array(mw * mh);
  const water = new Float32Array(mw * mh);
  const cloth = new Float32Array(mw * mh);
  const fireSpec = spec.fire ?? null;
  for (let j = 0; j < mh; j++) {
    for (let i = 0; i < mw; i++) {
      const x = keep[0] + i * 2 + 1;
      const y = keep[1] + j * 2 + 1;
      if (fireSpec) {
        const c = cell(source, keep[0] + i * 2, keep[1] + j * 2, 2);
        let f = smoothstep(fireSpec.min, fireSpec.min + 0.22, c.l) * smoothstep(0.1, 0.3, c.r - c.b);
        if (fireSpec.only && !fireSpec.only.some((poly) => inside(poly, x, y))) f = 0;
        if (fireSpec.exclude && fireSpec.exclude.some((poly) => inside(poly, x, y))) f = 0;
        fire[j * mw + i] = f;
      }
      for (const poly of spec.water ?? []) if (inside(poly, x, y)) water[j * mw + i] = 1;
      for (const banner of spec.sway ?? []) {
        if (inside(banner.poly, x, y)) cloth[j * mw + i] = Math.max(cloth[j * mw + i], clamp01((y - banner.top) / (banner.bottom - banner.top)));
      }
    }
  }
  blur(fire, mw, mh, 1, 1);
  blur(water, mw, mh, 4);
  blur(cloth, mw, mh, 1);
  const masksPath = join(dir, `${key}_masks.png`);
  fieldsImage(masksPath, mw, mh, [fire, water, cloth]);

  const entry = { key, spec, source, keep, paths: { painting: paintingPath, depth: depthPath, masks: masksPath } };
  paintings.set(key, entry);
  return entry;
}

// --- Palettes ---------------------------------------------------------------------------------------------
function srgbToOklab(r, g, b) {
  const lin = (c) => Math.pow(c / 255, 2.2);
  const lr = lin(r);
  const lg = lin(g);
  const lb = lin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** The palette's colour lookup: 64 levels a channel, blue in 8 x 8 tiles of 64 x 64. */
function writeLookup(path, palette) {
  const labs = palette.map(([r, g, b]) => srgbToOklab(r, g, b));
  const data = new Uint8ClampedArray(512 * 512 * 4);
  const level = (v) => Math.round((v * 255) / 63);
  for (let b = 0; b < 64; b++) {
    const tx = (b % 8) * 64;
    const ty = Math.floor(b / 8) * 64;
    for (let g = 0; g < 64; g++) {
      for (let r = 0; r < 64; r++) {
        const lab = srgbToOklab(level(r), level(g), level(b));
        let best = 0;
        let bestD = Infinity;
        for (let k = 0; k < labs.length; k++) {
          const d = (lab[0] - labs[k][0]) ** 2 + (lab[1] - labs[k][1]) ** 2 + (lab[2] - labs[k][2]) ** 2;
          if (d < bestD) { bestD = d; best = k; }
        }
        const i = ((ty + g) * 512 + tx + r) * 4;
        data[i] = palette[best][0];
        data[i + 1] = palette[best][1];
        data[i + 2] = palette[best][2];
        data[i + 3] = 255;
      }
    }
  }
  writePng(path, 512, 512, data);
}

/** The shot's palette: the painting as its camera frames it at each key, graded at its start and end. */
function shotPalette(shot, sources) {
  const canvases = [];
  const grades = [shot.grade, shot.gradeTo ?? shot.grade];
  for (const [, rect] of shot.camera) for (const source of sources) {
    const view = resample(source, rect, PICTURE[0], PICTURE[1]);
    for (const g of grades) {
      const graded = new Canvas(view.width, view.height);
      for (let i = 0; i < view.width * view.height; i++) {
        const c = grade([view.data[i * 4], view.data[i * 4 + 1], view.data[i * 4 + 2]], g);
        graded.data[i * 4] = c[0];
        graded.data[i * 4 + 1] = c[1];
        graded.data[i * 4 + 2] = c[2];
        graded.data[i * 4 + 3] = 255;
      }
      canvases.push(graded);
    }
  }
  return quantize(canvases, PALETTE_SIZE);
}

// --- Depth -----------------------------------------------------------------------------------------------
// The camera at u (0 to 1), eased between keys as CinematicShot.camera_at eases it.
function cameraAt(keys, u) {
  if (keys.length === 1 || u <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (u <= keys[i][0]) {
      let t = Math.max(0, Math.min(1, (u - keys[i - 1][0]) / Math.max(0.0001, keys[i][0] - keys[i - 1][0])));
      t = t * t * (3 - 2 * t);
      return keys[i - 1][1].map((v, k) => v + (keys[i][1][k] - v) * t);
    }
  }
  return keys[keys.length - 1][1];
}

/**
 * How strongly depth moves with the camera, so that through the whole shot the nearest and the farthest
 * parts of the painting drift at most `shift` screen pixels apart: a painting cut into depths by a soft map
 * smears where they part, so the parting is kept small.
 */
function parallaxFor(keys, reference, shift) {
  const ref = cameraAt(keys, reference);
  const refCentre = [ref[0] + ref[2] / 2, ref[1] + ref[3] / 2];
  let unit = 0;
  for (let i = 0; i <= 100; i++) {
    const cam = cameraAt(keys, i / 100);
    const centre = [cam[0] + cam[2] / 2, cam[1] + cam[3] / 2];
    const zoom = ref[2] / cam[2];
    for (const s of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0.5]]) {
      const at = (k) => [0, 1].map((a) => refCentre[a] + (centre[a] - refCentre[a]) * k + (s[a] - 0.5) * ref[2 + a] / Math.pow(zoom, k));
      const near = at(1.05);
      const far = at(0.95);
      const apart = Math.hypot(near[0] - far[0], near[1] - far[1]) / 0.1 / (cam[2] / PICTURE[0]);
      unit = Math.max(unit, apart);
    }
  }
  return unit > 0 ? Math.min(0.6, shift / unit) : 0;
}

// --- The definition -----------------------------------------------------------------------------------
const num = (v) => {
  const s = (Math.round(v * 10000) / 10000).toString();
  return s.includes(".") || s.includes("e") ? s : s;
};
const rect = ([x, y, w, h]) => `Rect2(${num(x)}, ${num(y)}, ${num(w)}, ${num(h)})`;
const floats = (list) => `PackedFloat32Array(${list.map(num).join(", ")})`;
const strings = (list) => `PackedStringArray(${list.map((s) => JSON.stringify(s)).join(", ")})`;

function writeDefinition(id, shots) {
  const ext = [];
  const extId = new Map();
  const use = (type, path) => {
    const key = `${type}:${path}`;
    if (!extId.has(key)) {
      extId.set(key, `${ext.length + 1}_${ext.length + 1}`);
      ext.push(`[ext_resource type="${type}" path="${res(path)}" id="${extId.get(key)}"]`);
    }
    return `ExtResource("${extId.get(key)}")`;
  };
  const definitionScript = use("Script", join(ROOT, "features", "cinematics", "cinematic_definition.gd"));
  const shotScript = use("Script", join(ROOT, "features", "cinematics", "cinematic_shot.gd"));
  const subs = [];
  shots.forEach((shot, n) => {
    const lines = [`[sub_resource type="Resource" id="Resource_shot${n}"]`, `script = ${shotScript}`];
    const set = (name, value) => lines.push(`${name} = ${value}`);
    if (shot.built) {
      set("painting", use("Texture2D", shot.built.paths.painting));
      set("depth", use("Texture2D", shot.built.paths.depth));
      set("masks", use("Texture2D", shot.built.paths.masks));
      set("painting_rect", rect(shot.built.keep));
      set("palette", use("Texture2D", shot.palettePath));
      set("camera_keys", `Array[Rect2]([${shot.camera.map(([, r]) => rect(r)).join(", ")}])`);
      set("camera_times", floats(shot.camera.map(([t]) => t)));
      set("reference", num(shot.reference ?? 0.5));
      set("parallax", num(shot.parallax ?? parallaxFor(shot.camera, shot.reference ?? 0.5, shot.depthShift ?? 12)));
      set("grade_from", floats(shot.grade));
      set("grade_to", floats(shot.gradeTo ?? shot.grade));
    }
    if (shot.caption) set("caption", JSON.stringify(shot.caption));
    if (shot.lines?.length) set("lines", strings(shot.lines));
    if (shot.title) set("title", JSON.stringify(shot.title));
    if (shot.heading) set("heading", "true");
    set("lead", num(shot.lead ?? 1));
    set("tail", num(shot.tail ?? 1));
    set("minimum", num(shot.minimum ?? 5));
    if (shot.dissolve) set("dissolve", num(shot.dissolve));
    if (shot.fadeIn) set("fade_in", num(shot.fadeIn));
    if (shot.fadeOut) set("fade_out", num(shot.fadeOut));
    for (const [field, name] of [["fire", "fire"], ["water", "water"], ["sway", "sway"], ["smoke", "smoke"]]) {
      if (shot[field]) set(name, num(shot[field]));
    }
    if (shot.drift) set("drift", `Vector2(${num(shot.drift[0])}, ${num(shot.drift[1])})`);
    if (shot.smokeArea) set("smoke_area", rect(shot.smokeArea));
    for (const name of ["embers", "ash", "snow", "motes", "birds"]) if (shot[name]) set(name, String(shot[name]));
    if (shot.impacts?.length) {
      set("impact_points", `PackedVector2Array(${shot.impacts.map(([, [x, y]]) => `${num(x)}, ${num(y)}`).join(", ")})`);
      set("impact_times", floats(shot.impacts.map(([t]) => t)));
    }
    if (shot.ambience) set("ambience", `&"${shot.ambience}"`);
    if (shot.cues?.length) {
      set("cue_names", `Array[StringName]([${shot.cues.map(([, c]) => `&"${c}"`).join(", ")}])`);
      set("cue_times", floats(shot.cues.map(([t]) => t)));
    }
    if (shot.mapBuilt) {
      set("map_ink", use("Texture2D", shot.mapBuilt.ink));
      set("map_times", use("Texture2D", shot.mapBuilt.times));
      set("map_rect", rect(shot.mapBuilt.rect));
      set("map_labels", strings(shot.mapBuilt.labels.map((l) => l.key)));
      set("map_points", `PackedVector2Array(${shot.mapBuilt.labels.map((l) => `${num(l.at[0])}, ${num(l.at[1])}`).join(", ")})`);
      set("map_phases", floats(shot.mapBuilt.labels.map((l) => l.phase)));
    }
    if (shot.washLine !== undefined) set("wash_line", String(shot.washLine));
    if (shot.routeLine !== undefined) set("route_line", String(shot.routeLine));
    if (shot.inkFrom) set("ink_from", num(shot.inkFrom));
    subs.push(lines.join("\n"));
  });
  const text = [
    `[gd_resource type="Resource" script_class="CinematicDefinition" load_steps=${ext.length + subs.length + 1} format=3]`,
    "",
    ...ext,
    "",
    subs.join("\n\n"),
    "",
    "[resource]",
    `script = ${definitionScript}`,
    `id = &"${id}"`,
    `shots = Array[${shotScript}]([${shots.map((_, n) => `SubResource("Resource_shot${n}")`).join(", ")}])`,
    "",
  ].join("\n");
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${id}.tres`), text);
}

// --- Build -------------------------------------------------------------------------------------------------
for (const id of CINEMATICS) {
  if (only && !only.includes(id)) continue;
  const file = join(ROOT, "tools", "cinematics", `${id}.mjs`);
  if (!existsSync(file)) continue;
  const { default: cinematic } = await import(`./${id}.mjs`);
  const dir = join(OUT, id);
  mkdirSync(dir, { recursive: true });
  // What an earlier build left (shots since removed) goes; Godot imports what is written afresh.
  for (const file of readdirSync(dir)) {
    if (/.(png|png.import|tres)$/.test(file)) rmSync(join(dir, file));
  }
  const shots = cinematic.shots.map((shot) => ({ ...shot }));
  shots.forEach((shot, n) => {
    if (!shot.painting) return;
    const entry = painting(shot.painting);
    shot.built = entry;
    if (shot.map) shot.mapBuilt = buildMap(entry.source, dir, shot.map);
    else if (shot.ink) shot.mapBuilt = buildInk(entry.source, dir, { ...shot.ink, name: `ink_${n}` });
    const sources = shot.mapBuilt ? [entry.source, shot.mapBuilt.finished] : [entry.source];
    shot.palettePath = join(dir, `palette_${n}.png`);
    writeLookup(shot.palettePath, shotPalette(shot, sources));
  });
  writeDefinition(cinematic.id, shots);
  console.log(`${cinematic.id}: ${shots.length} shots`);
}
