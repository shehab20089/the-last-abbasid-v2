class_name Warrior
extends Combatant
## Yusuf, the hero: a state machine over the shared Combatant body. Free movement (a run, a walk,
## a variable-height jump with coyote time and buffering, a drop through planks), the three-cut light
## combo and the heavy cleave, the air slash and the plunge, the shield (a block, a parry in the first
## moments of raising it, a bash), the dodge roll, finishers, remedies and interaction. Input comes from WarriorInput, animation choice from WarriorAnimator,
## and every timing from the profile and the animation frames.

signal stamina_changed(current: float, maximum: float)
signal remedies_changed(count: int, maximum: int)
## Knives left, and how many he can carry (0 before he has any).
signal knives_changed(count: int, maximum: int)
signal state_changed(state: State)
signal interactable_changed(target: Interactable)
signal jumped
signal landed(speed: float)
signal footstep
signal rolled
signal blocked(hit: HitData)
signal parried(hit: HitData)
signal guard_broken(hit: HitData)
signal dodged(hit: HitData)
signal healed(amount: float)
signal interacted(target: Interactable)
## A finisher began on a staggered soldier.
signal finisher_started(target: Combatant, finisher: FinisherDefinition)
## A finisher's blow landed on its frame: `cut` is what it took off, or nothing for a thrust's burst.
signal finisher_struck(target: Combatant, finisher: FinisherDefinition, frame: int, cut: StringName)
## The finisher is over; the hero has his body back.
signal finisher_ended(target: Combatant)
## The plunge struck the ground.
signal plunge_landed
## A knife left his hand.
signal thrown(knife: Node2D)

enum State {IDLE, MOVE, AIR, ATTACK, BLOCK, PARRY, ROLL, HURT, HEAL, INTERACT, DEAD, CINEMATIC, FINISHER, AIR_ATTACK,
	PLUNGE, THROW}

## The roll animation's length (8 frames at 18 fps).
const ROLL_TIME: float = 0.444
## The frame of the heal animation on which the remedy takes effect.
const HEAL_FRAME: int = 3
## The frame of the interact animation on which the hand arrives.
const INTERACT_FRAME: int = 2
## The frame of the throw on which the knife leaves his hand, and where it leaves (body space).
const THROW_FRAME: int = 1
const KNIFE_OFFSET: Vector2 = Vector2(18, -52)
## Falls faster than this (px/s) end in the landing crouch.
const HARD_LANDING: float = 260.0
const ATTACK_FRICTION: float = 1500.0
## How near (px) and how level a staggered soldier must be for a finisher.
const FINISH_REACH: float = 64.0
const FINISH_LEVEL: float = 10.0
## While another soldier this near (px) is still in the fight, a finisher plays this much quicker,
## without the bars and the slow time.
const FIGHT_RADIUS: float = 320.0
const QUICK_FINISHER: float = 1.4
## combo_index for what is not the light combo.
const HEAVY_INDEX: int = -1
const BASH_INDEX: int = -2
const PLUNGE_INDEX: int = -3
## The rolling cut stands in the combo where the rising cut does: the thrust follows it.
const ROLL_CUT_INDEX: int = 1
## How far (px) the rolling cut looks for a man to turn on when the stick is not held.
const ROLL_CUT_SEEK: float = 90.0
## How far down (px) he slips to drop through the planks under him.
const DROP_THROUGH: float = 9.0

@export var profile: WarriorProfile
## The scripted kills he can play on a staggered soldier (one chosen each time, never twice running).
@export var finishers: Array[FinisherDefinition] = []
## The techniques he has learned (the session sets them from the story: a page of a treatise in each
## level teaches one). By default he knows them all.
@export var techniques: Array[StringName] = [&"bash", &"plunge", &"roll_cut", &"knives"]

var state: State = State.IDLE
var stamina: float = 0.0
var remedies: int = 0
var knives: int = 0
## Index of the current light attack in the combo, or HEAVY_INDEX, BASH_INDEX, PLUNGE_INDEX.
var combo_index: int = 0
## Slashes made in this jump.
var _air_slashes: int = 0
## The plunge has turned its blade over and is dropping.
var _plunge_dropping: bool = false
## Horizontal intent while a script drives the hero (cutscenes).
var cinematic_move: float = 0.0
## A stroke playing while cinematic (cinematic_strike), until it ends.
var _cinematic_action: StringName = &""
var _state_time: float = 0.0
var _hurt_left: float = 0.0
var _coyote: float = 0.0
var _jump_rising: bool = false
var _regen_delay: float = 0.0
var _parry_window: float = 0.0
var _parry_cooldown: float = 0.0
var _riposte: float = 0.0
var _invulnerable: float = 0.0
var _since_hurt: float = 100.0
var _queued_attack: AttackDefinition
var _action_done: bool = false
var _interact_target: Interactable
var _interactables: Array[Interactable] = []
var _nearest: Interactable
## The staggered soldier a finisher would take now, or null.
var finisher_target: Combatant
## The finisher playing, its soldier, and the last one played.
var _finisher: FinisherDefinition
var _finished: Combatant
var _last_finisher: FinisherDefinition
var _finisher_frame: int = -1
## A finisher to play next instead of a random one (tests, set pieces).
var next_finisher: FinisherDefinition
## The finisher playing is the full one (bars, slow time): no other soldier near is still fighting.
var finisher_cinematic: bool = false

