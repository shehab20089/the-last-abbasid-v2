class_name MongolSoldier
extends Combatant
## A soldier of Hulegu's army: the body a brain drives. It walks where it is told, swings the
## attacks it is given, raises its guard, and reels from blows. It decides nothing itself; its
## EnemyBrain child does. Light blows interrupt it unless its attack is armoured; poise broken, a
## riposte, a broken guard or a parried blow leave it staggered and open. Caught unaware (busy with
## his plunder, his back turned), he dies of the first blow. How he falls follows the blow that
## killed him: a cut can take his head, an arm or a leg, the heavy cleave can cut him in two.

signal state_changed(state: State)
signal guarded_hit(hit: HitData)
signal staggered
## The first blow landed on him before he knew the hero was there (it killed him).
signal surprised
## The stroke of an execution fell: the captive kneeling before him is beheaded.
signal executed
## A boss brought to his knee by what would have been the killing blow; the finishing stroke follows.
signal beaten
## A projectile left its hands (an arrow); the session hooks up its sounds and sparks.
signal projectile_spawned(projectile: Node2D)

enum State {READY, ATTACK, GUARD, HURT, STAGGER, ACTING, DEAD}

## A staggered soldier this badly hurt (a fraction of his health) can be finished.
const FINISH_HEALTH: float = 0.5
const FRICTION: float = 900.0
## Braking once an attack's lunge ends: he plants his feet rather than skating on.
const ATTACK_FRICTION: float = 1600.0
## Friction while reeling from a blow, low enough that the knockback reads as a slide.
const REEL_FRICTION: float = 620.0
const SEPARATION: float = 20.0
## How brightly a killing blow flashes him (a living one flashes fully).
const KILL_FLASH: float = 0.25
## The frame of the behead animation on which the stroke falls, and how long the stroke takes.
const BEHEAD_STRIKE: int = 2
const BEHEAD_TIME: float = 0.95

@export var profile: EnemyProfile
## The way he faces when the level starts: +1 right, -1 left.
@export var start_facing: float = -1.0
## The walk and run animations' own foot speeds (px/s), so the feet match the ground.
@export var walk_animation_speed: float = 60.0
@export var run_animation_speed: float = 117.0
## Spawned at an attack's projectile frame (the archer's arrow).
@export var projectile_scene: PackedScene
## Where the projectile leaves, in body space facing right.
@export var projectile_offset: Vector2 = Vector2(22, -57)
## The pieces a killing blow can cut from him and where he bleeds (generated with his sprites).
@export var gore_set: GoreSet

## -1..1: where the brain wants to go.
var move_intent: float = 0.0
## What he does while he stands: his guard, or a task he is busy with (looting, burning books).
var rest_animation: StringName = &"idle"
## True while he has not noticed the hero (the brain says so).
var unaware: bool = false
var running: bool = false
var state: State = State.READY
var spawn_point: Vector2 = Vector2.ZERO
## While true every blow passes through him (a boss's roar, a set piece).
var untouchable: bool = false
## The blow that killed him, once one has.
var killing_hit: HitData
## What that blow cut off (head, arm, leg, waist), or nothing.
var severed: StringName = &""
var _timer: float = 0.0
var _fired: bool = false
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()

## Whether killing blows cut men apart (the gore setting; the session sets it).
static var dismemberment: bool = true

## Beaten to his knee (a boss), waiting for the finishing stroke.
var is_beaten: bool = false
var _finishing: bool = false
## Being finished by the hero (a scripted kill): his half plays out, and he dies on its death frame.
var in_finisher: bool = false
## Set by his brain while he is in the fight (he has seen the hero and not given up on him).
var engaged: bool = false


func _ready() -> void:
	max_health = profile.max_health
	max_poise = profile.max_poise
	team = 1
	super._ready()
	add_to_group(&"enemies")
	spawn_point = global_position
	set_facing(start_facing)
	sprite.play(&"idle")
	_rng.seed = hash(String(name))
	sprite.frame_changed.connect(_on_action_frame)


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
				velocity.x = move_toward(velocity.x, 0.0, ATTACK_FRICTION * delta)
		_:
			var friction: float = REEL_FRICTION if state == State.HURT or state == State.STAGGER else FRICTION
			velocity.x = move_toward(velocity.x, 0.0, friction * delta)
			if state != State.DEAD:
				_timer -= delta
				if _timer <= 0.0:
					_recover()
	if state != State.DEAD and not in_finisher:
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


## A boss does not die of the blow that would have killed him: it brings him to his knee, his
## guard gone, and the session plays the finishing stroke. True when it did.
func _beaten_by(damage: float) -> bool:
	if not profile.armoured_body or is_beaten or damage < health or not sprite.sprite_frames.has_animation(&"beaten"):
		return false
	is_beaten = true
	health = 1.0
	health_changed.emit(health, max_health)
	flash(0.6)
	act(&"beaten", 60.0, true)
	beaten.emit()
	return true


## The finishing stroke: his head, where he kneels.
func finish() -> void:
	if dead:
		return
	untouchable = false
	_finishing = true
	take_damage(health)


## Staggers him (a cinematic, a test): open, dazed, for `seconds`.
func stagger(seconds: float) -> void:
	if not dead:
		_stagger(seconds)


## A staggered soldier can be finished once his wounds have brought him this low (a fraction of his
## health): a parry on a fresh man opens him to the riposte, not to the finisher.
func can_be_finished() -> bool:
	return (not dead and not in_finisher and state == State.STAGGER and not profile.armoured_body and not is_beaten
		and health <= max_health * FINISH_HEALTH)


func in_fight() -> bool:
	return engaged and not dead and not in_finisher


