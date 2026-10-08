class_name WarriorAnimator
extends Node
## Chooses the hero's animation from his state and motion, keeps the walk and run feet matched to
## the ground speed, and reports footfalls. Combat actions ask for their animations through play().
## Gameplay timing never reads anything here except through the sprite's frames.

signal footstep

## Frames of the walk and run cycles on which a foot strikes the ground.
const STEP_FRAMES: Dictionary[StringName, Array] = {&"walk": [0, 4], &"run": [0, 4]}
## Animations that run on their own once started and are not replaced by locomotion.
const LANDING_TIME: float = 0.16

var _sprite: AnimatedSprite2D
var _profile: WarriorProfile
var _landing: float = 0.0


func setup(sprite: AnimatedSprite2D, profile: WarriorProfile) -> void:
	_sprite = sprite
	_profile = profile
	_sprite.frame_changed.connect(_on_frame_changed)


## Plays an action animation from its first frame.
func play(animation: StringName, restart: bool = true) -> void:
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
	if not on_floor:
		_sprite.speed_scale = 1.0
		if velocity.y < -70.0:
			_switch(&"jump")
		elif velocity.y < 70.0:
			_switch(&"apex")
		else:
			_switch(&"fall")
		return
	var speed: float = absf(velocity.x)
	if speed < 10.0:
		if _landing > 0.0 and _sprite.animation == &"land":
			return
		_sprite.speed_scale = 1.0
		_switch(&"idle")
		return
	_landing = 0.0
	if speed > _profile.walk_speed * 1.15:
		_switch(&"run")
		_sprite.speed_scale = clampf(speed / _profile.run_animation_speed, 0.6, 1.6)
	else:
		_switch(&"walk")
		_sprite.speed_scale = clampf(speed / _profile.walk_animation_speed, 0.5, 1.6)


func _switch(animation: StringName) -> void:
	if _sprite.animation != animation:
		_sprite.play(animation)


func _on_frame_changed() -> void:
	if STEP_FRAMES.has(_sprite.animation) and _sprite.frame in STEP_FRAMES[_sprite.animation]:
		footstep.emit()
