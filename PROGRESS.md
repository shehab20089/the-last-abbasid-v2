# PROGRESS — The Last Abbasid

Last updated: 2026-10-08. Godot 4.7.2 (Compatibility renderer), typed GDScript, Node.js asset tools. Architecture after `D:\personal\arabic-magic-v1` (feature folders, strict typing, generated assets, headless suites). Art direction follows the user's concept art pack (banners with the gold crescent, cranes and hanging cages, cobalt tilework, square gate towers, the Captain's dark lamellar and bronze shield).

## Phase 1 — First playable vertical slice: COMPLETE
The Fallen Market, playable from title to ending: run, variable jump, coyote time and jump buffer; three-cut combo and heavy cleave with swept-blade hitboxes; frontal block, parry and riposte; dodge roll with invulnerability; stamina; swordsman, spearman and archer AI; two lamp checkpoints; health, death and return; HUD and synthesized sound; an objective chain (Ibrahim, the ambush, the satchel) and an ending. All covered by the suites below.

## Phase 3 — Full chapter: COMPLETE (verified by automated suites and renders)

| Requirement | State | How it was checked |
| --- | --- | --- |
| Level 2 — Streets of Ash | Done | Smoky night; two fallen houses block the lane (climb over), rooftop archers, a rooftop page, the captives' square (ambush "captors", Salim kneeling until freed, captives run when freed), the quarter gate. Autoplayer finishes it; `captures/level/streets_of_ash_*.png` |
| Level 3 — The Scholars' Quarter | Done | Pre-dawn; tiled portal with muqarnas hood, madrasa courtyard (fountain, cypresses), library with shelves, ladders and a gallery (ambush "library"), the copyist and the librarian (gives the catalogue), the river wall over the Tigris (its own parallax river layer), lecture hall, garden door. Autoplayer finishes it |
| Level 4 — The Last Gate | Done | Dawn with a low sun; the wall road (Hamid returns), the Mongol camp (tents, horse-tail standards, braziers), the rampart and its wall walk (archers), the siege wreck, the gate square arena. Autoplayer finishes it, including the boss |
| Mongol Captain boss | Done | Large sprite (96×112 / 192×112 canvases, 14 animations), two phases (roar at 55%), chained three-cut combo, unblockable leaping smash (red glint + red body flush), unparryable guard-breaking shield charge, armoured body (no flinch), guards less in phase 2; cinematic entrance (arena closes behind burning barricades, camera keeps to the square, hero held for the roar, name bar), defeat (slow motion, dying line, arena opens, gate unlocks). `tests/enemy_test.gd`, `tests/session_test.gd`, `captures/session/11–13` |
| Level transitions and story | Done | Each level's data names its objectives, ambushes, gifts, exit and the story card told on leaving; cards between levels; the final ending (4 lines) then chapter complete with time, falls and manuscripts (10 in the chapter). Save points at the next level's start |
| New characters | Done | Salim (kneel/stand/talk), the librarian, the copyist, kneeling captives; the Captain and the soldiers restyled after the concept art (dark iron lamellar with bronze rivets, black horsehair plumes, the swordsman's round shield, the spearman's face mask, darker deels) |
| New environments | Done | Generalized painters: `layers.mjs` (4 looks: night, smoke, predawn, dawn; river layer), `backdrop.mjs` (ruins, bathhouse, quarter gate, portal, madrasa, library, river wall, rampart, gatehouse, camp, cranes with cages, carpets, cobalt tile, crescent banners, a deeper street behind every gap), facades (rubble, rampart), 13 new props and 3 new exit gates |
| Music and sound | Done | Maqam Saba (streets), Bayati with ney (scholars), Hijaz Kar march (gate) and boss theme; river ambience; boss roar, boss fall, dire telegraph cue |
| Localization | Done | All new text in English and Arabic (`assets/localization/strings.csv`); title font now falls back to a system font for Arabic glyphs |

