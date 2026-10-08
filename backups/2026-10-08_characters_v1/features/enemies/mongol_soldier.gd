class_name MongolSoldier
extends Combatant
## A soldier of Hulegu's army: the body a brain drives. It walks where it is told, swings the
## attacks it is given, raises its guard, and reels from blows. It decides nothing itself; its
## EnemyBrain child does. Light blows interrupt it unless its attack is armoured; poise broken, a
## riposte, a broken guard or a parried blow leave it staggered and open.

signal state_changed(state: State)
signal guarded_hit(hit: HitData)
signal staggered
## A projectile left its hands (an arrow); the session hooks up its sounds and sparks.
signal projectile_spawned(projectile: Node2D)

enum State {READY, ATTACK, GUARD, HURT, STAGGER, ACTING, DEAD}

const FRICTION: float = 900.0
## Friction while reeling from a blow, low enough that the knockback reads as a slide.
const REEL_FRICTION: float = 620.0
const SEPARATION: float = 20.0

@export var profile: EnemyProfile
## The way he faces when the level starts: +1 right, -1 left.
@export var start_facing: float = -1.0
## The walk and run animations' own foot speeds (px/s), so the feet match the ground.
@export var walk_animation_speed: float = 54.0
@export var run_animation_speed: float = 120.0
## Spawned at an attack's projectile frame (the archer's arrow).
@export var projectile_scene: PackedScene
## Where the projectile leaves, in body space facing right.
@export var projectile_offset: Vector2 = Vector2(22, -57)

## -1..1: where the brain wants to go.
var move_intent: float = 0.0
var running: bool = false
var state: State = State.READY
var spawn_point: Vector2 = Vector2.ZERO
## While true every blow passes through him (a boss's roar, a set piece).
var untouchable: bool = false
var _timer: float = 0.0
var _fired: bool = false


func _ready() -> void:
	max_health = profile.max_health
	max_poise = profile.max_poise
	team = 1
	super._ready()
	add_to_group(&"enemies")
	spawn_point = global_position
	set_facing(start_facing)
	sprite.play(&"idle")


func _physics_process(delta: float) -> void:
	tick_poise(delta)
	match state:
		State.READY:
			var speed: float = profile.run_speed if running else profile.walk_speed
			velocity.x = move_toward(velocity.x, move_intent * speed, 800.0 * delta)
			_animate_locomotion()
		State.ATTACK:
			var lunge: float = attack_lunge()
			if not is_nan(lunge) and is_on_floor():
				velocity.x = lunge
			else:
				velocity.x = move_toward(velocity.x, 0.0, FRICTION * delta)
		_:
			var friction: float = REEL_FRICTION if state == State.HURT or state == State.STAGGER else FRICTION
			velocity.x = move_toward(velocity.x, 0.0, friction * delta)
			if state != State.DEAD:
				_timer -= delta
				if _timer <= 0.0:
					_recover()
	if state != State.DEAD:
		_separate(delta)
	if not is_on_floor():
		velocity.y = minf(velocity.y + GRAVITY * delta, MAX_FALL_SPEED)
	move_and_slide()


# --- Orders from the brain ------------------------------------------------------------------------

func can_act() -> bool:
	return state == State.READY and not dead


func face_toward(x: float) -> void:
	if state == State.READY or state == State.GUARD:
		set_facing(signf(x - global_position.x))


func attack(definition: AttackDefinition) -> bool:
	if not can_act():
		return false
	move_intent = 0.0
	_fired = false
	_set_state(State.ATTACK)
	begin_attack(definition)
	return true


func guard(seconds: float) -> void:
	if not can_act():
		return
	move_intent = 0.0
	_timer = seconds
	_set_state(State.GUARD)
	sprite.play(&"block")


func release_guard() -> void:
	if state == State.GUARD:
		_recover()


## Plays a set piece (a roar, a taunt) that keeps him busy for `seconds`, untouchable if asked.
func act(animation: StringName, seconds: float, protected: bool = false) -> void:
	if dead:
		return
	cancel_attack()
	move_intent = 0.0
	untouchable = protected
	_timer = seconds
	_set_state(State.ACTING)
	play_action(animation)


## Puts the soldier back at its post, alive and whole (a level reset).
func reset_to_spawn() -> void:
	revive(spawn_point)
	_set_state(State.READY)
	hurtbox.set_deferred(&"monitorable", true)
	sprite.play(&"idle")


# --- Being struck --------------------------------------------------------------------------------

func judge_hit(hit: HitData) -> HitData.Outcome:
	if dead or untouchable:
		return HitData.Outcome.IGNORED
	if state == State.GUARD and is_frontal(hit):
		if hit.guard_break or hit.unblockable:
			return HitData.Outcome.GUARD_BROKEN
		return HitData.Outcome.BLOCKED
	return HitData.Outcome.HIT


