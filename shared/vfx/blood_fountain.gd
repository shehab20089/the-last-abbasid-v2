class_name BloodFountain
extends CPUParticles2D
## Blood pumping from a wound while the body falls: it follows the wound frame by frame (the falling
## sprite's own wound positions, from its GoreSet) and spurts in beats that weaken until they stop.
## A child of the body, so it moves with it. Purely visual.

const BEATS: int = 9
## Seconds of each spurt and of the pause after it.
const SPURT: float = 0.16
const PAUSE: float = 0.14

var _sprite: AnimatedSprite2D
var _gore: GoreSet
var _beat: int = 0
var _beats: int = BEATS
var _clock: float = 0.0


## Starts pumping from the wound of `sprite`'s present fall.
func start(sprite: AnimatedSprite2D, gore: GoreSet, drop: Texture2D, fury: float = 1.0) -> void:
	_sprite = sprite
	_gore = gore
	_beats = roundi(BEATS * fury)
	texture = drop
	amount = roundi(72 * minf(fury, 2.0))
	lifetime = 0.8
	explosiveness = 0.0
	direction = Vector2(0, -1)
	spread = 16.0
	gravity = Vector2(0, 760)
	initial_velocity_min = 95.0
	initial_velocity_max = 175.0
	local_coords = false
	emitting = true
	_follow()


func _process(delta: float) -> void:
	if _sprite == null:
		return
	_follow()
	_clock += delta
	var on: bool = emitting
	if on and _clock >= SPURT:
		emitting = false
		_clock = 0.0
		_beat += 1
		if _beat >= _beats:
			_sprite = null
			get_tree().create_timer(lifetime + 0.1).timeout.connect(queue_free)
	elif not on and _clock >= PAUSE:
		emitting = true
		_clock = 0.0
		# Each beat weaker than the last.
		var strength: float = 1.0 - float(_beat) / float(_beats)
		initial_velocity_min = 35.0 + 60.0 * strength
		initial_velocity_max = 60.0 + 115.0 * strength


## Sits on the wound and points the way the stump faces (up and back as he falls).
func _follow() -> void:
	var at: Vector2 = _gore.wound(_sprite.animation, _sprite.frame)
	if at == Vector2.INF:
		return
	var facing: float = -1.0 if _sprite.flip_h else 1.0
	position = Vector2(at.x * facing, at.y)
	var fallen: float = clampf(float(_sprite.frame) / 8.0, 0.0, 1.0)
	direction = Vector2(-facing * (0.25 + fallen * 0.9), -1.0 + fallen * 0.6).normalized()
