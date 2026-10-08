// Stacks several review sheets into one image, one animation per row, for quick inspection.
// Usage: node tools/asset_generation/review_rows.mjs out_name sheet1 sheet2 ...
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Canvas, hex } from "./lib/canvas.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const [outName, ...names] = process.argv.slice(2);
const sheets = names.map((n) => Canvas.fromPng(join(ROOT, "captures", "art_review", `${n}.png`)));
const width = Math.max(...sheets.map((s) => s.width));
const height = sheets.reduce((sum, s) => sum + s.height, 0);
const out = new Canvas(width, height);
out.clear(hex("#151215"));
let y = 0;
for (const sheet of sheets) {
  out.blit(sheet, 0, y);
  y += sheet.height;
}
out.save(join(ROOT, "captures", "art_review", `${outName}.png`));
console.log(`${outName}.png ${width}x${height}`);