func on_struck(hit: HitData, outcome: HitData.Outcome) -> void:
	match outcome:
		HitData.Outcome.BLOCKED:
			velocity.x = hit.direction * hit.knockback * 0.5
			poise -= hit.poise_damage * 0.5
			flash(0.35)
			guarded_hit.emit(hit)
			if poise <= 0.0:
				_stagger(profile.stagger_time)
			else:
				sprite.play(&"block_hit")
		HitData.Outcome.GUARD_BROKEN:
			take_damage(hit.damage * 0.5)
			flash()
			if not dead:
				velocity.x = hit.direction * hit.knockback
				_stagger(profile.stagger_time)
		HitData.Outcome.HIT:
			take_damage(hit.damage)
			flash()
			poise -= hit.poise_damage
			if dead:
				velocity.x = hit.direction * hit.knockback * 0.8
				return
			var armoured: bool = (state == State.ATTACK and current_attack != null
				and current_attack.super_armor and sprite.frame < current_attack.recovery_from)
			if hit.riposte or poise <= 0.0:
				velocity.x = hit.direction * hit.knockback
				_stagger(profile.stagger_time)
			elif armoured or profile.armoured_body:
				velocity.x = hit.direction * hit.knockback * 0.25
			else:
				velocity.x = hit.direction * hit.knockback
				_hurt()


func on_hit_landed(_target: Combatant, _hit: HitData, outcome: HitData.Outcome) -> void:
	if outcome == HitData.Outcome.PARRIED:
		_stagger(profile.parried_time)


func on_attack_finished(_attack: AttackDefinition) -> void:
	if state == State.ATTACK:
		_recover()


func on_animation_finished(animation: StringName) -> void:
	if animation == &"block_hit" and state == State.GUARD:
		sprite.play(&"block")


func on_died() -> void:
	move_intent = 0.0
	_set_state(State.DEAD)
	hurtbox.set_deferred(&"monitorable", false)
	sprite.play(&"death")


# --- Internals -----------------------------------------------------------------------------------

func _hurt() -> void:
	cancel_attack()
	_timer = profile.hurt_time
	_set_state(State.HURT)
	sprite.play(&"hurt")


func _stagger(seconds: float) -> void:
	cancel_attack()
	_timer = seconds
	_set_state(State.STAGGER)
	sprite.play(&"stagger" if sprite.sprite_frames.has_animation(&"stagger") else &"hurt")
	staggered.emit()


func _recover() -> void:
	if dead:
		return
	if state == State.STAGGER:
		poise = max_poise
	untouchable = false
	cancel_attack()
	_set_state(State.READY)
	sprite.play(&"idle")


func _animate_locomotion() -> void:
	var speed: float = absf(velocity.x)
	if speed < 6.0:
		sprite.speed_scale = 1.0
		if sprite.animation != &"idle" and sprite.animation != &"alert":
			sprite.play(&"idle")
		return
	# Giving ground, he backs away facing his enemy: the walk plays in reverse.
	var backing: bool = signf(velocity.x) != facing
	if running and not backing and sprite.sprite_frames.has_animation(&"run"):
		if sprite.animation != &"run":
			sprite.play(&"run")
		sprite.speed_scale = clampf(speed / run_animation_speed, 0.5, 1.6)
	else:
		if sprite.animation != &"walk":
			sprite.play(&"walk")
		sprite.speed_scale = clampf(speed / walk_animation_speed, 0.5, 1.6) * (-1.0 if backing else 1.0)


## Plays an animation outside of combat (the alert shout).
func play_action(animation: StringName) -> void:
	if sprite.sprite_frames.has_animation(animation):
		sprite.speed_scale = 1.0
		sprite.play(animation)


## Keeps soldiers from standing inside one another.
func _separate(delta: float) -> void:
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var other: MongolSoldier = node as MongolSoldier
		if other == null or other == self or other.dead:
			continue
		var dx: float = global_position.x - other.global_position.x
		if absf(dx) < SEPARATION and absf(global_position.y - other.global_position.y) < 40.0:
			var push: float = 1.0 if dx >= 0.0 else -1.0
			if is_zero_approx(dx):
				push = 1.0 if get_instance_id() > other.get_instance_id() else -1.0
			velocity.x += push * 520.0 * delta


func _update_attack_frame() -> void:
	super._update_attack_frame()
	if (current_attack != null and projectile_scene != null and not _fired
			and current_attack.projectile_frame >= 0 and sprite.frame >= current_attack.projectile_frame):
		_fired = true
		_fire()


func _fire() -> void:
	var projectile: Node2D = projectile_scene.instantiate() as Node2D
	projectile.set(&"direction", facing)
	projectile.set(&"shooter", self)
	get_parent().add_child(projectile)
	projectile.global_position = global_position + Vector2(projectile_offset.x * facing, projectile_offset.y)
	projectile_spawned.emit(projectile)


func _set_state(next: State) -> void:
	if state == next:
		return
	state = next
	if next != State.READY:
		sprite.speed_scale = 1.0
	state_changed.emit(next)
