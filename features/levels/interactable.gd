class_name Interactable
extends Area2D
## Something the hero can use where he stands: a lamp to light, a door, a fallen manuscript, a
## person to speak to. The hero's sensor finds it and pressing interact calls interact().

signal used(by: Node2D)

## The prompt shown while the hero can use it: a translation key.
@export var prompt: String = "PROMPT_INTERACT"
## Whether the hero reaches out (his interact animation) or simply acts (speaking).
@export var reach: bool = true
@export var enabled: bool = true


func _ready() -> void:
	collision_layer = 128
	collision_mask = 0
	monitoring = false
	monitorable = true


func can_interact(_by: Node2D) -> bool:
	return enabled


func interact(by: Node2D) -> void:
	used.emit(by)
