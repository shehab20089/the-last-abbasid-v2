class_name EnemyBrain
extends Node
## Decides what a soldier does: keeps watch, patrols or goes about a task (looting, burning books),
## notices the hero, raises the alarm, closes in, strikes, guards and gives ground. A finite state machine over its parent MongolSoldier, which carries
## out each order. Subclasses decide how to fight (engage); the senses, the patrol, the chase and
## the fairness rules are shared:
## - at most MAX_ATTACKERS soldiers swing at the hero at once;
## - every attack has a wind-up (its telegraph) and a cooldown before the next;
## - a soldier never walks off a ledge or into a wall.

signal mode_changed(mode: Mode)
## The soldier noticed the hero.
signal alerted

enum Mode {IDLE, PATROL, ALERT, CHASE, ATTACK, BLOCK, STAGGER, RETREAT, DEAD}

const MAX_ATTACKERS: int = 2
## Only a comrade this near the hero (px) counts against MAX_ATTACKERS (an archer drawing far off does not).
const ATTACKER_REACH: float = 140.0
## While the attackers' places are taken, the others wait this far off (px), ready to step in.
const WAIT_NEAR: float = 64.0
const WAIT_FAR: float = 84.0
## A blade reaches a man no further above or below than this (px): none is swung at a hero on a ledge.
const MELEE_HEIGHT: float = 40.0
## Seconds after the hero is hit during which no soldier starts a new attack on him.
const BREATHER: float = 0.75
## Seconds after a parried or guarded swing before a soldier counts the hero's next as part of a
## combo it can read.
const COMBO_MEMORY: float = 1.4
## Pixels of give at the edge of a soldier's preferred range, so he does not dither there.
const RANGE_SLACK: float = 8.0
## A soldier busy with a task sees and hears this much less (lost in his plunder, he hears almost
## nothing behind him).
const BUSY_SIGHT: float = 0.5
const BUSY_HEARING: float = 0.25
## A shout carries this far: comrades within it join the fight.
const ALARM_RADIUS: float = 210.0
## At an execution: from the moment the hero is near enough to see it, this long to stop it.
const EXECUTION_DELAY: float = 2.2
const EXECUTION_SIGHT: float = 300.0
## Seconds a soldier who has just noticed the hero is still startled, not yet turned: a blow then
## still takes him unawares. Longer for one who was busy with a task.
const SURPRISE_GRACE: float = 0.2
const SURPRISE_GRACE_BUSY: float = 0.45
## Seconds a soldier behind his shield takes to turn to a hero who has got round him: rolling past a
## raised guard finds his back.
const GUARD_TURN: float = 0.5
## A soldier caught twice by a cut all round (a whirl) keeps out of its reach for a while; so do those
## near the hero when he lets an Art loose. How far he keeps, and for how long.
const WARY_RANGE: float = 96.0
const WARY_TIME: float = 2.5
const WARY_ART_TIME: float = 1.2
const WARY_ART_RANGE: float = 150.0
## A hero holding a cleave back this near is answered (a veteran steps back, a spearman thrusts).
const CHARGE_ANSWER_RANGE: float = 110.0

@export var start_mode: Mode = Mode.PATROL
## A dormant soldier notices nothing until woken (an ambush, a story beat).
@export var dormant: bool = false
## Seed for this soldier's choices, so a fight plays the same way each time it is tested.
@export var seed_value: int = 0

var soldier: MongolSoldier
var target: Warrior
var mode: Mode = Mode.IDLE
var _timer: float = 0.0
var _cooldown: float = 0.6
## 0 until the patrol starts, then the way it heads (+1 right, -1 left).
var _patrol_dir: float = 0.0
var _patrol_pause: float = 0.0
var _seen_attack: AttackDefinition
var _last_swing_time: float = -10.0
var _clock: float = 0.0
var _guard_pending: float = -1.0
var _patrol_distance: float = 0.0
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()
var _closing: bool = false
## The task he is busy with until he notices the hero (an animation name), or none.
var activity: StringName = &""
## How long he stays startled once he has noticed the hero (see SURPRISE_GRACE).
var _startle: float = SURPRISE_GRACE
## Counting down to the stroke once the hero can see an execution (-1 before).
var _execution: float = -1.0
## The stroke has fallen; he turns to the hero once it is done.
var _executed: bool = false
## A sprung ambusher: he follows the hero however far he goes.
var _relentless: bool = false
## How long the hero has been behind him while his guard is up.
var _behind: float = 0.0
## Seconds left keeping out of the hero's reach, and cuts all round taken in this fight.
var _wary: float = 0.0
var _whirled: int = 0


