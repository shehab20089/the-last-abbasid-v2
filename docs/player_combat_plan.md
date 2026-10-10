# Yusuf's combat: more attacks, better animation — plan

**Status (2026-10-09): built and tested; awaiting the user's playtest.** Where the build departs from the plan is
listed at the end.

After the combat overhaul the user asked for *"player combat improvement with much more attacks and better
animations: review, plan, then implement."* This is the review and the plan; PROGRESS.md records what lands.

## Review

**What he has.** A three-cut light string (forehand, rising backhand, thrust) with an ender on the heavy button
after each cut (pommel strike, whirling cut, executioner's cleave), the delayed cut, one heavy cleave (held: the
charge in three levels), the running thrust, the bash, the roll and the rolling cut, two air slashes and the
plunge, knives, the ground stroke, finishers and five Arts. Many are bought or taught; the moves he always has
are few: three cuts, one cleave, one air slash used twice.

**Where the move set is thin.**
1. *The heavy button is one blow.* A second press after the cleave does nothing; there is no heavy string.
2. *Nothing goes low.* A soldier behind a raised round shield is answered only by guard-breakers (the cleave,
   the bash, the pommel, the delayed cut). The soldiers have low sweeps; Yusuf has none.
3. *No way to move a man.* The street is full of fire and the rampart of drops, and nothing he does throws a
   soldier any distance on purpose.
4. *The shield never attacks with the sword.* Holding block is passive; a guardsman fights from behind it.
5. *The parry's riposte is the first cut with more damage:* the payoff of the best defence looks like any cut.
6. *In the air: one slash twice and the plunge.* No second slash, nothing that keeps him up.
7. *On the run: only the heavy thrust.* No quick strike that closes on a fleeing archer or a skirmisher.
8. *A cut on a shield costs nothing.* Light blows into a raised guard spark and the string runs on, so the
   game never asks him to stop hammering a shield.

**Where the animation is thin** (close-up sheets of every move, `scratchpad/preview.mjs`).
1. *The light cuts are arm-only.* The feet stay planted, the hips barely turn, the shield hangs where it was.
2. *Big jumps between keys.* Seven frames a cut: the blade turns 90-120 degrees in a frame (the trail hides
   some of it), and the rising cut reads as raising the sword rather than cutting.
3. *The parry barely moves:* the best defence is the least visible motion.
4. *Air slashes repeat one forehand.*

## The plan

### A. Better animation for the core
Rekey the four blows the player sees most, at 24 fps with 9-11 frames each, keeping their timing to the
blade (first live frame ~0.12 s for a cut, ~0.3 s for the cleave) so the game's feel and the tests hold:
- **Forehand cut:** coil (blade over the shoulder, weight back, shield out), a step with the front foot,
  hips open before the shoulders, the arm fully out at the strike, the shield pulled back to the hip
  (counter-rotation), follow-through past the front knee, settle.
- **Rising backhand:** from the cut's low finish, the weight surges forward onto the front toe and the blade
  climbs low-behind to high-front on a real diagonal, the shield driving forward.
- **Thrust:** the point drawn back at the hip and the body coiled behind the shield, then an explosive lunge
  (back leg straight, front foot far, arm and blade in one line), a hold, a recovery step.
- **Cleave:** a big wind-up with the shield flung back, a step, the blade driving down through the body's
  centre, a deep landing, recovery (the charge still holds on its raised-blade frame).
- **Parry:** a sharp punch of the shield out and up, the sword arm cocked for the riposte.

