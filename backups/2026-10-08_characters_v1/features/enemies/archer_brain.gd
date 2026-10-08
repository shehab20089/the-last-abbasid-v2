class_name ArcherBrain
extends EnemyBrain
## The archer keeps his distance and shoots: he draws (the telegraph), looses an arrow that flies
## level and fast, and steps back whenever the hero closes in, until a wall or a ledge stops him.
## Cornered, he still shoots, point blank.

const SHOOT: int = 0
## Height difference beyond which he will not shoot (no clear line).
const MAX_DROP: float = 70.0


func engage(_delta: float) -> void:
	var p: EnemyProfile = soldier.profile
	var distance: float = distance_to_target()
	var toward: float = direction_to_target()
	soldier.face_toward(target.global_position.x)
	var cornered: bool = false
	if distance < p.min_range:
		if can_step(-toward):
			walk(-toward, distance < p.min_range * 0.6)
			soldier.face_toward(target.global_position.x)
		else:
			cornered = true
			stand()
	elif distance > p.preferred_range + 40.0:
		walk(toward, false)
	else:
		stand()
	if target.dead or absf(target.global_position.y - soldier.global_position.y) > MAX_DROP:
		return
	if (soldier.move_intent == 0.0 or cornered) and distance <= p.attack_ranges[SHOOT]:
		try_attack(p.attacks[SHOOT])
