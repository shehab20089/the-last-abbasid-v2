// Measures every character animation the way it plays in the game, frame by frame at its real
// timing, and reports what the eye would catch: limbs that pop between frames (strike frames
// excepted: a blow is meant to snap), feet that slide while they carry weight (in walk and run at
// the game's own playback speed, and in attacks whose lunge carries the body, with the sprites'
// planted feet held still exactly as the build holds them), loops whose last frame does not lead
// into the first, and limbs asked to reach past their length. Prints the ground speeds the game's
// walk_animation_speed / run_animation_speed should use.
// Usage: node tools/animation_lint.mjs [character]   (yusuf, swordsman, spearman, archer, captain, veteran, maceman, shieldbearer, engineer)
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const imp = (p) => import(pathToFileURL(join(ROOT, "tools", "asset_generation", p)).href);
const { solveBody } = await imp("characters/body3d.mjs");
const { add, scale, toParent } = await imp("lib/space.mjs");
const { plantFeet, readAttacks, rootMotion } = await imp("lib/root_motion.mjs");
const { ANIMATIONS: YUSUF } = await imp("characters/yusuf_animations.mjs");
const SOLDIERS = await imp("characters/mongol3d_animations.mjs");

const YAW = 22;
const COS = Math.cos((YAW * Math.PI) / 180);
const right = [COS, Math.sin((YAW * Math.PI) / 180), 0];
/** Screen position (x right, y up) of a character-space point. */
const screen = (p, size) => [(p[0] * right[0] + p[1] * right[1]) * size, p[2] * size];

const heroAttacks = readAttacks(join(ROOT, "features/warrior/definitions"));
const enemyAttacks = readAttacks(join(ROOT, "features/enemies/definitions"));
const CAST = {
  yusuf: { animations: YUSUF, attacks: heroAttacks, friction: 1500, size: 1 },
  swordsman: { animations: SOLDIERS.SWORDSMAN, attacks: enemyAttacks, friction: 1600, size: 1 },
  spearman: { animations: SOLDIERS.SPEARMAN, attacks: enemyAttacks, friction: 1600, size: 1 },
  archer: { animations: SOLDIERS.ARCHER, attacks: enemyAttacks, friction: 1600, size: 1 },
  captain: { animations: SOLDIERS.CAPTAIN, attacks: enemyAttacks, friction: 1600, size: 1.14 },
  veteran: { animations: SOLDIERS.VETERAN, attacks: enemyAttacks, friction: 1600, size: 1 },
  maceman: { animations: SOLDIERS.MACEMAN, attacks: enemyAttacks, friction: 1600, size: 1.06 },
  shieldbearer: { animations: SOLDIERS.SHIELDBEARER, attacks: enemyAttacks, friction: 1600, size: 1 },
  engineer: { animations: SOLDIERS.ENGINEER, attacks: enemyAttacks, friction: 1600, size: 1 },
};

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

const fmt = (v) => v.toFixed(1);
const GROUND = 1.3;
let problems = 0;

for (const [who, c] of Object.entries(CAST)) {
  if (process.argv[2] && process.argv[2] !== who) continue;
  for (const [name, anim] of Object.entries(c.animations)) {
    const attack = c.attacks[name];
    // A skid (the Captain's charge) is meant to slide.
    const travel = attack && attack.lunge > 0 && !anim.skid ? rootMotion(anim, attack, c.friction) : null;
    const poses = travel ? plantFeet(anim.poses, travel, COS * c.size) : anim.poses;
    const frames = poses.map((p) => keyPoints(solveBody(p), c.size));
    const holds = (anim.durations ?? anim.poses.map(() => 1)).map((d) => d / anim.fps);
    const issues = [];
    const notes = [];

    frames.forEach((k, i) => {
      const names = ["near foot", "far foot", "near hand", "far hand"];
      k.reach.forEach((ok, j) => { if (ok === false) issues.push(`frame ${i}: ${names[j]} out of reach`); });
    });

    // Pops: a part travelling far more in one frame than it does around it. Strike frames (the
    // attack's live frames and the frame before) are allowed to snap.
    const striking = (i) => attack && i >= attack.activeFrom - 0 && i <= attack.activeTo;
    for (const part of ["handF", "head", "footN", "footF"]) {
      const steps = frames.map((k, i) => {
        if (i === 0 && !anim.loop) return 0;
        const prev = frames[(i - 1 + frames.length) % frames.length][part];
        return Math.hypot(k[part][0] - prev[0], k[part][1] - prev[1]);
      });
      const sorted = [...steps].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      steps.forEach((d, i) => {
        if (!striking(i) && d > Math.max(9, median * 3.2)) {
          issues.push(`frame ${i}: ${part} jumps ${fmt(d)} px (median ${fmt(median)})`);
        }
      });
    }

    // Walk and run: planted feet move back at one steady speed; the game must play the cycle at it.
    if (anim.loop && (name === "walk" || name === "run")) {
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
        if (spread > mean * 0.2) issues.push(`planted feet move unevenly: spread ${fmt(spread)} px/s around ${fmt(mean)}`);
      }
    }

    // Attacks that carry the body: a foot that stays down must not slide over the ground.
    if (travel) {
      for (const side of ["N", "F"]) {
        for (let i = 0; i < frames.length - 1; i++) {
          const slide = slideOf(frames[i], frames[i + 1], side, travel[i], travel[i + 1]);
          if (slide !== null && Math.abs(slide) > 2.5) {
            issues.push(`frames ${i}-${i + 1}: ${side === "N" ? "near" : "far"} foot slides ${fmt(slide)} px`);
          }
        }
      }
    }

    if (anim.loop && frames.length > 2) {
      const a = frames[frames.length - 1].pelvis;
      const b = frames[0].pelvis;
      const seam = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (seam > 4) issues.push(`loop seam: the hips jump ${fmt(seam)} px from the last frame to the first`);
    }
    problems += issues.length;
    if (issues.length || notes.length) {
      console.log(`${who} ${name}${notes.length ? ` — ${notes.join("; ")}` : ""}`);
      for (const m of issues) console.log(`  ${m}`);
    }
  }
}
console.log(`ANIMATION_LINT ${problems} issue(s)`);
