class_name BossArena
extends Node2D
## The ground where a boss waits: barriers that close behind the hero when the fight begins and
## open when the boss falls, and the stretch of level the camera keeps to meanwhile. The session
## starts the fight (from a story trigger) and ends it; the arena only opens and closes. A scene's
## barricade (SceneBarriers: the fire between the hero and the last gate, where Hamid kneels) stands
## from the start until its scene lets it burn down, or once `scene_open_flag` is set.

## The camera's bounds while the fight lasts, in level space.
@export var camera_bounds: Rect2 = Rect2(0, 0, 640, 544)
@export var boss_path: NodePath
## The flag after which the scene's barricade stands open (its scene has played), or empty.
@export var scene_open_flag: StringName = &""

var closed: bool = false

@onready var barriers: Node2D = $Barriers
@onready var scene_barriers: Node2D = get_node_or_null(^"SceneBarriers") as Node2D


func _ready() -> void:
	_apply(false)
	set_scene_barriers(true)


## The scene's barricade burns down once its scene has played (a level entered again).
func apply_progress(flags: Array[StringName]) -> void:
	if scene_open_flag != &"" and scene_open_flag in flags:
		set_scene_barriers(false)


## The scene's barricade stands (on) or has burned down.
func set_scene_barriers(on: bool) -> void:
	if scene_barriers != null:
		_apply_to(scene_barriers, on)


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
	_apply_to(barriers, on)


func _apply_to(group: Node2D, on: bool) -> void:
	for node: Node in group.get_children():
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