## With reduced gore, only a finisher that cuts nothing off (the thrust).
func has_finisher(finisher: FinisherDefinition) -> bool:
	return super(finisher) and (dismemberment or finisher.cuts.is_empty())


func begin_finisher(animation: StringName, speed: float = 1.0) -> void:
	cancel_attack()
	in_finisher = true
	untouchable = true
	unaware = false
	move_intent = 0.0
	velocity = Vector2.ZERO
	_set_state(State.ACTING)
	_timer = 60.0
	sprite.play(animation)
	sprite.speed_scale = speed


func finisher_cut(cut: StringName) -> void:
	severed = cut


func finisher_kill() -> void:
	if dead:
		return
	untouchable = false
	take_damage(health)


## Leaves the fight (an archer whose comrades have all fallen): runs off into the smoke and is gone.
func withdraw(away: float) -> void:
	if dead:
		return
	untouchable = true
	cancel_attack()
	_set_state(State.ACTING)
	_timer = 60.0
	var brain: Node = get_node_or_null(^"Brain")
	if brain != null:
		brain.process_mode = Node.PROCESS_MODE_DISABLED
	set_facing(away)
	if sprite.sprite_frames.has_animation(&"run"):
		sprite.play(&"run")
	var flight: Tween = create_tween()
	flight.set_parallel(true)
	flight.tween_property(self, ^"position:x", position.x + away * 90.0, 1.1)
	flight.tween_property(self, ^"modulate:a", 0.0, 1.1)
	flight.chain().tween_callback(queue_free)


## Beheads the captive kneeling before him (the stroke falls on BEHEAD_STRIKE).
func execute() -> void:
	act(&"behead", BEHEAD_TIME)


func _on_action_frame() -> void:
	if state == State.ACTING and sprite.animation == &"behead" and sprite.frame == BEHEAD_STRIKE:
		executed.emit()


## Puts the soldier back at its post, alive and whole (a level reset).
func reset_to_spawn() -> void:
	revive(spawn_point)
	killing_hit = null
	severed = &""
	_set_state(State.READY)
	hurtbox.set_deferred(&"monitorable", true)
	sprite.play(&"idle")


# --- Being struck --------------------------------------------------------------------------------

func judge_hit(hit: HitData) -> HitData.Outcome:
	if dead or untouchable:
		return HitData.Outcome.IGNORED
	# A shield wall stands guard whenever he is not swinging or reeling.
	var walled: bool = profile.shield_wall and (state == State.READY or state == State.GUARD)
	if (state == State.GUARD or walled) and is_frontal(hit):
		if hit.unblockable or hit.overwhelms or (hit.guard_break and not walled):
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
			killing_hit = hit
			if _beaten_by(hit.damage * 0.5):
				return
			take_damage(hit.damage * 0.5)
			flash(KILL_FLASH if dead else 1.0)
			if not dead:
				velocity.x = hit.direction * hit.knockback
				_stagger(profile.stagger_time)
		HitData.Outcome.HIT:
			if unaware and not profile.armoured_body:
				# Caught at his plunder, he never sees the blade.
				unaware = false
				hit.surprise = true
				killing_hit = hit
				velocity.x = hit.direction * hit.knockback * 0.5
				take_damage(health)
				surprised.emit()
				return
			killing_hit = hit
			if _beaten_by(hit.damage):
				return
			take_damage(hit.damage)
			# A killing blow barely flashes: the cut is the thing to see.
			flash(KILL_FLASH if dead else 1.0)
			poise -= hit.poise_damage
			if dead:
				velocity.x = hit.direction * hit.knockback * 0.8
				return
			var armoured: bool = (state == State.ATTACK and current_attack != null
				and current_attack.super_armor and sprite.frame < current_attack.recovery_from)
			if hit.riposte or poise <= 0.0:
				velocity.x = hit.direction * hit.knockback
				_stagger(profile.stagger_time)
			elif armoured or profile.armoured_body or profile.unflinching:
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
	if in_finisher:
		# His half of the finisher plays on to its end; what it cut off is already cut.
		return
	severed = _severed_by(killing_hit)
	if _finishing and sprite.sprite_frames.has_animation(&"executed"):
		sprite.play(&"executed")
	else:
		sprite.play(StringName("death_%s" % severed) if severed != &"" else &"death")


## What the killing blow cuts off, if anything: a blow he never saw coming, or a riposte, takes his
## head; any other takes what its definition can cut (`severs`), as often as `sever_chance` says.
func _severed_by(hit: HitData) -> StringName:
	if not dismemberment:
		return &""
	# A boss loses his head, however he falls.
	if profile.armoured_body:
		return &"head" if _can_lose(&"head") else &""
	if hit == null or hit.attack == null:
		return &""
	if hit.surprise or hit.riposte:
		return &"head" if _can_lose(&"head") else &""
	var cuts: Array[StringName] = hit.attack.severs
	if cuts.is_empty() or _rng.randf() >= hit.attack.sever_chance:
		return &""
	var cut: StringName = cuts[_rng.randi() % cuts.size()]
	return cut if _can_lose(cut) else &""


func _can_lose(part: StringName) -> bool:
	return sprite.sprite_frames.has_animation(StringName("death_%s" % part))


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
		if sprite.animation != rest_animation and sprite.animation != &"alert":
			var rest: StringName = rest_animation if sprite.sprite_frames.has_animation(rest_animation) else &"idle"
			sprite.play(rest)
			# Soldiers standing together do not breathe, or loot, in step.
			sprite.set_frame_and_progress(absi(hash(name)) % sprite.sprite_frames.get_frame_count(rest), 0.0)
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
