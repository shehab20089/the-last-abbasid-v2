class_name SpearmanBrain
extends EnemyBrain
## The spearman keeps the hero at the length of his spear. He punishes a careless approach with a
## long, telegraphed thrust that leaves him over-extended, and answers a hero who slips inside
## his reach with a low sweep at the legs (jump it or roll through), or by giving ground.

const THRUST: int = 0
const SWEEP: int = 1


func engage(_delta: float) -> void:
	var p: EnemyProfile = soldier.profile
	var distance: float = distance_to_target()
	soldier.face_toward(target.global_position.x)
	keep_range(p.min_range, p.preferred_range + 6.0, 150.0)
	if target.dead:
		return
	var choices: Array[int] = attacks_in_range(distance)
	if choices.is_empty():
		return
	if distance < p.min_range + 6.0 and SWEEP in choices:
		if not try_attack(p.attacks[SWEEP]) and _cooldown > 0.0:
			retreat(0.4)
	elif THRUST in choices and distance > p.min_range - 4.0:
		try_attack(p.attacks[THRUST])
