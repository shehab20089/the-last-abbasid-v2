// Builds a level's environment art: its parallax layers (sky, skyline, city, and the river where it
// has one), the street-side backdrop, the ground underfoot and the facades over its solid blocks, the
// last two lit by the backdrop's fires and lamps. The shared tileset and prop library (used by every
// level) live with the market's art and build with --shared.
// Usage: node tools/asset_generation/build_environment.mjs [--level fallen_market] [--only sky,...]
//        node tools/asset_generation/build_environment.mjs --shared [--only tiles,props]
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTileset, tilesetResource } from "./environment/tiles.mjs";
import { buildLayers } from "./environment/layers.mjs";
import { buildBackdrop, paintBackdrop } from "./environment/backdrop.mjs";
import { buildGround } from "./environment/ground.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SHARED = join(ROOT, "assets", "environments", "market");
const REVIEW = join(ROOT, "captures", "art_review");
const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : null;
};
const only = option("only")?.split(",") ?? null;
const want = (name) => !only || only.includes(name);
mkdirSync(REVIEW, { recursive: true });

if (args.includes("--shared")) {
  mkdirSync(join(SHARED, "props"), { recursive: true });
  if (want("tiles")) {
    const atlas = buildTileset();
    atlas.save(join(SHARED, "market_tiles.png"));
    writeFileSync(join(SHARED, "market_tileset.tres"),
      tilesetResource("res://assets/environments/market/market_tiles.png"));
    atlas.scaled(6).save(join(REVIEW, "market_tiles.png"));
    console.log("tiles");
  }
  if (want("props")) {
    const { buildProps } = await import("./environment/props.mjs");
    buildProps(SHARED, REVIEW);
    console.log("props");
  }
} else {
  const name = option("level") ?? "fallen_market";
  const { LEVEL } = await import(`../levels/${name}.mjs`);
  const OUT = join(ROOT, (LEVEL.env ?? "res://assets/environments/market").replace("res://", ""));
  mkdirSync(join(OUT, "props"), { recursive: true });
  await buildLayers({ OUT, REVIEW, want, level: LEVEL });
  const backdrop = buildBackdrop({ OUT, REVIEW, want, level: LEVEL });
  if (want("ground") || want("facades")) {
    // The street's lamps light the play too; painted without saving when only the play is built.
    const lamps = (backdrop ?? paintBackdrop(LEVEL, LEVEL.look ?? "night")).lamps;
    const palette = LEVEL.painting ? JSON.parse(readFileSync(join(OUT, "palette.json"), "utf8")) : null;
    if (want("ground")) buildGround({ OUT, REVIEW, level: LEVEL, lamps, palette });
    if (want("facades")) {
      const { buildFacades } = await import("./environment/facades.mjs");
      buildFacades(OUT, LEVEL, { lamps, palette });
      console.log("facades");
    }
  }
}
