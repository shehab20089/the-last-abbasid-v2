// Measures every character animation the way it plays in the game, frame by frame at its real
// timing, and reports what the eye would catch: limbs that pop between frames (strike frames
// excepted: a blow is meant to snap), feet that slide while they carry weight (in walk and run at
// the game's own playback speed, and in attacks whose lunge carries the body, with the sprites'
// planted feet held still exactly as the build holds them), loops whose last frame does not lead
// into the first, and limbs asked to reach past their length. Prints the ground speeds the game's
// walk_animation_speed / run_animation_speed should use. Each soldier is measured against his own attacks
// (his profile's), and an animation two of his attacks play with different lunges is measured for each.
// Known issues are kept in tools/animation_lint_baseline.json, grouped by what causes them; with --check
// the lint fails (exit 1) on an issue not listed there, or one grown worse than it was, and names those
// fixed since; --update writes the baseline afresh (known issues keep their group, new ones go to a group
// for their kind, to be looked into).
// Usage: node tools/animation_lint.mjs [character] [--check | --update]
//   (yusuf, swordsman, spearman, archer, captain, veteran, maceman, shieldbearer, engineer, skirmisher, axeman)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(join(ROOT, "tools", "asset_generation", p)).href);
const { solveBody } = await imp("characters/body3d.mjs");
const { add, scale, toParent } = await imp("lib/space.mjs");
const { attackUses, plantFeet, readAttacks, rootMotion } = await imp("lib/root_motion.mjs");
const { ANIMATIONS: YUSUF } = await imp("characters/yusuf_animations.mjs");
const SOLDIERS = await imp("characters/mongol3d_animations.mjs");
const { FINISHERS } = await imp("characters/finisher_timing.mjs");

const YAW = 22;
const COS = Math.cos((YAW * Math.PI) / 180);
const right = [COS, Math.sin((YAW * Math.PI) / 180), 0];
/** Screen position (x right, y up) of a character-space point. */
const screen = (p, size) => [(p[0] * right[0] + p[1] * right[1]) * size, p[2] * size];

const HERO = join(ROOT, "features/warrior/definitions");
/** A soldier's attacks are those his own profile uses. */
const profile = (who) => join(ROOT, "features/enemies/definitions", `${who}.tres`);
const CAST = {
  yusuf: { animations: YUSUF, source: HERO, friction: 1500, size: 1 },
  swordsman: { animations: SOLDIERS.SWORDSMAN, source: profile("swordsman"), friction: 1600, size: 1 },
  spearman: { animations: SOLDIERS.SPEARMAN, source: profile("spearman"), friction: 1600, size: 1 },
  archer: { animations: SOLDIERS.ARCHER, source: profile("archer"), friction: 1600, size: 1 },
  captain: { animations: SOLDIERS.CAPTAIN, source: profile("captain"), friction: 1600, size: 1.14 },
  veteran: { animations: SOLDIERS.VETERAN, source: profile("veteran"), friction: 1600, size: 1 },
  maceman: { animations: SOLDIERS.MACEMAN, source: profile("maceman"), friction: 1600, size: 1.06 },
  shieldbearer: { animations: SOLDIERS.SHIELDBEARER, source: profile("shieldbearer"), friction: 1600, size: 1 },
  engineer: { animations: SOLDIERS.ENGINEER, source: profile("engineer"), friction: 1600, size: 1 },
  skirmisher: { animations: SOLDIERS.SKIRMISHER, source: profile("skirmisher"), friction: 1600, size: 1 },
  axeman: { animations: SOLDIERS.AXEMAN, source: profile("axeman"), friction: 1600, size: 1.08 },
};
const BASELINE = join(ROOT, "tools", "animation_lint_baseline.json");
const args = process.argv.slice(2);
const CHECK = args.includes("--check");
const UPDATE = args.includes("--update");
const ONLY = args.find((a) => !a.startsWith("--"));

/** Key points of a solved pose, in screen pixels: each foot's heel and toe, hands, head, hips. */
/** How far a planted foot slid between two frames (by the part that stayed down), or null. */
function slideOf(a, b, side, shiftA = 0, shiftB = 0) {
  for (const part of ["heel", "toe"]) {
    const p = a[`${part}${side}`];
    const q = b[`${part}${side}`];
    if (p[1] < GROUND && q[1] < GROUND) return q[0] + shiftB - (p[0] + shiftA);
  }
  return null;
}

function keyPoints(f, size) {
  const point = (side, local) => screen(toParent(f[`foot${side}`], local), size);
  return {
    heelN: point("N", [-1.8, 0, -3.8]), toeN: point("N", [6.4, 0, -3.6]),
    heelF: point("F", [-1.8, 0, -3.8]), toeF: point("F", [6.4, 0, -3.6]),
    footN: point("N", [2.2, 0, -3.8]), footF: point("F", [2.2, 0, -3.8]),
    handN: screen(add(f.forearmN.o, scale(f.forearmN.z, 12.2)), size),
    handF: screen(add(f.forearmF.o, scale(f.forearmF.z, 12.2)), size),
    head: screen(toParent(f.head, [0, 0, 6]), size),
    pelvis: screen(f.pelvis.o, size),
    reach: [f.footN.reached, f.footF.reached, f.forearmN.reached, f.forearmF.reached],
  };
}

