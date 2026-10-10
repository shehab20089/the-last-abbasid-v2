class_name VeteranBrain
extends SwordsmanBrain
## A veteran of the khan's guard, masked, a white plume: he fights as the swordsman does, but his
## quick cut is most often the first of two. The second, a rising backhand, comes after a held beat,
## so a shield raised in a panic for the first is down again, or not yet up, when the second lands.

## The backhand that follows the quick cut (an index in the profile; never chosen on its own).
const CUT_B: int = 2
## How often his quick cut is followed by the backhand.
const CHAIN_CHANCE: float = 0.8

var _chain: bool = false


func try_attack(attack: AttackDefinition) -> bool:
	if not super.try_attack(attack):
		return false
	_chain = attack == soldier.profile.attacks[CUT] and rng().randf() < CHAIN_CHANCE
	return true


## A veteran knows a held blow when he sees one: he steps back out of its reach.
func answer_charge() -> bool:
	retreat(0.6)
	return true


## The backhand follows at once, turned on wherever the hero has gone.
func after_attack() -> void:
	if _chain and soldier.can_act() and target != null and not target.dead:
		_chain = false
		soldier.face_toward(target.global_position.x)
		soldier.attack(soldier.profile.attacks[CUT_B])
		return
	_chain = false
	super.after_attack()