## The blow he last began (its follow-up may come at once).
var _last_attack: AttackDefinition
## The hero's last swing this soldier has weighed (Combatant.attack_serial).
var _seen_serial: int = -1


func _ready() -> void:
	soldier = get_parent() as MongolSoldier
	_rng.seed = seed_value if seed_value != 0 else hash(String(soldier.name))
	# A level may set these per soldier through metadata (an ambush, a longer patrol).
	if soldier.has_meta(&"dormant"):
		dormant = soldier.get_meta(&"dormant")
	_patrol_distance = soldier.get_meta(&"patrol", soldier.profile.patrol_distance)
	activity = soldier.get_meta(&"activity", &"")
	mode = start_mode
	_go_about_business()
	soldier.surprised.connect(_raise_alarm)
	soldier.struck.connect(_on_struck)
	soldier.parried_blow.connect(_on_parried_blow)


## A soldier who has not seen the hero: busy at his task if he has one, and open to a first strike.
func _go_about_business() -> void:
	# A dormant group's ambushers are ready for him; a man busy at his task in plain sight has not seen him.
	soldier.unaware = not dormant or _at_work_in_sight()
	if activity != &"":
		soldier.rest_animation = activity


## An execution's count, for the eye: the share of its time left (1 as it starts, 0 at the stroke), or -1 while
## none runs (not begun, stopped, or done).
func execution_left() -> float:
	if _execution < 0.0 or _executed or activity != &"execute" or soldier.dead:
		return -1.0
	var total: float = soldier.get_meta(&"delay", EXECUTION_DELAY)
	return clampf(_execution / maxf(total, 0.01), 0.0, 1.0)


## An execution: once the hero is near enough to see it the count begins, and when it runs out the
## stroke falls, unless the hero has stopped him first. True once the stroke has begun.
func _tend_execution(delta: float) -> bool:
	if _execution < 0.0:
		if target != null and not target.dead:
			var offset: Vector2 = target.global_position - soldier.global_position
			if absf(offset.x) <= EXECUTION_SIGHT and absf(offset.y) <= soldier.profile.sight_height:
				_execution = soldier.get_meta(&"delay", EXECUTION_DELAY)
		return false
	_execution -= delta
	if _execution > 0.0 or not soldier.can_act():
		return false
	end_activity()
	_executed = true
	soldier.execute()
	return true


## Done with his task (the captive he was to kill is dead or gone): back to plain guard.
func end_activity() -> void:
	activity = &""
	soldier.rest_animation = &"idle"


## A comrade's shout: a soldier still about his business turns to the fight (all but a headsman,
## who finishes his work first).
func hear_alarm() -> void:
	if (dormant and not _at_work_in_sight()) or soldier.dead or (mode != Mode.IDLE and mode != Mode.PATROL) or activity == &"execute":
		return
	_acquire_target()
	if target != null and not target.dead:
		_alert()


## A man of a dormant group busy at a task in plain sight (the library's looters): he waits for the group's
## trigger like the rest, but sees, hears and is taken unawares as any busy soldier does. Hidden ambushers and those
## with no task wait blind until they are sprung.
func _at_work_in_sight() -> bool:
	return activity != &"" and not soldier.get_meta(&"hidden", false)


## Lets a dormant soldier notice the hero (an ambush springs). Once sprung, he does not give up the
## chase, so the fight always comes to its end.
func wake(alert_now: bool = false) -> void:
	dormant = false
	_relentless = true
	if alert_now and mode != Mode.DEAD:
		_acquire_target()
		if target != null:
			_alert()


