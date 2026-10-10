class_name ArcherBrain
extends EnemyBrain
## The archer keeps his distance and shoots: he draws (the telegraph), looses an arrow that flies
## level and fast, and steps back whenever the hero closes in, until a wall or a ledge stops him. A man
## who gets right up to him is kicked away (a push kick that glints first), and he backs off to shoot.
## Cornered, he still shoots, point blank.

const SHOOT: int = 0
const KICK: int = 1
## How near the hero must be for the kick.
const KICK_RANGE: float = 38.0
## Height difference beyond which he will not shoot (no clear line). From a roof he shoots down.
const MAX_DROP: float = 150.0


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
	if distance < KICK_RANGE and p.attacks.size() > KICK and try_attack(p.attacks[KICK]):
		return
	if (soldier.move_intent == 0.0 or cornered) and distance <= p.attack_ranges[SHOOT]:
		try_attack(p.attacks[SHOOT])
