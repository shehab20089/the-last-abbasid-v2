class_name SwordsmanBrain
extends EnemyBrain
## The swordsman closes to sword's length and fights there: a heavy, telegraphed downward slash
## from his high guard (often followed at once by a quick cut), a quicker cut when the hero lingers
## close, and a raised guard against the hero's combos that a heavy cleave breaks. Now and then he
## feints: the slash wound up and glinting, then broken off behind his shield, and the cut after a beat
## (a parry thrown at the first glint finds nothing). After he swings he may give ground a step.

## Attack indices in the profile.
const SLASH: int = 0
const CUT: int = 1
## How often his slash is a feint, how long he stands behind his shield before the cut, and how long the
## cut waits on the hero coming back in reach before it is forgotten.
const FEINT_CHANCE: float = 0.22
const FEINT_GUARD: float = 0.32
const FEINT_FOLLOW: float = 1.0

var _feinting: bool = false
## Seconds left in which the cut follows his feint.
var _after_feint: float = 0.0


func engage(delta: float) -> void:
	_after_feint = maxf(0.0, _after_feint - delta)
	var p: EnemyProfile = soldier.profile
	var distance: float = distance_to_target()
	soldier.face_toward(target.global_position.x)
	keep_range(p.min_range, p.preferred_range + 8.0, 120.0)
	if target.dead or target.is_invulnerable():
		return
	var choices: Array[int] = attacks_in_range(distance)
	if choices.is_empty():
		return
	# Out of his feint, the cut at once.
	if _after_feint > 0.0 and CUT in choices:
		_after_feint = 0.0
		_cooldown = 0.0
		try_attack(p.attacks[CUT])
		return
	var pick: int = choices[0]
	if CUT in choices and (distance < p.preferred_range - 6.0 or rng().randf() < 0.35):
		pick = CUT
	elif SLASH in choices:
		pick = SLASH
	if try_attack(p.attacks[pick]):
		_feinting = pick == SLASH and rng().randf() < FEINT_CHANCE


## A feint: the slash shown (past its glint), then broken off behind the shield.
func attacking(_delta: float) -> void:
	var swing: AttackDefinition = soldier.current_attack
	if not _feinting or swing == null or swing != soldier.profile.attacks[SLASH]:
		return
	if soldier.sprite.frame > swing.telegraph_frame and soldier.sprite.frame < swing.active_from:
		_feinting = false
		_after_feint = FEINT_FOLLOW + FEINT_GUARD
		_last_attack = null
		soldier.break_off()
		soldier.guard(FEINT_GUARD)