func _physics_process(delta: float) -> void:
	if soldier == null:
		return
	_clock += delta
	if soldier.dead:
		_set_mode(Mode.DEAD)
		return
	_cooldown -= delta
	_timer -= delta
	_wary -= delta
	_acquire_target()
	match soldier.state:
		MongolSoldier.State.STAGGER, MongolSoldier.State.HURT, MongolSoldier.State.DOWN:
			_set_mode(Mode.STAGGER)
			return
		MongolSoldier.State.ATTACK:
			_set_mode(Mode.ATTACK)
			attacking(delta)
			return
		MongolSoldier.State.GUARD:
			_set_mode(Mode.BLOCK)
			guarding(delta)
			return
		MongolSoldier.State.ACTING:
			return
	if mode == Mode.ATTACK:
		after_attack()
	elif mode == Mode.STAGGER or mode == Mode.BLOCK:
		_set_mode(Mode.CHASE)
	match mode:
		Mode.IDLE, Mode.PATROL:
			if _executed:
				# The stroke done, he turns on the hero he heard coming.
				_executed = false
				if target != null and not target.dead:
					soldier.unaware = false
					_alert()
				return
			if activity == &"execute" and soldier.unaware and _tend_execution(delta):
				return
			# Look first: a patrol step turns him, and he should see what was before him.
			if _notices():
				_alert()
			elif mode == Mode.PATROL:
				_patrol(delta)
			else:
				soldier.move_intent = 0.0
		Mode.ALERT:
			if target == null:
				_give_up()
				return
			soldier.move_intent = 0.0
			# Startled, he takes a moment before he turns: a blow then still finds him unaware.
			if not soldier.unaware or _timer < soldier.profile.alert_time - _startle:
				soldier.unaware = false
				soldier.face_toward(target.global_position.x)
			if _timer <= 0.0:
				_set_mode(Mode.CHASE)
		Mode.CHASE:
			if not _target_in_play():
				_give_up()
			elif _wary > 0.0:
				_keep_clear()
			elif _charging_near() and answer_charge():
				pass
			else:
				_watch_for_swings()
				engage(delta)
		Mode.RETREAT:
			if not _target_in_play():
				_give_up()
			else:
				soldier.face_toward(target.global_position.x)
				walk(-signf(target.global_position.x - soldier.global_position.x), false)
				soldier.face_toward(target.global_position.x)
				if _timer <= 0.0:
					_set_mode(Mode.CHASE)


# --- For subclasses -----------------------------------------------------------------------------

## How this soldier fights once he has seen the hero.
func engage(_delta: float) -> void:
	pass


## Called each step while the guard is up. Behind his shield he turns slowly (GUARD_TURN). A cut
## after a beat (a feint) catches him: he takes the string for over and lowers his shield as it comes.
func guarding(delta: float) -> void:
	if target == null:
		return
	var swing: AttackDefinition = target.current_attack
	if (swing != null and swing.feint and target.attack_serial != _seen_serial
			and distance_to_target() < soldier.profile.preferred_range + 46.0):
		_seen_serial = target.attack_serial
		_seen_attack = swing
		soldier.release_guard()
		return
	if (target.global_position.x - soldier.global_position.x) * soldier.facing >= 0.0:
		_behind = 0.0
		return
	_behind += delta
	if _behind >= GUARD_TURN:
		_behind = 0.0
		soldier.face_toward(target.global_position.x)


## Scales the chance of raising his guard (a boss guards less as he grows desperate).
func block_scale() -> float:
	return 1.0


## The hero holds a cleave back near him: true if this soldier answered it (he decides how).
func answer_charge() -> bool:
	return false


func _charging_near() -> bool:
	return target != null and target.state == Warrior.State.CHARGE and distance_to_target() < CHARGE_ANSWER_RANGE


## Out of the hero's reach: he backs off, facing him, and waits.
func _keep_clear() -> void:
	soldier.face_toward(target.global_position.x)
	if distance_to_target() < WARY_RANGE:
		walk(-direction_to_target(), false)
		soldier.face_toward(target.global_position.x)
	else:
		stand()


## A cut all round him a second time in this fight: he keeps out of its reach a while.
func _on_struck(hit: HitData, outcome: HitData.Outcome) -> void:
	if hit.attack == null or not hit.attack.radial or outcome != HitData.Outcome.HIT:
		return
	_whirled += 1
	if _whirled >= 2:
		_whirled = 0
		_wary = WARY_TIME


