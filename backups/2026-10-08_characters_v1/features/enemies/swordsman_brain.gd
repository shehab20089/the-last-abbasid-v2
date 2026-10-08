class_name SwordsmanBrain
extends EnemyBrain
## The swordsman closes to sword's length and fights there: a heavy, telegraphed downward slash
## from his high guard, a quicker cut when the hero lingers close, and a raised guard against the
## hero's combos that a heavy cleave breaks. After he swings he may give ground a step.

## Attack indices in the profile.
const SLASH: int = 0
const CUT: int = 1


func engage(_delta: float) -> void:
	var p: EnemyProfile = soldier.profile
	var distance: float = distance_to_target()
	soldier.face_toward(target.global_position.x)
	keep_range(p.min_range, p.preferred_range + 8.0, 120.0)
	if target.dead or target.is_invulnerable():
		return
	var choices: Array[int] = attacks_in_range(distance)
	if choices.is_empty():
		return
	var pick: int = choices[0]
	if CUT in choices and (distance < p.preferred_range - 6.0 or rng().randf() < 0.35):
		pick = CUT
	elif SLASH in choices:
		pick = SLASH
	try_attack(p.attacks[pick])