@onready var input: WarriorInput = $Input
@onready var animator: WarriorAnimator = $Animator
@onready var sensor: Area2D = $InteractionSensor


func _ready() -> void:
	max_health = profile.max_health
	super._ready()
	add_to_group(&"player")
	stamina = profile.max_stamina
	remedies = profile.max_remedies
	knives = profile.max_knives if knows(&"knives") else 0
	animator.setup(sprite, profile)
	animator.footstep.connect(_on_animator_footstep)
	sprite.frame_changed.connect(_on_action_frame)
	sensor.area_entered.connect(_on_sensor_entered)
	sensor.area_exited.connect(_on_sensor_exited)
	animator.play(&"idle")


func _physics_process(delta: float) -> void:
	input.poll(delta)
	_tick(delta)
	match state:
		State.IDLE, State.MOVE, State.AIR:
			_free(delta)
		State.ATTACK:
			_attacking(delta)
		State.BLOCK:
			_blocking(delta)
		State.PARRY:
			_parrying(delta)
		State.ROLL:
			_rolling(delta)
		State.HURT:
			_hurting(delta)
		State.HEAL, State.INTERACT, State.DEAD:
			velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
		State.CINEMATIC:
			_cinematic(delta)
		State.FINISHER:
			velocity.x = 0.0
		State.AIR_ATTACK:
			_air_attacking(delta)
		State.THROW:
			_throwing(delta)
		State.PLUNGE:
			_plunging(delta)
	_apply_gravity(delta)
	var was_on_floor: bool = is_on_floor()
	var fall_speed: float = velocity.y
	move_and_slide()
	_after_move(was_on_floor, fall_speed)
	_update_nearest_interactable()
	_update_finisher_target()


# --- Public ---------------------------------------------------------------------------------------

## Brings the hero back at a checkpoint: full health, stamina and remedies.
func respawn(at: Vector2, face: float = 1.0) -> void:
	revive(at)
	set_facing(face)
	stamina = profile.max_stamina
	remedies = profile.max_remedies
	_refill_knives()
	combo_index = 0
	_queued_attack = null
	_parry_window = 0.0
	_riposte = 0.0
	_invulnerable = 0.6
	input.clear()
	_set_state(State.IDLE)
	animator.play(&"idle")
	stamina_changed.emit(stamina, profile.max_stamina)
	remedies_changed.emit(remedies, profile.max_remedies)


## Refills remedies and health (resting at a lamp).
func rest() -> void:
	heal(max_health)
	remedies = profile.max_remedies
	stamina = profile.max_stamina
	_refill_knives()
	remedies_changed.emit(remedies, profile.max_remedies)
	stamina_changed.emit(stamina, profile.max_stamina)


## Hands control to a script (dialogue, cutscenes) or gives it back to the player.
func set_cinematic(on: bool) -> void:
	if dead:
		return
	if on:
		cancel_attack()
		input.clear()
		cinematic_move = 0.0
		_set_state(State.CINEMATIC)
	elif state == State.CINEMATIC:
		input.clear()
		_set_state(State.IDLE)


func is_invulnerable() -> bool:
	return _invulnerable > 0.0 or _rolling_through() or state == State.FINISHER


## Whether he has learned a technique (bash, plunge, roll_cut, knives).
func knows(technique: StringName) -> bool:
	return techniques.has(technique)


## Sets what he knows (the session, from the story); knives come with their full count.
func set_techniques(known: Array[StringName]) -> void:
	techniques = known.duplicate()
	_refill_knives()


## Learns a technique (a page of the treatise, a gift).
func learn(technique: StringName) -> void:
	if not techniques.has(technique):
		techniques.append(technique)
	if technique == &"knives":
		_refill_knives()


func _refill_knives() -> void:
	knives = profile.max_knives if knows(&"knives") else 0
	knives_changed.emit(knives, profile.max_knives if knows(&"knives") else 0)


func riposte_ready() -> bool:
	return _riposte > 0.0


## True when a blow landed on the hero within `seconds`: soldiers give him a breath after a hit.
func recently_hurt(seconds: float) -> bool:
	return _since_hurt < seconds


