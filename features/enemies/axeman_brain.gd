class_name AxemanBrain
extends EnemyBrain
## The Georgian axeman fights for the distance. From beyond a sword's reach his hook drags the hero in
## (and tears a raised shield aside: parry it, or roll); a hero who crowds him gets the butt in the chest
## and is driven off; between the two he chops (the blow breaks a guard: parry it or roll, then punish
## the axe stuck in the street; the low sweep may follow it at once) or sweeps low at the shins (amber:
## jump it or roll). A guard held up before him invites the hook.

## Attack indices in the profile.
const CHOP: int = 0
const SWEEP: int = 1
const HOOK: int = 2
const JAB: int = 3
## How often he chooses the chop over the sweep at middle distance.
const CHOP_CHANCE: float = 0.5
## Beyond this the hook; within CROWDED the butt.
const HOOK_FROM: float = 66.0
const CROWDED: float = 34.0
## A raised guard within the hook's reach draws it this often.
const HOOK_GUARD_CHANCE: float = 0.7


func engage(_delta: float) -> void:
	var p: EnemyProfile = soldier.profile
	var distance: float = distance_to_target()
	soldier.face_toward(target.global_position.x)
	keep_range(p.min_range, p.preferred_range + 8.0, 150.0)
	if target.dead or target.is_invulnerable():
		return
	var choices: Array[int] = attacks_in_range(distance)
	if choices.is_empty():
		return
	var pick: int = -1
	if JAB in choices and distance < CROWDED:
		pick = JAB
	elif HOOK in choices and (distance > HOOK_FROM or (target.is_guarding() and rng().randf() < HOOK_GUARD_CHANCE)):
		pick = HOOK
	elif CHOP in choices and (not SWEEP in choices or rng().randf() < CHOP_CHANCE):
		pick = CHOP
	elif SWEEP in choices:
		pick = SWEEP
	if pick >= 0:
		try_attack(p.attacks[pick])
