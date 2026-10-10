class_name SwordTrail
extends Node2D
## The arc a blade cuts through the air, drawn as its own glowing effect behind the fighter: each frame
## of a live swing adds a crescent from the blade's last position to its new one, a coloured afterglow
## over the swept band with a hot core along its leading edge, fading within a few hundredths of a
## second. A thrust leaves a straight streak instead. The colour says the blow: steel for a cut, gold for
## a great blow (one that breaks guards or floors men), amber for an Art, red for one no shield stops,
## dark red from a blade wet with a kill; a soldier's low sweep trails amber and his guard-breaker violet,
## as their warnings glint. Pure presentation: it reads the fighter's attack and its
## generated blade positions and changes nothing.
##
## Put it under the fighter's Sprite with show_behind_parent on, so the body stays in front.

## Steel catching the firelight.
@export var color: Color = Color(0.72, 0.86, 1.0)
## A great blow: one that breaks a guard or throws a man down.
@export var heavy_color: Color = Color(1.0, 0.78, 0.4)
## A blow of one of the hero's Arts.
@export var art_color: Color = Color(1.0, 0.56, 0.2)
## A blow that cannot be blocked or parried.
@export var dire_color: Color = Color(1.0, 0.32, 0.18)
## A soldier's blows trail the colours of their warnings: a low sweep amber, a guard-breaker violet.
@export var low_color: Color = Color(1.0, 0.66, 0.24)
@export var break_color: Color = Color(0.72, 0.46, 1.0)
## The trail of a blade wet from a kill.
@export var blood_color: Color = Color(0.62, 0.07, 0.06)
## The bright edge along the front of a cut.
@export var edge_color: Color = Color(1.0, 1.0, 0.96)
## Seconds a crescent takes to fade: short, so a great blow's crescents do not pile into a sheet.
@export var fade_time: float = 0.13
## How far along the blade (0 hilt, 1 tip) the crescent reaches inward: only its outer half, so the arm,
## the grip and the man struck stay in sight through it.
@export_range(0.0, 1.0) var inner: float = 0.5
## How far along the blade the hot core along the leading edge begins.
@export_range(0.0, 1.0) var core: float = 0.8
## The afterglow's strength at its leading edge and on its inner side, and how far the hot core whitens: the
## band stays the colour of the blow (its warning) and lighter than the blade it follows.
@export_range(0.0, 1.0) var glow: float = 0.65
@export_range(0.0, 1.0) var inner_glow: float = 0.12
@export_range(0.0, 1.0) var core_white: float = 0.45

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
	# Light, not paint: the trail adds to what is behind it.
	var glow: CanvasItemMaterial = CanvasItemMaterial.new()
	glow.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	material = glow
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
		if not points.is_empty():
			var colors: PackedColorArray = PackedColorArray()
			for a: float in alphas:
				colors.append(Color(tint, a * life))
			draw_polygon(points, colors)
		if crescent.has("core"):
			var core_points: PackedVector2Array = crescent["core"]
			var core_alphas: PackedFloat32Array = crescent["core_alphas"]
			var hot: Color = tint.lerp(Color.WHITE, core_white)
			var core_colors: PackedColorArray = PackedColorArray()
			for a: float in core_alphas:
				core_colors.append(Color(hot, a * life))
			draw_polygon(core_points, core_colors)
		if crescent.has("edge"):
			var edge: PackedVector2Array = crescent["edge"]
			draw_polyline(edge, Color(edge_color, life * 0.85), 1.0)


func _on_frame_changed() -> void:
	if _fighter == null or _fighter.hitboxes == null:
		return
	var attack: AttackDefinition = _fighter.current_attack
	if attack == null or _sprite.animation != attack.animation:
		return
	strike(attack, _fighter.hitboxes, _sprite.frame, _fighter.facing)


