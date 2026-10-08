class_name BossArena
extends Node2D
## The ground where a boss waits: barriers that close behind the hero when the fight begins and
## open when the boss falls, and the stretch of level the camera keeps to meanwhile. The session
## starts the fight (from a story trigger) and ends it; the arena only opens and closes.

## The camera's bounds while the fight lasts, in level space.
@export var camera_bounds: Rect2 = Rect2(0, 0, 640, 544)
@export var boss_path: NodePath

var closed: bool = false

@onready var barriers: Node2D = $Barriers


func _ready() -> void:
	_apply(false)


func boss() -> MongolSoldier:
	return get_node_or_null(boss_path) as MongolSoldier


func close() -> void:
	closed = true
	_apply(true)


func open() -> void:
	closed = false
	_apply(false)


## Each barrier is a StaticBody2D (its collision) with an optional visual child (flames, debris)
## shown while the arena is closed.
func _apply(on: bool) -> void:
	for node: Node in barriers.get_children():
		var body: StaticBody2D = node as StaticBody2D
		if body == null:
			continue
		for child: Node in body.get_children():
			var shape: CollisionShape2D = child as CollisionShape2D
			if shape != null:
				shape.set_deferred(&"disabled", not on)
			var visual: CanvasItem = child as CanvasItem
			if visual != null and shape == null:
				visual.visible = on
