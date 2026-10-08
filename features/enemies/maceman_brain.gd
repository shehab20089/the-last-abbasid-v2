class_name MacemanBrain
extends EnemyBrain
## The mace-bearer walks in under his armour; light blows do not stop him (his profile is
## unflinching). Close in, he sweeps; given a moment he raises the mace for the overhead blow, which
## breaks a raised shield: parry it, or roll, and punish the long moment it takes him to recover.

## Attack indices in the profile.
const SMASH: int = 0
const SWING: int = 1
## How often he chooses the overhead blow when both are in reach.
const SMASH_CHANCE: float = 0.55


func engage(_delta: float) -> void:
	var p: EnemyProfile = soldier.profile
	var distance: float = distance_to_target()
	soldier.face_toward(target.global_position.x)
	keep_range(p.min_range, p.preferred_range + 8.0, 140.0)
	if target.dead or target.is_invulnerable():
		return
	var choices: Array[int] = attacks_in_range(distance)
	if choices.is_empty():
		return
	var pick: int = SWING
	if SMASH in choices and (not SWING in choices or rng().randf() < SMASH_CHANCE):
		pick = SMASH
	try_attack(p.attacks[pick])
