// Writes a page to listen to every recorded cue, take by take, beside the code-made sound it replaced (taken from
// git's last commit), for the human ear check the tools cannot do: captures/audio/listen/index.html (open it in a
// browser; it plays the files in place). It changes nothing in the game.
// Usage: node tools/asset_generation/audio/listen_page.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SFX = join(ROOT, "assets", "audio", "sfx");
const OUT = join(ROOT, "captures", "audio", "listen");
const variation = JSON.parse(readFileSync(join(SFX, "variation.json"), "utf8"));
const report = existsSync(join(ROOT, "captures", "audio", "sfx_report.json"))
  ? JSON.parse(readFileSync(join(ROOT, "captures", "audio", "sfx_report.json"), "utf8")) : [];
const loudness = new Map(report.map((r) => [r.name, r.short_db]));

const GROUPS = [
  ["Blades through the air", {
    sword_swing: "Yusuf's light cuts: a katana's or a sabre's edge whistling",
    sword_thrust: "his thrust: a dagger's quick swish",
    sword_heavy: "his cleave: an axe's whomp under a slowed whistle",
    charge_release: "the charged cleave let go",
    whirl: "the whirling cut: two sweeps",
    enemy_swing: "a soldier's sabre: a long knife's cut, slowed",
    enemy_swing_heavy: "a mace or an axe swung",
    spear_thrust: "a spear thrust",
  }],
  ["Steel on steel, and on the shields", {
    parry: "a parry: two strikes a breath apart, a slide of steel (should be the brightest sound in the game)",
    shield_block: "a blow on a round shield's board",
    guard_break: "a guard broken: a mace on steel, the board cracking",
    glance: "a light blow glancing off a raised shield",
  }],
  ["Blows landing", {
    sword_hit: "a light blow on cloth and lamellar",
    sword_hit_heavy: "a heavy blow",
    pommel_crack: "the pommel strike",
    kick_hit: "the kick",
    shield_bash: "the shield bash",
    sever: "a blade cutting a man apart",
  }],
  ["Voices", {
    enemy_hurt: "a soldier struck: five with a grunt, three his armour alone",
    enemy_death: "a soldier's cry as he falls, then his body",
    enemy_alert: "a soldier sees Yusuf: a shout, a sabre drawn",
    hero_hurt: "Yusuf struck",
    hero_death: "Yusuf's death",
    war_cry: "the Second Wind's cry",
    boss_roar: "the Captain's roar",
    boss_fall: "the Captain falling",
  }],
  ["Steps and the body", {
    footstep: "a step on stone",
    footstep_wood: "a step on boards",
    jump: "a jump",
    land: "a landing",
    roll: "a roll",
    body_drop: "a body meeting the street",
  }],
  ["Bows, fire and things", {
    bow_release: "an archer looses",
    arrow_thunk: "an arrow into wood",
    arrow_hit: "an arrow into a man",
    pot_burst: "a fire pot shatters",
    naft_burst: "the naphtha flask bursts",
    gate_open: "a great gate opens",
    siege_impact: "a stone strikes a wall far off",
    heal: "a remedy drunk",
    lamp_light: "a lamp lit",
    manuscript: "a page found",
  }],
];

mkdirSync(join(OUT, "before"), { recursive: true });
const files = readdirSync(SFX).filter((f) => f.endsWith(".wav"));
const rows = [];
for (const [title, cues] of GROUPS) {
  rows.push(`<h2>${title}</h2>`);
  for (const [cue, what] of Object.entries(cues)) {
    if (!variation[cue]) continue;
    const takes = files.filter((f) => f === `${cue}.wav` || f.startsWith(`${cue}__`))
      .sort((a, b) => Number(a.match(/__(\d+)/)?.[1] ?? 0) - Number(b.match(/__(\d+)/)?.[1] ?? 0));
    let before = "";
    try {
      const old = execFileSync("git", ["show", `HEAD:assets/audio/sfx/${cue}.wav`], { cwd: ROOT, maxBuffer: 1 << 26,
        stdio: ["ignore", "pipe", "ignore"] });
      writeFileSync(join(OUT, "before", `${cue}.wav`), old);
      before = `<button class="before" data-src="before/${cue}.wav" title="the code-made sound it replaced">before</button>`;
    } catch {
      before = `<span class="new">new</span>`;
    }
    const buttons = takes.map((f, i) => {
      const level = loudness.get(f.replace(/\.wav$/, ""));
      return `<button data-src="../../../assets/audio/sfx/${f}" title="${f}${level !== undefined ? `, ${level} dBFS` : ""}">${i + 1}</button>`;
    }).join("");
    rows.push(`<div class="cue"><div class="name"><b>${cue}</b><span>${what}</span></div><div class="takes">${before}${buttons}<button class="all">all</button></div></div>`);
  }
}

writeFileSync(join(OUT, "index.html"), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sound Check</title>
<style>
:root { --bg: #15130f; --panel: #201c16; --ink: #e9dfcc; --dim: #a39780; --gold: #d7a64a; --old: #6f8fa8; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 Georgia, serif; }
main { max-width: 980px; margin: 0 auto; padding: 24px 16px 60px; }
h1 { font-size: 26px; margin: 0 0 4px; color: var(--gold); }
h2 { font-size: 18px; margin: 28px 0 8px; color: var(--gold); border-bottom: 1px solid #3a3226; padding-bottom: 4px; }
p.lead { color: var(--dim); margin: 0 0 12px; }
.cue { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between;
  background: var(--panel); border-radius: 6px; padding: 8px 10px; margin: 6px 0; }
.name { display: flex; flex-direction: column; min-width: 260px; flex: 1; }
.name span { color: var(--dim); font-size: 13px; }
.takes { display: flex; flex-wrap: wrap; gap: 6px; }
button { background: #2e271d; color: var(--ink); border: 1px solid #4a3f2e; border-radius: 4px; min-width: 34px;
  padding: 5px 8px; font: inherit; cursor: pointer; }
button:hover { border-color: var(--gold); }
button.playing { background: var(--gold); color: #1b160f; }
button.before { color: var(--old); border-color: #3b4c5a; }
button.all { color: var(--gold); }
.new { color: var(--dim); font-size: 13px; align-self: center; padding: 0 6px; }
</style></head>
<body><main>
<h1>Sound check</h1>
<p class="lead">Every recorded sound of the game, take by take. Press a number to hear one take, <b>all</b> to hear the
takes one after another, <b>before</b> to hear the code-made sound it replaced. In the game each plays at random (never
the same take twice running) with a little pitch spread, panned to where it happens, in the place's room. Note any take
that sounds wrong (comic, too loud, clicking, the wrong voice): its file name shows when you hover over it.</p>
${rows.join("\n")}
</main>
<script>
let current = null;
function play(button) {
  if (current) { current.audio.pause(); current.button.classList.remove("playing"); }
  const audio = new Audio(button.dataset.src);
  current = { audio, button };
  button.classList.add("playing");
  audio.addEventListener("ended", () => button.classList.remove("playing"));
  audio.play();
  return audio;
}
document.querySelectorAll(".takes button").forEach((button) => {
  button.addEventListener("click", () => {
    if (!button.classList.contains("all")) return play(button);
    const takes = [...button.parentElement.querySelectorAll("button:not(.all):not(.before)")];
    let i = 0;
    const next = () => { if (i < takes.length) play(takes[i++]).addEventListener("ended", () => setTimeout(next, 250)); };
    next();
  });
});
</script>
</body></html>
`);
console.log(`LISTEN page: ${join(OUT, "index.html")}`);