func nearest_interactable() -> Interactable:
	return _nearest


# --- Free movement --------------------------------------------------------------------------------

func _free(delta: float) -> void:
	var on_floor: bool = is_on_floor()
	if on_floor:
		_air_slashes = 0
	if on_floor and input.down_held and input.has(&"jump") and _on_one_way_floor():
		input.consume(&"jump")
		_drop_through()
		on_floor = false
	elif (on_floor or _coyote > 0.0) and input.consume(&"jump"):
		_jump()
		on_floor = false
	if on_floor and _try_action():
		return
	if not on_floor and _try_air_action():
		return
	var move: float = input.move
	if move != 0.0:
		set_facing(move)
	var speed: float = profile.run_speed if absf(move) >= profile.run_tilt else profile.walk_speed
	var target: float = signf(move) * speed
	var rate: float = profile.ground_acceleration if on_floor else profile.air_acceleration
	if move == 0.0 and on_floor:
		rate = profile.ground_deceleration
	velocity.x = move_toward(velocity.x, target, rate * delta)
	if _jump_rising and velocity.y < 0.0 and not input.jump_held:
		velocity.y *= profile.jump_cut
		_jump_rising = false
	if velocity.y >= 0.0:
		_jump_rising = false
	if not on_floor:
		_set_state(State.AIR)
	else:
		_set_state(State.MOVE if absf(velocity.x) > 5.0 else State.IDLE)
	animator.locomotion(on_floor, velocity, delta)


## Starts whichever grounded action was pressed. Returns true when one started.
func _try_action() -> bool:
	if input.has(&"dodge") and _try_roll():
		return true
	if input.has(&"attack") and not profile.combo.is_empty():
		input.consume(&"attack")
		_start_attack(profile.combo[0], 0)
		return true
	if input.has(&"heavy_attack") and _start_finisher():
		return true
	if input.has(&"heavy_attack") and input.block_held and profile.bash != null and knows(&"bash"):
		input.consume(&"heavy_attack")
		_start_attack(profile.bash, BASH_INDEX)
		return true
	if input.has(&"heavy_attack") and profile.heavy != null:
		input.consume(&"heavy_attack")
		_start_attack(profile.heavy, HEAVY_INDEX)
		return true
	if input.block_held:
		_start_block()
		return true
	if input.has(&"throw") and _start_throw():
		return true
	if input.has(&"heal") and remedies > 0 and health < max_health:
		input.consume(&"heal")
		_start_heal()
		return true
	if input.has(&"interact") and _nearest != null:
		input.consume(&"interact")
		_start_interact(_nearest)
		return true
	return false


## In the air the light button slashes (`profile.air_slashes` times a jump) and the heavy one plunges.
func _try_air_action() -> bool:
	if input.has(&"heavy_attack") and _start_plunge():
		return true
	if input.has(&"throw") and _start_throw():
		return true
	if input.has(&"attack") and profile.air_attack != null and _air_slashes < profile.air_slashes:
		input.consume(&"attack")
		return _start_air_attack()
	return false


## Standing on planks (a one-way floor): down and jump drop him through them.
func _on_one_way_floor() -> bool:
	for i: int in get_slide_collision_count():
		var contact: KinematicCollision2D = get_slide_collision(i)
		if contact.get_normal().y > -0.7:
			continue
		var tiles: TileMapLayer = contact.get_collider() as TileMapLayer
		if tiles != null:
			# The tile just under the point where his feet meet it.
			var cell: Vector2i = tiles.local_to_map(tiles.to_local(contact.get_position() + Vector2(0.0, 2.0)))
			var data: TileData = tiles.get_cell_tile_data(cell)
			return data != null and data.get_collision_polygons_count(0) > 0 and data.is_collision_polygon_one_way(0, 0)
		var shape: CollisionShape2D = contact.get_collider_shape() as CollisionShape2D
		return shape != null and shape.one_way_collision
	return false


func _drop_through() -> void:
	global_position.y += DROP_THROUGH
	velocity.y = 60.0
	_coyote = 0.0
	_jump_rising = false
	_set_state(State.AIR)


func _jump() -> void:
	velocity.y = -profile.jump_velocity
	_coyote = 0.0
	_jump_rising = true
	jumped.emit()


func _apply_gravity(delta: float) -> void:
	if is_on_floor() and velocity.y >= 0.0:
		return
	# The plunge drops at its own speed.
	if state == State.PLUNGE and _plunge_dropping:
		return
	var g: float = GRAVITY * (profile.fall_gravity_scale if velocity.y > 0.0 else 1.0)
	velocity.y = minf(velocity.y + g * delta, MAX_FALL_SPEED)


