class_name EngineerBrain
extends EnemyBrain
## A siege engineer keeps his distance and lobs pots of burning naphtha: each bursts into fire where
## it lands, so the hero must keep moving. He gives ground when the hero closes in, and cornered he
## throws anyway, at his own feet if he must.

const THROW: int = 0
## Height difference beyond which he will not throw (a lob reaches further up and down than an arrow).
const MAX_DROP: float = 140.0


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
	if (soldier.move_intent == 0.0 or cornered) and distance <= p.attack_ranges[THROW]:
		try_attack(p.attacks[THROW])
