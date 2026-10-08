class_name CaptainBrain
extends EnemyBrain
## Toqto Noyan, captain of a thousand. He fights behind his shield: a three-cut combo he chains as
## the fight wears on, a leaping overhead smash no shield can stop (it glints red: roll), and a
## charge behind his shield that throws any guard aside and cannot be parried. He raises his guard
## against the hero's combos. Below half his strength he roars and fights harder: shorter pauses,
## longer chains, more charges, less guarding.

signal phase_changed(phase: int)
## The fight has begun (his entrance roar).
signal fight_begun

## Attack indices in the profile.
const SLASH_A: int = 0
const SLASH_B: int = 1
const SLASH_C: int = 2
const SMASH: int = 3
const BASH: int = 4
## Fraction of his health below which the second phase begins.
const SECOND_PHASE_AT: float = 0.55
const ROAR_TIME: float = 1.5

## The closest he wants to be to start each attack (the charge needs a run-up).
const MIN_DISTANCE: Array[float] = [0.0, 0.0, 0.0, 40.0, 90.0]

var phase: int = 1
var _chain: Array[int] = []
## The attack he has decided on next, or -1.
var _plan: int = -1
## The second phase began during a stagger or a swing; he roars as soon as he is free to.
var _roar_pending: bool = false


func _ready() -> void:
	super._ready()
	soldier.health_changed.connect(_on_health_changed)


## The arena closes behind the hero: he roars, untouchable, and the fight begins.
func begin_fight() -> void:
	dormant = false
	_acquire_target()
	if target != null:
		soldier.face_toward(target.global_position.x)
	soldier.act(&"roar", ROAR_TIME, true)
	_set_mode(Mode.CHASE)
	_cooldown = ROAR_TIME + 0.5
	fight_begun.emit()


func engage(_delta: float) -> void:
	if _roar_pending:
		_roar_pending = false
		_chain.clear()
		_plan = -1
		soldier.act(&"roar", ROAR_TIME, true)
		_cooldown = ROAR_TIME + 0.3
		phase_changed.emit(2)
		return
	var p: EnemyProfile = soldier.profile
	var distance: float = distance_to_target()
	var toward: float = direction_to_target()
	soldier.face_toward(target.global_position.x)
	if target.dead or _cooldown > 0.0:
		# Between attacks he keeps to his fighting distance.
		keep_range(p.min_range, p.preferred_range + 10.0, 170.0)
		return
	# Once his pause is over he decides on his next attack, then closes in (or gives ground) to
	# the distance it wants and strikes.
	if _plan < 0:
		_plan = _choose(distance)
	var reach: float = p.attack_ranges[_plan]
	var nearest: float = MIN_DISTANCE[_plan]
	if distance > reach:
		walk(toward, distance > 170.0)
	elif distance < nearest:
		walk(-toward, false)
	else:
		stand()
		if try_attack(p.attacks[_plan]):
			if _plan == SLASH_A:
				_chain.clear()
				if phase == 2 or rng().randf() < 0.55:
					_chain.append(SLASH_B)
					if rng().randf() < (0.75 if phase == 2 else 0.35):
						_chain.append(SLASH_C)
			_plan = -1


## His next attack: the charge when the hero keeps his distance, now and then the falling blow,
## otherwise his combo.
func _choose(distance: float) -> int:
	var roll: float = rng().randf()
	if distance > 120.0:
		return BASH if roll < (0.6 if phase == 2 else 0.4) else SLASH_A
	if roll < (0.3 if phase == 2 else 0.2):
		return SMASH
	if phase == 2 and roll < 0.42:
		return BASH
	return SLASH_A


func try_attack(attack: AttackDefinition) -> bool:
	if not super.try_attack(attack):
		return false
	if phase == 2:
		_cooldown *= 0.55
	return true


## A chained cut follows at once, turning to wherever the hero has gone.
func after_attack() -> void:
	if not _chain.is_empty() and soldier.can_act() and target != null and not target.dead:
		var next: int = _chain.pop_front()
		soldier.face_toward(target.global_position.x)
		soldier.attack(soldier.profile.attacks[next])
		return
	_chain.clear()
	super.after_attack()


func block_scale() -> float:
	return 0.4 if phase == 2 else 1.0


func _on_health_changed(current: float, maximum: float) -> void:
	if phase == 1 and current > 0.0 and current <= maximum * SECOND_PHASE_AT:
		phase = 2
		_chain.clear()
		_roar_pending = true