/** The part of the model that shows each measured point: one a cut has hidden (the head taken off, the sword
 *  arm, all above the waist) can neither pop nor be out of reach to the eye. */
const SHOWN_BY = { head: "skull", handN: "fistN", handF: "fistF", footN: "bootN", footF: "bootF" };

/** A finisher's blows: the frames its cuts, bursts and strikes land on (finisher_timing.mjs), which may snap in
 *  both halves; in the hero's half (finish_*) the frame after each too, his follow-through. Null for any other
 *  animation. */
function finisherBlows(name) {
  const m = /^finish(ed)?_(\w+)$/.exec(name);
  const finisher = m && FINISHERS[m[2]];
  if (!finisher) return null;
  const at = [...Object.keys(finisher.cuts).map(Number), ...finisher.bursts, ...(finisher.strikes ?? [])];
  return m[1] ? at : [...at, ...at.map((i) => i + 1)];
}

const fmt = (v) => v.toFixed(1);
const GROUND = 1.3;
/** Every issue found: { key (who, animation and what, without measures), size (its measure, or null), text }. */
const found = [];

for (const [who, c] of Object.entries(CAST)) {
  if (ONLY && ONLY !== who) continue;
  const attacks = readAttacks(c.source);
  const uses = attackUses(c.source);
  for (const [name, anim] of Object.entries(c.animations)) {
    const attack = attacks[name];
    // A skid (the Captain's charge) is meant to slide.
    const travel = attack && attack.lunge > 0 && !anim.skid ? rootMotion(anim, attack, c.friction) : null;
    const poses = travel ? plantFeet(anim.poses, travel, COS * c.size) : anim.poses;
    const frames = poses.map((p) => keyPoints(solveBody(p), c.size));
    const holds = (anim.durations ?? anim.poses.map(() => 1)).map((d) => d / anim.fps);
    const issues = [];
    const notes = [];
    const issue = (key, size, text = key) => issues.push({ key: `${who} ${name}: ${key}`, size, text });
    const shown = (i, part) => !(anim.poses[i].hide ?? []).includes(SHOWN_BY[part]);

    frames.forEach((k, i) => {
      const names = ["near foot", "far foot", "near hand", "far hand"];
      const parts = ["footN", "footF", "handN", "handF"];
      k.reach.forEach((ok, j) => {
        if (ok === false && shown(i, parts[j])) issue(`frame ${i}: ${names[j]} out of reach`, null);
      });
    });

    // Pops: a part travelling far more in one frame than it does around it. Strike frames (the
    // attack's live frames, a thrown weapon's release, a finisher's blows) are allowed to snap.
    const blows = finisherBlows(name);
    const striking = (i) => (attack && ((i >= attack.activeFrom && i <= attack.activeTo) || i === attack.projectile))
      || (blows ?? []).includes(i);
    for (const part of ["handF", "head", "footN", "footF"]) {
      // A step to or from a frame where the part is hidden is not seen: it is left out, of the median too.
      const steps = frames.map((k, i) => {
        if (i === 0 && !anim.loop) return 0;
        const before = (i - 1 + frames.length) % frames.length;
        if (!shown(i, part) || !shown(before, part)) return null;
        const prev = frames[before][part];
        return Math.hypot(k[part][0] - prev[0], k[part][1] - prev[1]);
      });
      const sorted = steps.filter((d) => d !== null).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
      steps.forEach((d, i) => {
        if (d !== null && !striking(i) && d > Math.max(9, median * 3.2)) {
          issue(`frame ${i}: ${part} jumps`, d, `frame ${i}: ${part} jumps ${fmt(d)} px (median ${fmt(median)})`);
        }
      });
    }

    // Walk and run: planted feet move back at one steady speed; the game must play the cycle at it.
    if (anim.loop && ["walk", "run", "block_walk", "block_back"].includes(name)) {
      const speeds = [];
      for (const side of ["N", "F"]) {
        frames.forEach((k, i) => {
          const slide = slideOf(k, frames[(i + 1) % frames.length], side);
          if (slide !== null) speeds.push(-slide / holds[i]);
        });
      }
      if (speeds.length) {
        const mean = speeds.reduce((a, b) => a + b, 0) / speeds.length;
        const spread = Math.max(...speeds) - Math.min(...speeds);
        notes.push(`ground speed ${fmt(mean)} px/s (spread ${fmt(spread)})`);
        if (spread > Math.abs(mean) * 0.2) {
          issue("planted feet move unevenly", spread, `planted feet move unevenly: spread ${fmt(spread)} px/s around ${fmt(mean)}`);
        }
      }
    }

    // Attacks that carry the body: a foot that stays down must not slide over the ground. The sprites are
    // drawn for the first of his attacks to play the animation; another that plays it with another lunge
    // (the spearman's lunge on his thrust) carries the same drawn feet at its own speed.
    const lunges = [];
    for (const use of uses) {
      if (use.anim !== name || use.lunge <= 0 || anim.skid) continue;
      if (!lunges.some((l) => l.lunge === use.lunge && l.from === use.from && l.to === use.to)) lunges.push(use);
    }
    for (const use of lunges) {
      const carried = rootMotion(anim, use, c.friction);
      const drawn = travel && use.lunge === attack.lunge && use.from === attack.from && use.to === attack.to;
      const as = drawn ? "" : ` (as ${use.file.replace(".tres", "")})`;
      for (const side of ["N", "F"]) {
        for (let i = 0; i < frames.length - 1; i++) {
          const slide = slideOf(frames[i], frames[i + 1], side, carried[i], carried[i + 1]);
          if (slide !== null && Math.abs(slide) > 2.5) {
            const what = `frames ${i}-${i + 1}: ${side === "N" ? "near" : "far"} foot slides`;
            issue(`${what}${as}`, Math.abs(slide), `${what} ${fmt(slide)} px${as}`);
          }
        }
      }
    }

    if (anim.loop && frames.length > 2) {
      const a = frames[frames.length - 1].pelvis;
      const b = frames[0].pelvis;
      const seam = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (seam > 4) issue("loop seam", seam, `loop seam: the hips jump ${fmt(seam)} px from the last frame to the first`);
    }
    found.push(...issues);
    if (!CHECK && (issues.length || notes.length)) {
      console.log(`${who} ${name}${notes.length ? ` — ${notes.join("; ")}` : ""}`);
      for (const m of issues) console.log(`  ${m.text}`);
    }
  }
}

