class_name GameCamera
extends Camera2D
## Follows the hero with a little look-ahead in the way he faces, keeps him low in the frame so
## the street and its rooftops show, stays inside the level, and shakes with trauma from heavy
## blows. Smoothing is exponential and frame-rate independent; the final position is whole pixels.

## Seconds for the camera to cover most of the distance to its target.
@export var follow_time: float = 0.12
@export var look_ahead: float = 34.0
@export var look_ahead_time: float = 0.6
## How far above the hero's feet the camera centres: high enough that the burning city fills the
## upper half of the frame.
@export var height: float = 84.0
## Largest shake offset in pixels at full trauma.
@export var max_shake: float = 6.0
## Scales every shake (the player's setting).
var shake_scale: float = 1.0

var target: Node2D
var _look: float = 0.0
var _trauma: float = 0.0
var _focus: Vector2 = Vector2.ZERO
var _noise: FastNoiseLite = FastNoiseLite.new()
var _time: float = 0.0


func _ready() -> void:
	_noise.seed = 7
	_noise.frequency = 6.0
	position_smoothing_enabled = false


func set_bounds(bounds: Rect2) -> void:
	limit_left = int(bounds.position.x)
	limit_top = int(bounds.position.y)
	limit_right = int(bounds.end.x)
	limit_bottom = int(bounds.end.y)


## Jumps straight to the target (after a load or a respawn).
func snap() -> void:
	if target == null:
		return
	_look = _facing() * look_ahead
	_focus = target.global_position + Vector2(_look, -height)
	global_position = _focus.round()
	reset_smoothing()


func shake(amount: float) -> void:
	_trauma = minf(1.0, _trauma + amount * 0.12)


func _process(delta: float) -> void:
	# Real time: the camera keeps moving smoothly through hit-stop.
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	_time += real
	if target != null and is_instance_valid(target):
		var ahead: float = _facing() * look_ahead
		_look = lerpf(_look, ahead, 1.0 - exp(-real / look_ahead_time))
		var goal: Vector2 = target.global_position + Vector2(_look, -height)
		_focus = _focus.lerp(goal, 1.0 - exp(-real / follow_time))
		global_position = _focus.round()
	_trauma = maxf(0.0, _trauma - real * 1.6)
	var power: float = _trauma * _trauma * max_shake * shake_scale
	offset = Vector2(_noise.get_noise_2d(_time, 0.0), _noise.get_noise_2d(0.0, _time)) * power
	offset = offset.round()


func _facing() -> float:
	var combatant: Combatant = target as Combatant
	return combatant.facing if combatant != null else 1.0
