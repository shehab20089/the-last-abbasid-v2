# The Arts: strong and worth the wait — plan

**Status (2026-10-09): built and tested; awaiting the user's playtest.** Where the build departs from the plan is
listed at the end.

After the review fixes the user played the build: *"all feels good, but the Arts are so weak and not
interesting at all."* This is the review of the five Arts and the plan; PROGRESS.md records what lands.

## Review

**Weak.** An Art costs half the resolve meter (50) or all of it (100): a parry and several kills' worth
of good fighting. What it gives back:
- *Storm of Blades* (50): 10 damage a pass, and its 150 knockback throws men out of the turn after the
  first pass, so it lands once or twice: 10 to 20 damage, less than one light string (53).
- *Piercing Line* (50): one 20-damage hit per man, a thrust's worth.
- *Naft Flask* (50): the engineer's fire pot in the hero's hand: 10 on impact, a small fire men step out of.
- *Second Wind* (100): health and breath back and ten seconds of free blows: useful, never exciting.
- *Judgment* (100): one man finished (fixed last round for elites and the Captain).

**Not interesting.** Each plays like an ordinary move with a sting: one turn of the whirling cut, a plain
lunge, a throw, a bowed head. Nothing marks the moment an Art is spent, and nothing about a fight changes
after it.

## The plan

### The Art moment (every Art)
The instant an Art is spent the world stops for a heartbeat: a hard freeze and slow time; everything but
Yusuf drains to dim ash grey (a ring of colour about him, `post_process.gdshader` `focus`); the Art's
name flashes across the screen in gold, its Arabic calligraphy above the English (`ArtBanner`); a deep
drum and a ring of steel (`art_moment`), then the Art's own sound. Then the Art plays at full speed.

### Five Arts, five verbs (all physical: speed, steel, fire and fear; no magic)
| Art | Cost | What it becomes |
| --- | --- | --- |
| **Storm of Blades** | 50 | *The whirlwind.* Three turns low on the ball of the foot, steered with the stick, every pass striking all round him and drawing men into the circle (`pulls`), then a rising cut out of the last turn that throws every man about him down. A blur of steel and a vortex of dust. About 70 to 90 damage to a man who stays in it. |
| **Piercing Line** | 50 | *The draw.* Crouched, the blade drawn back, held; then he crosses ~200 px in a blink through the whole line (untouchable), each man struck and frozen in place; he slides to a stop on one knee and flicks the blade, and as he does every wound he left opens at once (a second, heavier cut, blood bursting, men thrown down). |
| **Naft Flask** | 50 | *Greek fire.* The flask bursts in a fireball and spreads a sheet of burning naphtha ~150 px wide for five seconds. Men caught are **set ablaze**: they panic and run burning (no blows, no guard), take heavy harm over three seconds, and set alight any comrade they blunder into. No soldier walks into the fire: it holds a street. |
| **Second Wind** | 100 | *The guard's cry.* Planted, sword high, he roars: every man within ~130 px is thrown back and staggered (their blows broken off; the Captain only pushed). Then ten seconds of **fury**: health and breath back, blows cost nothing and come 25% faster, light blows do not stop him, each blow that lands gives a little blood back, and each kill holds the fury a second longer. A gold glow, after-images, embers. |
| **Judgment of the Guard** | 100 | *The guard's judgment.* Up to three men within reach are executed one after another: he crosses to each in a blink and kills him with a finisher (an elite still fresh, or the Captain, takes the great blow: 40% of his health). Black bars and slow time hold for the whole chain; a gong for each death. |

### Systems
- `ArtDefinition`: `finale` (a second blow played as the first ends), `steer_speed`, `brake` (friction
  after a lunge), `opens_wounds` (the blow every man struck takes on `effect_frame`), the cry
  (`cry_radius`, `cry_knockback`, `cry_stagger`), the fury (`fury_speed`, `fury_heal`, `fury_kill_time`),
  `judgment_chain`.
- `MongolSoldier.frighten` (the cry), `ignite` and the burning state (flee, harm over time, spread; a
  boss burns but does not flee), `BurningGround.ignites` and `covers` (brains will not step into fire).
- Presentation in `app/main.gd` from signals: the Art moment, the whirlwind's blur and dust, the wounds
  opening, the fireball, flames on burning men, the cry's shockwave, the fury's glow, the chain's bars and
  gongs. New effects (`naft_burst`, `shockwave`, `embers`) and sounds (`art_moment`, `storm_wind`,
  `pierce_draw`, `wounds_open`, `naft_burst`, `ignite`, `war_cry`, `judgment_gong`).
- New hero animations: `art_storm` (three turns), `art_storm_burst`, `art_pierce` (the draw, the dash,
  the slide, the flick), `art_second_wind` (the cry), `art_flit` (the blink between judgments).

### Proof
Gameplay tests for each Art's numbers and behaviour (the whirlwind's passes and its throw, steering; the
line's reach and the wounds opening; men set ablaze, fleeing, burning, spreading, and fire no soldier
walks into; the cry's stagger and the fury's speed, heal and kill time; three men judged); the fairness
and full suites; lint clean on every new animation; captures of each Art in the game's own view.

## Where the build departs from the plan

- The Storm kills the common soldiers who stay in it before its rising cut comes (about 70 damage in the turns,
  24 more in the cut): the rising cut throws down the tougher men who live through the turns. A blow that draws men
  in leaves a man at the striker's side where he is (none is dragged through him).
- The Naft's fire no longer staggers a man on its first burn: it sets him ablaze instead, after the burn, so he runs
  from it. The engineers' own pots still only burn.
- A judgment's last man (or its only one) dies in the full finisher, with its bars and slow time; those before him
  die quickly, under the judgment's own bars. A blink never crosses a wall.
