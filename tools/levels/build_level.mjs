// Assembles a level scene (.tscn) from its data module: parallax layers, the street-side
// backdrop, the tile layer (autotiled from terrain rectangles), fires with their light and smoke,
// props, lamps, manuscripts, people, captives, soldiers, story triggers, a boss's arena, the exit and
// the foreground.
// Usage: node tools/levels/build_level.mjs fallen_market
// The scene is generated: edit the level's data module and rebuild rather than editing the scene.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ATLAS } from "../asset_generation/environment/tiles.mjs";
import { BACKDROP_TOP, CHUNK } from "../asset_generation/environment/backdrop.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const name = process.argv[2] ?? "fallen_market";
const { LEVEL, STREET } = await import(`./${name}.mjs`);
const T = 16;

// --- Terrain and autotiling --------------------------------------------------------------------

const grid = Array.from({ length: LEVEL.rows }, () => new Array(LEVEL.cols).fill(null));
for (const [material, c0, c1, r0, r1] of LEVEL.terrain) {
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) grid[r][c] = material;
}
const at = (c, r) => (r < 0 || r >= LEVEL.rows || c < 0 || c >= LEVEL.cols ? "edge" : grid[r][c]);
const solid = (m) => m !== null && m !== "plank";
const hash = (c, r) => ((c * 73856093) ^ (r * 19349663)) >>> 0;
const variant = (list, c, r) => list[hash(c, r) % list.length];

function tileFor(c, r) {
  const m = grid[r][c];
  if (!m) return null;
  const above = at(c, r - 1);
  const exposed = !solid(above) && above !== "edge";
  const left = !solid(at(c - 1, r)) && at(c - 1, r) !== "edge";
  const right = !solid(at(c + 1, r)) && at(c + 1, r) !== "edge";
  if (m === "plank") {
    const pl = at(c - 1, r) === "plank";
    const pr = at(c + 1, r) === "plank";
    if (!pl && !pr) return ATLAS.plankSingle;
    if (!pl) return ATLAS.plankLeft;
    if (!pr) return ATLAS.plankRight;
    return variant(ATLAS.plankMid, c, r);
  }
  if (m === "crate") return variant(ATLAS.crate, c, r);
  if (m === "brick") {
    if (exposed) return variant(ATLAS.brickTop, c, r);
    if (left) return ATLAS.brickLeft;
    if (right) return ATLAS.brickRight;
    return variant(ATLAS.brick, c, r);
  }
  if (m === "stone") {
    if (exposed) {
      if (left && right) return ATLAS.stoneTopSingle;
      if (left) return ATLAS.stoneTopLeft;
      if (right) return ATLAS.stoneTopRight;
      return variant(ATLAS.stoneTop, c, r);
    }
    if (left) return ATLAS.stoneFillLeft;
    if (right) return ATLAS.stoneFillRight;
    return variant(ATLAS.stoneFill, c, r);
  }
  // Street: top, then fill, then deep, by how far below the surface the cell is.
  let depth = 0;
  while (depth < 3 && at(c, r - depth - 1) === "street") depth++;
  const coveredByOther = solid(above) && above !== "street";
  if (depth === 0 && !coveredByOther) {
    if (left && right) return ATLAS.streetTopSingle;
    if (left) return ATLAS.streetTopLeft;
    if (right) return ATLAS.streetTopRight;
    return variant(ATLAS.streetTop, c, r);
  }
  if (depth <= 1) {
    if (left) return ATLAS.streetFillLeft;
    if (right) return ATLAS.streetFillRight;
    return variant(ATLAS.streetFill, c, r);
  }
  if (left) return ATLAS.streetDeepLeft;
  if (right) return ATLAS.streetDeepRight;
  return variant(ATLAS.streetDeep, c, r);
}

function tileMapData() {
  const cells = [];
  for (let r = 0; r < LEVEL.rows; r++) {
    for (let c = 0; c < LEVEL.cols; c++) {
      const tile = tileFor(c, r);
      if (tile) cells.push([c, r, tile[0], tile[1]]);
    }
  }
  const bytes = Buffer.alloc(2 + cells.length * 12);
  bytes.writeUInt16LE(0, 0);
  cells.forEach(([c, r, ax, ay], i) => {
    const o = 2 + i * 12;
    bytes.writeInt16LE(c, o);
    bytes.writeInt16LE(r, o + 2);
    bytes.writeUInt16LE(0, o + 4);
    bytes.writeUInt16LE(ax, o + 6);
    bytes.writeUInt16LE(ay, o + 8);
    bytes.writeUInt16LE(0, o + 10);
  });
  return `PackedByteArray(${[...bytes].join(", ")})`;
}

