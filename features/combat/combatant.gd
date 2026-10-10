class_name Combatant
extends CharacterBody2D
## The body every fighter shares, hero and soldier alike: health and poise, facing, the sprite,
## the blade's hitbox driven frame by frame by the attack animation, and the rules for being
## struck. Subclasses answer blows their own way (blocks, parries, rolls) by overriding judge_hit
## and on_struck, and decide what follows an attack in on_attack_finished.

signal health_changed(current: float, maximum: float)
## This combatant was struck, whatever the outcome.
signal struck(hit: HitData, outcome: HitData.Outcome)
## A blow of this combatant's reached another.
signal hit_landed(target: Combatant, hit: HitData, outcome: HitData.Outcome)
## An attack's blade went live (the swing sound).
signal swung(attack: AttackDefinition)
## An attack reached its warning frame (enemy telegraphs).
signal telegraphed(attack: AttackDefinition)
signal died

const GRAVITY: float = 1150.0
const MAX_FALL_SPEED: float = 560.0
const FLASH_WHITE: Color = Color(1.0, 0.94, 0.84)
## Seconds a hit flash takes to fade.
const FLASH_TIME: float = 0.09

@export var max_health: float = 100.0
## Blows never land on the same team.
@export var team: int = 0
@export var max_poise: float = 30.0
## Seconds without being struck before poise refills.
@export var poise_recovery_delay: float = 1.6
## The blade's swept area per animation frame; attacks fall back to their own rectangle.
@export var hitboxes: FrameHitboxes

var health: float = 0.0
var poise: float = 0.0
## +1 facing right, -1 facing left.
var facing: float = 1.0
var dead: bool = false
var current_attack: AttackDefinition
var _poise_timer: float = 0.0
var _flash: float = 0.0
var _blade_live: bool = false
## The live frame the blade last opened on (a flurry opens it again on each).
var _live_frame: int = -1

@onready var sprite: AnimatedSprite2D = $Sprite
@onready var hitbox: Hitbox = $Hitbox
@onready var hurtbox: Hurtbox = $Hurtbox


func _ready() -> void:
	health = max_health
	poise = max_poise
	sprite.frame_changed.connect(_on_sprite_frame_changed)
	sprite.animation_finished.connect(_on_sprite_animation_finished)
	hitbox.touched.connect(_on_hitbox_touched)


func _process(delta: float) -> void:
	if _flash > 0.0:
		# Real time: a blink, whatever a hit-stop is doing to the world.
		_flash = maxf(0.0, _flash - delta / maxf(Engine.time_scale, 0.001) / FLASH_TIME)
		_apply_flash()


func set_facing(direction: float) -> void:
	if is_zero_approx(direction):
		return
	facing = signf(direction)
	sprite.flip_h = facing < 0.0


## Restores the body for a fresh life at `at`.
func revive(at: Vector2) -> void:
	global_position = at
	velocity = Vector2.ZERO
	health = max_health
	poise = max_poise
	dead = false
	current_attack = null
	hitbox.close()
	_blade_live = false
	health_changed.emit(health, max_health)


# --- Attacking -----------------------------------------------------------------------------------

## Starts an attack: its animation plays from the first frame (or `from_frame`, picking up a wind-up
## held a while) and its frames drive the hitbox.
func begin_attack(attack: AttackDefinition, from_frame: int = 0) -> void:
	current_attack = attack
	attack_serial += 1
	lunge_scale = 1.0
	_blade_live = false
	hitbox.close()
	# An attack keeps its own pace, whatever the walk or the run before it did to the sprite's speed.
	sprite.speed_scale = 1.0
	sprite.play(attack.animation)
	sprite.frame = from_frame
	_update_attack_frame()


## Ends the current attack early (a roll, a stagger, a parry).
func cancel_attack() -> void:
	current_attack = null
	_blade_live = false
	hitbox.close()


func attack_frame() -> int:
	return sprite.frame if current_attack != null else -1


## The current attack's lunge, stretched to reach a man or shortened not to pass him (1: as drawn).
var lunge_scale: float = 1.0
## Counts every attack begun, so a watcher sees each swing once even when the same blow is repeated.
var attack_serial: int = 0


