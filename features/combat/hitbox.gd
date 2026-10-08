class_name Hitbox
extends Area2D
## A weapon's reach while a blow is live. The owner opens it with a polygon (flipped to its facing)
## and closes it when the blade's active frames end. Each hurtbox it touches is reported once per
## opening, so one swing never hits the same body twice.

signal touched(hurtbox: Hurtbox)

var _shape: CollisionShape2D
var _polygon: ConvexPolygonShape2D
var _open: bool = false
var _touched: Array[Hurtbox] = []


func _ready() -> void:
	monitoring = true
	monitorable = false
	_polygon = ConvexPolygonShape2D.new()
	_shape = CollisionShape2D.new()
	_shape.shape = _polygon
	_shape.disabled = true
	add_child(_shape)


## Opens the hitbox for a new blow; everything it touches from now on can be struck once.
func open(points: PackedVector2Array) -> void:
	_touched.clear()
	_open = true
	reshape(points)


## Changes the live shape without forgetting who was already struck (the next frame of one swing).
func reshape(points: PackedVector2Array) -> void:
	if points.size() < 3:
		_shape.set_deferred("disabled", true)
		return
	_polygon.points = points
	_shape.set_deferred("disabled", false)


func close() -> void:
	_open = false
	_shape.set_deferred("disabled", true)


func is_open() -> bool:
	return _open


func _physics_process(_delta: float) -> void:
	if not _open:
		return
	for area: Area2D in get_overlapping_areas():
		var hurtbox: Hurtbox = area as Hurtbox
		if hurtbox == null or hurtbox in _touched:
			continue
		_touched.append(hurtbox)
		touched.emit(hurtbox)