// --- Scene writing --------------------------------------------------------------------------------

const ext = [];
const sub = [];
const nodes = [];
const extIds = new Map();
function resource(type, path) {
  if (!extIds.has(path)) {
    const id = `${extIds.size + 1}_${path.split("/").pop().replace(/\W/g, "_")}`;
    extIds.set(path, id);
    ext.push(`[ext_resource type="${type}" path="${path}" id="${id}"]`);
  }
  return `ExtResource("${extIds.get(path)}")`;
}
let subCount = 0;
function subResource(type, props) {
  const id = `${type}_${++subCount}`;
  sub.push([`[sub_resource type="${type}" id="${id}"]`, ...Object.entries(props).map(([k, v]) => `${k} = ${v}`), ""].join("\n"));
  return `SubResource("${id}")`;
}
function node(nodeName, type, parent, props = {}, instance = null) {
  const header = instance
    ? `[node name="${nodeName}" parent="${parent}" instance=${instance}]`
    : `[node name="${nodeName}" type="${type}"${parent !== null ? ` parent="${parent}"` : ""}]`;
  nodes.push([header, ...Object.entries(props).map(([k, v]) => `${k} = ${v}`), ""].join("\n"));
}
const v2 = (x, y) => `Vector2(${+x.toFixed(2)}, ${+y.toFixed(2)})`;
const str = (s) => `"${s}"`;
const sn = (s) => `&"${s}"`;
const xOf = (col) => col * T + 8;
const yOf = (row) => row * T;

/** The level's own art (sky, skyline, city, backdrop, facades); tiles and props are shared. */
const ENV = LEVEL.env ?? "res://assets/environments/market";
const SHARED = "res://assets/environments/market";
const W = LEVEL.cols * T;
const H = LEVEL.rows * T;

node(LEVEL.id.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(""), "Node2D", null, {
  script: resource("Script", "res://features/levels/level.gd"),
  level_id: sn(LEVEL.id),
  title_key: str(LEVEL.title),
  bounds: `Rect2(0, 0, ${W}, ${H})`,
  music: sn(LEVEL.music),
  ambience: sn(LEVEL.ambience),
  next_level: str(LEVEL.next),
  exit_card: sn(LEVEL.exitCard ?? ""),
  exit_title: str(LEVEL.exitTitle ?? ""),
  // Each objective: [flag, KEY, target?]; the target is what the HUD marks (npc:<id>, exit, col:<n>:<NAME>, group:<g>).
  objectives: `PackedStringArray(${(LEVEL.objectives ?? []).map(([flag, key, target]) => str(target ? `${flag}|${key}|${target}` : `${flag}|${key}`)).join(", ")})`,
  known_techniques: `PackedStringArray(${(LEVEL.knownTechniques ?? []).map((t) => str(t)).join(", ")})`,
  toughness: `Vector2(${(LEVEL.toughness ?? [1, 1]).map((v) => v.toFixed(2)).join(", ")})`,
  aggression: (LEVEL.aggression ?? 1).toFixed(2),
  // What is to be found here, for the Journal (pages, guardsmen's tokens, captives under a sabre).
  manuscript_ids: `PackedStringArray(${(LEVEL.manuscripts ?? []).map((m) => str(m.id)).join(", ")})`,
  relic_ids: `PackedStringArray(${(LEVEL.relics ?? []).filter((r) => !r.keepsake).map((r) => str(r.id)).join(", ")})`,
  captive_ids: `PackedStringArray(${(LEVEL.captives ?? []).filter((c) => c.id).map((c) => str(c.id)).join(", ")})`,
});