## The hero lets an Art loose: those near him and in the fight give ground.
func _on_art_started(_art: ArtDefinition) -> void:
	if soldier.dead or mode == Mode.IDLE or mode == Mode.PATROL or target == null:
		return
	if distance_to_target() < WARY_ART_RANGE:
		_wary = maxf(_wary, WARY_ART_TIME)


## He beat the hero's blade aside: a riposte at once, with his quickest blow (it glints as it always does).
func _on_parried_blow() -> void:
	var answer: AttackDefinition = soldier.profile.riposte
	if target == null or target.dead or answer == null:
		return
	_cooldown = 0.0
	soldier.face_toward(target.global_position.x)
	if soldier.attack(answer):
		_last_attack = answer


## Called each step while he swings (a feint is broken off here).
func attacking(_delta: float) -> void:
	pass


## The blow that may follow the one just thrown, at once (its chained follow-up): true if it began.
func follow_up() -> bool:
	var last: AttackDefinition = _last_attack
	_last_attack = null
	if last == null or last.follow_up == null or _rng.randf() >= last.follow_chance:
		return false
	if not soldier.can_act() or target == null or target.dead:
		return false
	soldier.face_toward(target.global_position.x)
	if soldier.attack(last.follow_up):
		_last_attack = last.follow_up
		return true
	return false


## Called once when an attack of his ends.
func after_attack() -> void:
	if follow_up():
		return
	_set_mode(Mode.CHASE)
	if _rng.randf() < soldier.profile.retreat_chance:
		retreat(soldier.profile.retreat_time)


func retreat(seconds: float) -> void:
	_timer = seconds
	_set_mode(Mode.RETREAT)


## Moves toward `direction` unless a ledge or a wall is in the way.
func walk(direction: float, run: bool) -> void:
	soldier.running = run
	if direction != 0.0 and not can_step(direction):
		soldier.move_intent = 0.0
		return
	soldier.move_intent = direction


func stand() -> void:
	soldier.move_intent = 0.0
	soldier.running = false


## Steps to keep the target between `near` and `far`: closes in when he is beyond `far` and keeps
## coming until he is within it by a margin, so the soldier does not stutter at the boundary.
func keep_range(near: float, far: float, run_beyond: float) -> void:
	# While two comrades are at the hero, he waits a step off rather than crowd in (and steps in when one
	# is done).
	if _waiting():
		near = maxf(near, WAIT_NEAR)
		far = maxf(far, WAIT_FAR)
	var distance: float = distance_to_target()
	var toward: float = direction_to_target()
	if distance > far + (0.0 if _closing else RANGE_SLACK):
		_closing = true
		walk(toward, distance > run_beyond)
	elif distance < near:
		_closing = false
		walk(-toward, false)
	else:
		if distance < far - RANGE_SLACK:
			_closing = false
		if _closing:
			walk(toward, false)
		else:
			stand()


## True when the floor continues a step ahead, no wall blocks the way and no fire burns there (a man
## already standing in fire may walk out of it).
func can_step(direction: float) -> bool:
	var space: PhysicsDirectSpaceState2D = soldier.get_world_2d().direct_space_state
	var ahead: Vector2 = soldier.global_position + Vector2(direction * 16.0, -6.0)
	for node: Node in soldier.get_tree().get_nodes_in_group(&"hazards"):
		var fire: BurningGround = node as BurningGround
		if fire != null and fire.covers(ahead) and not fire.covers(soldier.global_position + Vector2(0.0, -6.0)):
			return false
	var floor_query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(
		ahead, ahead + Vector2(0, 30), 1)
	if space.intersect_ray(floor_query).is_empty():
		return false
	var wall_query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(
		soldier.global_position + Vector2(0, -20), soldier.global_position + Vector2(direction * 14.0, -20), 1)
	return space.intersect_ray(wall_query).is_empty()


## True when the floor runs on and no wall stands for `distance` px toward `direction` (room for a leap).
func can_leap(direction: float, distance: float) -> bool:
	var space: PhysicsDirectSpaceState2D = soldier.get_world_2d().direct_space_state
	var step: float = 16.0
	while step <= distance + 0.1:
		var ahead: Vector2 = soldier.global_position + Vector2(direction * step, -6.0)
		if space.intersect_ray(PhysicsRayQueryParameters2D.create(ahead, ahead + Vector2(0, 30), 1)).is_empty():
			return false
		step += 16.0
	var wall_query: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(
		soldier.global_position + Vector2(0, -20), soldier.global_position + Vector2(direction * distance, -20), 1)
	return space.intersect_ray(wall_query).is_empty()


