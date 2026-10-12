// Lists the raw sound libraries the kit is cut from (sources/audio/<pack>/x/, downloaded and git-ignored): each
// clip's path, length, rate and channels, by ffprobe. A help for choosing clips; it changes nothing.
// Usage: node tools/asset_generation/audio/list_sources.mjs [pack...]
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SOURCES = join(ROOT, "sources", "audio");
const wanted = process.argv.slice(2);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    // An archive made on a Mac carries resource forks (__MACOSX/, ._name): not sounds.
    if (name === "__MACOSX" || name.startsWith("._")) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.(wav|ogg|flac|mp3)$/i.test(name)) out.push(path);
  }
  return out;
}

for (const pack of readdirSync(SOURCES)) {
  if (wanted.length && !wanted.includes(pack)) continue;
  const extracted = join(SOURCES, pack, "x");
  let files = [];
  try {
    files = walk(extracted).sort();
  } catch {
    continue;
  }
  console.log(`== ${pack} (${files.length})`);
  for (const file of files) {
    const probe = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=sample_rate,channels:format=duration", "-of",
      "default=noprint_wrappers=1:nokey=0", file], { encoding: "utf8" });
    const get = (key) => (probe.match(new RegExp(`${key}=([^\\r\\n]+)`)) ?? [])[1] ?? "?";
    console.log(`  ${relative(extracted, file).replace(/\\/g, "/")}  ${Number(get("duration")).toFixed(2)}s  ${get("sample_rate")}Hz ${get("channels")}ch`);
  }
}