// Parallax layers, far to near. A level with a concept painting shows the painted city far off;
// the others paint their sky, skyline and nearer city.
if (LEVEL.painting) {
  // The painting already carries its light: undo the level's night tint on it.
  const tint = (LEVEL.tint ?? "Color(0.86, 0.82, 0.9, 1)").match(/[\d.]+/g).map(Number);
  node("Distant", "Parallax2D", ".", { scroll_scale: v2(LEVEL.painting.scroll ?? 0.06, 0),
    modulate: `Color(${(1 / tint[0]).toFixed(3)}, ${(1 / tint[1]).toFixed(3)}, ${(1 / tint[2]).toFixed(3)}, 1)` });
  node("Image", "Sprite2D", "Distant", { texture: resource("Texture2D", `${ENV}/distant.png`), centered: "false" });
} else {
  node("Sky", "Parallax2D", ".", { scroll_scale: v2(0, 0) });
  node("Image", "Sprite2D", "Sky", { texture: resource("Texture2D", `${ENV}/sky.png`), centered: "false" });
  node("Skyline", "Parallax2D", ".", { scroll_scale: v2(0.12, 0.05) });
  node("Image", "Sprite2D", "Skyline", { texture: resource("Texture2D", `${ENV}/skyline.png`), centered: "false",
    position: v2(0, -85) });
  node("City", "Parallax2D", ".", { scroll_scale: v2(0.3, 0.15) });
  node("Image", "Sprite2D", "City", { texture: resource("Texture2D", `${ENV}/city.png`), centered: "false",
    position: v2(0, -64) });
}
if (LEVEL.river && !LEVEL.painting) {
  // The river and its far bank, seen only where the backdrop opens onto the water.
  node("River", "Parallax2D", ".", { scroll_scale: v2(0.55, 1) });
  node("Image", "Sprite2D", "River", { texture: resource("Texture2D", `${ENV}/river.png`), centered: "false",
    position: v2(0, yOf(STREET) - LEVEL.river.height) });
}

// Smoke drifting across the city between the painting and the street, and a thinner haze nearer.
node("Smoke", "Parallax2D", ".", { scroll_scale: v2(0.4, 0.25), repeat_size: v2(512, 0), repeat_times: 4,
  autoscroll: v2(-7, 0) });
node("Band", "Sprite2D", "Smoke", { texture: resource("Texture2D", "res://assets/effects/smoke_drift.png"),
  centered: "false", position: v2(0, yOf(STREET) - 400) });

// The street-side facades.
node("Backdrop", "Node2D", ".");
for (let i = 0; i < Math.ceil(W / CHUNK); i++) {
  node(`Chunk${i}`, "Sprite2D", "Backdrop", { texture: resource("Texture2D", `${ENV}/backdrop_${i}.png`),
    centered: "false", position: v2(i * CHUNK, BACKDROP_TOP) });
}

node("Haze", "Parallax2D", ".", { scroll_scale: v2(1, 1), repeat_size: v2(512, 0), repeat_times: 12,
  autoscroll: v2(-13, 0) });
node("Band", "Sprite2D", "Haze", { texture: resource("Texture2D", "res://assets/effects/haze_drift.png"),
  centered: "false", position: v2(0, yOf(STREET) - 104) });

// Fires with their light, smoke and embers: [flame height, light scale, light energy, embers].
const FIRE = { small: [30, 1.7, 0.8, 4], medium: [52, 2.7, 0.95, 7], large: [96, 4.0, 1.15, 12] };
function fire(parent, nodeName, x, y, size, phase) {
  const [h, lightScale, energy, embers] = FIRE[size];
  const path = `${parent}/${nodeName}`;
  node(nodeName, "AnimatedSprite2D", parent, {
    position: v2(x, y),
    sprite_frames: resource("SpriteFrames", "res://assets/effects/effect_frames.tres"),
    animation: sn(`fire_${size}`), autoplay: str(`fire_${size}`), offset: v2(0, -h / 2 + 1),
    frame_progress: phase % 1,
  });
  node("Light", "PointLight2D", path, {
    position: v2(0, -h * 0.4), color: "Color(1, 0.58, 0.26, 1)", energy: energy.toFixed(2),
    texture: resource("Texture2D", "res://assets/effects/light_soft.png"), texture_scale: lightScale.toFixed(2),
    script: resource("Script", "res://features/levels/fire_light.gd"), base_energy: energy.toFixed(2),
  });
  node("Smoke", "CPUParticles2D", path, {
    position: v2(0, -h * 0.8), amount: size === "large" ? 10 : 6, lifetime: 4.0, preprocess: 4.0,
    texture: resource("Texture2D", `res://assets/effects/smoke_${size === "small" ? "small" : "medium"}.png`),
    emission_shape: 1, emission_sphere_radius: (h * 0.15).toFixed(1), direction: v2(0.15, -1), spread: 12.0,
    gravity: v2(4, -6), initial_velocity_min: 14.0, initial_velocity_max: 24.0,
    scale_amount_min: 0.6, scale_amount_max: 1.0,
    scale_amount_curve: subResource("Curve", { _data: "[Vector2(0, 0.5), 0.0, 0.0, 0, 0, Vector2(1, 1.6), 0.0, 0.0, 0, 0]", point_count: 2 }),
    color_ramp: subResource("Gradient", { offsets: "PackedFloat32Array(0, 0.2, 1)",
      colors: "PackedColorArray(0.9, 0.55, 0.3, 0, 0.55, 0.5, 0.5, 0.75, 0.3, 0.28, 0.32, 0)" }),
  });
  // Embers spat up from the flames, glowing as they climb and wink out.
  node("Embers", "CPUParticles2D", path, {
    position: v2(0, -h * 0.55), amount: embers, lifetime: 2.6, preprocess: 2.6, explosiveness: 0.0,
    material: emberMaterial,
    texture: resource("Texture2D", "res://assets/effects/ember.png"),
    emission_shape: 3, emission_rect_extents: v2(h * 0.18, h * 0.2), direction: v2(0.1, -1), spread: 28.0,
    gravity: v2(10, -16), initial_velocity_min: 18.0, initial_velocity_max: 46.0,
    angular_velocity_min: -90.0, angular_velocity_max: 90.0, scale_amount_min: 0.5, scale_amount_max: 1.0,
    color_ramp: subResource("Gradient", { offsets: "PackedFloat32Array(0, 0.15, 0.7, 1)",
      colors: "PackedColorArray(1, 0.95, 0.6, 0, 1, 0.8, 0.4, 1, 1, 0.45, 0.15, 0.85, 0.6, 0.15, 0.05, 0)" }),
  });
}
/** Embers add their light to what is behind them. */
const emberMaterial = subResource("CanvasItemMaterial", { blend_mode: 1 });
node("Fires", "Node2D", ".");
LEVEL.fires.forEach(([col, row, size], i) => fire("Fires", `Fire${i}`, xOf(col), yOf(row), size, i * 0.37));