func _after_move(was_on_floor: bool, fall_speed: float) -> void:
	var on_floor: bool = is_on_floor()
	if on_floor and not was_on_floor:
		_air_slashes = 0
		landed.emit(fall_speed)
		if fall_speed > HARD_LANDING and (state == State.AIR or state == State.IDLE
				or state == State.MOVE):
			animator.land()
	if was_on_floor and not on_floor and velocity.y >= 0.0:
		_coyote = profile.coyote_time


# --- Attacks ------------------------------------------------------------------------------------

func _start_attack(attack: AttackDefinition, index: int) -> void:
	if not _spend(attack.stamina_cost):
		return
	if input.move != 0.0:
		set_facing(input.move)
	combo_index = index
	_queued_attack = null
	_set_state(State.ATTACK)
	velocity.x *= 0.25
	begin_attack(attack)


func _attacking(delta: float) -> void:
	var lunge: float = attack_lunge()
	if not is_nan(lunge) and is_on_floor():
		velocity.x = lunge
	else:
		velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
	if current_attack == null:
		_set_state(State.IDLE)
		return
	var frame: int = sprite.frame
	var next_index: int = combo_index + 1
	if (input.has(&"attack") and combo_index >= 0 and next_index < profile.combo.size()
			and frame >= current_attack.active_from):
		input.consume(&"attack")
		_queued_attack = profile.combo[next_index]
	if frame < current_attack.recovery_from:
		return
	if _queued_attack != null:
		cancel_attack()
		_start_attack(_queued_attack, next_index)
	elif input.has(&"dodge") and _try_roll():
		pass
	elif input.has(&"heavy_attack") and finisher_target != null:
		cancel_attack()
		_start_finisher()
	elif input.has(&"heavy_attack") and (combo_index >= 0 or combo_index == BASH_INDEX) and profile.heavy != null:
		input.consume(&"heavy_attack")
		cancel_attack()
		_start_attack(profile.heavy, HEAVY_INDEX)
	elif input.has(&"attack") and (combo_index == profile.combo.size() - 1 or combo_index <= BASH_INDEX):
		# After the last cut, a bash or a plunge, the light button starts the combo again.
		input.consume(&"attack")
		cancel_attack()
		_start_attack(profile.combo[0], 0)
	elif input.block_held:
		cancel_attack()
		_start_block()
	elif input.move != 0.0 and frame > current_attack.recovery_from:
		cancel_attack()
		_set_state(State.MOVE)


func on_attack_finished(_attack: AttackDefinition) -> void:
	if state == State.ATTACK:
		_set_state(State.IDLE)
		animator.play(&"idle")
	elif state == State.AIR_ATTACK:
		_set_state(State.AIR)


# --- Knives -------------------------------------------------------------------------------------

## A knife from his belt, flicked at the man before him (on the ground or in the air).
func _start_throw() -> bool:
	if not knows(&"knives") or knives <= 0 or profile.knife_scene == null:
		return false
	input.consume(&"throw")
	if input.move != 0.0:
		set_facing(input.move)
	cancel_attack()
	_queued_attack = null
	_action_done = false
	_set_state(State.THROW)
	animator.play(&"throw")
	return true


func _throwing(delta: float) -> void:
	if is_on_floor():
		velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
	else:
		velocity.x = move_toward(velocity.x, input.move * profile.run_speed, profile.air_acceleration * 0.5 * delta)


func _release_knife() -> void:
	knives -= 1
	knives_changed.emit(knives, profile.max_knives)
	var knife: Node2D = profile.knife_scene.instantiate() as Node2D
	knife.set(&"direction", facing)
	knife.set(&"thrower", self)
	get_parent().add_child(knife)
	knife.global_position = global_position + Vector2(KNIFE_OFFSET.x * facing, KNIFE_OFFSET.y)
	thrown.emit(knife)


# --- In the air ---------------------------------------------------------------------------------

func _start_air_attack() -> bool:
	if not _spend(profile.air_attack.stamina_cost):
		return false
	if input.move != 0.0:
		set_facing(input.move)
	_air_slashes += 1
	_queued_attack = null
	_jump_rising = false
	# A slash checks his fall for a moment, so it can find a man standing below.
	velocity.y = minf(velocity.y, 30.0)
	_set_state(State.AIR_ATTACK)
	begin_attack(profile.air_attack)
	return true


func _air_attacking(delta: float) -> void:
	# He keeps his flight; the stick still steers him a little.
	velocity.x = move_toward(velocity.x, input.move * profile.run_speed, profile.air_acceleration * 0.5 * delta)
	if is_on_floor():
		# Landing cuts the slash short.
		cancel_attack()
		_set_state(State.IDLE)
		return
	if current_attack == null:
		_set_state(State.AIR)
		return
	if sprite.frame < current_attack.recovery_from:
		return
	if input.has(&"heavy_attack") and _start_plunge():
		return
	if input.has(&"attack") and _air_slashes < profile.air_slashes:
		input.consume(&"attack")
		cancel_attack()
		_start_air_attack()


