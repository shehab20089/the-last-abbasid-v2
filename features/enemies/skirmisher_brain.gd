class_name SkirmisherBrain
extends EnemyBrain
## The Kipchak skirmisher hangs at the edge of reach and dashes in: a spring across the street behind a
## rising cut (the knife may follow it at once), and often straight back out. He will not stand to take
## a heavy blow: when the hero winds one up near him (a cleave or its charge, a great ender, an Art) he
## leaps back out of reach, untouchable in the air, if his legs are fresh (EVADE_REST between leaps) and
## the street behind him is clear. Pressed close, he cuts quickly. He has no shield: catch him as his
## dash ends, or as he lands.

## Attack indices in the profile.
const DASH: int = 0
const CUT: int = 1
## Closer than this, the quick cut instead of the dash.
const CLOSE: float = 42.0
## His leap: how far it carries him (for the room it needs), how fast, how long he is in the air.
const EVADE_DISTANCE: float = 56.0
const EVADE_SPEED: float = 330.0
const EVADE_TIME: float = 0.5
## Rest between leaps, and the chance he leaps from a heavy blow wound up within EVADE_RANGE of him.
const EVADE_REST: float = 2.0
const EVADE_CHANCE: float = 0.75
const EVADE_RANGE: float = 80.0
## How often he springs straight back out after his own blow.
const HIT_AND_RUN: float = 0.4

var _evade_rest: float = 0.0
## The hero's swing last weighed (each is weighed once), and the leap he has decided on, a beat late.
var _weighed: int = -1
var _leap_pending: float = -1.0


func _physics_process(delta: float) -> void:
	_evade_rest -= delta
	super._physics_process(delta)


func engage(_delta: float) -> void:
	var p: EnemyProfile = soldier.profile
	soldier.face_toward(target.global_position.x)
	# A heavy blow wound up near him: he decides, and leaps a beat later (he reads, he does not foresee).
	if _heavy_blow_coming() and rng().randf() < EVADE_CHANCE:
		_leap_pending = soldier.profile.reaction_time * rng().randf_range(0.6, 1.1)
	if _leap_pending >= 0.0:
		_leap_pending -= get_physics_process_delta_time()
		if _leap_pending < 0.0 and evade():
			return
	var distance: float = distance_to_target()
	keep_range(p.min_range, p.preferred_range, 150.0)
	if target.dead or target.is_invulnerable():
		return
	var choices: Array[int] = attacks_in_range(distance)
	if choices.is_empty():
		return
	var pick: int = CUT if CUT in choices and distance < CLOSE else DASH
	if not pick in choices:
		return
	if try_attack(p.attacks[pick]) and pick == DASH:
		# The spring is judged to end at sword's length from the hero, wherever he stands.
		soldier.aim_lunge(distance, MongolSoldier.ATTACK_FRICTION)


## He leaps from the hero's charged cleave as it is held.
func answer_charge() -> bool:
	return evade()


## An Art let loose near him: he leaps clear if he can, or gives ground as the others do.
func _on_art_started(art: ArtDefinition) -> void:
	if target != null and not soldier.dead and distance_to_target() < WARY_ART_RANGE and evade():
		return
	super._on_art_started(art)


func after_attack() -> void:
	if follow_up():
		return
	_set_mode(Mode.CHASE)
	if rng().randf() < HIT_AND_RUN and evade():
		return
	if rng().randf() < soldier.profile.retreat_chance:
		retreat(soldier.profile.retreat_time)


## Springs back out of reach if his legs are fresh and the street behind him is clear: true if he did.
func evade() -> bool:
	if _evade_rest > 0.0 or target == null or not soldier.can_act():
		return false
	var away: float = -direction_to_target()
	if away == 0.0 or not can_leap(away, EVADE_DISTANCE):
		return false
	soldier.face_toward(target.global_position.x)
	if not soldier.evade(EVADE_SPEED, EVADE_TIME):
		return false
	_evade_rest = EVADE_REST
	return true


## The hero has just begun a heavy blow near him (one that breaks guards, overwhelms, throws a man
## down, or cuts all round).
func _heavy_blow_coming() -> bool:
	if distance_to_target() > EVADE_RANGE:
		return false
	var swing: AttackDefinition = target.current_attack
	if swing == null or target.attack_serial == _weighed:
		return false
	_weighed = target.attack_serial
	return swing.guard_break or swing.overwhelms or swing.knocks_down or swing.radial or swing.unblockable