## Draws the arc the blade cuts on `frame` of `attack` (nothing off its live frames, or for a blow that
## does not use the blade's sweep). The fighter's own frames call it; a preview of a move can too.
func strike(attack: AttackDefinition, hitboxes: FrameHitboxes, frame: int, facing: float) -> void:
	if not attack.use_blade_sweep or not attack.is_active_frame(frame):
		return
	var from: PackedVector2Array = hitboxes.blade(attack.animation, frame - 1)
	var to: PackedVector2Array = hitboxes.blade(attack.animation, frame)
	if from.size() != 2 or to.size() != 2:
		return
	var tint: Color = color
	var tell: AttackDefinition.Tell = attack.tell()
	var soldier: bool = _fighter != null and _fighter.team != 0
	if tell == AttackDefinition.Tell.DIRE:
		tint = dire_color
	elif soldier and tell == AttackDefinition.Tell.LOW:
		tint = low_color
	elif soldier and tell == AttackDefinition.Tell.BREAK:
		tint = break_color
	elif attack.art:
		tint = art_color
	elif attack.guard_break or attack.knocks_down or attack.overwhelms:
		tint = heavy_color
	if bloodied > 0.0:
		# Wet from a kill: dark red, clearing over its last second.
		tint = tint.lerp(blood_color, 0.75 * clampf(bloodied, 0.0, 1.0))
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
	var hot_in: PackedVector2Array = PackedVector2Array()
	var outer_alpha: PackedFloat32Array = PackedFloat32Array()
	var inner_alpha: PackedFloat32Array = PackedFloat32Array()
	var hot_alpha: PackedFloat32Array = PackedFloat32Array()
	for i: int in SAMPLES + 1:
		var k: float = float(i) / SAMPLES
		var hilt: Vector2 = from[0].lerp(to[0], k)
		var direction: Vector2 = Vector2.from_angle(a0 + turn * k)
		var length: float = lerpf(l0, l1, k)
		outer.append(_flip(hilt + direction * length, facing))
		# Older positions show only near the tip, so the crescent tapers behind the blade.
		var reach: float = lerpf(0.8, inner, k)
		inside.append(_flip(hilt + direction * length * reach, facing))
		hot_in.append(_flip(hilt + direction * length * lerpf(0.95, core, k), facing))
		outer_alpha.append(lerpf(0.0, glow, pow(k, 1.2)))
		inner_alpha.append(lerpf(0.0, inner_glow, k))
		hot_alpha.append(lerpf(0.0, 0.85, pow(k, 1.8)))
	var points: PackedVector2Array = PackedVector2Array()
	var alphas: PackedFloat32Array = PackedFloat32Array()
	for i: int in outer.size():
		points.append(outer[i])
		alphas.append(outer_alpha[i])
	for i: int in range(inside.size() - 1, -1, -1):
		points.append(inside[i])
		alphas.append(inner_alpha[i])
	# The hot core along the leading edge.
	var core_points: PackedVector2Array = PackedVector2Array()
	var core_alphas: PackedFloat32Array = PackedFloat32Array()
	for i: int in outer.size():
		core_points.append(outer[i])
		core_alphas.append(hot_alpha[i])
	for i: int in range(hot_in.size() - 1, -1, -1):
		core_points.append(hot_in[i])
		core_alphas.append(hot_alpha[i] * 0.4)
	# The leading half of the outer arc is the blade's bright edge. A blade drawn back along itself folds
	# the band over: then there is nothing to fill, only the edge.
	var edge: PackedVector2Array = outer.slice(int(SAMPLES * 0.5))
	var crescent: Dictionary = {"points": points, "alphas": alphas, "tint": tint, "age": 0.0, "edge": edge}
	if not _fillable(points):
		crescent["points"] = PackedVector2Array()
	if _fillable(core_points):
		crescent["core"] = core_points
		crescent["core_alphas"] = core_alphas
	_crescents.append(crescent)


## A thrust: a narrow streak from where the point was to where it is, widest at the point (a blade
## pulled back, as a hooked axe is, streaks back toward the fighter).
func _add_streak(tip_from: Vector2, tip_to: Vector2, hilt_to: Vector2, tint: Color) -> void:
	var along: Vector2 = (tip_to - hilt_to).normalized()
	if tip_from.distance_to(tip_to) > 0.5:
		along = (tip_to - tip_from).normalized()
	var start: Vector2 = tip_from - along * 10.0
	var side: Vector2 = Vector2(-along.y, along.x)
	var points: PackedVector2Array = PackedVector2Array([start, tip_to + side * 1.6, tip_to + along * 2.0,
		tip_to - side * 1.6])
	var alphas: PackedFloat32Array = PackedFloat32Array([0.0, 0.7, 0.95, 0.7])
	_crescents.append({"points": points, "alphas": alphas, "tint": tint, "age": 0.0})


## True when a band's outline does not cross itself, so it can be filled.
func _fillable(points: PackedVector2Array) -> bool:
	return points.size() >= 3 and not Geometry2D.triangulate_polygon(points).is_empty()


## A body-space point (facing right) as it lies for a fighter facing `facing`.
func _flip(p: Vector2, facing: float) -> Vector2:
	return Vector2(p.x * facing, p.y)