// The tiles.
node("Tiles", "TileMapLayer", ".", {
  tile_map_data: tileMapData(),
  tile_set: resource("TileSet", `${SHARED}/market_tileset.tres`),
});

// Facades painted over solid blocks so they read as buildings.
node("Facades", "Node2D", ".");
for (const facade of LEVEL.facades ?? []) {
  node(`Facade_${facade.kind}_${facade.col}`, "Sprite2D", "Facades", {
    texture: resource("Texture2D", `${ENV}/props/facade_${facade.kind}_${facade.col}.png`), centered: "false",
    position: v2(facade.col * T, facade.top * T),
  });
}

// Props (decoration, behind the actors).
node("Props", "Node2D", ".");
/** A PNG's size, read from its header (props stand on their bottom edge). */
function pngSize(resPath) {
  const bytes = readFileSync(join(ROOT, resPath.replace("res://", "")));
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}
let propIndex = 0;
function prop(kind, col, row = STREET, { flip = false, dx = 0 } = {}) {
  const path = `${SHARED}/props/${kind}.png`;
  const [, height] = pngSize(path);
  node(`${kind}_${propIndex++}`, "Sprite2D", "Props", {
    texture: resource("Texture2D", path), position: v2(col * T + dx, yOf(row) + 1),
    offset: v2(0, -height / 2), flip_h: flip ? "true" : "false",
  });
}
// Stalls under each timber roof (the market).
if (LEVEL.stallsUnderPlanks) {
  LEVEL.terrain.filter(([m, , , r0]) => m === "plank" && r0 === STREET - 3).forEach(([, c0, c1], i) => {
    prop(`stall_${i % 3}`, (c0 + c1 + 1) / 2);
  });
}
for (const [kind, col, row, flip] of LEVEL.props ?? []) prop(kind, col, row ?? STREET, { flip: !!flip });