// --- The baseline ------------------------------------------------------------------------------------
/** How much a known issue may grow (px, or px/s for a ground speed's spread) before it counts as worse. */
const SLACK = (size) => Math.max(1, size * 0.15);
/** The kind of an issue, for the group a new one is put in. */
function kindOf(key) {
  if (/out of reach/.test(key)) return "reach";
  if (/foot slides .*\(as /.test(key)) return "second lunge";
  if (/foot slides/.test(key)) return "lunge slide";
  if (/unevenly/.test(key)) return "uneven ground speed";
  if (/loop seam/.test(key)) return "loop seam";
  if (/: frame \d+: (footN|footF) jumps/.test(key)) return "foot pop";
  if (/: frame \d+: head jumps/.test(key)) return "head pop";
  return "hand pop";
}
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : { about: "", groups: [] };
const known = new Map();
for (const group of baseline.groups) {
  for (const [key, size] of Object.entries(group.issues)) known.set(key, { size, group });
}
const inScope = (key) => !ONLY || key.startsWith(`${ONLY} `);
const now = new Set(found.map((f) => f.key));
const fresh = found.filter((f) => !known.has(f.key));
const worse = found.filter((f) => known.has(f.key) && f.size !== null && known.get(f.key).size !== null
  && f.size > known.get(f.key).size + SLACK(known.get(f.key).size));
const fixed = [...known.keys()].filter((key) => inScope(key) && !now.has(key));

if (UPDATE) {
  const groups = baseline.groups.map((g) => ({ ...g, issues: {} }));
  const groupOf = (key) => {
    const was = known.get(key)?.group;
    if (was) return groups[baseline.groups.indexOf(was)];
    const kind = kindOf(key);
    let group = groups.find((g) => g.kind === kind && g.unsorted);
    if (!group) {
      group = { cause: `New ${kind} issues, not yet looked into.`, kind, unsorted: true, issues: {} };
      groups.push(group);
    }
    return group;
  };
  for (const f of found) groupOf(f.key).issues[f.key] = f.size === null ? null : Number(f.size.toFixed(1));
  // A lint of one character keeps every other character's known issues as they were.
  for (const [key, { size }] of known) {
    if (!inScope(key)) groupOf(key).issues[key] = size;
  }
  const out = { about: baseline.about, groups: groups.filter((g) => Object.keys(g.issues).length) };
  writeFileSync(BASELINE, `${JSON.stringify(out, null, 2)}\n`);
  console.log(`baseline written: ${Object.values(out.groups).reduce((n, g) => n + Object.keys(g.issues).length, 0)} issue(s)`
    + ` in ${out.groups.length} group(s)`);
}

if (CHECK) {
  console.log("known issues, by cause:");
  for (const group of baseline.groups) {
    const left = Object.keys(group.issues).filter((key) => now.has(key)).length;
    if (left) console.log(`  ${String(left).padStart(3)}  ${group.cause}`);
  }
  for (const f of fresh) console.log(`  NEW    ${f.key.split(": ")[0]}: ${f.text}`);
  for (const f of worse) console.log(`  WORSE  ${f.key.split(": ")[0]}: ${f.text} (was ${fmt(known.get(f.key).size)})`);
  for (const key of fixed) console.log(`  fixed  ${key} (take it out of the baseline: --update)`);
}
console.log(`ANIMATION_LINT ${found.length} issue(s): ${found.length - fresh.length} known, ${fresh.length} new, `
  + `${worse.length} worse, ${fixed.length} fixed`);
if (CHECK && (fresh.length || worse.length)) process.exitCode = 1;