## The plunge: the blade turned point-down in the air, then a drop on whoever is below.
func _start_plunge() -> bool:
	if profile.plunge == null or not knows(&"plunge") or is_on_floor() or not _spend(profile.plunge.stamina_cost):
		return false
	input.consume(&"heavy_attack")
	cancel_attack()
	_queued_attack = null
	_jump_rising = false
	if input.move != 0.0:
		set_facing(input.move)
	_plunge_dropping = false
	# He checks in the air as he turns the blade over.
	velocity = Vector2(velocity.x * 0.4, minf(velocity.y, 0.0) - 50.0)
	_set_state(State.PLUNGE)
	animator.play(&"plunge")
	return true


func _plunging(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, 600.0 * delta)
	if _plunge_dropping:
		velocity.y = profile.plunge_speed
	if is_on_floor() and (_plunge_dropping or _state_time > 0.05):
		_land_plunge()


## The blade is down: he drops, the blade live beneath him.
func _drop_plunge() -> void:
	_plunge_dropping = true
	velocity.y = profile.plunge_speed
	begin_attack(profile.plunge)


func _land_plunge() -> void:
	cancel_attack()
	_plunge_dropping = false
	velocity = Vector2.ZERO
	combo_index = PLUNGE_INDEX
	_queued_attack = null
	_set_state(State.ATTACK)
	begin_attack(profile.plunge_landing)
	plunge_landed.emit()


func build_hit(attack: AttackDefinition) -> HitData:
	var hit: HitData = super.build_hit(attack)
	if _riposte > 0.0:
		hit.riposte = true
		hit.damage *= profile.riposte_multiplier
		hit.poise_damage *= 2.0
		hit.hit_stop *= 1.5
	return hit


func on_hit_landed(_target: Combatant, hit: HitData, outcome: HitData.Outcome) -> void:
	if hit.riposte:
		_riposte = 0.0
	if outcome == HitData.Outcome.BLOCKED:
		# The blade glances off a raised guard and throws the hero back a step.
		velocity.x = -facing * 70.0


# --- The shield ---------------------------------------------------------------------------------

func _start_block() -> void:
	_set_state(State.BLOCK)
	if _parry_cooldown <= 0.0 and _spend(profile.parry_cost):
		_parry_window = profile.parry_window
	animator.play(&"block_start")


func _blocking(delta: float) -> void:
	if not input.block_held:
		_parry_window = 0.0
		_set_state(State.IDLE)
		animator.play(&"idle")
		return
	if input.has(&"dodge") and _try_roll():
		return
	if input.has(&"heavy_attack") and _start_finisher():
		return
	if input.has(&"heavy_attack") and profile.bash != null and knows(&"bash"):
		# The shield driven into the man before him.
		input.consume(&"heavy_attack")
		_parry_window = 0.0
		_start_attack(profile.bash, BASH_INDEX)
		return
	if input.has(&"attack") and not profile.combo.is_empty():
		input.consume(&"attack")
		_start_attack(profile.combo[0], 0)
		return
	velocity.x = move_toward(velocity.x, input.move * profile.block_walk_speed,
		profile.ground_acceleration * delta)


