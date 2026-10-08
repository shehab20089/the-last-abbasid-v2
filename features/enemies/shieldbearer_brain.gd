class_name ShieldbearerBrain
extends EnemyBrain
## A Georgian shield-bearer comes on behind his tall shield, a step at a time, never running. His
## shield turns every blow from the front (his profile's shield wall), the heavy cleave too; he jabs
## over its rim, and shoves a man who crowds him. Under its weight he turns slowly: a hero who gets
## behind him has a moment at his back. The shield bash or a plunge from above breaks the wall.

## Attack indices in the profile.
const JAB: int = 0
const SHOVE: int = 1
## Seconds he takes to turn to a hero behind him.
const TURN_TIME: float = 0.6

var _behind_time: float = 0.0


func engage(delta: float) -> void:
	var p: EnemyProfile = soldier.profile
	_turn_slowly(delta)
	var toward: float = direction_to_target()
	if toward != soldier.facing:
		# Turning under the shield's weight: he stands.
		stand()
		return
	var distance: float = distance_to_target()
	keep_range(p.min_range, p.preferred_range + 6.0, INF)
	if target.dead:
		return
	var choices: Array[int] = attacks_in_range(distance)
	if choices.is_empty():
		return
	if SHOVE in choices and distance < p.min_range + 10.0:
		try_attack(p.attacks[SHOVE])
	elif JAB in choices:
		try_attack(p.attacks[JAB])


func _turn_slowly(delta: float) -> void:
	if (target.global_position.x - soldier.global_position.x) * soldier.facing >= 0.0:
		_behind_time = 0.0
		return
	_behind_time += delta
	if _behind_time >= TURN_TIME:
		_behind_time = 0.0
		soldier.face_toward(target.global_position.x)


## Behind his shield he is always on guard: he never raises it the way a swordsman does.
func guarding(_delta: float) -> void:
	pass
