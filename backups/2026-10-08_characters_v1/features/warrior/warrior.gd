class_name Warrior
extends Combatant
## Yusuf, the hero: a state machine over the shared Combatant body. Free movement (a run, a walk,
## a variable-height jump with coyote time and buffering), the three-cut light combo and the heavy
## cleave, the shield (a block, and a parry in the first moments of raising it), the dodge roll,
## remedies and interaction. Input comes from WarriorInput, animation choice from WarriorAnimator,
## and every timing from the profile and the animation frames.

signal stamina_changed(current: float, maximum: float)
signal remedies_changed(count: int, maximum: int)
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

enum State {IDLE, MOVE, AIR, ATTACK, BLOCK, PARRY, ROLL, HURT, HEAL, INTERACT, DEAD, CINEMATIC}

## The roll animation's length (8 frames at 18 fps).
const ROLL_TIME: float = 0.444
## The frame of the heal animation on which the remedy takes effect.
const HEAL_FRAME: int = 3
## The frame of the interact animation on which the hand arrives.
const INTERACT_FRAME: int = 2
## Falls faster than this (px/s) end in the landing crouch.
const HARD_LANDING: float = 260.0
const ATTACK_FRICTION: float = 1500.0

@export var profile: WarriorProfile

var state: State = State.IDLE
var stamina: float = 0.0
var remedies: int = 0
## Index of the current light attack in the combo, -1 for the heavy.
var combo_index: int = 0
## Horizontal intent while a script drives the hero (cutscenes).
var cinematic_move: float = 0.0
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

@onready var input: WarriorInput = $Input
@onready var animator: WarriorAnimator = $Animator
@onready var sensor: Area2D = $InteractionSensor


func _ready() -> void:
	max_health = profile.max_health
	super._ready()
	add_to_group(&"player")
	stamina = profile.max_stamina
	remedies = profile.max_remedies
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
	_apply_gravity(delta)
	var was_on_floor: bool = is_on_floor()
	var fall_speed: float = velocity.y
	move_and_slide()
	_after_move(was_on_floor, fall_speed)
	_update_nearest_interactable()


# --- Public ---------------------------------------------------------------------------------------

## Brings the hero back at a checkpoint: full health, stamina and remedies.
func respawn(at: Vector2, face: float = 1.0) -> void:
	revive(at)
	set_facing(face)
	stamina = profile.max_stamina
	remedies = profile.max_remedies
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
	return _invulnerable > 0.0 or _rolling_through()


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
	if (on_floor or _coyote > 0.0) and input.consume(&"jump"):
		_jump()
		on_floor = false
	if on_floor and _try_action():
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
	if input.has(&"heavy_attack") and profile.heavy != null:
		input.consume(&"heavy_attack")
		_start_attack(profile.heavy, -1)
		return true
	if input.block_held:
		_start_block()
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


func _jump() -> void:
	velocity.y = -profile.jump_velocity
	_coyote = 0.0
	_jump_rising = true
	jumped.emit()


func _apply_gravity(delta: float) -> void:
	if is_on_floor() and velocity.y >= 0.0:
		return
	var g: float = GRAVITY * (profile.fall_gravity_scale if velocity.y > 0.0 else 1.0)
	velocity.y = minf(velocity.y + g * delta, MAX_FALL_SPEED)


func _after_move(was_on_floor: bool, fall_speed: float) -> void:
	var on_floor: bool = is_on_floor()
	if on_floor and not was_on_floor:
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
	elif input.has(&"heavy_attack") and combo_index >= 0 and profile.heavy != null:
		input.consume(&"heavy_attack")
		cancel_attack()
		_start_attack(profile.heavy, -1)
	elif input.has(&"attack") and combo_index == profile.combo.size() - 1:
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
	elif sprite.frame >= 2 and input.has(&"heavy_attack") and profile.heavy != null:
		input.consume(&"heavy_attack")
		_start_attack(profile.heavy, -1)


# --- Being struck --------------------------------------------------------------------------------

func judge_hit(hit: HitData) -> HitData.Outcome:
	# Nothing touches him while the story has the stage (a gate opening, a boss's entrance).
	if state == State.DEAD or state == State.CINEMATIC:
		return HitData.Outcome.IGNORED
	if is_invulnerable():
		return HitData.Outcome.DODGED
	var guarding: bool = state == State.BLOCK or state == State.PARRY
	if guarding and is_frontal(hit) and not hit.unblockable:
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
	var t: float = clampf(_state_time / ROLL_TIME, 0.0, 1.0)
	velocity.x = facing * profile.roll_speed * (1.0 - 0.6 * t * t)


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
	if _action_done:
		return
	if state == State.HEAL and sprite.animation == &"heal" and sprite.frame >= HEAL_FRAME:
		_action_done = true
		heal(profile.remedy_heal)
		healed.emit(profile.remedy_heal)
	elif state == State.INTERACT and sprite.animation == &"interact" and sprite.frame >= INTERACT_FRAME:
		_action_done = true
		if is_instance_valid(_interact_target):
			_interact_target.interact(self)
			interacted.emit(_interact_target)


func on_animation_finished(animation: StringName) -> void:
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


# --- Cinematic -------------------------------------------------------------------------------------

func _cinematic(delta: float) -> void:
	if cinematic_move != 0.0:
		set_facing(cinematic_move)
	velocity.x = move_toward(velocity.x, cinematic_move * profile.walk_speed,
		profile.ground_acceleration * delta)
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
