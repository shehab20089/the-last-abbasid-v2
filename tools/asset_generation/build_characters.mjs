// Builds every character's animation strips, SpriteFrames resources, frame metadata and review
// sheets. Every character is a 3D model rendered into pixel art: Yusuf (characters/yusuf.mjs), the
// Mongol soldiers (characters/mongol3d.mjs) and the townsfolk (characters/townsfolk3d.mjs). A soldier
// also gets his gore set: the pieces a killing blow can cut from him, tumbling, and his wounds. Usage: node tools/asset_generation/build_characters.mjs [--only warrior]
// [--anim idle,walk]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { strip } from "./lib/canvas.mjs";
import { reviewSheet } from "./lib/character_sheet.mjs";
import { writeFinisherDefinition, writeFrameHitboxes, writeGoreSet, writeSpriteFrames, writeSpriteFramesRegions } from "./lib/godot_resources.mjs";
import { FINISHERS } from "./characters/finisher_timing.mjs";
import { spriteCamera } from "./lib/raster.mjs";
import { solveBody } from "./characters/body3d.mjs";
import * as yusuf from "./characters/yusuf.mjs";
import { ANIMATIONS as YUSUF_ANIMATIONS } from "./characters/yusuf_animations.mjs";
import { prepareCharacter, renderPiece, renderPoses } from "./characters/render3d.mjs";
import { readAttacks, rootMotion } from "./lib/root_motion.mjs";

import { mongol } from "./characters/mongol3d.mjs";
import { ARCHER, CAPTAIN, ENGINEER, MACEMAN, PIECES, SHIELDBEARER, SPEARMAN, SWORDSMAN, VETERAN }
  from "./characters/mongol3d_animations.mjs";
import { townsperson } from "./characters/townsfolk3d.mjs";
import { TOWNSFOLK_ANIMATIONS, TOWNSFOLK_PIECES } from "./characters/townsfolk3d_animations.mjs";

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

/** The pieces each cut throws off. */
const CUTS = { head: ["head"], arm: ["arm"], leg: ["leg"], waist: ["upper"] };
/** A piece's tumble: eight turns. */
const TURNS = [0, 45, 90, 135, 180, 225, 270, 315];