// Lamps, manuscripts, people and the exit.
node("Interactables", "Node2D", ".");
for (const lamp of LEVEL.checkpoints) {
  node(lamp.id, null, "Interactables", { position: v2(xOf(lamp.col), yOf(lamp.row ?? STREET)),
    checkpoint_id: sn(lamp.id) }, resource("PackedScene", "res://features/levels/checkpoint.tscn"));
}
for (const page of LEVEL.manuscripts) {
  node(page.id, null, "Interactables", { position: v2(xOf(page.col), yOf(page.row ?? STREET)),
    manuscript_id: sn(page.id), teaches: sn(page.teaches ?? "") }, resource("PackedScene", "res://features/levels/manuscript.tscn"));
}
// Guardsman's tokens and lost keepsakes, off the beaten way.
for (const relic of LEVEL.relics ?? []) {
  node(relic.id, null, "Interactables", { position: v2(xOf(relic.col), yOf(relic.row ?? STREET)),
    relic_id: sn(relic.id), keepsake: sn(relic.keepsake ?? "") }, resource("PackedScene", "res://features/levels/relic.tscn"));
}
/** Each kind's [idle, talk, waiting] animations. */
const NPC_ANIM = {
  scholar: ["idle", "talk"], guard: ["sit", "talk"], mother: ["crouch", "talk"], salim: ["stand", "talk", "kneel"],
  librarian: ["idle", "talk"], copyist: ["crouch", "talk"],
};
for (const npc of LEVEL.npcs) {
  const [idle, talk, waiting] = NPC_ANIM[npc.kind];
  node(npc.id, null, "Interactables", {
    position: v2(xOf(npc.col), yOf(npc.row ?? STREET)), npc_id: sn(npc.id), dialogue: sn(npc.dialogue),
    requires: sn(npc.requires ?? ""), gives_flag: sn(npc.gives ?? ""), gives_notice: str(npc.notice ?? ""),
    teaches: sn(npc.teaches ?? ""), gives_keepsake: sn(npc.keepsake ?? ""),
    idle_animation: sn(idle), talk_animation: sn(talk), waiting_animation: sn(waiting ?? ""),
    face: npc.face.toFixed(1),
    frames: resource("SpriteFrames", `res://assets/npcs/${npc.kind}/${npc.kind}_frames.tres`),
  }, resource("PackedScene", "res://features/levels/npc.tscn"));
}
const exit = LEVEL.exit;
const exitProps = { position: v2(exit.col * T, yOf(exit.row ?? STREET)), requires: sn(exit.requires),
  open_prompt: str(exit.prompt), locked_prompt: str(exit.lockedPrompt ?? "PROMPT_GATE_LOCKED"),
  locked_line: str(exit.lockedLine ?? "GATE_LOCKED_1"),
  // What the hero says at the barred gate by the story so far: [flag, KEY] (first set flag wins; an empty one always fits).
  locked_lines: `PackedStringArray(${(exit.lockedLines ?? []).map(([flag, key]) => str(`${flag}|${key}`)).join(", ")})` };
if (exit.art) {
  exitProps.closed_texture = resource("Texture2D", `${SHARED}/props/${exit.art}.png`);
  exitProps.open_texture = resource("Texture2D", `${SHARED}/props/${exit.art}_open.png`);
}
node(exit.name ?? "RiverGate", null, "Interactables", exitProps,
  resource("PackedScene", "res://features/levels/level_exit.tscn"));

// Captives kneeling under guard, who run once freed; some under an executioner's sabre (a soldier
// whose "victim" is their id), with what they cry if they get away.
if (LEVEL.captives?.length) {
  node("People", "Node2D", ".");
  LEVEL.captives.forEach((captive, i) => {
    const gore = `assets/npcs/${captive.kind}/${captive.kind}_gore.tres`;
    node(captive.id ?? `Captive${i}`, "AnimatedSprite2D", "People", {
      position: v2(xOf(captive.col), yOf(captive.row ?? STREET)),
      sprite_frames: resource("SpriteFrames", `res://assets/npcs/${captive.kind}/${captive.kind}_frames.tres`),
      animation: sn("kneel"), flip_h: (captive.face ?? 1) < 0 ? "true" : "false",
      script: resource("Script", "res://features/levels/captive.gd"), freed_by: sn(captive.freedBy ?? ""),
      run_direction: (captive.run ?? -1).toFixed(1), captive_id: sn(captive.id ?? ""), thanks: str(captive.thanks ?? ""),
      keepsake: sn(captive.keepsake ?? ""),
      ...(existsSync(join(ROOT, gore)) ? { gore_set: resource("Resource", `res://${gore}`) } : {}),
    });
  });
}

// Soldiers.
node("Enemies", "Node2D", ".");
const soldierNames = LEVEL.enemies.map((e, i) => `${e.kind}_${i}`);
LEVEL.enemies.forEach((e, i) => {
  const props = { position: v2(xOf(e.col), yOf(e.row ?? STREET)), start_facing: (e.face ?? -1).toFixed(1) };
  if (e.group) props["metadata/group"] = sn(e.group);
  if (e.dormant) props["metadata/dormant"] = "true";
  if (e.patrol !== undefined) props["metadata/patrol"] = e.patrol.toFixed(1);
  // What he is busy with until he notices the hero, how readily he guards, and whether he waits
  // out of sight until his ambush springs.
  if (e.activity) props["metadata/activity"] = sn(e.activity);
  if (e.guard !== undefined) props["metadata/guard_chance"] = e.guard.toFixed(2);
  if (e.hidden) props["metadata/hidden"] = "true";
  if (e.victim) props["metadata/victim"] = sn(e.victim);
  if (e.delay !== undefined) props["metadata/delay"] = e.delay.toFixed(2);
  node(soldierNames[i], null, "Enemies", props, resource("PackedScene", `res://features/enemies/${e.kind}.tscn`));
});

