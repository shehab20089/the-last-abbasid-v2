class_name FleeingCivilian
extends AnimatedSprite2D
## A townsperson running from the soldiers: crosses the street at a run and is gone, unless an
## arrow finds them first (shot_after), and they fall and lie where they fell. Pure scenery; it
## never touches the fight.

## They were shot (the session gives it its sound and its blood).
signal fell(runner: FleeingCivilian)

@export var speed: float = 150.0
@export var lifetime: float = 6.0
## -1 runs left, +1 runs right.
@export var direction: float = -1.0
## Seconds before an arrow takes them, or less than zero for one who gets away.
@export var shot_after: float = -1.0

var _down: bool = false


func _ready() -> void:
	flip_h = direction < 0.0
	offset = Vector2(0, -60)
	play(&"run")


func _process(delta: float) -> void:
	if _down:
		# The last stumbling steps, then still.
		speed = move_toward(speed, 0.0, 300.0 * delta)
		position.x += direction * speed * delta
		return
	position.x += direction * speed * delta
	if shot_after >= 0.0:
		shot_after -= delta
		if shot_after < 0.0 and sprite_frames.has_animation(&"shot"):
			_down = true
			play(&"shot")
			fell.emit(self)
			return
	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()