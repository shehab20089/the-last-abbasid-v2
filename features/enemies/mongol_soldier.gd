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
## Flinched twice close together, he steels himself: blows still wound him but no longer stop him.
signal steeled
## Set ablaze (he burns, and a common soldier runs burning).
signal ignited
## Thrown off his feet by a great blow.
signal knocked_down
## Behind his shield he beat the hero's blade aside (a duellist's parry): his brain answers with a riposte.
signal parried_blow
## He leapt back out of reach.
signal evaded
## The first blow landed on him before he knew the hero was there (it killed him).
signal surprised
## The stroke of an execution fell: the captive kneeling before him is beheaded.
signal executed
## A boss brought to his knee by what would have been the killing blow; the finishing stroke follows.
signal beaten
## A projectile left its hands (an arrow); the session hooks up its sounds and sparks.
signal projectile_spawned(projectile: Node2D)

enum State {READY, ATTACK, GUARD, HURT, STAGGER, ACTING, DEAD, DOWN}
## Thrown down: falling, lying on the street, getting up (untouchable as he rises).
enum DownPhase {FALL, LIE, RISE}

## A staggered soldier this badly hurt (a fraction of his health) can be finished.
const FINISH_HEALTH: float = 0.5
## The share of a turned blow's poise damage a shield wall feels (a round shield, half): his tall shield takes it
## full on, so only what is meant to open it does (an overwhelming blow, one from behind, a parry's riposte).
const WALL_POISE: float = 0.1
const FRICTION: float = 900.0
## Braking once an attack's lunge ends: he plants his feet rather than skating on.
const ATTACK_FRICTION: float = 1600.0
## Friction while reeling from a blow, low enough that the knockback reads as a slide.
const REEL_FRICTION: float = 820.0
const SEPARATION: float = 24.0
## How hard comrades standing inside one another are pushed apart (px/s/s).
const SEPARATION_PUSH: float = 1400.0
## A knife thrown at a man who never saw it: this many times its harm (it takes a blade to kill unseen).
const THROWN_SURPRISE: float = 2.0
## How brightly a killing blow flashes him (a living one flashes fully).
const KILL_FLASH: float = 0.25
## The frame of the behead animation on which the stroke falls, and how long the stroke takes.
const BEHEAD_STRIKE: int = 2
const BEHEAD_TIME: float = 0.95
## A blow this heavy that does not floor him makes him reel back instead of flinching.
const REEL_KNOCKBACK: float = 240.0
## A man left open to a finisher is shoved no faster than this (px/s): never out of the hero's reach.
const FINISHABLE_PUSH: float = 150.0
## Blows on his shield further apart than this (s) are not one string: the row starts again.
const BLOCK_MEMORY: float = 1.4
## Burning: harm every BURN_TICK s; how far (px) a burning man sets alight a comrade he runs into.
## A blow that draws men in leaves a man this near the striker (px) where he is.
const PULL_STOP: float = 26.0
const BURN_TICK: float = 0.35
const BURN_DAMAGE: float = 6.0
const BURN_SPREAD: float = 18.0
## A man thrown down slides back with this share of the blow's force, and this friction stops him.
const DOWN_PUSH: float = 0.7
const DOWN_FRICTION: float = 900.0
## A man struck again where he lies stays down this much longer.
const DOWN_STRUCK: float = 0.35
## Flinches close together (within FLINCH_WINDOW s) before he steels himself for STEELED_TIME s.
const FLINCH_LIMIT: int = 2
const FLINCH_WINDOW: float = 1.2
const STEELED_TIME: float = 1.0

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
## How eagerly he fights (the level's): his pauses between blows shortened by it, his guard raised more
## readily. A boss keeps his own measure.
var aggression: float = 1.0
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
var _down_phase: DownPhase = DownPhase.FALL
## Each flinch takes the other pose, so a string of blows does not repeat one.
var _flinch_alt: bool = false
## The hero's blows blocked in a row behind his raised shield (a duellist parries the next), and the time
## since the last (a pause ends the row).
var _blocked_in_row: int = 0
var _since_blocked: float = 0.0
## Burning: the time left, the next harm, the way he runs, whether he runs (a boss burns but fights on), and
## whether he has set a comrade alight yet.
var _burning: float = 0.0
var _burn_tick: float = 0.0
var _burn_away: float = 1.0
var _panicking: bool = false
var _spread: bool = false
## Flinches in the current window, the window's time left, and how long he stays steeled.
var _flinches: int = 0
var _flinch_window: float = 0.0
var _steeled: float = 0.0
## Struck once where he lies already (that keeps him down a moment longer, once a fall).
var _down_struck: bool = false
## The hurtbox standing (it lies low while he is down).
var _stand_size: Vector2 = Vector2.ZERO
var _stand_at: Vector2 = Vector2.ZERO


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
	_flinch_window = maxf(0.0, _flinch_window - delta)
	_steeled = maxf(0.0, _steeled - delta)
	_since_blocked += delta
	if _burning > 0.0 and not dead:
		_burn(delta)
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
		State.DOWN:
			velocity.x = move_toward(velocity.x, 0.0, DOWN_FRICTION * delta)
			if _down_phase == DownPhase.LIE:
				_timer -= delta
				if _timer <= 0.0:
					_rise()
		_:
			var friction: float = REEL_FRICTION if state == State.HURT or state == State.STAGGER else FRICTION
			velocity.x = move_toward(velocity.x, 0.0, friction * delta)
			if state != State.DEAD:
				_timer -= delta
				if _timer <= 0.0:
					_recover()
	# Running burning, blind: away from the fire's heart, turning back at a drop.
	if _panicking and state == State.ACTING and not dead:
		if not _floor_ahead(_burn_away):
			_burn_away = -_burn_away
			set_facing(_burn_away)
		velocity.x = _burn_away * profile.run_speed * 0.9
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