// Story triggers: tall boxes across the street and the roofs above it (from `above` px over the
// street, so a hint for a gallery is not shown to one walking below it).
node("Triggers", "Node2D", ".");
for (const t of LEVEL.triggers) {
  const width = (t.to - t.from) * T;
  const height = t.height ?? 320;
  const above = t.above ?? 0;
  node(t.id, "Area2D", "Triggers", {
    position: v2(t.from * T + width / 2, yOf(STREET) - above - height / 2), script: resource("Script", "res://features/levels/story_trigger.gd"),
    trigger_id: str(t.id), hint: str(t.hint ?? ""), event: sn(t.event ?? ""), group: sn(t.group ?? ""),
    line: str(t.line ?? ""), speaker: str(t.speaker ?? ""), teaches: sn(t.teaches ?? ""),
  });
  node("Shape", "CollisionShape2D", `Triggers/${t.id}`, {
    shape: subResource("RectangleShape2D", { size: v2(width, height) }),
  });
}

// A boss's arena: burning barricades that close behind the hero, and the stretch the camera keeps to.
if (LEVEL.arena) {
  const a = LEVEL.arena;
  node("Arena", "Node2D", ".", {
    script: resource("Script", "res://features/levels/boss_arena.gd"),
    camera_bounds: `Rect2(${a.from * T}, 0, ${(a.to - a.from) * T}, ${H})`,
    boss_path: `NodePath("../Enemies/${soldierNames[a.boss]}")`,
  });
  node("Barriers", "Node2D", "Arena");
  a.barriers.forEach((col, i) => {
    const path = `Arena/Barriers/Barrier${i}`;
    node(`Barrier${i}`, "StaticBody2D", "Arena/Barriers", { position: v2(xOf(col), yOf(STREET)) });
    node("Shape", "CollisionShape2D", path, { position: v2(0, -160),
      shape: subResource("RectangleShape2D", { size: v2(16, 320) }) });
    node("Flames", "Node2D", path);
    fire(`${path}/Flames`, "FireA", -10, 0, "large", 0.2 + i * 0.3);
    fire(`${path}/Flames`, "FireB", 12, 0, "medium", 0.6 + i * 0.3);
    node("Barricade", "Sprite2D", `${path}/Flames`, { texture: resource("Texture2D", `${SHARED}/props/cart.png`),
      position: v2(0, 1), offset: v2(0, -18), flip_h: i % 2 ? "true" : "false" });
  });
}

node("PlayerStart", "Marker2D", ".", { position: v2(xOf(LEVEL.start[0]), yOf(LEVEL.start[1])) });

// Foreground silhouettes, passing faster than the street.
node("Foreground", "Parallax2D", ".", { scroll_scale: v2(1.25, 1) });
const fgWidth = Math.ceil(1.25 * (W - 640) + 640);
for (let x = 120, i = 0; x < fgWidth; x += 520 + ((i * 137) % 260), i++) {
  node(`Rubble${i}`, "Sprite2D", "Foreground", { texture: resource("Texture2D", `${SHARED}/props/fg_rubble.png`),
    centered: "false", position: v2(x, H - 40), flip_h: i % 2 ? "true" : "false" });
  // Hanging cloth framing the top of the view, only where there are no painted skies to hang in.
  if (i % 4 === 2 && !LEVEL.painting) {
    node(`Cloth${i}`, "Sprite2D", "Foreground", { texture: resource("Texture2D", `${SHARED}/props/fg_cloth.png`),
      centered: "false", position: v2(x + 60, 120) });
  }
}

// The hour: everything tinted so the fires and lamps carry the light.
node("Night", "CanvasModulate", ".", { color: LEVEL.tint ?? "Color(0.86, 0.82, 0.9, 1)" });

const text = ["[gd_scene format=3]", "", ...ext, "", ...sub, ...nodes].join("\n");
const out = join(ROOT, LEVEL.scene.replace("res://", ""));
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, text);
console.log(`${name}: ${nodes.length} nodes, ${ext.length} resources -> ${LEVEL.scene}`);
