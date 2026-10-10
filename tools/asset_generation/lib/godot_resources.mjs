// Writes Godot text resources for generated art.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/** Convex hull (monotone chain) of [x, y] points, counter-clockwise. */
export function convexHull(points) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (sorted.length < 3) return sorted;
  const lower = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (const p of sorted.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/**
 * The area a blade sweeps between two frames, as a padded convex polygon in body space (x forward,
 * y down, origin at the feet). Blades are { hilt: [x, y], tip: [x, y] } in that same space.
 */
export function bladeSweep(from, to, padding = 2, minX = -6) {
  const points = [to.hilt, to.tip];
  if (from) {
    points.push(from.hilt, from.tip);
    const a0 = Math.atan2(from.tip[1] - from.hilt[1], from.tip[0] - from.hilt[0]);
    let a1 = Math.atan2(to.tip[1] - to.hilt[1], to.tip[0] - to.hilt[0]);
    while (a1 - a0 > Math.PI) a1 -= Math.PI * 2;
    while (a1 - a0 < -Math.PI) a1 += Math.PI * 2;
    const l0 = Math.hypot(from.tip[0] - from.hilt[0], from.tip[1] - from.hilt[1]);
    const l1 = Math.hypot(to.tip[0] - to.hilt[0], to.tip[1] - to.hilt[1]);
    for (let i = 1; i < 6; i++) {
      const k = i / 6;
      const a = a0 + (a1 - a0) * k;
      const hx = from.hilt[0] + (to.hilt[0] - from.hilt[0]) * k;
      const hy = from.hilt[1] + (to.hilt[1] - from.hilt[1]) * k;
      const l = l0 + (l1 - l0) * k;
      points.push([hx + Math.cos(a) * l, hy + Math.sin(a) * l]);
    }
  }
  let hull = convexHull(points);
  if (hull.length < 3) {
    // A blade that did not move: a thin box around it.
    const [h, t] = [to.hilt, to.tip];
    const len = Math.hypot(t[0] - h[0], t[1] - h[1]) || 1;
    const n = [-(t[1] - h[1]) / len, (t[0] - h[0]) / len];
    hull = [[h[0] + n[0] * 2, h[1] + n[1] * 2], [t[0] + n[0] * 2, t[1] + n[1] * 2],
      [t[0] - n[0] * 2, t[1] - n[1] * 2], [h[0] - n[0] * 2, h[1] - n[1] * 2]];
  }
  // A blade swung up from behind the shoulder cuts only in front of the body.
  hull = clipBehind(hull, minX);
  const cx = hull.reduce((s, p) => s + p[0], 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p[1], 0) / hull.length;
  const padded = convexHull(hull.map(([x, y]) => {
    const d = Math.hypot(x - cx, y - cy) || 1;
    return [Math.round((x + ((x - cx) / d) * padding) * 10) / 10, Math.round((y + ((y - cy) / d) * padding) * 10) / 10];
  }));
  // Drop vertices crowded together, which make a degenerate collision polygon.
  const clean = [];
  for (const p of padded) {
    const last = clean[clean.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > 1.5) clean.push(p);
  }
  if (clean.length > 3 && Math.hypot(clean[0][0] - clean[clean.length - 1][0], clean[0][1] - clean[clean.length - 1][1]) <= 1.5) {
    clean.pop();
  }
  return clean.length >= 3 ? clean : padded;
}

/** Clips a convex polygon to x >= minX. */
function clipBehind(points, minX) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aIn = a[0] >= minX;
    const bIn = b[0] >= minX;
    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (minX - a[0]) / (b[0] - a[0]);
      out.push([minX, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out.length >= 3 ? out : points;
}

const packed = (points) => (points && points.length
  ? `PackedVector2Array(${points.map(([x, y]) => `${x}, ${y}`).join(", ")})`
  : "PackedVector2Array()");

/** Writes a FrameHitboxes resource: each animation's per-frame blade sweep and blade segment. */
export function writeFrameHitboxes(path, meta) {
  const sweeps = [];
  const blades = [];
  for (const [name, m] of Object.entries(meta)) {
    if (!m.blades || m.blades.every((b) => !b)) continue;
    // A blow all round him is not cut off behind his back.
    const minX = m.allRound ? -Infinity : -6;
    const frameSweeps = m.blades.map((blade, i) => (blade ? bladeSweep(i > 0 ? m.blades[i - 1] : null, blade, 2, minX) : null));
    sweeps.push(`&"${name}": [${frameSweeps.map(packed).join(", ")}]`);
    blades.push(`&"${name}": [${m.blades.map((b) => (b ? packed([b.hilt, b.tip]) : packed(null))).join(", ")}]`);
  }
  const text = [
    '[gd_resource type="Resource" script_class="FrameHitboxes" format=3]',
    "",
    '[ext_resource type="Script" path="res://features/combat/frame_hitboxes.gd" id="1_script"]',
    "",
    "[resource]",
    'script = ExtResource("1_script")',
    `sweeps = {\n${sweeps.join(",\n")}\n}`,
    `blades = {\n${blades.join(",\n")}\n}`,
    "",
  ].join("\n");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/**
 * Writes a soldier's GoreSet (shared/vfx/gore_set.gd): `pieces` the res path of the
 * pieces' SpriteFrames; `bottoms` piece -> [px per frame]; `origins` piece -> [x, y]; `cuts` cut ->
 * [piece names]; `wounds` death animation -> [[x, y] per frame] (all body space facing right).
 */
export function writeGoreSet(path, { pieces, bottoms, origins, cuts, wounds }) {
  const num = (v) => String(Math.round(v * 10) / 10);
  const dict = (entries) => `{\n${entries.join(",\n")}\n}`;
  const text = [
    '[gd_resource type="Resource" script_class="GoreSet" format=3]',
    "",
    '[ext_resource type="Script" path="res://shared/vfx/gore_set.gd" id="1_script"]',
    `[ext_resource type="SpriteFrames" path="${pieces}" id="2_pieces"]`,
    "",
    "[resource]",
    'script = ExtResource("1_script")',
    'pieces = ExtResource("2_pieces")',
    `piece_bottoms = ${dict(Object.entries(bottoms).map(([k, v]) => `&"${k}": PackedFloat32Array(${v.map(num).join(", ")})`))}`,
    `piece_origins = ${dict(Object.entries(origins).map(([k, [x, y]]) => `&"${k}": Vector2(${num(x)}, ${num(y)})`))}`,
    `cut_pieces = ${dict(Object.entries(cuts).map(([k, v]) => `&"${k}": PackedStringArray(${v.map((n) => `"${n}"`).join(", ")})`))}`,
    `wounds = ${dict(Object.entries(wounds).map(([k, v]) => `&"${k}": ${packed(v)}`))}`,
    "",
  ].join("\n");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/**
 * Writes a FinisherDefinition .tres: a scripted kill's two animations, where the soldier stands, and
 * what each frame of the hero's half does (finisher_timing.mjs).
 */
export function writeFinisherDefinition(path, key, finisher) {
  const cutFrames = Object.keys(finisher.cuts).map(Number);
  const text = [
    '[gd_resource type="Resource" script_class="FinisherDefinition" format=3]',
    "",
    '[ext_resource type="Script" path="res://features/combat/finisher_definition.gd" id="1_script"]',
    "",
    "[resource]",
    'script = ExtResource("1_script")',
    `display_name = "${finisher.name}"`,
    `hero_animation = &"finish_${key}"`,
    `victim_animation = &"finished_${key}"`,
    `distance = ${finisher.distance.toFixed(1)}`,
    `cut_frames = PackedInt32Array(${cutFrames.join(", ")})`,
    `cuts = Array[StringName]([${cutFrames.map((f) => `&"${finisher.cuts[f]}"`).join(", ")}])`,
    `burst_frames = PackedInt32Array(${finisher.bursts.join(", ")})`,
    `slow_from = ${finisher.slow[0]}`,
    `slow_to = ${finisher.slow[1]}`,
    `death_frame = ${finisher.death}`,
    `ground = ${finisher.ground ? "true" : "false"}`,
    "",
  ].join("\n");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}

/**
 * Writes a SpriteFrames .tres from explicit regions: animations = [{ name, texture (res path),
 * frames: [[x, y, w, h], ...], fps, loop }].
 */
export function writeSpriteFramesRegions(path, animations) {
  const textures = [...new Set(animations.map((a) => a.texture))];
  const lines = ['[gd_resource type="SpriteFrames" format=3]', ""];
  textures.forEach((t, i) => lines.push(`[ext_resource type="Texture2D" path="${t}" id="${i + 1}_tex"]`));
  lines.push("");
  for (const a of animations) {
    a.frames.forEach(([x, y, w, h], f) => {
      lines.push(`[sub_resource type="AtlasTexture" id="${a.name}_${f}"]`);
      lines.push(`atlas = ExtResource("${textures.indexOf(a.texture) + 1}_tex")`);
      lines.push(`region = Rect2(${x}, ${y}, ${w}, ${h})`, "");
    });
  }
  const anims = animations.map((a) => `{\n"frames": [${a.frames.map((_, f) =>
    `{\n"duration": 1.0,\n"texture": SubResource("${a.name}_${f}")\n}`).join(", ")}],\n"loop": ${a.loop ? "true" : "false"},\n` +
    `"name": &"${a.name}",\n"speed": ${a.fps.toFixed(1)}\n}`);
  lines.push("[resource]", `animations = [${anims.join(", ")}]`, "");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join("\n"));
}

/**
 * Writes a SpriteFrames .tres whose animations reference regions of each animation's strip PNG.
 * `meta` maps animation name to { file, frames, width, height, fps, loop, durations }.
 */
export function writeSpriteFrames(path, resDir, meta) {
  const lines = ['[gd_resource type="SpriteFrames" format=3]', ""];
  const names = Object.keys(meta);
  names.forEach((name, i) => {
    lines.push(`[ext_resource type="Texture2D" path="${resDir}/${meta[name].file}" id="${i + 1}_${name}"]`);
  });
  lines.push("");
  for (const [i, name] of names.entries()) {
    const m = meta[name];
    for (let f = 0; f < m.frames; f++) {
      lines.push(`[sub_resource type="AtlasTexture" id="${name}_${f}"]`);
      lines.push(`atlas = ExtResource("${i + 1}_${name}")`);
      lines.push(`region = Rect2(${f * m.width}, 0, ${m.width}, ${m.height})`);
      lines.push("");
    }
  }
  const animations = names.map((name) => {
    const m = meta[name];
    const frames = [];
    for (let f = 0; f < m.frames; f++) {
      const duration = m.durations ? m.durations[f] : 1.0;
      frames.push(`{\n"duration": ${duration.toFixed(2)},\n"texture": SubResource("${name}_${f}")\n}`);
    }
    return `{\n"frames": [${frames.join(", ")}],\n"loop": ${m.loop ? "true" : "false"},\n` +
      `"name": &"${name}",\n"speed": ${m.fps.toFixed(1)}\n}`;
  });
  lines.push("[resource]");
  lines.push(`animations = [${animations.join(", ")}]`);
  lines.push("");
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, lines.join("\n"));
}