### Tests (all passing: `./tools/run_tests.ps1`)
- `tests/gameplay_test.gd` — 61 checks: movement, jumping, coyote, buffer, combo, heavy, roll, guard, parry/riposte, hurt, heal, death/respawn, real keyboard and gamepad events.
- `tests/enemy_test.gd` — 71: soldiers (perception, telegraph, parry → riposte, guard, death, spearman spacing, archer, ledges; busy soldiers, surprise strikes, sentries on watch, the alarm) and the Captain (waits until the fight, roars untouchable, telegraphed blows land; the smash goes through a raised shield; the charge crosses the gap and breaks the guard; armour takes a cut without flinching; second phase at 55% with an untouchable roar and less guarding; death).
- `tests/session_test.gd` — 73: the chapter through `app/main.tscn` — the market's story (the mother's rescue, the hidden pincer ambush), the card into the Streets of Ash (new objective, save at the next level), then the Last Gate: the square closes, he roars, the barricade holds, he falls, the square opens, the gate opens on the ending, chapter complete.
- `tests/traversal_test.gd -- <level>` — 17 in all: an autoplayer whose goals come from each level's own story data finishes all four levels with real physics (ambushes beaten, gifts received, the boss beaten, exits opened).
- Visual (not pass/fail): `tests/capture_level.gd -- <level>`, `tests/capture_session.gd` → `captures/`.

### Fixed during this phase
- An ambush interrupted by the hero's death left its soldiers dormant for good (the trigger was disarmed on reload). Ambush triggers now stay armed until their group is cleared.
- Enemies could strike the hero while the story had the stage (opening a gate); the hero is untouchable while cinematic.
- Hit-stop timed by the wall clock could slow fades and level loads; it now runs on unscaled frame time, and fades ignore time scale.
- The boss bar overlapped hints; it now sits at the foot of the screen and hides the interaction prompt while shown.

### Not verified (honest limits)
- No extended human play session (desktop control was declined; all play is scripted). The Captain's difficulty, the levels' pacing and combat feel need a person at the keyboard.
- Audio was checked numerically (levels, loops), not by ear.
- Arabic text is complete and shaped through system fonts; full RTL layout of every screen has not been reviewed.

## Art pass 2 (after the user's "looks like 90s pixel art" feedback): IN PROGRESS
Done:
- Distant layers from the concept paintings (market, streets, scholars from the gameplay mockup, gate), pixel-converted with a 96-colour palette (`environment/painted.mjs`), the old procedural sky/skyline/city kept only as a fallback.
- Street backdrops mapped to each painting's palette, built lower (single storeys, the odd tall building) and darker (silhouettes lit by their fires), so the painted city reads above them.
- Camera height 52 → 84 px (more city, less ground).
- Post-process: warm bloom, split toning (violet shadows, amber lights), contrast, vignette.
- No ordered dithering: smooth sky gradients and translucent smoke.
- Tiles: warm bevelled stone paving and masonry sinking into darkness (replacing the noisy earth band).
- Hero restyled after the concept sheet; fighters lifted and rim-lit by their shader.
- Fires: multi-tongued 12-frame flames up to 96 px with soft translucent edges and an ember bed; each fire spits additive embers.
- Drifting smoke: a tiling translucent smoke band between the painted city and the street (scrolling slowly), and a thin haze at street level.
- HUD after the concept: a bronze crescent medallion, slender bronze-framed red and teal bars ending in arrowheads, the boss bar capped at both ends.
- Title screen: the concept key art, pixel-converted (192 colours, warmed), drifting slowly, the title and menu in a darkened right-hand third.
Tried and dropped: a supersampled "pre-rendered" character renderer (4× render, palette reduction, textures) — at 80 px it read as noise and blur; the crisp renderer with better palettes won.
Next: civilians' palettes after the concept; the gate square's backdrop (the boss arena) is still a broad flat wall; a settings switch for the bloom (cost on weak GPUs); story cards and menus over painted backdrops.

## Characters, animation and combat feel rebuilt (after "the character design looks awful, combat and animation very off"): DONE
- Every character is now a 3D model rendered into pixel art (see AGENTS.md, Art pipeline): Yusuf after concept 01, the three soldiers after 07, the Captain after 08, and the eight townsfolk. Rigged skeleton with IK, skinned cloth, simulated scarf/plumes/strips/cloak, 4× G-buffer shaded into palette ramps with outlines and a warm rim. All 19 hero animations, 11 swordsman, 9 spearman, 6 archer, 14 Captain and the townsfolk's were keyed anew: anticipation, whole-body strikes (hips lead, shoulders follow), follow-through, recovery; held, readable wind-ups on every enemy telegraph frame.
- Movement: the hero runs by default (150 px/s, snappier acceleration); a light stick tilt walks; the sprint button is gone.
- Attacks retimed to the new frames: light cut active from 0.13 s, recoverable at 0.22 s; heavy active at 0.28 s.
- Hits: longer hit-stop (light 0.075–0.08 s, thrust 0.11, heavy 0.15), stronger shoves with a visible slide (soldiers reel on low friction), a cut's crescent streak or a thrust's punch, sparks and a blood spray, dust under a big shove; blade sweeps no longer reach behind the hero.
- Soldiers back away facing the hero (the walk plays in reverse) instead of flipping round; they hold their range with some give instead of stuttering at its edge; they look before they turn on patrol.
- Removed: the 2D rig (`rig.mjs`, `rotsprite.mjs`, `humanoid.mjs`, `cycles.mjs`, the old character modules).
- Not verified: feel by a person at the keyboard (all play is scripted).

