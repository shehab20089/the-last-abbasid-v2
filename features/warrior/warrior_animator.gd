class_name WarriorAnimator
extends Node
## Chooses the hero's animation from his state and motion, keeps the walk and run feet matched to
## the ground speed, and reports footfalls. Combat actions ask for their animations through play().
## On the ground the run has its moments: a lean into it from a standstill, the heels dug in pulling up
## out of it, a pivot when he turns about on it. Gameplay timing never reads anything here except
## through the sprite's frames.

signal footstep

## Frames of the walk and run cycles on which a foot strikes the ground (and of the guarded steps behind the
## shield).
const STEP_FRAMES: Dictionary[StringName, Array] = {&"walk": [0, 4], &"run": [0, 4], &"block_walk": [0, 3],
	&"block_back": [0, 3]}
## Slower than this behind the shield, he holds his guard still.
const GUARD_STILL: float = 6.0
## Animations that run on their own once started and are not replaced by locomotion.
const LANDING_TIME: float = 0.16
## The run's one-shot moments, played out before the walk or the run takes over again.
const ONE_SHOTS: Array[StringName] = [&"run_start", &"skid", &"turn"]
## How recently he must have been running for a stop to be a skid or a turn to be a pivot, and how long
## he must not have run for setting off to be a lean into it.
const RAN_LATELY: float = 0.18
const RESTED: float = 0.35

var _sprite: AnimatedSprite2D
var _profile: WarriorProfile
var _landing: float = 0.0
var _last_flip: bool = false
## Seconds since he last moved at a run.
var _since_run: float = 10.0


func setup(sprite: AnimatedSprite2D, profile: WarriorProfile) -> void:
	_sprite = sprite
	_profile = profile
	_last_flip = sprite.flip_h
	_sprite.frame_changed.connect(_on_frame_changed)


## Plays an action animation from its first frame.
func play(animation: StringName, restart: bool = true) -> void:
	# An action ends the run: no skid or pivot after it.
	_since_run = 10.0
	_sprite.speed_scale = 1.0
	if restart or _sprite.animation != animation:
		_sprite.play(animation)
		_sprite.frame = 0
		_sprite.frame_progress = 0.0


## Plays the landing crouch for a moment unless the hero moves on at once.
func land() -> void:
	_landing = LANDING_TIME
	play(&"land")


## Picks the locomotion animation for free movement on the ground or in the air.
func locomotion(on_floor: bool, velocity: Vector2, delta: float) -> void:
	_landing = maxf(0.0, _landing - delta)
	var turned: bool = _sprite.flip_h != _last_flip
	_last_flip = _sprite.flip_h
	if not on_floor:
		_since_run = 10.0
		_sprite.speed_scale = 1.0
		if velocity.y < -70.0:
			_switch(&"jump")
		elif velocity.y < 70.0:
			_switch(&"apex")
		else:
			_switch(&"fall")
		return
	var speed: float = absf(velocity.x)
	var running: bool = speed > _profile.walk_speed * 1.15
	var ran_lately: bool = _since_run < RAN_LATELY
	var rested: bool = _since_run > RESTED
	_since_run = 0.0 if running else _since_run + delta
	# Turning about on the run: a pivot.
	if turned and (running or ran_lately) and _has(&"turn"):
		_one_shot(&"turn")
		return
	# A moment of the run plays out, unless he sets off again out of a stop.
	if _sprite.animation in ONE_SHOTS and _sprite.is_playing():
		if not (_sprite.animation == &"skid" and running):
			return
	if speed < 10.0:
		if ran_lately and _has(&"skid"):
			_one_shot(&"skid")
			return
		if _landing > 0.0 and _sprite.animation == &"land":
			return
		_sprite.speed_scale = 1.0
		_switch(&"idle")
		return
	_landing = 0.0
	if running:
		if rested and _sprite.animation != &"run" and _has(&"run_start"):
			_one_shot(&"run_start")
			return
		_switch(&"run")
		_sprite.speed_scale = clampf(speed / _profile.run_animation_speed, 0.6, 1.6)
	else:
		_switch(&"walk")
		_sprite.speed_scale = clampf(speed / _profile.walk_animation_speed, 0.5, 1.6)


## Behind the shield: the guard held still, or, moving, the shuffle step (forward toward where he faces, back
## away from it), its feet matched to the ground speed.
func guard(velocity_x: float, facing: float) -> void:
	var speed: float = absf(velocity_x)
	if speed < GUARD_STILL:
		_sprite.speed_scale = 1.0
		_switch(&"block")
		return
	_switch(&"block_walk" if signf(velocity_x) == signf(facing) else &"block_back")
	_sprite.speed_scale = clampf(speed / _profile.block_walk_speed, 0.5, 1.6)


func _has(animation: StringName) -> bool:
	return _sprite.sprite_frames != null and _sprite.sprite_frames.has_animation(animation)


func _one_shot(animation: StringName) -> void:
	_sprite.speed_scale = 1.0
	_sprite.play(animation)


func _switch(animation: StringName) -> void:
	if _sprite.animation != animation:
		_sprite.play(animation)


func _on_frame_changed() -> void:
	if STEP_FRAMES.has(_sprite.animation) and _sprite.frame in STEP_FRAMES[_sprite.animation]:
		footstep.emit()
