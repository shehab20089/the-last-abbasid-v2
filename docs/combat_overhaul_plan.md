# Combat overhaul — plan

**Status (2026-10-09): built (A–D) and tested; awaiting the user's playtest.** Where the build departs from the
plan is listed at the end.

After the user's verdict on the build with the reanimated moves and the coach: *"still lacking a lot; the combat
system still needs tons of new improvements and content, much much better animations, good game design, the best
stamina consumption and all of that."* This plan answers it in five parts, built in order. Each part ends with tests
and captures; PROGRESS.md records each as it lands.

## What is wrong now (the designer's audit)

1. **Stamina is flat.** Every action costs a fixed amount, anything above zero lets any action through, and the bar
   only refills by waiting. Skill earns nothing back: a parry, a dodge at the last instant and a string of clean hits
   cost the same breath as flailing. Running dry has no warning and no sound.
2. **Defence has one depth.** The roll and the block work, but nothing rewards doing them *well* except the parry's
   riposte. A roll timed to the last moment is the same as one thrown early.
3. **Hits land on statues.** A soldier has one flinch and one stagger. Nothing is knocked off his feet, nothing reels
   back, a parried man looks the same as a hurt one. The great blows (the charged cleave, the executioner's cleave)
   have no payoff a light cut does not have.
4. **Motion is too plain.** The hero's strikes snap between keys with few in-betweens; the arcs the blade cuts are
   faint grey crescents; fast movement (the roll, the dashes) leaves nothing behind it; the locomotion has no start,
   stop or turn.
5. **Soldiers fight with one move.** Most soldiers have one or two attacks on a cooldown. They do not chain, feint,
   keep distance, close distance, or answer a hero who repeats himself.

## Part A — Breath and the skilled defence

Stamina becomes **breath**: the hero spends it on everything, and earns it back by fighting well.

- **Costs retuned** so a full string and a roll fit in one bar: cuts 8 / 8 / 11, heavy 24, roll 20, bash 10,
  enders 8–20. Regeneration 48/s after a 0.4 s pause (half behind the shield). At zero he is **winded**: 1.1 s
  before it refills, the bar flashes red, he gasps. An action he cannot pay for is refused with a dull knock and a
  flash of the bar (the old rule let any action through on one point of stamina).
- **Momentum**: every blow that lands gives breath back (`AttackDefinition.breath_gain`: 4 a cut, 7 a heavy blow,
  10 a charged one). Fighting well sustains itself; whiffing does not.
- **Steady Breath** (a skill window, after Nioh's ki pulse): as a blow's live frames end, steel glints on the
  hero for 0.16 s; raising the shield in that glint draws breath (+22) and turns the recovery into the guard at
  once. The coach names it until it is used three times.
- **Close Call** (the perfect dodge): a blow that would have landed in the first 0.18 s of a roll is a close call.
  Time slows (0.35x for 0.4 s), he gets +20 breath, a pale after-image trails him, and for 1.1 s his next blow is a
  **counter** (the riposte's damage and stagger).
- **Parry**: +12 breath, a ring of sparks, time held a heartbeat (0.45x for 0.12 s).

## Part B — Weight: blows that move men

- **Knockdown**: the great blows (`AttackDefinition.knocks_down`: the charged cleave II and III, the executioner's
  cleave, the plunge, the Storm's last blow, a guard broken by the bash on a man out of poise) throw a soldier off
  his feet: he falls (`knockdown`), lies (1.1 s), and gets up (`getup`, untouchable as he rises). Not the Captain,
  not a mace-bearer.
- **The ground stroke**: a man on the ground can be finished with the heavy button: the blade driven down into him
  (`finish_ground` / `finished_ground`, a finisher like the others, frame-locked).
- **Reactions**: a second flinch (`hurt_b`, the head snapped back) so a string does not repeat one pose; a parried
  man thrown open (`parried`: arm flung up, off balance) for the riposte window; a heavy blow that does not knock him
  down makes him **reel** back two steps (`reel`).
- **Into the fire, off the edge**: a man knocked into burning ground burns; a man knocked off a ledge falls (the
  brains still never *walk* off one).
- **The hero takes weight too**: an unblockable or overwhelming blow knocks him down (`knockdown`, `getup`): he
  can roll out of it after 0.3 s; his invulnerability covers the getting up.

## Part C — Motion

- **Trails**: two-tone crescents (a hot core along the leading edge, a cool afterglow), thicker, fading over
  0.16 s; heavy blows gold, Arts amber, unblockable red, a bloody blade dark red.
- **After-images**: the roll, the dashes (running thrust, Piercing Line), the plunge and a close call leave fading
  copies of the hero behind him.
- **In-betweens**: a timeline helper (`timeline()` in `yusuf_animations.mjs`: key poses with holds and eases) that
  adds in-between frames where the body travels far, so wind-ups ease in, strikes snap, follow-throughs ease out.
  The light string, the heavy cleave, the roll, the jump and the landing are rebuilt on it (attack frame data
  follows).
- **Locomotion**: a run that starts with a lean (`run_start`), stops with a skid (`skid`), and turns with a pivot
  (`turn`).
- **Hit feel**: the camera kicks in the blow's direction; hit-stop tiers by weight; the struck man's hit flash
  holds through the stop.

## Part D — Soldiers who fight

- **Swordsman**: a two-blow chain (cut, then backhand), a feint (wind-up, then guard: punishes a panic parry).
- **Spearman**: a charge from range (a running thrust, white) and he keeps his distance.
- **Archer**: a close-range kick that knocks the hero back, then a step back to shoot.
- **Mace-bearer**: a three-blow chain (swing, swing, smash), relentless and slow.
- **Veteran**: parries a hero who cuts into his raised guard three times running, and ripostes.
- **New: the Kipchak skirmisher** — light, fast, two knives: a dash-in double stab, a back-flip out, sidesteps
  heavy blows. Teaches patience and the parry.
- **New: the Georgian axeman** — a great two-handed axe, unflinching on his swings, a hooking pull that tears a
  guard open, a sweeping turn (amber, low). Teaches reading big wind-ups.
- Encounters in the levels use them (each fight still asks its own question).

## Part E — Balance and proof

- Tests: breath (costs, momentum, refusal, winded), steady breath (window, gain, cancel into guard), close call
  (window, slow, counter), knockdown (who falls, getting up, the ground stroke), the hero knocked down, soldiers'
  new attacks keep the fairness rules (telegraphs, two attackers), time to kill per level.
- Captures: a combat reel (`tests/capture_combat.gd`) of every new piece.

## Order

A (breath, close call, parry) → B (knockdown, ground stroke, reactions, hazards) → C (trails, after-images,
in-betweens, locomotion) → D (soldiers) → E (balance) — each landing whole, tested, with its captures.

## Where the build departs from the plan

- **A.** Steady Breath gives 20 breath (not 22). The parry's held time is 0.45x for 0.28 s.
- **B.** The Storm's last blow and a bash on a man out of poise do not throw men down; the Judgment's blow
  (`judgment_blow`) does. A man thrown down is finished with the ground stroke (`ground_stab`, a plain blow) or,
  wounded to half, the Pinned finisher. "Into the fire": the soldiers' own naphtha burns a soldier the hero throws
  into it (one reeling, staggered or down), not one who walks in. The hero is thrown down by the blows that
  `knocks_down` (the mace-bearer's and the Captain's smashes, the axeman's chop), not by every unblockable blow.
- **C.** No `timeline()` helper: the moves were rekeyed by hand with in-betweens where the lint asked for them
  (the earlier reanimation pass rebuilt the string, the cleave and the new moves). Trails skip a band a blade
  drawn back along itself folds over (the axeman's hook) instead of failing to fill it.
- **D.** The mace-bearer's chain is swing then swing (50%), not swing, swing, smash. The veteran parries the third
  blow of a string (`parries_after` 2), not the fourth. The **skirmisher** carries a short sabre and a long knife
  (not two knives) and leaps back (a back-flip's long coat read as a tumbling sack at 80 px); his dash cut comes
  with a chained knife thrust and a quick cut close in, and he does not sidestep; his question is "quick cuts, not
  cleaves" (he leaps from heavy blows, the charge and the Arts). The **axeman** is not unflinching (his chop has
  super armour; light blows hurt him, his poise is high); his hook pulls and breaks a guard, and he has a butt
  strike for a hero who crowds him (fairness: the hero's post-hit invulnerability means no blow can be chained onto
  a hook that lands, so the hook sets up distance instead of a combo).
- **E.** Time to kill per level is the M4 test (an early swordsman 70 frames, a Last Gate one 84); no new
  time-to-kill table for the new soldiers.
- **After the independent review** (PROGRESS.md has the whole list): the axeman's chop no longer throws a man
  down (it breaks a guard, and the low sweep may follow it at once); soldiers' poise builds blow on blow, two
  flinches close together steel a man a moment, a stagger is neither ended nor stretched by a blow, and guards
  come up a beat after a swing is seen (`reaction_time`); only blows near the hero count against the two
  attackers, the rest wait a step off; breath is paid in full or the action refused (the roll needs a breath),
  and Steady Breath follows only a blow that met a man.