const CHARACTERS = {
  warrior: { render: () => modelled(yusuf, YUSUF_ANIMATIONS), dir: "assets/characters/warrior", prefix: "warrior",
    attacks: "features/warrior/definitions", friction: 1500, finishers: true },
  swordsman: { render: () => soldier("swordsman", SWORDSMAN), dir: "assets/enemies/swordsman", prefix: "swordsman",
    attacks: "features/enemies/definitions", friction: 1600, pieces: PIECES.swordsman, cuts: CUTS },
  spearman: { render: () => soldier("spearman", SPEARMAN), dir: "assets/enemies/spearman", prefix: "spearman",
    attacks: "features/enemies/definitions", friction: 1600, pieces: PIECES.spearman,
    cuts: { ...CUTS, arm: ["arm", "spear"], waist: ["upper", "spear"] } },
  archer: { render: () => soldier("archer", ARCHER), dir: "assets/enemies/archer", prefix: "archer", pieces: PIECES.archer,
    cuts: CUTS },
  captain: { render: () => soldier("captain", CAPTAIN), dir: "assets/enemies/captain", prefix: "captain",
    attacks: "features/enemies/definitions", friction: 1600, pieces: PIECES.captain, cuts: CUTS },
  veteran: { render: () => soldier("veteran", VETERAN), dir: "assets/enemies/veteran", prefix: "veteran",
    attacks: "features/enemies/definitions", friction: 1600, pieces: PIECES.veteran, cuts: CUTS },
  maceman: { render: () => soldier("maceman", MACEMAN), dir: "assets/enemies/maceman", prefix: "maceman",
    attacks: "features/enemies/definitions", friction: 1600, pieces: PIECES.maceman,
    cuts: { ...CUTS, arm: ["arm", "spear"], waist: ["upper", "spear"] } },
  shieldbearer: { render: () => soldier("shieldbearer", SHIELDBEARER), dir: "assets/enemies/shieldbearer",
    prefix: "shieldbearer", attacks: "features/enemies/definitions", friction: 1600, pieces: PIECES.shieldbearer,
    cuts: { ...CUTS, arm: ["arm", "spear"], waist: ["upper", "spear"] } },
  engineer: { render: () => soldier("engineer", ENGINEER), dir: "assets/enemies/engineer", prefix: "engineer",
    pieces: PIECES.engineer, cuts: CUTS },
};
for (const kind of Object.keys(TOWNSFOLK_ANIMATIONS)) {
  // Those the soldiers kill have a gore set too (a beheading takes the head).
  CHARACTERS[kind] = { render: () => person(kind), dir: `assets/npcs/${kind}`, prefix: kind,
    ...(TOWNSFOLK_PIECES[kind] ? { pieces: TOWNSFOLK_PIECES[kind], cuts: { head: ["head"] } } : {}) };
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
    wounds: frames.some((f) => f.wound) ? frames.map((f) => (f.wound ? f.wound.map(round) : [0, 0])) : null,
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
  // The game's lunges, so the sprites can keep planted feet still while the body travels.
  const attacks = entry.attacks ? readAttacks(join(ROOT, entry.attacks)) : {};
  for (const [name, animation] of Object.entries(animations)) {
    if (animFilter && !animFilter.includes(name)) continue;
    const file = `${entry.prefix}_${name}.png`;
    const attack = attacks[name];
    const moving = attack && attack.lunge > 0 && !animation.skid
      ? { ...animation, travel: rootMotion(animation, attack, entry.friction) } : animation;
    const result = writeRendered(join(outDir, file), rendered.model, name, moving);
    reviewSheet(result.canvases).save(join(ROOT, "captures", "art_review", `${entry.prefix}_${name}.png`));
    delete result.canvases;
    meta[name] = { ...result, file };
    console.log(`${key}: ${name} (${result.frames} frames)`);
  }
  if (!animFilter) {
    writeFileSync(join(outDir, `${entry.prefix}_frames.json`), JSON.stringify(meta, null, 1));
    writeSpriteFrames(join(outDir, `${entry.prefix}_frames.tres`), `res://${entry.dir}`, meta);
    writeFrameHitboxes(join(outDir, `${entry.prefix}_hitboxes.tres`), meta);
    if (entry.pieces) writeGore(entry, rendered.model, outDir, meta);
  }
  // The hero's scripted kills, read by the game from the same timing the two halves were drawn to.
  if (entry.finishers) {
    for (const [name, finisher] of Object.entries(FINISHERS)) {
      writeFinisherDefinition(join(outDir, "finishers", `finish_${name}.tres`), name, finisher);
    }
  }
}

/** Where a piece leaves the body: its pivot in the pose it was drawn in, in body space. */
function pieceOrigin(model, piece) {
  const camera = spriteCamera({ width: 112, height: 128, scale: 1, yaw: model.yaw ?? 20 });
  const grow = model.scale ?? 1;
  const [x, y] = camera.project(piece.pivot(solveBody(piece.pose, model.build)).map((v) => v * grow));
  return [round(x - camera.width / 2), round(y - (camera.height - camera.baseline))];
}

/** A soldier's pieces (a strip each, one SpriteFrames for all) and his gore set. */
function writeGore(entry, model, outDir, meta) {
  const animations = [];
  const bottoms = {};
  const origins = {};
  for (const [name, piece] of Object.entries(entry.pieces)) {
    const frames = renderPiece(model, { ...piece, angles: TURNS });
    const file = `${entry.prefix}_piece_${name}.png`;
    strip(frames.map((f) => f.canvas)).save(join(outDir, file));
    reviewSheet(frames.map((f) => f.canvas)).save(join(ROOT, "captures", "art_review", `${entry.prefix}_piece_${name}.png`));
    const [w, h] = piece.size;
    animations.push({ name, texture: `res://${entry.dir}/${file}`, frames: frames.map((_, i) => [i * w, 0, w, h]), fps: 14,
      loop: true });
    bottoms[name] = frames.map((f) => f.bottom);
    origins[name] = pieceOrigin(model, piece);
    console.log(`${entry.prefix}: piece ${name} (${frames.length} turns)`);
  }
  writeSpriteFramesRegions(join(outDir, `${entry.prefix}_pieces.tres`), animations);
  const wounds = {};
  for (const [name, m] of Object.entries(meta)) if (m.wounds) wounds[name] = m.wounds;
  writeGoreSet(join(outDir, `${entry.prefix}_gore.tres`), { pieces: `res://${entry.dir}/${entry.prefix}_pieces.tres`,
    bottoms, origins, cuts: entry.cuts, wounds });
}