## Quality pass after an outside review (character consistency, animation, combat effects): DONE
- `docs/art_style_guide.md`: scale, light, value groups, faction colours, materials, silhouettes, animation and effect rules.
- Readability by measured value groups (share of dark/mid/accent/bright pixels per figure): the soldiers were 54–67% near-black against Yusuf's 45%; plates lightened, each soldier given his own deel (madder, umber, indigo) and lighter trousers, now 40–46%. Townsfolk dyes dulled for night (Salim's linen was the brightest thing on screen).
- Sword trails are a runtime effect (`features/combat/sword_trail.gd`): crescents built from the generated blade positions on live frames, fading in 0.13 s behind the body, red for blows no shield can stop; baked smears removed from every sprite. Rising cuts throw their impact streak upward (`hit_slash_rise`). The hit flash no longer whitens a body completely, so its recoil reads.
- `tools/animation_lint.mjs` measures every animation at its game timing. It found 103 problems; 1 small one remains (a foot in Yusuf's collapse moving 9 px). Fixed: walk/run ground speeds measured and the game set to them (walk 60, run 126 hero / 117 soldiers / 123 Captain), run contact spacing evened (spread 60 → 8 px/s); every lunging attack re-footed (the front foot steps into the blow, the back foot drags up) with planted feet held still against the game's lunge (`lib/root_motion.mjs`); hurt and death given in-betweens; the Captain's charge became a leap landing in a skid.
- Gameplay touched only where the art needed it: thrust lunge 190 → 120 px/s, the swordsman's rising slash 95 → 75, the spearman's thrust 130 → 100; soldiers brake at 1600 px/s² after a lunge instead of skating on at 900.
- Townsfolk body language: the scholar unhurried with measured gestures; the wounded guard breathing hard, hand to his side; the copyist trembling; the refugees running hunched and glancing back (the man shielding his head, the woman gathering her robe).
- `tests/capture_cast.gd` lines the whole cast up inside every level (quiet street and beside a large fire) at native 640×360.
- Backup of the previous characters: `backups/2026-10-08_characters_v1/` (ignored by Godot).

## Encounter redesign, The Fallen Market (after "the game feels repetitive"): DONE, awaiting the user's playtest
A designer's audit found every level built from one move: a soldier standing in the street facing the hero, mostly alone. The Market now has six fights, each asking its own question:
1. **The looter** (col 66): kneeling at a broken-open chest, his back to the street. Teaches the surprise strike (hint before it).
2. **The mother** (col 99): a soldier with his sabre raised over a woman shielding her son; her cry (`mother_cry`, event `alarm`) turns him to the hero: a face-to-face duel, after the guard hint. She can be spoken to once he is dead (`mother_cleared`).
3. **The terrace** (cols 135–142): a spearman holds the stone terrace, an archer on watch behind him (hint `HINT_ARCHER_COVER`).
4. **The book burners** (col 161): one feeds a pyre of books, one talks across it. Optional: the gallery above passes them unseen (out of sight height), or the hero drops in; the ledger page lies by the fire.
5. **The ambush at Ibrahim's** (trigger 205): two from the shops ahead and one from behind, all hidden until it springs.
6. **The river gate** (cols 280, 283): two sentries with shields locked (`guard: 0.95`); `HINT_GUARD_BREAK` points to the heavy cleave.
Systems behind it (all levels can use them; level data keys in `tools/levels/*.mjs`):
- `activity` per soldier: an animation he loops until he notices the hero (swordsman `loot`, `burn`, `menace`; spearman `chat`; archer `watch`). Busy soldiers stay put and see/hear less (×0.5 / ×0.55); `watch` keeps full sight.
- Surprise: the first blow on a soldier who has not noticed the hero deals double and staggers him (`MongolSoldier.SURPRISE_DAMAGE`, `surprised` signal: guard-break sound, hit-stop, shake). A soldier who has only just noticed is still turning for 0.3 s (`EnemyBrain.SURPRISE_GRACE`).
- Alarm: a soldier who notices (or is surprised) shouts; comrades within 210 px join. Story event `alarm` turns a group.
- `hidden` soldiers are invisible and out of physics until their group wakes; `guard` sets a soldier's block chance.
- "Objective updated" only shows when the objective really changes.
- Set pieces modelled in 3D like the characters (`environment/props3d.mjs`, built with the shared props): `book_pyre`, `chest_looted`.
Tests: enemy 56 (surprise, busy senses, watch, alarm), session 60 (the mother's rescue, the hidden pincer), traversal unchanged (the bot skips the optional burners). Captures: `tests/capture_encounters.gd` → `captures/encounters/` (`market_encounters.png` is the contact sheet).
Not verified: how it plays by hand. Next, once the user has played it: the same treatment for Streets of Ash, the Scholars' Quarter and the Last Gate (items 3–6 of the audit: level identity, soldier variety, pacing beats, set-piece moments).

## Combat review, the rest of the plan (after "do the uncompleted phase and the rest of the phases"): DONE
- **Phase 2, finished: the rolling cut.** The light button late in a roll (from 0.2 s) comes up out of it in a rising cut, turned on the nearest man (or where the stick points); the thrust follows it.
- **Phase 3: new soldiers who ask new questions** (3D models and full animation sets, gore pieces, finisher halves, brains, tests):
  - *Keshig veteran* (masked, indigo, white plume): fights as the swordsman, but his quick cut is followed (80%) by a backhand after a held beat (`chained`, no glint): a panicked parry meets the second cut wrong.
  - *Mace-bearer* (lamellar to the collar, iron mask, flanged mace, 130 health): `unflinching` (light blows wound but do not stop him); the overhead blow breaks a raised shield (parry it or roll; his recovery is long), the sweep is heavy. He can be finished and taken unawares.
  - *Georgian shield-bearer* (mail, conical helmet with a nasal, tall crimson shield, short spear): `shield_wall` turns every frontal blow, the cleave and knives too; the bash or a plunge (`overwhelms`) breaks it; a blow from behind gets past, and he turns slowly (0.6 s). He jabs over the rim and shoves (parry the shove to open him).
  - *Siege engineer* (felt cap, no armour): keeps his distance and lobs `FirePot`s at where the hero is going; each leaves `BurningGround` for 2.8 s that burns through any shield. Cornered, he throws at his own feet.
  - Placed: Streets of Ash (a shield-bearer on the bathhouse street, a veteran among the captors), Scholars' Quarter (engineers on the mooring steps and the hall balcony, a shield-bearer in the hall, a veteran at the garden wall), Last Gate (a mace-bearer on the wall walk and one in the siege wreck, a shield-bearer sentry). New hints for each.
- **Phase 4: a technique learned in each level.** Pages of a treatise on the arts of war (`Manuscript.teaches`) teach the shield bash (Streets of Ash, before the first shield-bearer), the plunging strike (Scholars' Quarter, on the library gallery over the soldiers) and the rolling cut (Last Gate, by the camp lamp, before the mace-bearers); Salim gives the throwing knives (`Npc.teaches`). A learned technique shows a notice, then how to use it once play resumes. Entering a level, the hero knows what the levels before taught (`knownTechniques` in the level data) plus what he has learned (`knows_<t>` flags). The Fallen Market teaches nothing new: its gallery hint is now a drop-in, its gate hint the cleave again. Manuscripts: 13.
- **Throwing knives:** `throw` (U / LT): three, refilled at lamps and on respawn; fast and flat; a raised shield turns them; a man who never saw it coming dies of one. The HUD shows how many are left.
- Fixed on the way: an `Area2D` with `monitorable = false` does not see bodies here, so arrows flew through walls; arrows (and pots) now stick or break where they hit.
- Tests: gameplay 86 (rolling cut, knives, U throws), enemy 179 (veteran, mace-bearer, shield wall, fire pots; glint timing for all eight kinds), session 78 (a page teaches the plunge; what the hero knows per level), traversal all four levels with the new soldiers. Captures: `tests/capture_soldiers.gd` -> `captures/soldiers/`; `tests/capture_encounters.gd -- <level>` now stops at the new soldiers.
- Lint: the new soldiers are clean except the finisher frame every soldier shares (`finished_impale` 5: hands out of reach).
- Not verified by hand: the new fights' difficulty and pacing, the engineers' aim, how often the veteran's chain catches a player.

## Combat review, first plan (after "review the combat as a staff game designer", then "implement it"): DONE
The review found that one answer won every fight: the light combo's poise damage (46) staggers every common soldier, every stagger could be finished, and a held shield stopped almost everything for free; Yusuf could not attack in the air; the spearman's "low" sweep could simply be blocked; a guard turned instantly; two attacks glinted too late to react to (129 and 167 ms). This first plan answers those:
- **Finishers only on a wounded soldier** (staggered and at half health or less: `MongolSoldier.FINISH_HEALTH`). A parry on a fresh man now earns the riposte, then the finisher. The full finisher (bars, sting, slow time) is kept for the last soldier standing; while another near is still in the fight it plays 1.4x quicker and plain. Each finisher gives back 40 stamina.
- **Glints in time:** every attack a soldier opens with glints at least 0.22 s before it lands (Quick Cut, Low Sweep and the Captain's first cut now glint on their first frame); follow-ups in a chain are marked `chained`. Tested over every soldier's attacks.
- **The low sweep is low:** no standing guard stops it (`AttackDefinition.low`); it glints amber and flushes the spearman amber; jump it or roll.
- **A guard turns slowly** (`EnemyBrain.GUARD_TURN` 0.5 s): roll round a blocking soldier and strike his back.
- **Air slash:** light in the air, two a jump, a moment's check of the fall each.
- **Plunging strike:** heavy in the air turns the blade point-down (a short hang), drops at 540 px/s with the blade live beneath him, and lands on it (`plunge_land`, a second blow at whoever is before him). A man below who never saw it dies of it. Breaks guards.
- **Drop through planks:** down (S / ↓ / stick / D-pad) and jump on a one-way platform. The gallery over the Fallen Market's book burners now teaches it: "They have not seen you…" (a trigger can now start `above` the street, so the hint shows only up there).
- **Shield bash:** heavy with the shield up: fast, cheap (12 stamina), breaks a raised guard, shoves a man back; the light button follows it with the combo.
- Art: five new hero animations from the 3D pipeline (`air_attack`, `plunge`, `plunge_fall`, `plunge_land`, `bash`). Hints updated (jump, roll, the gate's guard break) and a new one (the plunge), English and Arabic. README controls updated.
- Tests: gameplay 72 (air slash, two a jump, the plunge, dropping through planks, L+K bashes with real keys), enemy 157 (finisher rules, glint timing for every attack, the low sweep against a shield and a jump, the slow guard, the bash, the plunge on a looter and through a guard), session 75 (dropping through the Fallen Market's planks), traversal all four levels. Capture: `tests/capture_moves.gd` -> `captures/moves/`.
- Not verified by hand: the feel of the plunge's hang and the air slash's check, the bash's range, whether 0.5 s is the right guard turn.
- Next (from the review): new soldiers who ask new questions (a Georgian shield-bearer, a heavy with an armoured mace, a fire-pot thrower; a two-cut swordsman), the rolling cut, a technique learned in each level, a thrown weapon.

## Finishers (after "we need multiple finisher moves that feel like a scripted cool way of killing the enemy"): DONE
- **A staggered soldier can be finished.** When a parry, a broken guard or a run of blows leaves a common soldier staggered within 64 px before Yusuf, he glows a pulsing red and the prompt reads "[K] Finish him"; the heavy button then plays a scripted kill instead of the cleave (from standing, mid-combo or out of a parry). One of four is chosen each time, never the same twice running:
  1. **Headsman**: a kick drops him to his knees, a high wind-up, the head taken off.
  2. **Run Through**: the sabre driven through his middle, blood bursting front and back, lifted on the blade and kicked off it.
  3. **Spin Cleave**: a full turn, cut through at the waist; the legs stand a moment and fold.
  4. **Disarm**: a rising flick takes his sword arm, he reels clutching the stump, then the head.
- Both halves are drawn in 3D and frame-locked: Yusuf's `finish_*` and the soldier's `finished_*` (swordsman, spearman, archer) from one timing table (`characters/finisher_timing.mjs`), which also writes the `FinisherDefinition` resources. The soldier is set where the choreography wants him; Yusuf is untouchable throughout and no soldier attacks him.
- On screen: black bars slide in and the HUD fades out, a low sting, slow time on the killing blow, a freeze and heavy shake on each cut, the pieces thrown with 1.6x the flesh of an ordinary cut, a thrust's double burst and pumping wound. The hit-stop now keeps a freeze and slow time apart, so a freeze inside slow time returns to it.
- Not for the Captain (he has his own end) or a soldier on his feet, behind the hero, or out of reach. With the Gore setting on Reduced only Run Through is played (it cuts nothing off).
- Tests: gameplay 61, enemy 127 (each finisher: begins on the heavy button, both halves play, the soldier placed, the hero untouchable, death on its frame, what it cuts, every blow, the hero back after; never the same twice; spearman and archer; who cannot be finished; reduced gore; the cleave when no one can be), session 73, traversal all four levels. Capture: `tests/capture_finishers.gd` -> `captures/finishers/` (a sheet per finisher, the prompt, the kill, the aftermath).
- Not verified: how it feels by hand (is 64 px the right reach; is a finisher too long in a crowded fight).

## The library unstuck; the Captain's end (after "stuck in here also" and "the final boss needs to die in a very gore way"): DONE
- **Stuck in the library:** the library's ambush could not be won while its archer, up on the book gallery, still lived, and once the soldiers on the floor were dead he was out of sight above and behind the hero; the keeper kept saying "stop them". Now archers left alone in a group flee (they run off into the smoke) and the group counts as beaten (`Level._on_group_soldier_died`, `MongolSoldier.withdraw`). Session test: kill the three on the floor, the library is clear, the archer gone, the keeper ready to speak.
- **The Captain's end:** the blow that would kill him brings him to one knee instead, propped on his sabre (`beaten`); time slows, he says his last words, Yusuf steps in and his stroke (a cinematic heavy cut) takes the Captain's head where he kneels (`executed`): the head (helmet and red plume) thrown high, three times the gore of an ordinary cut (chunks, a fountain pumping 27 beats), the body pitching forward into the widest pool. Then the arena opens as before. Captures: `tests/capture_finisher.gd`. Enemy and session tests cover the knee, the stroke and the head.

## After the user's playtest: people always talk, ambushes always end, far more gore: DONE
- **People can always be spoken to.** Before, an NPC waiting on a story flag could not be spoken to at all (Ibrahim until the ambush at his door was dead, the mother until her captor died, the librarian, Salim), and the ambusher who comes from behind gave up the chase once the hero ran ahead (beyond 420 px), so the ambush never cleared until the player hunted him down. Now everyone speaks: before their moment they say a fitting line (`<dialogue>_waiting`: "Behind you, the soldiers!") and nothing is handed over or remembered; and a sprung ambusher chases the hero however far he goes (`EnemyBrain._relentless`). Fixed with it: a waiting conversation used to leave the game stuck in the dialogue state (caught by the session test).
- **Sneaking:** the user says it feels better now.
- **Gore, much more:** every killing blow dismembers (`sever_chance` 1.0 on every hero attack; the thrust cuts too); each cut throws 7 chunks of flesh (13 for the waist), a double gush and a blood mist; wounds pump 9 beats, harder; every blow throws twice the drops and flecks; a wide pool for a man cut in two; the hero's sword trail runs blood-red for 6 s after a kill; a killing blow flashes faintly instead of whiting the body out, so the cut shows.
- Tests: gameplay 61, enemy 70 (every killing blow cuts something off), session 68 (speaking to the mother while her captor stands over her: she begs, nothing is remembered; the head flies with the flesh), traversal all four levels.

## Every level redesigned; gore and the horrors of the sack (after "keep the activities pattern", "sneaking is so hard", "the game needs more gore"): DONE, awaiting the user's playtest
- **Sneaking fixed.** It worked in a sandbox from 52 px in to 20 px, but the looter spun round at 36 px, so it looked like failure. Now busy soldiers hear far less (×0.25), one who hears the hero behind him is startled for 0.45 s before he turns (0.2 s for a soldier not busy), and a blow he never saw coming kills him (`tests/enemy_test.gd`: a real run-up and strike from 52, 44, 36, 28 and 20 px all kill).
- **Dismemberment.** Killing blows cut men apart as the blow can: the forehand cut takes a head or an arm, the rising cut a leg or an arm (65% of kills), the cleave cuts through the waist or takes the head (always); a surprise kill or a riposte takes the head. Each soldier falls in his own animation without what was cut (a raw wound cap shown), and the piece is thrown and tumbles (head, sword arm with its sabre, leg, upper half, the spearman's spear), drawn from the same 3D model. The wound pumps in weakening beats as he falls; pools spread under the dead; blows spatter the street. New sounds: `sever`, `body_drop`. A Gore setting (Full / Reduced) in the options.
- **The horrors of the sack.** Executions: townspeople kneeling under a headsman's sabre; from the moment the hero is within 300 px the stroke falls after a few seconds unless he kills or turns the headsman first (they run, crying their thanks; or they are beheaded, and Yusuf says he came too late). Seven in the chapter; the chapter's end counts lives saved. Refugees: one is shot in the back as they run past. Soldiers stab at the dead and strip bodies; the dead lie in the streets (eight corpse props from the townsfolk models, in the poses they fell in, in their blood).
- **Every level** now uses the encounter toolkit: Streets of Ash (a soldier stripping a body, an execution behind a lookout, a stabber at the bathhouse, the dead of the mosque, a headsman at the square as the captors spring, a looter under an archer, burners at the quarter gate), the Scholars' Quarter (burners at the portal, an execution at the fountain under an archer's eye, the library's ambushers seen at their work, a stabber and an execution on the river wall, a looter in the hall), the Last Gate (an execution on the wall road, soldiers talking round a brazier, sorting plunder, stabbing prisoners, an execution in the siege wreck, the defenders dead before the gate).
- Tests: gameplay 61, enemy 69 (sneak run-up, surprise kills, dismemberment, reduced gore, executions), session 66 (the gate captive saved, the gore wiring through the real session), traversal all four levels. Captures: `tests/capture_encounters.gd -- <level>`, `tests/capture_gore.gd`, `tests/capture_atrocities.gd`.
- Not verified: how it all plays by hand (execution timings, sneak feel, gore readability at speed). Lint: 7 small issues left (the beheaded body's far foot moving fast as it drops to its knees, and the old one in Yusuf's fall).

## Phase 2 — Visual and combat polish: PARTLY DONE
Done: smears, hit flash, sparks, parry flash, telegraph glints (red for dire blows), hit-stop, trauma shake, dust, fire lights, ash and embers, facades, crescent banners, place-name banner, soldiers and Captain after the concept art.
Next:
1. Hero art pass after the concept (bronze engraved helmet, scarf tail, bronze-patterned shield).
2. HUD after the concept: crescent medallion, ornate bar ends, level-progress strip with the city silhouette.
3. Hurt flash/sound on enemies blocking; footstep variety; mix pass.
4. The Captain's cape reads as a solid tube when it streams out in the charge; fray its hem.

## Phase 4 — Release quality: NOT STARTED
Windows export preset and build, input rebinding, RTL review, performance pass, audio balance by ear, difficulty tuning from playtests.

## Precise next action
The user plays the chapter and reports on the new soldiers (shield-bearers, mace-bearers, engineers, veterans), the techniques learned per level, the knives, the new moves (the plunge, the bash, the air slash, the rolling cut, dropping through planks), the finishers (reach, length, which land best), the sneaking, the executions (are the delays fair?), the gore and the new encounters. Finisher tuning: `characters/finisher_timing.mjs` (then rebuild warrior, swordsman, spearman, archer), `Warrior.FINISH_REACH`, the slow time and shake in `main.gd` `_on_finisher_struck`. Tune from that (`EnemyBrain` constants, each headsman's `delay` in `tools/levels/<level>.mjs`, `severs`/`sever_chance` in `features/warrior/definitions/*.tres`). After that, give the gate square (the boss arena, `last_gate` cols 186–240) more depth: break the gatehouse backdrop's wall with scaffolds, braziers and the camp beyond (`gatehouse()` in `tools/asset_generation/environment/backdrop.mjs`), rebuild with `node tools/asset_generation/build_environment.mjs --level last_gate --only backdrop` and `node tools/levels/build_level.mjs last_gate`, review with `tests/capture_tour.gd` and `tests/capture_session.gd`, rerun `./tools/run_tests.ps1`.
