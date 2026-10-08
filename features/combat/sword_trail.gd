class_name SwordTrail
extends Node2D
## The arc a blade cuts through the air, drawn as its own effect behind the fighter: each frame of a
## live swing adds a crescent from the blade's last position to its new one, brightest along the
## leading edge, and the crescents fade within a few hundredths of a second. A thrust leaves a
## straight streak instead. Blows no shield can stop leave a red trail. Pure presentation: it reads
## the fighter's attack and its generated blade positions and changes nothing.
##
## Put it under the fighter's Sprite with show_behind_parent on, so the body stays in front.

## Steel catching the firelight.
@export var color: Color = Color(0.9, 0.94, 1.0)
## A blow that cannot be blocked or parried.
@export var dire_color: Color = Color(1.0, 0.36, 0.2)
## The trail of a blade wet from a kill.
@export var blood_color: Color = Color(0.62, 0.07, 0.06)
## The bright edge along the front of a cut.
@export var edge_color: Color = Color(1.0, 1.0, 0.96)
## Seconds a crescent takes to fade.
@export var fade_time: float = 0.13
## How far along the blade (0 hilt, 1 tip) the crescent reaches inward.
@export_range(0.0, 1.0) var inner: float = 0.32

const SAMPLES: int = 10
## A blade that turns less than this (radians) between frames is thrusting, not cutting.
const THRUST_TURN: float = 0.16

var _fighter: Combatant
var _sprite: AnimatedSprite2D
## Each: { "points": PackedVector2Array, "alphas": PackedFloat32Array, "tint": Color, "age": float }
var _crescents: Array[Dictionary] = []
## Seconds the blade stays wet after a kill (the session sets it).
var bloodied: float = 0.0


func _ready() -> void:
	_sprite = get_parent() as AnimatedSprite2D
	var node: Node = get_parent()
	while node != null and not node is Combatant:
		node = node.get_parent()
	_fighter = node as Combatant
	if _sprite != null:
		_sprite.frame_changed.connect(_on_frame_changed)


func _process(delta: float) -> void:
	bloodied = maxf(0.0, bloodied - delta)
	if _crescents.is_empty():
		return
	var alive: Array[Dictionary] = []
	for crescent: Dictionary in _crescents:
		var age: float = crescent["age"]
		age += delta
		crescent["age"] = age
		if age < fade_time:
			alive.append(crescent)
	_crescents = alive
	queue_redraw()


func _draw() -> void:
	for crescent: Dictionary in _crescents:
		var points: PackedVector2Array = crescent["points"]
		var alphas: PackedFloat32Array = crescent["alphas"]
		var tint: Color = crescent["tint"]
		var age: float = crescent["age"]
		var life: float = clampf(1.0 - age / fade_time, 0.0, 1.0)
		var colors: PackedColorArray = PackedColorArray()
		for a: float in alphas:
			colors.append(Color(tint, a * life))
		draw_polygon(points, colors)
		if crescent.has("edge"):
			var edge: PackedVector2Array = crescent["edge"]
			draw_polyline(edge, Color(edge_color, life), 1.0)


func _on_frame_changed() -> void:
	if _fighter == null or _fighter.hitboxes == null:
		return
	var attack: AttackDefinition = _fighter.current_attack
	if attack == null or _sprite.animation != attack.animation or not attack.use_blade_sweep:
		return
	var frame: int = _sprite.frame
	if not attack.is_active_frame(frame):
		return
	var from: PackedVector2Array = _fighter.hitboxes.blade(attack.animation, frame - 1)
	var to: PackedVector2Array = _fighter.hitboxes.blade(attack.animation, frame)
	if from.size() != 2 or to.size() != 2:
		return
	var tint: Color = dire_color if attack.unblockable or not attack.parryable else color
	if bloodied > 0.0:
		tint = blood_color.lerp(tint, 0.25)
	var facing: float = _fighter.facing
	var a0: float = (from[1] - from[0]).angle()
	var a1: float = (to[1] - to[0]).angle()
	var turn: float = wrapf(a1 - a0, -PI, PI)
	if absf(turn) < THRUST_TURN:
		_add_streak(_flip(from[1], facing), _flip(to[1], facing), _flip(to[0], facing), tint)
	else:
		_add_crescent(from, to, turn, facing, tint)
	queue_redraw()


## The band swept between two blades: an arc at the tips, an arc partway down the blades, the
## trailing end clear and the leading edge bright.
func _add_crescent(from: PackedVector2Array, to: PackedVector2Array, turn: float, facing: float,
		tint: Color) -> void:
	var a0: float = (from[1] - from[0]).angle()
	var l0: float = from[0].distance_to(from[1])
	var l1: float = to[0].distance_to(to[1])
	var outer: PackedVector2Array = PackedVector2Array()
	var inside: PackedVector2Array = PackedVector2Array()
	var outer_alpha: PackedFloat32Array = PackedFloat32Array()
	var inner_alpha: PackedFloat32Array = PackedFloat32Array()
	for i: int in SAMPLES + 1:
		var k: float = float(i) / SAMPLES
		var hilt: Vector2 = from[0].lerp(to[0], k)
		var direction: Vector2 = Vector2.from_angle(a0 + turn * k)
		var length: float = lerpf(l0, l1, k)
		outer.append(_flip(hilt + direction * length, facing))
		# Older positions show only near the tip, so the crescent tapers behind the blade.
		var reach: float = lerpf(0.8, inner, k)
		inside.append(_flip(hilt + direction * length * reach, facing))
		outer_alpha.append(lerpf(0.0, 0.95, pow(k, 1.4)))
		inner_alpha.append(lerpf(0.0, 0.4, k))
	var points: PackedVector2Array = PackedVector2Array()
	var alphas: PackedFloat32Array = PackedFloat32Array()
	for i: int in outer.size():
		points.append(outer[i])
		alphas.append(outer_alpha[i])
	for i: int in range(inside.size() - 1, -1, -1):
		points.append(inside[i])
		alphas.append(inner_alpha[i])
	# The leading half of the outer arc is the blade's bright edge.
	var edge: PackedVector2Array = outer.slice(int(SAMPLES * 0.5))
	_crescents.append({"points": points, "alphas": alphas, "tint": tint, "age": 0.0, "edge": edge})


## A thrust: a narrow streak from where the point was to where it is, widest at the point.
func _add_streak(tip_from: Vector2, tip_to: Vector2, hilt_to: Vector2, tint: Color) -> void:
	var along: Vector2 = (tip_to - hilt_to).normalized()
	var start: Vector2 = tip_from - along * 10.0
	var side: Vector2 = Vector2(-along.y, along.x)
	var points: PackedVector2Array = PackedVector2Array([start, tip_to + side * 1.6, tip_to + along * 2.0,
		tip_to - side * 1.6])
	var alphas: PackedFloat32Array = PackedFloat32Array([0.0, 0.7, 0.95, 0.7])
	_crescents.append({"points": points, "alphas": alphas, "tint": tint, "age": 0.0})


## A body-space point (facing right) as it lies for a fighter facing `facing`.
func _flip(p: Vector2, facing: float) -> Vector2:
	return Vector2(p.x * facing, p.y)