## Starts `attack` if few enough comrades are already swinging, the hero is open to it, and (a blade)
## he stands level enough to be reached; a blow that reaches for a man (`seeks`) is aimed at him.
func try_attack(attack: AttackDefinition) -> bool:
	if _cooldown > 0.0 or not _may_attack():
		return false
	if target != null and (target.is_invulnerable() or target.recently_hurt(BREATHER)):
		return false
	if (target != null and attack.projectile_frame < 0
			and absf(target.global_position.y - soldier.global_position.y) > MELEE_HEIGHT):
		return false
	if soldier.attack(attack):
		var p: EnemyProfile = soldier.profile
		_cooldown = _rng.randf_range(p.attack_cooldown.x, p.attack_cooldown.y) / soldier.aggression
		_last_attack = attack
		if target != null:
			soldier.aim_lunge(distance_to_target(), MongolSoldier.ATTACK_FRICTION)
		return true
	return false


## Whether he could start a blow now (he is free to act at all).
func can_attack_now() -> bool:
	return soldier.can_act()


func distance_to_target() -> float:
	return absf(target.global_position.x - soldier.global_position.x)


func direction_to_target() -> float:
	return signf(target.global_position.x - soldier.global_position.x)


## The attacks (with their index) whose range covers `distance`.
func attacks_in_range(distance: float) -> Array[int]:
	var p: EnemyProfile = soldier.profile
	var choices: Array[int] = []
	for i: int in p.attacks.size():
		var reach: float = p.attack_ranges[i] if i < p.attack_ranges.size() else p.preferred_range + 10.0
		if distance <= reach:
			choices.append(i)
	return choices


func rng() -> RandomNumberGenerator:
	return _rng


# --- Senses and the shared modes ---------------------------------------------------------------

func _acquire_target() -> void:
	if target == null or not is_instance_valid(target):
		target = soldier.get_tree().get_first_node_in_group(&"player") as Warrior
		if target != null and not target.art_started.is_connected(_on_art_started):
			target.art_started.connect(_on_art_started)


func _notices() -> bool:
	if (dormant and not _at_work_in_sight()) or target == null or target.dead:
		return false
	var p: EnemyProfile = soldier.profile
	var offset: Vector2 = target.global_position - soldier.global_position
	if absf(offset.y) > p.sight_height:
		return false
	var ahead: bool = offset.x * soldier.facing >= 0.0
	# A sentry on watch is about his business too, but his business is looking.
	var busy: bool = soldier.unaware and activity != &"" and activity != &"watch"
	var sight: float = p.sight_range * (BUSY_SIGHT if busy else 1.0)
	# A hero who has learned to step quietly is heard less still by one busy at his plunder.
	var hearing: float = p.hearing_range * (BUSY_HEARING * target.mods.hearing if busy else 1.0)
	return (ahead and absf(offset.x) <= sight) or absf(offset.x) <= hearing


func _target_in_play() -> bool:
	if target == null or target.dead:
		return false
	var offset: Vector2 = target.global_position - soldier.global_position
	if _relentless:
		return absf(offset.y) <= soldier.profile.sight_height * 2.0
	return absf(offset.x) <= soldier.profile.lose_range and absf(offset.y) <= soldier.profile.sight_height * 2.0


func _alert() -> void:
	_timer = soldier.profile.alert_time
	_startle = (SURPRISE_GRACE_BUSY if activity != &"" and activity != &"watch" else SURPRISE_GRACE) + target.mods.startle
	soldier.rest_animation = &"idle"
	# One who sees the hero before him knows him at once; one who hears him behind is startled first.
	if (target.global_position.x - soldier.global_position.x) * soldier.facing >= 0.0:
		soldier.unaware = false
	if not soldier.unaware:
		soldier.face_toward(target.global_position.x)
	soldier.play_action(&"alert")
	_set_mode(Mode.ALERT)
	alerted.emit()
	_raise_alarm()


