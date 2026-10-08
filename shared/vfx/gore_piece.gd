class_name GorePiece
extends Node2D
## A piece cut from a body (a head, an arm, a leg, the upper half, a spear): thrown by the blow, it
## tumbles through its turns, bleeds as it flies, bounces on the street and comes to rest on its
## flattest side. Purely visual: it touches nothing but the ground's collision shapes.

## The piece hit the ground (each bounce) at a point on the ground's surface.
signal landed(at: Vector2, resting: bool)

const GRAVITY: float = 840.0
const BOUNCE: float = 0.3
const DRAG: float = 0.5
## The world's solid layer (streets, walls, roofs).
const SOLID_MASK: int = 1

var velocity: Vector2 = Vector2.ZERO
## Turns per second (eighths of a circle per frame of the tumble); the sign is the way it spins.
var spin: float = 1.8
var _sprite: AnimatedSprite2D
var _bottoms: PackedFloat32Array = PackedFloat32Array()
var _turn: float = 0.0
var _resting: bool = false
var _bounces: int = 0
var _trail: CPUParticles2D


## Dresses the piece: its tumble (an animation of `frames`), how low each turn reaches, which way
## it faces, and the drop its trail of blood is made of (none for a clean weapon).
func setup(frames: SpriteFrames, piece: StringName, bottoms: PackedFloat32Array, flip: bool, drop: Texture2D) -> void:
	_sprite = AnimatedSprite2D.new()
	_sprite.sprite_frames = frames
	_sprite.animation = piece
	_sprite.flip_h = flip
	_sprite.stop()
	add_child(_sprite)
	_bottoms = bottoms
	if drop != null:
		_trail = CPUParticles2D.new()
		_trail.texture = drop
		_trail.amount = 14
		_trail.lifetime = 0.5
		_trail.direction = Vector2(0, -1)
		_trail.spread = 40.0
		_trail.gravity = Vector2(0, 520)
		_trail.initial_velocity_min = 10.0
		_trail.initial_velocity_max = 40.0
		_trail.local_coords = false
		add_child(_trail)


func _physics_process(delta: float) -> void:
	if _resting:
		return
	velocity.y += GRAVITY * delta
	var low: float = _low(_frame())
	var space: PhysicsDirectSpaceState2D = get_world_2d().direct_space_state
	# A wall in the way turns it back.
	if absf(velocity.x) > 1.0:
		var side: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(global_position,
			global_position + Vector2(velocity.x * delta + signf(velocity.x) * 6.0, 0), SOLID_MASK)
		if not space.intersect_ray(side).is_empty():
			velocity.x = -velocity.x * 0.3
	# The ground below its lowest point this turn.
	if velocity.y > 0.0:
		var from: Vector2 = global_position + Vector2(0, low - 3.0)
		var down: PhysicsRayQueryParameters2D = PhysicsRayQueryParameters2D.create(from,
			from + Vector2(0, velocity.y * delta + 4.0), SOLID_MASK)
		var hit: Dictionary = space.intersect_ray(down)
		if not hit.is_empty():
			var ground: Vector2 = hit["position"]
			_bounce(ground.y)
			return
	global_position += velocity * delta
	_turn += spin * delta
	_sprite.frame = _frame()


func _bounce(ground_y: float) -> void:
	_bounces += 1
	if velocity.y < 110.0 or _bounces >= 3:
		_settle(ground_y)
		return
	global_position.y = ground_y - _low(_frame())
	velocity = Vector2(velocity.x * DRAG, -velocity.y * BOUNCE)
	spin *= 0.55
	landed.emit(Vector2(global_position.x, ground_y), false)


## Comes to rest on whichever turn near its present one lies flattest.
func _settle(ground_y: float) -> void:
	var frame: int = _frame()
	var best: int = frame
	for offset: int in [-1, 1, -2, 2]:
		var other: int = posmod(frame + offset, 8)
		if _low(other) < _low(best) - 0.5:
			best = other
	_sprite.frame = best
	global_position = Vector2(roundf(global_position.x), ground_y - _low(best))
	_resting = true
	if _trail != null:
		_trail.emitting = false
	landed.emit(Vector2(global_position.x, ground_y), true)


func _frame() -> int:
	return posmod(int(roundf(_turn * 8.0)), 8)


func _low(frame: int) -> float:
	return _bottoms[frame] if frame < _bottoms.size() else 6.0
