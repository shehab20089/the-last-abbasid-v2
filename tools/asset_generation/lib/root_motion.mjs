// Root motion shared by the sprite builder and the animation lint. The game moves a fighter's body
// during an attack's lunge (AttackDefinition: lunge_speed over lunge_from..lunge_to, then friction);
// the sprite must keep a foot that bears weight still on the ground meanwhile, so every planted
// foot is shifted back in the sprite by exactly the distance the body has travelled.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Attack definitions in a folder, by animation name: { lunge, from, to }. */
export function readAttacks(folder) {
  const out = {};
  for (const file of existsSync(folder) ? readdirSync(folder) : []) {
    if (!file.endsWith(".tres")) continue;
    const text = readFileSync(join(folder, file), "utf8");
    const anim = /animation = &"([^"]+)"/.exec(text)?.[1];
    if (!anim) continue;
    const num = (key, fallback) => Number(new RegExp(`^${key} = (-?[\\d.]+)`, "m").exec(text)?.[1] ?? fallback);
    out[anim] = { lunge: num("lunge_speed", 0), from: num("lunge_from", 0), to: num("lunge_to", -1),
      activeFrom: num("active_from", 2), activeTo: num("active_to", 3) };
  }
  return out;
}

/**
 * The body's travel (screen pixels) at the start of each frame of an attack animation, integrated
 * at 60 Hz as the game does: lunge speed on lunge frames, friction elsewhere.
 */
export function rootMotion(animation, attack, friction) {
  const holds = (animation.durations ?? animation.poses.map(() => 1)).map((d) => d / animation.fps);
  const travel = [];
  let body = 0;
  let speed = 0;
  holds.forEach((hold, i) => {
    travel.push(body);
    const lunging = attack && attack.lunge > 0 && i >= attack.from && i <= attack.to;
    for (let s = 0; s < Math.max(1, Math.round(hold * 60)); s++) {
      speed = lunging ? attack.lunge : Math.max(0, speed - friction / 60);
      body += speed / 60;
    }
  });
  return travel;
}

/**
 * Keeps planted feet still in the world while the body travels. A foot is planted while it is
 * down (its ankle no higher than `lift`) and its authored spot stays put; a foot lifted, or set
 * down somewhere new, starts a new step. `pixels` converts character-space x to screen pixels
 * (cos of the camera's turn times the character's scale).
 */
export function plantFeet(poses, travel, pixels, { lift = 6.5, moved = 1.5 } = {}) {
  const out = poses.map((p) => ({ ...p }));
  for (const side of ["N", "F"]) {
    let anchor = null;
    let authored = null;
    poses.forEach((pose, i) => {
      const foot = pose[`foot${side}`];
      if (!foot || pose.limbSpace === "pelvis" || (foot[2] ?? 4.2) > lift) {
        anchor = null;
        authored = null;
        return;
      }
      if (anchor === null || authored === null || Math.abs(foot[0] - authored) > moved) {
        anchor = foot[0] + travel[i] / pixels;
      }
      authored = foot[0];
      out[i][`foot${side}`] = [anchor - travel[i] / pixels, foot[1], foot[2]];
    });
  }
  return out;
}