## Stretches or shortens the current attack's lunge (if it `seeks`) so it ends `strike_at` px short of a
## man `gap` px ahead, closing no more than `seeks` px: the lunge frames carry the body, then it slides
## to a stop under `friction`.
func aim_lunge(gap: float, friction: float) -> void:
	var attack: AttackDefinition = current_attack
	if attack == null or attack.seeks <= 0.0 or attack.lunge_speed <= 0.0:
		return
	var frames: SpriteFrames = sprite.sprite_frames
	if frames == null or not frames.has_animation(attack.animation):
		return
	var fps: float = maxf(frames.get_animation_speed(attack.animation), 1.0)
	var count: int = frames.get_frame_count(attack.animation)
	var seconds: float = 0.0
	for f: int in range(attack.lunge_from, mini(attack.lunge_to, count - 1) + 1):
		seconds += frames.get_frame_duration(attack.animation, f) / fps
	# As drawn the lunge carries him `run` px and he slides `slide` more; scaled by s, s*run + s*s*slide.
	var run: float = attack.lunge_speed * seconds
	var slide: float = attack.lunge_speed * attack.lunge_speed / (2.0 * friction)
	var travel: float = clampf(gap - attack.strike_at, 0.0, attack.seeks)
	if run + slide <= 0.0:
		return
	var stretch: float = travel / run if slide <= 0.0 else (-run + sqrt(run * run + 4.0 * slide * travel)) / (2.0 * slide)
	lunge_scale = clampf(stretch, 0.3, 4.0)


## Horizontal speed the current attack drives this frame (its lunge), or NAN when it drives none.
func attack_lunge() -> float:
	if current_attack == null or sprite.animation != current_attack.animation:
		return NAN
	return facing * current_attack.lunge_speed * lunge_scale if current_attack.is_lunge_frame(sprite.frame) else NAN


## The blow an attack deals; subclasses add their own bonuses (a riposte).
func build_hit(attack: AttackDefinition) -> HitData:
	return HitData.from_attack(self, attack)


# --- Being struck --------------------------------------------------------------------------------

## Judges and applies a blow. Returns how it ended.
func receive_hit(hit: HitData) -> HitData.Outcome:
	if dead:
		return HitData.Outcome.IGNORED
	var outcome: HitData.Outcome = judge_hit(hit)
	if outcome == HitData.Outcome.IGNORED:
		return outcome
	on_struck(hit, outcome)
	struck.emit(hit, outcome)
	return outcome


## How this combatant answers a blow. The plain body is simply hit.
func judge_hit(_hit: HitData) -> HitData.Outcome:
	return HitData.Outcome.HIT


## Applies a judged blow. The plain body takes damage, loses poise and is knocked back.
func on_struck(hit: HitData, outcome: HitData.Outcome) -> void:
	if outcome == HitData.Outcome.HIT or outcome == HitData.Outcome.GUARD_BROKEN:
		take_damage(hit.damage)
		poise -= hit.poise_damage
		_poise_timer = poise_recovery_delay
		velocity.x = hit.direction * hit.knockback
		flash()


func take_damage(amount: float) -> void:
	if dead or amount <= 0.0:
		return
	health = maxf(0.0, health - amount)
	health_changed.emit(health, max_health)
	if health <= 0.0:
		die()


func heal(amount: float) -> void:
	if dead:
		return
	health = minf(max_health, health + amount)
	health_changed.emit(health, max_health)


func die() -> void:
	if dead:
		return
	dead = true
	cancel_attack()
	on_died()
	died.emit()


## Whether a finisher can be played on this body now (a staggered soldier). The plain body: never.
func can_be_finished() -> bool:
	return false


## Whether the Judgment of the Guard can finish this body where it stands, staggered or not. The
## plain body: never.
func can_be_judged() -> bool:
	return false


## Whether this body can play its half of a finisher (it has the animation).
func has_finisher(finisher: FinisherDefinition) -> bool:
	return sprite.sprite_frames.has_animation(finisher.victim_animation)


## A finisher begins on this body: it plays its half (at `_speed`, the hero's own), untouchable, held
## where the hero put it.
func begin_finisher(_animation: StringName, _speed: float = 1.0) -> void:
	pass


## A finisher's cut falls (head, arm, leg, waist).
func finisher_cut(_cut: StringName) -> void:
	pass


## A finisher's death frame: the body dies where it is, still playing its half.
func finisher_kill() -> void:
	pass


## True while this body is in the fight against the hero (a soldier who has seen him). The plain
## body: never.
func in_fight() -> bool:
	return false


## Whether this body lies on the ground, thrown down by a great blow. The plain body never does.
func is_down() -> bool:
	return false


## Whether this body stands behind a raised guard. The plain body never does.
func is_guarding() -> bool:
	return false


## Whether this body is being thrown about by a blow (reeling, staggered, down): not walking where it goes.
func is_reeling() -> bool:
	return false


## A heavy blow lands beside this body: it flinches, thrown off its stroke (`away` is the way it
## reels). The plain body takes no notice.
func flinch(_away: float) -> void:
	pass


## Leaves this body reeling, open, for `_seconds`. The plain body takes no notice.
## The guard's cry: thrown back (`away`, at `knockback`) and staggered `seconds`. A plain body does nothing.
## Out of reach of every blow for now (a man rising, one in a finisher). A plain body never is.
func is_untouchable() -> bool:
	return false


func frighten(_away: float, _knockback: float, _seconds: float) -> void:
	pass


## Set ablaze for `seconds` (naphtha), fleeing `away`. A plain body does not burn.
func ignite(_seconds: float, _away: float) -> void:
	pass