## Springs back out of reach (a skirmisher's leap): untouchable in the air, carried back at `speed`.
func evade(speed: float, seconds: float) -> bool:
	if not can_act() or not sprite.sprite_frames.has_animation(&"evade"):
		return false
	act(&"evade", seconds, true)
	velocity.x = -facing * speed
	evaded.emit()
	return true


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


## Tougher than the first level's soldiers (the level says how much); a boss is as his profile made him.
## The level's eagerness for the fight (see `aggression`); a boss in his armour keeps his own.
func set_aggression(value: float) -> void:
	if not profile.armoured_body:
		aggression = maxf(value, 0.1)


func toughen(health_scale: float, poise_scale: float) -> void:
	if profile.armoured_body:
		return
	max_health = profile.max_health * health_scale
	health = max_health
	max_poise = profile.max_poise * poise_scale
	poise = max_poise
	health_changed.emit(health, max_health)


## A heavy blow lands beside him: thrown off his stroke for a moment. Not a man nothing stops (a
## mace-bearer, a boss in his armour), nor one already reeling, nor one in an armoured swing.
func flinch(away: float) -> void:
	if dead or untouchable or in_finisher or profile.armoured_body or profile.unflinching:
		return
	if state == State.STAGGER or state == State.ACTING or state == State.HURT:
		return
	if (state == State.ATTACK and current_attack != null and current_attack.super_armor
			and sprite.frame < current_attack.recovery_from):
		return
	velocity.x = away * 110.0
	_hurt()


## A staggered soldier can be finished once his wounds have brought him this low (a fraction of his
## health): a parry on a fresh man opens him to the riposte, not to the finisher.
## A shield wall stands guard whenever he is not swinging or reeling.
func _walled() -> bool:
	return profile.shield_wall and (state == State.READY or state == State.GUARD)


func can_be_finished() -> bool:
	return (not dead and not in_finisher and (state == State.STAGGER or is_down()) and not profile.armoured_body
		and not is_beaten and health <= max_health * FINISH_HEALTH)


## Lying on the street (falling or lying, not yet rising).
func is_down() -> bool:
	return state == State.DOWN and _down_phase != DownPhase.RISE and not dead


func is_guarding() -> bool:
	return not dead and state == State.GUARD


func is_reeling() -> bool:
	return not dead and (state == State.HURT or state == State.STAGGER or state == State.DOWN)


## Thrown off his feet: he falls, lies a moment, and gets up.
func knock_down() -> void:
	cancel_attack()
	_down_struck = false
	_set_state(State.DOWN)
	_down_phase = DownPhase.FALL
	_timer = profile.down_time
	sprite.play(&"knockdown")
	_lie_low(true)
	knocked_down.emit()


