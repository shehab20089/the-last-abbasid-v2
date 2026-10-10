// Checks that rebuilding some of a character's animations keeps all of its data in step (the review of
// 2026-10-09: a partial build once rewrote the strips and left the frame data, the hitboxes and the gore set
// behind). In a scratch folder: a full build of the swordsman; a copy whose data for an attack and a death is
// spoiled (blades, timing, wounds) and whose hitboxes and gore set are gone; a partial build of those two into
// the copy. Every file the game reads must then match the full build, the two rebuilt and every other alike.
// Usage: node tools/check_partial_build.mjs
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUILD = join(ROOT, "tools", "asset_generation", "build_characters.mjs");
const CHARACTER = "swordsman";
const DIR = join("assets", "enemies", "swordsman");
const REBUILT = ["attack", "death_head"];

let passed = 0;
let failed = 0;
const check = (ok, label) => {
  if (ok) passed++;
  else failed++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label}`);
};
const build = (out, extra = []) =>
  execFileSync(process.execPath, [BUILD, "--only", CHARACTER, "--out", out, ...extra], { stdio: "pipe" });

const scratch = mkdtempSync(join(tmpdir(), "abbasid_partial_"));
try {
  const full = join(scratch, "full");
  const partial = join(scratch, "partial");
  build(full);
  cpSync(full, partial, { recursive: true });
  // Spoil what the game reads of the two animations, and take away the files made from it.
  const metaPath = join(partial, DIR, `${CHARACTER}_frames.json`);
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  for (const name of REBUILT) {
    meta[name].fps += 3;
    meta[name].blades = meta[name].blades.map(() => ({ hilt: [0, 0], tip: [1, 1] }));
    if (meta[name].wounds) meta[name].wounds = meta[name].wounds.map(() => [0, 0]);
    writeFileSync(join(partial, DIR, `${CHARACTER}_${name}.png`), "spoiled");
  }
  writeFileSync(metaPath, JSON.stringify(meta, null, 1));
  rmSync(join(partial, DIR, `${CHARACTER}_hitboxes.tres`));
  writeFileSync(join(partial, DIR, `${CHARACTER}_gore.tres`), "spoiled");
  build(partial, ["--anim", REBUILT.join(",")]);
  // Every file of the character, compared.
  const files = readdirSync(join(full, DIR)).filter((file) => !file.endsWith(".import"));
  const differing = files.filter((file) => {
    const other = join(partial, DIR, file);
    return !existsSync(other) || !readFileSync(join(full, DIR, file)).equals(readFileSync(other));
  });
  check(files.length > 10 && differing.length === 0,
    `a partial build of ${REBUILT.join(" and ")} leaves every file as a full build makes it (${files.length} files${
      differing.length ? `; differing: ${differing.join(", ")}` : ""})`);
  const rebuilt = JSON.parse(readFileSync(metaPath, "utf8"));
  const truth = JSON.parse(readFileSync(join(full, DIR, `${CHARACTER}_frames.json`), "utf8"));
  check(REBUILT.every((name) => JSON.stringify(rebuilt[name]) === JSON.stringify(truth[name])),
    "the rebuilt animations' blades, timing and wounds are written again from their strips");
  check(Object.keys(truth).every((name) => JSON.stringify(rebuilt[name]) === JSON.stringify(truth[name]))
    && Object.keys(rebuilt).length === Object.keys(truth).length, "and every other animation's data is kept whole");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
console.log(`PARTIAL_BUILD_CHECK_COMPLETE passed=${passed} failed=${failed}`);
process.exitCode = failed === 0 ? 0 : 1;