### B. New attacks (eleven)
| Move | Input | What it is for |
| --- | --- | --- |
| **Kick** (4th light) | J after the thrust | A push kick that throws a man ~70 px back: into fire, off a ledge, out of a crowd. Heavy poise damage. |
| **Low cut** | ↓ + J | A crouching cut at the shins. `low`: it passes under a raised round shield (not a shield wall). J after it is the rising backhand. |
| **Reaping sweep** | ↓ + K | A full turn at shin height: strikes all round, low, and throws men down (then the ground stroke). Taught by a treatise page in the Fallen Market. |
| **Backhand cleave** (2nd heavy) | K after the cleave | A rising horizontal cleave that sends a man reeling. |
| **Hammer blow** (3rd heavy) | K after the backhand cleave | Both hands on the hilt, the whole body behind it: breaks guards and throws a man down. Long recovery. |
| **Running slash** | J on the run | A leaping horizontal cut that closes the gap; the string carries on from it. |
| **Guarded thrust** | J while blocking | A short stab over the shield's rim, the shield still up (frontal blows are still blocked). Fast, cheap, repeatable. |
| **Riposte** | J after a parry or a close call | Its own move: a lunge that reaches the parried man, a thrust to the throat. |
| **Backhand air slash** | J, J in the air | The second air slash is a backhand, not the forehand again. |
| **Down-stab** | ↓ + J in the air | Point down under his feet; striking a man (or his shield) bounces him back up, and the air slashes refresh. |
| **Glance** (a reaction) | — | A light blow on a raised shield glances off: his arm is thrown back for 0.2 s (block or roll out of it). The string stops: go low, break the guard, or bash. |

All but the sweep are his from the start; the move coach names each as its moment comes (the kick after the
thrust, the low cut before a raised shield, K after the cleave, J behind the shield, ↓ + J above a soldier,
J after a parry), the Techniques page shows each performed, and every one has its EN/AR name and how-to.

### C. Systems
- `AttackDefinition.guarded` (the shield stays up through the blow), `bounces` (a hit throws him back up),
  `low` now also matters against soldiers (`MongolSoldier.judge_hit`: a low blow passes a round shield's guard).
- `WarriorProfile`: the four-step `combo`, `heavy_string`, `low_cut`, `sweep`, `running_slash`, `shield_thrust`,
  `riposte_attack`, `air_combo`, `down_stab`, `glance_time`.
- `Warrior`: routing for each input above, the glance (`State.HURT` with its own animation, no damage, no
  invulnerability), the down-stab's bounce, the guarded thrust counted as guarding in `judge_hit`.

### D. Proof
Gameplay tests for every new input and its effect (the kick's distance, the low cut through a guard and not
through a wall, the sweep floors men all round, the heavy string's three steps, the running slash, the guarded
thrust still blocks, the riposte replaces the cut after a parry, the backhand air slash, the down-stab's bounce,
the glance); the whole-string and fairness checks still pass; lint clean on every new animation; captures of
each move in the game's own view.

## Where the build departs from the plan

- The **glance** resolves as the blow gives way, not at its impact, and not at all when a guard-breaker (the pommel,
  the cleave) was already called for: the pommel's whole point is the cut that a guard turned.
- The **kick** has a skip-step that reaches for the man (`seeks`), because the thrust before it knocks him back
  out of a plain kick's reach.
- The **windmill** strikes each time the blade passes (`rehit`), not once at the end.
- **Taught, not given** (after the independent combat review): the second move set is learned two a level by
  lesson triggers (the kick and the low cut in the Fallen Market, the rising cleave and the running slash in the
  Streets of Ash, the guarded thrust and the down-stab in the Scholars' Quarter, the windmill on the gate road);
  until then the buttons make the plain moves. The riposte, the backhand air slash and the glance are his from
  the start.
- Also from the review: every press in a blow's live frames is kept for when it gives way (down held: the low
  cut); a beat after a step of the string the light button carries it on; the running slash and thrust need a
  man ahead; the riposte's force belongs to the riposte alone; the kick is cheaper and never throws a man open
  to a finisher out of reach; the whirling cut and the windmill hit harder for less breath; the running thrust
  breaks guards.
- Blade sweeps behind his back were cut off for every blow; animations marked `allRound` (the sweep, and with it
  the whirling cut and the Storm of Blades) are not, so all three strike men behind him.