## A man no blow floors (a captain in his armour, a mace-bearer), or one with no fall drawn.
func _steadfast() -> bool:
	return profile.armoured_body or profile.unflinching or not sprite.sprite_frames.has_animation(&"knockdown")


func _rise() -> void:
	_down_phase = DownPhase.RISE
	untouchable = true
	sprite.play(&"getup")


## While he is down his hurtbox lies along the street behind him, so only a blow driven down finds him.
func _lie_low(down: bool) -> void:
	var shape: CollisionShape2D = hurtbox.get_node_or_null(^"Shape") as CollisionShape2D
	if shape == null or not shape.shape is RectangleShape2D:
		return
	if _stand_size == Vector2.ZERO:
		# His own shape (scenes share theirs).
		shape.shape = shape.shape.duplicate()
		var standing: RectangleShape2D = shape.shape as RectangleShape2D
		_stand_size = standing.size
		_stand_at = shape.position
	var rect: RectangleShape2D = shape.shape as RectangleShape2D
	if down:
		rect.size = Vector2(56, 18)
		shape.position = Vector2(-facing * 16.0, -9.0)
	else:
		rect.size = _stand_size
		shape.position = _stand_at


## The Judgment of the Guard finishes a common soldier at once, a hardened one only once wounded to
## half; never a boss in his armour.
func can_be_judged() -> bool:
	return (not dead and not in_finisher and not profile.armoured_body and not is_beaten and not untouchable
		and (not profile.elite or health <= max_health * FINISH_HEALTH))


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


## The guard's cry breaks his nerve: whatever he was doing is broken off and he is thrown back, staggered.
## A boss in his armour only gives ground; a man down, in a finisher or already dead hears nothing.
func frighten(away: float, knockback: float, seconds: float) -> void:
	if dead or untouchable or in_finisher or state == State.DOWN:
		return
	if profile.armoured_body:
		velocity.x = away * knockback * 0.35
		return
	cancel_attack()
	velocity.x = away * knockback
	_stagger(seconds)


## Set ablaze: he burns `seconds`, harmed every BURN_TICK; a common soldier panics and runs burning `away`
## (no blow, no guard) and sets alight the first comrade he blunders into; a boss burns but fights on.
func ignite(seconds: float, away: float) -> void:
	if dead or in_finisher:
		return
	var fresh: bool = _burning <= 0.0
	_burning = maxf(_burning, seconds)
	if away != 0.0:
		_burn_away = away
	if fresh:
		_burn_tick = 0.12
		_spread = false
		ignited.emit()
	if not profile.armoured_body and state != State.DOWN:
		_panic()


func is_untouchable() -> bool:
	return untouchable


func is_burning() -> bool:
	return _burning > 0.0 and not dead


## Seconds he has yet to burn.
func burn_left() -> float:
	return _burning


func _panic() -> void:
	cancel_attack()
	unaware = false
	_panicking = true
	_timer = _burning
	_set_state(State.ACTING)
	set_facing(_burn_away)
	sprite.play(&"run" if sprite.sprite_frames.has_animation(&"run") else &"hurt")


func _burn(delta: float) -> void:
	_burning = maxf(0.0, _burning - delta)
	_burn_tick -= delta
	if _burn_tick <= 0.0:
		_burn_tick = BURN_TICK
		flash(0.45, Color(1.0, 0.55, 0.2))
		take_damage(BURN_DAMAGE)
		if dead:
			_panicking = false
			return
	if not _spread:
		for node: Node in get_tree().get_nodes_in_group(&"enemies"):
			var other: MongolSoldier = node as MongolSoldier
			if (other != null and other != self and not other.dead and not other.is_burning()
					and absf(other.global_position.x - global_position.x) <= BURN_SPREAD
					and absf(other.global_position.y - global_position.y) <= 30.0):
				_spread = true
				other.ignite(_burning * 0.7, signf(other.global_position.x - global_position.x))
				break
	if _burning <= 0.0:
		_panicking = false


## The street goes on a step ahead (a burning man turns back at a drop).
func _floor_ahead(direction: float) -> bool:
	var space: PhysicsDirectSpaceState2D = get_world_2d().direct_space_state
	var ahead: Vector2 = global_position + Vector2(direction * 16.0, -6.0)
	return not space.intersect_ray(PhysicsRayQueryParameters2D.create(ahead, ahead + Vector2(0, 30), 1)).is_empty()