func _parrying(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
	if sprite.frame >= 2 and input.has(&"attack") and not profile.combo.is_empty():
		input.consume(&"attack")
		_start_attack(profile.combo[0], 0)
	elif sprite.frame >= 2 and input.has(&"heavy_attack") and _start_finisher():
		pass
	elif sprite.frame >= 2 and input.has(&"heavy_attack") and profile.heavy != null:
		input.consume(&"heavy_attack")
		_start_attack(profile.heavy, HEAVY_INDEX)


# --- Being struck --------------------------------------------------------------------------------

func judge_hit(hit: HitData) -> HitData.Outcome:
	# Nothing touches him while the story has the stage (a gate opening, a boss's entrance).
	if state == State.DEAD or state == State.CINEMATIC:
		return HitData.Outcome.IGNORED
	if is_invulnerable():
		return HitData.Outcome.DODGED
	var guarding: bool = state == State.BLOCK or state == State.PARRY
	# A low sweep passes under a standing guard.
	if guarding and is_frontal(hit) and not hit.unblockable and not hit.low:
		if _parry_window > 0.0 and hit.parryable:
			return HitData.Outcome.PARRIED
		if hit.guard_break or stamina < _guard_cost(hit):
			return HitData.Outcome.GUARD_BROKEN
		return HitData.Outcome.BLOCKED
	return HitData.Outcome.HIT


func on_struck(hit: HitData, outcome: HitData.Outcome) -> void:
	match outcome:
		HitData.Outcome.PARRIED:
			_parry_window = 0.0
			_parry_cooldown = 0.0
			_riposte = profile.riposte_window
			velocity.x = -facing * 40.0
			_set_state(State.PARRY)
			animator.play(&"parry")
			parried.emit(hit)
		HitData.Outcome.BLOCKED:
			_drain(_guard_cost(hit))
			take_damage(hit.damage * profile.block_chip)
			velocity.x = hit.direction * hit.knockback * 0.6
			animator.play(&"block_hit")
			blocked.emit(hit)
		HitData.Outcome.GUARD_BROKEN:
			_drain(stamina)
			_regen_delay = profile.exhausted_delay
			take_damage(hit.damage * 0.5)
			if not dead:
				_hurt(hit, profile.guard_break_time)
			guard_broken.emit(hit)
		HitData.Outcome.HIT:
			take_damage(hit.damage)
			if not dead:
				_hurt(hit, profile.hurt_time)
		HitData.Outcome.DODGED:
			dodged.emit(hit)


func _guard_cost(hit: HitData) -> float:
	return hit.stamina_damage * (1.6 if hit.guard_break else 1.0)


func _hurt(hit: HitData, time: float) -> void:
	_since_hurt = 0.0
	cancel_attack()
	_parry_window = 0.0
	_set_state(State.HURT)
	_hurt_left = time
	_invulnerable = profile.hit_invulnerability
	velocity.x = hit.direction * maxf(hit.knockback, 60.0)
	animator.play(&"hurt")
	flash()


func _hurting(delta: float) -> void:
	velocity.x = move_toward(velocity.x, 0.0, 700.0 * delta)
	if _state_time >= profile.hurt_escape_time and input.has(&"dodge") and _try_roll():
		return
	_hurt_left -= delta
	if _hurt_left <= 0.0:
		_set_state(State.IDLE)
		animator.play(&"idle")


func on_died() -> void:
	input.clear()
	_invulnerable = 0.0
	_set_state(State.DEAD)
	animator.play(&"death")
	flash()


# --- Roll ---------------------------------------------------------------------------------------

func _try_roll() -> bool:
	if not is_on_floor() or stamina < 1.0:
		return false
	input.consume(&"dodge")
	_spend(profile.roll_cost)
	if input.move != 0.0:
		set_facing(input.move)
	cancel_attack()
	_parry_window = 0.0
	_set_state(State.ROLL)
	animator.play(&"roll")
	rolled.emit()
	return true


func _rolling(_delta: float) -> void:
	if (_state_time >= profile.roll_cut_from and input.has(&"attack") and profile.roll_cut != null
			and knows(&"roll_cut")):
		input.consume(&"attack")
		_start_roll_cut()
		return
	var t: float = clampf(_state_time / ROLL_TIME, 0.0, 1.0)
	velocity.x = facing * profile.roll_speed * (1.0 - 0.6 * t * t)


## Up out of the roll in a rising cut, turned on whoever is nearest (the stick decides if it is held).
func _start_roll_cut() -> void:
	var turn: float = input.move
	if turn == 0.0:
		var nearest: float = ROLL_CUT_SEEK
		for node: Node in get_tree().get_nodes_in_group(&"enemies"):
			var other: Combatant = node as Combatant
			if other == null or other.dead:
				continue
			var dx: float = other.global_position.x - global_position.x
			if absf(dx) < nearest and absf(other.global_position.y - global_position.y) < 40.0:
				nearest = absf(dx)
				turn = signf(dx) if dx != 0.0 else facing
	if turn != 0.0:
		set_facing(turn)
	_start_attack(profile.roll_cut, ROLL_CUT_INDEX)


func _rolling_through() -> bool:
	return (state == State.ROLL and _state_time >= profile.roll_invulnerable_from
		and _state_time <= profile.roll_invulnerable_to)


# --- Remedies and interaction -------------------------------------------------------------------

func _start_heal() -> void:
	remedies -= 1
	remedies_changed.emit(remedies, profile.max_remedies)
	_action_done = false
	_set_state(State.HEAL)
	animator.play(&"heal")


func _start_interact(target: Interactable) -> void:
	if not target.reach:
		set_facing(signf(target.global_position.x - global_position.x))
		target.interact(self)
		interacted.emit(target)
		return
	set_facing(signf(target.global_position.x - global_position.x))
	_interact_target = target
	_action_done = false
	_set_state(State.INTERACT)
	animator.play(&"interact")


func _on_action_frame() -> void:
	if state == State.FINISHER:
		_finisher_step()
		return
	if _action_done:
		return
	if state == State.HEAL and sprite.animation == &"heal" and sprite.frame >= HEAL_FRAME:
		_action_done = true
		heal(profile.remedy_heal)
		healed.emit(profile.remedy_heal)
	elif state == State.THROW and sprite.animation == &"throw" and sprite.frame >= THROW_FRAME:
		_action_done = true
		_release_knife()
	elif state == State.INTERACT and sprite.animation == &"interact" and sprite.frame >= INTERACT_FRAME:
		_action_done = true
		if is_instance_valid(_interact_target):
			_interact_target.interact(self)
			interacted.emit(_interact_target)


func on_animation_finished(animation: StringName) -> void:
	if state == State.FINISHER and _finisher != null and animation == _finisher.hero_animation:
		_end_finisher()
		return
	match animation:
		&"block_start", &"block_hit":
			if state == State.BLOCK:
				animator.play(&"block")
		&"parry":
			if state == State.PARRY:
				if input.block_held:
					_set_state(State.BLOCK)
					animator.play(&"block")
				else:
					_set_state(State.IDLE)
					animator.play(&"idle")
		&"roll":
			if state == State.ROLL:
				_set_state(State.IDLE)
				animator.play(&"idle")
		&"heal", &"interact":
			if state == State.HEAL or state == State.INTERACT:
				_set_state(State.IDLE)
				animator.play(&"idle")
		&"plunge":
			if state == State.PLUNGE:
				_drop_plunge()
		&"throw":
			if state == State.THROW:
				_set_state(State.IDLE if is_on_floor() else State.AIR)
				if is_on_floor():
					animator.play(&"idle")


func _on_sensor_entered(area: Area2D) -> void:
	var target: Interactable = area as Interactable
	if target != null and not target in _interactables:
		_interactables.append(target)


func _on_sensor_exited(area: Area2D) -> void:
	var target: Interactable = area as Interactable
	if target != null:
		_interactables.erase(target)


func _update_nearest_interactable() -> void:
	var best: Interactable = null
	var best_distance: float = INF
	if state != State.DEAD and state != State.CINEMATIC:
		for target: Interactable in _interactables:
			if not is_instance_valid(target) or not target.can_interact(self):
				continue
			var distance: float = absf(target.global_position.x - global_position.x)
			if distance < best_distance:
				best = target
				best_distance = distance
	if best != _nearest:
		_nearest = best
		interactable_changed.emit(best)


# --- Finishers -------------------------------------------------------------------------------------
# A staggered soldier near and before him can be finished: the heavy-attack button plays one of
# the scripted kills. The hero is untouchable through it (no soldier starts an attack on him); the
# soldier is set where the choreography wants him and plays his half frame-locked.

func _update_finisher_target() -> void:
	finisher_target = null
	if finishers.is_empty() or dead or not is_on_floor():
		return
	var best: float = FINISH_REACH
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if other == null or not other.can_be_finished():
			continue
		var offset: Vector2 = other.global_position - global_position
		if absf(offset.y) > FINISH_LEVEL or absf(offset.x) > best:
			continue
		# Before him, or close enough to turn to.
		if offset.x * facing < -12.0:
			continue
		finisher_target = other
		best = absf(offset.x)


## Plays a finisher on the soldier in reach, if there is one. True when it began.
func _start_finisher() -> bool:
	var target: Combatant = finisher_target
	if target == null or not target.can_be_finished():
		return false
	var choices: Array[FinisherDefinition] = []
	for finisher: FinisherDefinition in finishers:
		if target.has_finisher(finisher) and finisher != _last_finisher:
			choices.append(finisher)
	if choices.is_empty():
		for finisher: FinisherDefinition in finishers:
			if target.has_finisher(finisher):
				choices.append(finisher)
	if choices.is_empty():
		return false
	var chosen: FinisherDefinition = choices.pick_random()
	if next_finisher != null and target.has_finisher(next_finisher):
		chosen = next_finisher
		next_finisher = null
	input.consume(&"heavy_attack")
	cancel_attack()
	_queued_attack = null
	set_facing(signf(target.global_position.x - global_position.x) if target.global_position.x != global_position.x else facing)
	_finisher = chosen
	_finished = target
	_last_finisher = chosen
	_finisher_frame = -1
	velocity = Vector2.ZERO
	# The full one when he is the last; a quick one while others still fight.
	finisher_cinematic = not _foe_still_fighting(target)
	var speed: float = 1.0 if finisher_cinematic else QUICK_FINISHER
	# He is set where the choreography wants him, facing the hero.
	target.global_position = Vector2(global_position.x + facing * chosen.distance, global_position.y)
	target.velocity = Vector2.ZERO
	target.set_facing(-facing)
	target.begin_finisher(chosen.victim_animation, speed)
	_set_state(State.FINISHER)
	animator.play(chosen.hero_animation)
	sprite.speed_scale = speed
	finisher_started.emit(target, chosen)
	_finisher_step()
	return true


## Each frame of the hero's half: the cuts and bursts it lands, and the soldier's death.
func _finisher_step() -> void:
	if _finisher == null or sprite.animation != _finisher.hero_animation:
		return
	var frame: int = sprite.frame
	if frame == _finisher_frame:
		return
	_finisher_frame = frame
	var target: Combatant = _finished
	if target == null or not is_instance_valid(target):
		return
	var cut: StringName = _finisher.cut_on(frame)
	if cut != &"":
		target.finisher_cut(cut)
		finisher_struck.emit(target, _finisher, frame, cut)
	elif _finisher.burst_frames.has(frame):
		finisher_struck.emit(target, _finisher, frame, &"")
	if frame == _finisher.death_frame:
		target.finisher_kill()


## True while another soldier near him is still in the fight.
func _foe_still_fighting(except: Combatant) -> bool:
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var other: Combatant = node as Combatant
		if (other != null and other != except and other.in_fight()
				and absf(other.global_position.x - global_position.x) <= FIGHT_RADIUS):
			return true
	return false


func _end_finisher() -> void:
	var target: Combatant = _finished
	if target != null and is_instance_valid(target) and not target.dead:
		target.finisher_kill()
	_finisher = null
	_finished = null
	# A kill like that puts the breath back in him.
	stamina = minf(profile.max_stamina, stamina + profile.finisher_stamina)
	stamina_changed.emit(stamina, profile.max_stamina)
	_invulnerable = maxf(_invulnerable, 0.3)
	_set_state(State.IDLE)
	animator.play(&"idle")
	finisher_ended.emit(target)


# --- Cinematic -------------------------------------------------------------------------------------

## Plays a stroke while the story has the stage (the last blow on the Captain); it strikes nothing.
func cinematic_strike(animation: StringName) -> void:
	if state != State.CINEMATIC:
		return
	_cinematic_action = animation
	animator.play(animation)


func _cinematic(delta: float) -> void:
	if cinematic_move != 0.0:
		set_facing(cinematic_move)
	velocity.x = move_toward(velocity.x, cinematic_move * profile.walk_speed,
		profile.ground_acceleration * delta)
	if _cinematic_action != &"":
		if sprite.animation == _cinematic_action and sprite.is_playing():
			return
		_cinematic_action = &""
	animator.locomotion(is_on_floor(), velocity, delta)


# --- Stamina and timers -------------------------------------------------------------------------

## Spends stamina on an action. Any stamina left allows it; none refuses it.
func _spend(amount: float) -> bool:
	if stamina < 1.0:
		return false
	_drain(amount)
	return true


func _drain(amount: float) -> void:
	if amount <= 0.0:
		return
	stamina = maxf(0.0, stamina - amount)
	_regen_delay = profile.exhausted_delay if stamina <= 0.0 else profile.stamina_regen_delay
	stamina_changed.emit(stamina, profile.max_stamina)


func _tick(delta: float) -> void:
	_state_time += delta
	_since_hurt += delta
	_coyote = maxf(0.0, _coyote - delta)
	_riposte = maxf(0.0, _riposte - delta)
	_parry_cooldown = maxf(0.0, _parry_cooldown - delta)
	if _parry_window > 0.0:
		_parry_window -= delta
		if _parry_window <= 0.0:
			_parry_cooldown = profile.parry_cooldown
	if _invulnerable > 0.0:
		_invulnerable = maxf(0.0, _invulnerable - delta)
		_set_ghost(_invulnerable > 0.0 and state != State.DEAD and int(_invulnerable * 20.0) % 2 == 0)
	tick_poise(delta)
	if _regen_delay > 0.0:
		_regen_delay -= delta
	elif stamina < profile.max_stamina and state != State.DEAD:
		var rate: float = profile.stamina_regen * (0.5 if state == State.BLOCK else 1.0)
		stamina = minf(profile.max_stamina, stamina + rate * delta)
		stamina_changed.emit(stamina, profile.max_stamina)


func _set_ghost(on: bool) -> void:
	var flash_material: ShaderMaterial = sprite.material as ShaderMaterial
	if flash_material != null:
		flash_material.set_shader_parameter(&"ghost", 1.0 if on else 0.0)


func _set_state(next: State) -> void:
	if state == next:
		return
	state = next
	_state_time = 0.0
	state_changed.emit(next)


func _on_animator_footstep() -> void:
	if state == State.MOVE or state == State.CINEMATIC:
		footstep.emit()