func stagger(_seconds: float) -> void:
	pass


## True when the blow comes from the side this combatant faces.
func is_frontal(hit: HitData) -> bool:
	if hit.projectile:
		return hit.direction * facing < 0.0
	if hit.attacker == null:
		return true
	return (hit.attacker.global_position.x - global_position.x) * facing > 0.0


## How strong a struck body's white flash is (a setting softens it for eyes that need it; warnings keep
## their colour).
static var flash_scale: float = 1.0


## Flashes the body toward bone white (struck), or toward a warning colour (a blow no shield
## can stop).
func flash(amount: float = 1.0, color: Color = FLASH_WHITE) -> void:
	_flash = maxf(_flash, amount * (flash_scale if color == FLASH_WHITE else 1.0))
	var flash_material: ShaderMaterial = sprite.material as ShaderMaterial
	if flash_material != null:
		flash_material.set_shader_parameter(&"flash_color", color)
	_apply_flash()


## A soft tint held frame after frame (a soldier open to a finisher); never covers a hit's flash.
func glow(amount: float, color: Color) -> void:
	if _flash <= amount:
		flash(amount, color)


## Refills poise once the combatant has not been struck for a while.
func tick_poise(delta: float) -> void:
	if _poise_timer > 0.0:
		_poise_timer -= delta
	elif poise < max_poise:
		poise = max_poise


# --- Hooks for subclasses ------------------------------------------------------------------------

## A blow of ours reached `target`, which answered with `outcome`.
func on_hit_landed(_target: Combatant, _hit: HitData, _outcome: HitData.Outcome) -> void:
	pass


## The current attack's animation ended on its own.
func on_attack_finished(_attack: AttackDefinition) -> void:
	pass


## A non-attack animation ended (hurt, roll, parry...).
func on_animation_finished(_animation: StringName) -> void:
	pass


func on_died() -> void:
	pass


# --- Internals -----------------------------------------------------------------------------------

func _apply_flash() -> void:
	var flash_material: ShaderMaterial = sprite.material as ShaderMaterial
	if flash_material != null:
		flash_material.set_shader_parameter(&"flash", _flash)


func _on_sprite_frame_changed() -> void:
	if current_attack != null:
		_update_attack_frame()


func _update_attack_frame() -> void:
	if current_attack == null or sprite.animation != current_attack.animation:
		return
	var frame: int = sprite.frame
	if frame == current_attack.telegraph_frame:
		telegraphed.emit(current_attack)
	if current_attack.is_active_frame(frame):
		var shape: PackedVector2Array = _hitbox_shape(current_attack, frame)
		# A flurry strikes afresh on each of its live frames.
		if not _blade_live or (current_attack.rehit and frame != _live_frame):
			_blade_live = true
			_live_frame = frame
			hitbox.open(shape)
			swung.emit(current_attack)
		else:
			hitbox.reshape(shape)
	elif _blade_live:
		_blade_live = false
		hitbox.close()


func _hitbox_shape(attack: AttackDefinition, frame: int) -> PackedVector2Array:
	var points: PackedVector2Array = PackedVector2Array()
	if hitboxes != null and attack.use_blade_sweep:
		points = hitboxes.sweep(attack.animation, frame)
	if points.size() < 3:
		var r: Rect2 = attack.fallback_hitbox
		points = PackedVector2Array([r.position, Vector2(r.end.x, r.position.y), r.end,
			Vector2(r.position.x, r.end.y)])
	if facing < 0.0:
		var flipped: PackedVector2Array = PackedVector2Array()
		for i: int in range(points.size() - 1, -1, -1):
			flipped.append(Vector2(-points[i].x, points[i].y))
		return flipped
	return points


func _on_sprite_animation_finished() -> void:
	if current_attack != null and sprite.animation == current_attack.animation:
		var finished: AttackDefinition = current_attack
		cancel_attack()
		on_attack_finished(finished)
	else:
		on_animation_finished(sprite.animation)


func _on_hitbox_touched(target_box: Hurtbox) -> void:
	var target: Combatant = target_box.owner_body
	if current_attack == null or target == null or target == self or target.dead or target.team == team:
		return
	var hit: HitData = build_hit(current_attack)
	# A cut all round throws each man away on his own side.
	if current_attack.radial and target.global_position.x != global_position.x:
		hit.direction = signf(target.global_position.x - global_position.x)
	var reach: CollisionShape2D = target_box.get_child(0) as CollisionShape2D
	var centre: Vector2 = target.global_position + Vector2(0, -40)
	if reach != null:
		centre = reach.global_position
	hit.position = Vector2(lerpf(global_position.x, centre.x, 0.7), centre.y - 6.0)
	var outcome: HitData.Outcome = target.receive_hit(hit)
	if outcome == HitData.Outcome.IGNORED:
		return
	on_hit_landed(target, hit, outcome)
	hit_landed.emit(target, hit, outcome)
