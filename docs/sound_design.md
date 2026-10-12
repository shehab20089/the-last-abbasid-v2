# Sound design

How the game sounds, how its sounds are made, and what a human ear has to check. Built 2026-10-10 after the
user asked for "top notch" sound, using the method of the "no more cheap beeps" prompt they attached: real
recordings for what is physical, chosen by looking at them and measuring them, cut on a timeline, checked in a QA
loop, then a human listens. (The prompt's helper repository was not cloned or run; its method is followed with the
project's own tools.)

## The standard

- **Physical sounds are recordings.** Blades through the air, steel on steel, blades on shields, blows on bodies,
  steps, cloth, armour, arrows, bodies falling, the gate, the siege, and the voices are layered from CC0
  recordings, several takes each, so no blow sounds twice the same.
- **Code makes what no recording gives:** the warnings (each its own colour and sound, so they must stay distinct
  and synthetic), the Arts' moments, breath and the heart, honour and the interface, the stings, the ambiences
  and the score (an oud over a drone, a maqam for each place). A code layer stays inside a recorded cue only where
  the thing is not a recording's to give: a fire's rush, a drum under the war cry, the weight of a distant stone,
  a reward's chime.
- **Heard where it happens.** A blow sounds where it lands, a swing where the man swings, an archer's string from
  the side he stands, panned across the screen and softer further off. The hero's own breath, steps and heart sit
  in both ears.
- **In a room.** Each level rings in its own space: an open street (the Market), narrow alleys (the Streets of
  Ash), courtyards and halls (the Scholars' Quarter), the stone canyon under the wall (the Last Gate).
- **Mixed.** Each cue's takes are levelled to one loudness (their loudest 50 ms) without crushing their
  transients; the music gives way to the fighting by itself and bows out for finishers, Arts, the Captain's roars
  and a death; a limiter on the master keeps everything under -0.5 dBFS.

## The pipeline

```
sources/audio/<pack>/            raw CC0 libraries, downloaded with the user's approval (git-ignored)
  slice_sources.mjs              every recording split into single events, measured, drawn on numbered sheets
  pick_sheet.mjs                 the candidates for one sound side by side, to choose takes by eye
tools/asset_generation/audio/kit.mjs     the chosen takes: pack, recording, seconds; credits per pack
  build_kit.mjs                  cuts, cleans and levels the kit -> assets/audio/kit/<family>_<n>.wav (+ CREDITS.md)
  build_sounds.mjs               layers the kit (and code) into cues -> assets/audio/sfx/<cue>__<n>.wav, variation.json
tools/write_main_scene.mjs       each multi-take cue an AudioStreamRandomizer in app/main.tscn
  sound_sheet.mjs                QA: every cue drawn, measured and flagged (captures/audio/)
```

```bash
node tools/asset_generation/audio/slice_sources.mjs still_north_impacts   # after downloading a pack
node tools/asset_generation/audio/pick_sheet.mjs parry still_north_impacts "Sabre .* Blade on Blade" --single
node tools/asset_generation/audio/build_kit.mjs                           # needs sources/ and ffmpeg
node tools/asset_generation/audio/build_sounds.mjs                        # the cues (--only a,b), music and ambience
node tools/write_main_scene.mjs
node tools/asset_generation/audio/sound_sheet.mjs --folders sfx,kit       # the QA sheets and reports
node tools/run_godot_cli.mjs --headless --editor --path . --quit          # import the new files
```

The kit is committed (`assets/audio/kit/`, a folder Godot ignores), so the cues rebuild without the raw
libraries; only changing the kit needs `sources/` (the packs are listed with their links in
`assets/audio/kit/CREDITS.md`) and ffmpeg.

## The libraries (all CC0)

| Pack | By | Used for |
| --- | --- | --- |
| Medieval Sound Effects: Weapon on Weapon | Still North Media | parries, blocks, broken guards, glances |
| Medieval Sound Effects: Weapon Textures | Still North Media | every swing, the bow, arrows passing, sabres drawn |
| Impact Sounds | Kenney | punches, thuds, steps on stone and boards, planks, plates, wood |
| RPG Audio | Kenney | cloth, the chop and slice of a blade, pages, latches, the door |
| RPG Sound Pack | artisticdude | mail, light armour, small metal, a bottle, heavy cloth |
| 37 hits/punches | Independent.nu | blows to the body |
| 75 CC0 breaking/falling/hit sfx | rubberduck | pots and flasks shattering, wood cracking, rock and rubble, metal falling |
| Male Grunt/Yelling Sounds | HaelDB | the soldiers' grunts, cries and shouts; Yusuf's voice; the Captain's roar |

## The cues

Loudness is the cue's loudest 50 ms in dBFS as built; the game's call sites add their own offsets as before.

| Cue | Takes | Made of | dBFS | Heard |
| --- | --- | --- | --- | --- |
| sword_swing | 8 | katana and sabre swishes (the edge's whistle), swelling in 30 ms to their peak | -12 | where he swings |
| sword_thrust | 6 | a dagger's swish, quickened | -14.6 | where he swings |
| sword_heavy | 6 | an axe's whomp under a slowed sabre whistle | -12.8 | where he swings |
| charge_release | 4 | the axe's whomp slowed further, a low whistle | -12.4 | where he swings |
| whirl | 4 | two sweeps 0.17 s apart, the second higher | -11.6 | where he swings |
| enemy_swing | 8 | a long knife's cut, slowed | -13.4 | where the soldier swings |
| enemy_swing_heavy | 6 | the axe's whomp slowed, a spear's air under it | -12.5 | where the soldier swings |
| spear_thrust | 5 | a spear's swing | -12 | where the soldier swings |
| parry | 8 | two sword-on-sword strikes a breath apart, a slide of steel, a little room | -13.1 | at the guard |
| shield_block | 8 | a blade on a wooden haft, a plank's board under it | -12.6 | at the guard |
| guard_break | 6 | a mace on a sword, the board cracking, the plates crashing | -13.7 | at the guard |
| glance | 6 | a light ring, quickened, and a skid of steel | -17.9 | in both ears |
| sword_hit | 8 | a knife's slice, a blow to the body, small plates knocking | -9.9 | where it lands |
| sword_hit_heavy | 8 | a heavy punch, a chop, the slice, a crash of plates | -9.3 | where it lands |
| pommel_crack, kick_hit, shield_bash | 4–5 | wood and bone; a boot and a thud; the shield's timber and boss | -9 to -10 | where it lands |
| sever | 6 | a chop, a wet slice, a blow, a few drops after | -12.4 | at the man |
| enemy_hurt | 8 | five with a soldier's grunt over his armour, three his armour alone | -11.5 / -17 | at the man |
| enemy_death | 7 | a soldier's cry, his body and mail on the stones 0.32 s later | -10.7 | at the man |
| enemy_alert | 6 | four with a shout then a sabre drawn, two the draw alone | -12 / -14 | at the man |
| hero_hurt | 6 | Yusuf's grunt over his mail | -9 | in both ears* |
| hero_death, war_cry | 2 | Yusuf's dying cry and fall; his great cry over a drum | -8 | in both ears |
| boss_roar | 3 | a man's roar lowered and rung through a helm | -9 | where the Captain stands |
| boss_fall | 1 | a big man and his armour falling, his shield ringing out | -8.7 | where he falls |
| footstep / footstep_wood | 8 / 6 | a step on stone with a soft weight under it / on boards | -16 | in both ears |
| jump, land, roll | 4–6 | cloth and a scuff; both feet, a thud, cloth, mail; cloth, two thuds, mail | -10 to -16 | in both ears |
| body_drop | 6 | a heavy soft thud, leather, mail, a plate | -8 | where it falls |
| bow_release | 5 | a recurve's string slap and the arrow's hiss | -18 | at the archer |
| arrow_thunk, arrow_hit | 5 | into wood; into a man | -13 / -10 | where it strikes |
| pot_burst, naft_burst | 3, 2 | a pot or a flask shattering, the fire's rush (code) | -12 / -10 | where it bursts |
| gate_open, siege_impact | 1, 2 | a door slowed to a gate's timbers; rock and rubble slowed under a boom, far off | -10 / -8 | in both ears |
| heal, lamp_light, manuscript | 1 | a bottle, a latch, a page, each before its chime | -11 to -12 | in both ears |

\* `hero_hurt` is placed at the hero, who stands near the screen's centre.

The warnings (`enemy_tell*`) stay synthetic and are now placed at the soldier: heard from his side however far
off (they never fade out with distance), softer further away as before.

## The mix

- **Buses** (`default_bus_layout.tres`): Master (a hard limiter, ceiling -0.5 dB), Effects (the world's sounds, a
  reverb set per place), Interface (menus, lessons, objectives, honour: dry), Music (a compressor that listens to
  the Effects bus, so the score dips under the fighting, and an amplifier `MusicDirector.duck` lowers for a
  moment), Ambience (the same compressor, gentler). The player's volume settings still set Master, Music, Effects
  and Ambience.
- **Positional voices** (`SoundDirector.play_at`): a pool of 24 `AudioStreamPlayer2D`, panning 1.6, heard to
  1400 px, made up by 6 dB so a sound where the hero stands is as loud as one played plainly.
- **Spaces** (`SoundDirector.SPACES`, chosen by `Level.acoustics` from the level data): street, alleys, court,
  walls; each a room size, damping, wet level, pre-delay and high-pass.
- **Ducks**: finisher -9 dB, Art -8 dB, the Captain's roars -8 dB, the hero's death -14 dB.
- **Variation**: each multi-take cue never repeats a take twice running, with a pitch spread (1.03 for voices to
  1.08 for steps) and a level spread (0 to 2 dB), from `variation.json`.

## The QA loop

`sound_sheet.mjs` draws every cue (waveform over a log-frequency spectrogram) and flags what must not ship: a
physical cue still made in code, a blow that starts more than 10 ms late (it would lag what it stands for), a
clip, a sound that ends without fading, a cue whose takes differ by more than 4 dB. The run on 2026-10-10:
239 takes in 73 cues, nothing flagged. Before the pass, 20 physical cues were synthetic tones (the old sheet's
"tonal" flags); the tonal measure is kept in the report, not flagged, because real steel rings and real blows have
strong resonances.

## Listening: what a human ear must check

The tools cannot hear. Play with headphones, then with speakers, and check:

1. **The Market's first fight.** Do Yusuf's cuts whistle, and does each landed blow thud and rattle? Is any take
   comic or too loud next to the others? (A bad take is replaced in `kit.mjs` or dropped from its cue in
   `build_sounds.mjs`.)
2. **A parry and a block.** Is the parry the brightest, most satisfying sound in the game? Is the block a dull wood
   knock, plainly different?
3. **The soldiers' voices.** The voices were cast by measurement, not by ear: do the grunts, cries and shouts
   sound like men in a fight, and nothing like monsters or cartoons? Do the soldiers grunt too often?
4. **Yusuf's voice** when struck, at his death and at the Second Wind's cry: one man, distinct from the soldiers?
5. **Off-screen.** Does an archer's string come from his side? Does a warning come from where the blow is coming?
6. **Each place's room.** Market (short), Streets of Ash (close), Scholars' Quarter (fuller), Last Gate (long and
   late): too much echo anywhere?
7. **The music under a fight** and at a finisher or an Art: does it give way, and come back smoothly, without
   pumping?
8. **The Captain:** his roar at the start, at his second phase and when beaten.
9. **Steps:** stone in the streets, boards on the planks; landing from a height.
10. **Gore off** (reduced): the sever and the cries still fit.

## Where it departs from the prompt, and what is left

- The prompt's repository was not used (unknown code, it would install packages); its method is followed.
- The voices were chosen without listening (pitch, length and level measured); they are the first thing to check.
- The Arts, the warnings and the interface stay synthetic by agreement; the music stays synthesized at 24 kHz.
- The soldiers have no footsteps, and their steps would not know boards from stone.
- The Interface bus is not on the settings screen (it follows Master).