## Calls the comrades within earshot into the fight.
func _raise_alarm() -> void:
	for node: Node in soldier.get_tree().get_nodes_in_group(&"enemies"):
		var other: MongolSoldier = node as MongolSoldier
		if other == null or other == soldier or other.dead:
			continue
		var offset: Vector2 = other.global_position - soldier.global_position
		if absf(offset.x) > ALARM_RADIUS or absf(offset.y) > 64.0:
			continue
		var brain: EnemyBrain = other.get_node_or_null(^"Brain") as EnemyBrain
		if brain != null:
			brain.hear_alarm()


func _give_up() -> void:
	stand()
	_set_mode(Mode.PATROL)


func _patrol(delta: float) -> void:
	var p: EnemyProfile = soldier.profile
	# A soldier at his task stays at it.
	if _patrol_distance <= 0.0 or (soldier.unaware and activity != &""):
		stand()
		return
	if _patrol_pause > 0.0:
		_patrol_pause -= delta
		stand()
		return
	if _patrol_dir == 0.0:
		_patrol_dir = soldier.facing
	var offset: float = soldier.global_position.x - soldier.spawn_point.x
	if (offset > _patrol_distance and _patrol_dir > 0.0) or (offset < -_patrol_distance and _patrol_dir < 0.0):
		_patrol_dir = -_patrol_dir
		_patrol_pause = p.patrol_pause
		stand()
		return
	if not can_step(_patrol_dir):
		_patrol_dir = -_patrol_dir
		_patrol_pause = p.patrol_pause
		stand()
		return
	soldier.face_toward(soldier.global_position.x + _patrol_dir)
	walk(_patrol_dir, false)


## Raises the guard against the hero's swings, more readily once he has seen a combo begin.
func _watch_for_swings() -> void:
	var p: EnemyProfile = soldier.profile
	# A soldier set to hold a guard (a gate's sentries) raises his shield more readily.
	var guard_chance: float = soldier.get_meta(&"guard_chance", p.block_chance)
	if guard_chance <= 0.0 or target == null:
		return
	var swing: AttackDefinition = target.current_attack
	if swing != null and target.attack_serial != _seen_serial:
		_seen_serial = target.attack_serial
		_seen_attack = swing
		# A cut after a beat is misread: he does not raise his shield against it.
		if not swing.feint and distance_to_target() < p.preferred_range + 46.0:
			var chained: bool = _clock - _last_swing_time < COMBO_MEMORY
			_last_swing_time = _clock
			var chance: float = (guard_chance if chained else guard_chance * 0.45) * block_scale() * soldier.aggression
			if _rng.randf() < chance:
				# He answers what he sees, a beat late: quicker once a string has begun.
				_guard_pending = p.reaction_time * _rng.randf_range(0.8, 1.25) * (0.6 if chained else 1.0)
	if _guard_pending >= 0.0:
		_guard_pending -= get_physics_process_delta_time()
		if _guard_pending < 0.0 and soldier.can_act():
			soldier.face_toward(target.global_position.x)
			soldier.guard(p.block_time)


## Few enough comrades are swinging at the hero: only blows that can reach him count (a man near him
## winding up), not a shot drawn far off or a fight elsewhere.
func _may_attack() -> bool:
	var swinging: int = 0
	for node: Node in soldier.get_tree().get_nodes_in_group(&"enemies"):
		var other: MongolSoldier = node as MongolSoldier
		if other == null or other == soldier or other.state != MongolSoldier.State.ATTACK:
			continue
		if other.current_attack != null and other.current_attack.projectile_frame >= 0:
			continue
		if target != null and absf(other.global_position.x - target.global_position.x) > ATTACKER_REACH:
			continue
		swinging += 1
	return swinging < MAX_ATTACKERS


## The attackers' places are taken (and he is not swinging himself): he waits his turn.
func _waiting() -> bool:
	return target != null and soldier.state != MongolSoldier.State.ATTACK and not _may_attack()


func _set_mode(next: Mode) -> void:
	if mode == next:
		return
	mode = next
	soldier.engaged = next != Mode.IDLE and next != Mode.PATROL and next != Mode.DEAD
	# Once he is in the fight he cannot be taken unawares.
	if next != Mode.IDLE and next != Mode.PATROL and next != Mode.ALERT:
		soldier.unaware = false
	mode_changed.emit(next)
