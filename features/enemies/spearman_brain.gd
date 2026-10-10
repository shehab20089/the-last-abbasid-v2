class_name SpearmanBrain
extends EnemyBrain
## The spearman keeps the hero at the length of his spear. He punishes a careless approach with a
## long, telegraphed thrust that leaves him over-extended, closes on a hero who hangs back beyond it with
## a running lunge (the point carried far, glinting long before), and answers a hero who slips inside
## his reach with a low sweep at the legs (jump it or roll through), or by giving ground.

const THRUST: int = 0
const SWEEP: int = 1
const LUNGE: int = 2
## How often he lunges at a hero who stands beyond his thrust but inside the lunge's reach.
const LUNGE_CHANCE: float = 0.45


## A spearman drives his point into a man who stands holding his blow back.
func answer_charge() -> bool:
	var p: EnemyProfile = soldier.profile
	soldier.face_toward(target.global_position.x)
	return THRUST in attacks_in_range(distance_to_target()) and try_attack(p.attacks[THRUST])


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
	elif LUNGE in choices and not THRUST in choices and _cooldown <= 0.0 and rng().randf() < LUNGE_CHANCE:
		try_attack(p.attacks[LUNGE])
