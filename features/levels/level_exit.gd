class_name LevelExit
extends Interactable
## The way out of a level (a gate, a door). It opens only once its requirement is met; tried before, it is
## barred, and the hero says what is still missing (the first of `locked_lines` whose flag is set).

signal exit_requested

@export var requires: StringName = &""
@export var locked_prompt: String = "PROMPT_GATE_LOCKED"
@export var open_prompt: String = "PROMPT_OPEN_GATE"
## What the hero says when he tries it before its time (a translation key), when no line below fits.
@export var locked_line: String = "GATE_LOCKED_1"
## What he says by the story so far, as "flag|KEY" entries: the first whose flag is set wins (an empty flag
## always fits), like a level's objectives.
@export var locked_lines: PackedStringArray = PackedStringArray()

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
	prompt = open_prompt if on else "PROMPT_BARRED"


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


## What the hero says trying it shut, by the story so far.
func locked_line_for(flags: Array[StringName]) -> String:
	for entry: String in locked_lines:
		var parts: PackedStringArray = entry.split("|")
		if parts.size() == 2 and (parts[0] == "" or StringName(parts[0]) in flags):
			return parts[1]
	return locked_line


## Its name over it while it is barred (the gate's own, as the locked prompt names it).
func display_name() -> String:
	return "" if unlocked else locked_prompt