## His blow broken off before it was thrown (a feint): ready again, free to raise his guard.
func break_off() -> void:
	cancel_attack()
	_set_state(State.READY)


# --- Being struck --------------------------------------------------------------------------------

func judge_hit(hit: HitData) -> HitData.Outcome:
	if dead or untouchable:
		return HitData.Outcome.IGNORED
	# A blow no shield can stop (the fully charged cleave) goes through any guard, a wall's too.
	if hit.unblockable:
		return HitData.Outcome.HIT
	var walled: bool = _walled()
	if (state == State.GUARD or walled) and is_frontal(hit) and not (hit.low and not walled):
		if hit.overwhelms or (hit.guard_break and not walled):
			_blocked_in_row = 0
			return HitData.Outcome.GUARD_BROKEN
		# A duellist reads a string beaten on his shield, and turns the next blow of it.
		if (profile.parries_after > 0 and state == State.GUARD and hit.parryable and not hit.projectile
				and (hit.attack == null or not hit.attack.feint)):
			if _since_blocked > BLOCK_MEMORY:
				_blocked_in_row = 0
			_since_blocked = 0.0
			_blocked_in_row += 1
			if _blocked_in_row > profile.parries_after:
				_blocked_in_row = 0
				return HitData.Outcome.PARRIED
		return HitData.Outcome.BLOCKED
	_blocked_in_row = 0
	return HitData.Outcome.HIT


func on_struck(hit: HitData, outcome: HitData.Outcome) -> void:
	# A blow that takes a share of any man, however strong (the Judgment's great blow).
	if hit.attack != null and hit.attack.health_share > 0.0:
		hit.damage = maxf(hit.damage, max_health * hit.attack.health_share)
	# Braced against a great technique (a boss), he takes only part of it.
	if hit.attack != null and hit.attack.art and profile.art_resistance > 0.0:
		hit.damage *= 1.0 - profile.art_resistance
		hit.poise_damage *= 1.0 - profile.art_resistance
	match outcome:
		HitData.Outcome.PARRIED:
			# His shield beat the blade aside: his guard comes down for the riposte.
			flash(0.3)
			release_guard()
			parried_blow.emit()
		HitData.Outcome.BLOCKED:
			velocity.x = hit.shove(0.0, 0.5)
			_drawn(hit)
			poise -= hit.poise_damage * (WALL_POISE if _walled() else 0.5)
			_poise_timer = poise_recovery_delay
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
				velocity.x = hit.shove()
				if hit.attack != null and hit.attack.knocks_down and not _steadfast():
					velocity.x *= DOWN_PUSH
					knock_down()
				else:
					_stagger(profile.stagger_time * hit.stagger_scale)
				_keep_in_reach()
		HitData.Outcome.HIT:
			if unaware and not profile.armoured_body and hit.projectile:
				# A knife out of the dark wounds him badly and turns him; it takes a blade to kill unseen.
				unaware = false
				hit.damage *= THROWN_SURPRISE
			elif unaware and not profile.armoured_body:
				# Caught at his plunder, he never sees the blade.
				unaware = false
				hit.surprise = true
				killing_hit = hit
				velocity.x = hit.shove(0.0, 0.5)
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
			_poise_timer = poise_recovery_delay
			if dead:
				velocity.x = hit.shove(0.0, 0.8)
				return
			# Struck where he lies: a blow driven down rouses him (once a fall); any other keeps him down a
			# moment longer, once.
			if state == State.DOWN:
				if hit.attack != null and hit.attack.rouses and _down_phase == DownPhase.LIE:
					_rise()
				elif not _down_struck:
					_down_struck = true
					_timer += DOWN_STRUCK
				return
			var armoured: bool = (state == State.ATTACK and current_attack != null
				and current_attack.super_armor and sprite.frame < current_attack.recovery_from)
			if hit.attack != null and hit.attack.knocks_down and not _steadfast():
				velocity.x = hit.shove(0.0, DOWN_PUSH)
				knock_down()
			elif state == State.STAGGER:
				# Staggered, he stays as open as he was: a blow neither ends the opening nor stretches it, though
				# a great one (the thrust, the kick) still drives him back.
				velocity.x = hit.shove(0.0, 1.0 if hit.knockback >= REEL_KNOCKBACK else 0.25)
			elif hit.riposte or poise <= 0.0:
				velocity.x = hit.shove()
				_stagger(profile.stagger_time * hit.stagger_scale)
			elif armoured or profile.armoured_body or profile.unflinching or _steeled > 0.0:
				velocity.x = hit.shove(0.0, 0.25)
			else:
				velocity.x = hit.shove()
				_flinch(hit.knockback >= REEL_KNOCKBACK)
			_keep_in_reach()
			_drawn(hit)


