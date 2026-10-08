// Builds every character's animation strips, SpriteFrames resources, frame metadata and review
// sheets. Every character is a 3D model rendered into pixel art: Yusuf (characters/yusuf.mjs), the
// Mongol soldiers (characters/mongol3d.mjs) and the townsfolk (characters/townsfolk3d.mjs). Usage: node tools/asset_generation/build_characters.mjs [--only warrior]
// [--anim idle,walk]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { strip } from "./lib/canvas.mjs";
import { reviewSheet } from "./lib/character_sheet.mjs";
import { writeFrameHitboxes, writeSpriteFrames } from "./lib/godot_resources.mjs";
import * as yusuf from "./characters/yusuf.mjs";
import { ANIMATIONS as YUSUF_ANIMATIONS } from "./characters/yusuf_animations.mjs";
import { prepareCharacter, renderPoses } from "./characters/render3d.mjs";

import { mongol } from "./characters/mongol3d.mjs";
import { ARCHER, CAPTAIN, SPEARMAN, SWORDSMAN } from "./characters/mongol3d_animations.mjs";
import { townsperson } from "./characters/townsfolk3d.mjs";
import { TOWNSFOLK_ANIMATIONS } from "./characters/townsfolk3d_animations.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const only = option("only")?.split(",");
const animFilter = option("anim")?.split(",");

/** A 3D character: its model and its animations. */
const modelled = (model, animations) => ({
  model: prepareCharacter({ parts: model.PARTS, chains: model.CHAINS, blade: model.BLADE,
    colliders: model.colliders, rest: model.rest, yaw: model.YAW }),
  animations,
});

/** A Mongol soldier: his model and his animations. */
const soldier = (kind, animations) => ({ model: prepareCharacter(mongol(kind)), animations });
/** A townsperson: their model and their animations. */
const person = (kind) => ({ model: prepareCharacter(townsperson(kind)), animations: TOWNSFOLK_ANIMATIONS[kind] });

const CHARACTERS = {
  warrior: { render: () => modelled(yusuf, YUSUF_ANIMATIONS), dir: "assets/characters/warrior", prefix: "warrior" },
  swordsman: { render: () => soldier("swordsman", SWORDSMAN), dir: "assets/enemies/swordsman", prefix: "swordsman" },
  spearman: { render: () => soldier("spearman", SPEARMAN), dir: "assets/enemies/spearman", prefix: "spearman" },
  archer: { render: () => soldier("archer", ARCHER), dir: "assets/enemies/archer", prefix: "archer" },
  captain: { render: () => soldier("captain", CAPTAIN), dir: "assets/enemies/captain", prefix: "captain" },
};
for (const kind of Object.keys(TOWNSFOLK_ANIMATIONS)) {
  CHARACTERS[kind] = { render: () => person(kind), dir: `assets/npcs/${kind}`, prefix: kind };
}

const round = (v) => Math.round(v * 10) / 10;

/** Renders a 3D character's animation into a strip; returns its metadata and frames. */
function writeRendered(path, model, name, animation) {
  const frames = renderPoses(model, animation);
  strip(frames.map((f) => f.canvas)).save(path);
  return {
    name,
    frames: frames.length,
    width: animation.size[0],
    height: animation.size[1],
    fps: animation.fps,
    loop: Boolean(animation.loop),
    durations: animation.durations ?? null,
    blades: frames.map((f) => (f.blade ? { hilt: f.blade.hilt.map(round), tip: f.blade.tip.map(round) } : null)),
    canvases: frames.map((f) => f.canvas),
  };
}

for (const [key, entry] of Object.entries(CHARACTERS)) {
  if (only && !only.includes(key)) continue;
  const outDir = join(ROOT, entry.dir);
  mkdirSync(outDir, { recursive: true });
  const meta = {};
  const rendered = entry.render();
  const animations = rendered.animations;
  for (const [name, animation] of Object.entries(animations)) {
    if (animFilter && !animFilter.includes(name)) continue;
    const file = `${entry.prefix}_${name}.png`;
    const result = writeRendered(join(outDir, file), rendered.model, name, animation);
    reviewSheet(result.canvases).save(join(ROOT, "captures", "art_review", `${entry.prefix}_${name}.png`));
    delete result.canvases;
    meta[name] = { ...result, file };
    console.log(`${key}: ${name} (${result.frames} frames)`);
  }
  if (!animFilter) {
    writeFileSync(join(outDir, `${entry.prefix}_frames.json`), JSON.stringify(meta, null, 1));
    writeSpriteFrames(join(outDir, `${entry.prefix}_frames.tres`), `res://${entry.dir}`, meta);
    writeFrameHitboxes(join(outDir, `${entry.prefix}_hitboxes.tres`), meta);
  }
}
