class_name LevelExit
extends Interactable
## The way out of a level (a gate, a door). It opens only once its requirement is met.

signal exit_requested

@export var requires: StringName = &""
@export var locked_prompt: String = "PROMPT_GATE_LOCKED"
@export var open_prompt: String = "PROMPT_OPEN_GATE"
## What the hero says when he tries it before its time (a translation key).
@export var locked_line: String = "GATE_LOCKED_1"

var unlocked: bool = false

## The gate's look when shut and when open; empty keeps the scene's own (the river gate).
@export var closed_texture: Texture2D
@export var open_texture: Texture2D

@onready var sprite: Sprite2D = $Sprite


func _ready() -> void:
	super._ready()
	if closed_texture != null:
		sprite.texture = closed_texture
	# Whatever its size, the gate stands on the street.
	sprite.position = Vector2(0, -sprite.texture.get_height() / 2.0)
	unlock(requires == &"")


func unlock(on: bool) -> void:
	unlocked = on
	prompt = open_prompt if on else locked_prompt


func refresh(flags: Array[StringName]) -> void:
	unlock(requires == &"" or requires in flags)


func interact(by: Node2D) -> void:
	super.interact(by)
	if not unlocked:
		return
	enabled = false
	if open_texture != null:
		sprite.texture = open_texture
	exit_requested.emit()