func on_hit_landed(_target: Combatant, _hit: HitData, outcome: HitData.Outcome) -> void:
	if outcome == HitData.Outcome.PARRIED:
		_stagger(profile.parried_time, &"parried")


func on_attack_finished(_attack: AttackDefinition) -> void:
	if state == State.ATTACK:
		_recover()


func on_animation_finished(animation: StringName) -> void:
	if animation == &"block_hit" and state == State.GUARD:
		sprite.play(&"block")
	elif animation == &"knockdown" and state == State.DOWN and _down_phase == DownPhase.FALL:
		_down_phase = DownPhase.LIE
		sprite.play(&"down")
	elif animation == &"getup" and state == State.DOWN:
		_lie_low(false)
		_recover()


func on_died() -> void:
	var lying: bool = state == State.DOWN
	move_intent = 0.0
	_set_state(State.DEAD)
	hurtbox.set_deferred(&"monitorable", false)
	if in_finisher:
		# His half of the finisher plays on to its end; what it cut off is already cut.
		return
	if lying and sprite.sprite_frames.has_animation(&"death_down"):
		# Killed where he lay.
		sprite.play(&"death_down")
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

## A blow that draws men in (the Storm's turns) stops drawing a man already at the striker's side: none is
## dragged through him.
func _drawn(hit: HitData) -> void:
	if (hit.pulls and hit.attacker != null and is_instance_valid(hit.attacker)
			and absf(hit.attacker.global_position.x - global_position.x) < PULL_STOP):
		velocity.x = 0.0


## Left open to a finisher (staggered or down, wounded enough), a blow does not throw him out of reach.
func _keep_in_reach() -> void:
	if can_be_finished():
		velocity.x = clampf(velocity.x, -FINISHABLE_PUSH, FINISHABLE_PUSH)


## Struck and flinching. The FLINCH_LIMIT-th flinch close together steels him for STEELED_TIME: blows
## still wound him and can still break his poise, but no longer stop what he is doing.
func _flinch(heavy: bool) -> void:
	if _flinch_window <= 0.0:
		_flinches = 0
	_flinch_window = FLINCH_WINDOW
	_flinches += 1
	if _flinches >= FLINCH_LIMIT:
		_flinches = 0
		_steeled = STEELED_TIME
		steeled.emit()
	_hurt(heavy)


## A flinch: the two poses taken in turn, or, from a great blow that does not floor him, a reel back.
func _hurt(heavy: bool = false) -> void:
	cancel_attack()
	_timer = profile.hurt_time
	_set_state(State.HURT)
	var frames: SpriteFrames = sprite.sprite_frames
	if heavy and frames.has_animation(&"reel"):
		_timer = profile.hurt_time * 1.4
		sprite.play(&"reel")
		return
	_flinch_alt = not _flinch_alt
	sprite.play(&"hurt_b" if _flinch_alt and frames.has_animation(&"hurt_b") else &"hurt")


## Staggered, open: thrown open by a parry (parried), or his poise broken.
func _stagger(seconds: float, animation: StringName = &"stagger") -> void:
	cancel_attack()
	_timer = seconds
	_set_state(State.STAGGER)
	var frames: SpriteFrames = sprite.sprite_frames
	if not frames.has_animation(animation):
		animation = &"stagger" if frames.has_animation(&"stagger") else &"hurt"
	sprite.play(animation)
	staggered.emit()


func _recover() -> void:
	if dead:
		return
	if _burning > 0.0 and not profile.armoured_body and state != State.DOWN:
		_panic()
		return
	_panicking = false
	if state == State.STAGGER or state == State.DOWN:
		poise = max_poise
	if state == State.DOWN:
		_lie_low(false)
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
			velocity.x += push * SEPARATION_PUSH * delta


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
