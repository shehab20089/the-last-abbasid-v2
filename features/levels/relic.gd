class_name Relic
extends Interactable
## Something lying where it fell, to be picked up: the bronze token of one of the Caliph's fallen
## guardsmen (Honour), or a keepsake someone lost. Taking it is remembered (relic_<id>).

signal taken(relic: Relic)

const TOKEN: Texture2D = preload("res://assets/effects/guard_token.png")
const KEEPSAKE: Texture2D = preload("res://assets/effects/keepsake.png")

@export var relic_id: StringName = &"relic"
## The keepsake it is, or nothing for a guardsman's token.
@export var keepsake: StringName = &""

var _time: float = 0.0

@onready var sprite: Sprite2D = $Sprite


func _ready() -> void:
	super._ready()
	prompt = "PROMPT_TAKE"
	sprite.texture = KEEPSAKE if keepsake != &"" else TOKEN


func _process(delta: float) -> void:
	_time += delta
	# A slow bronze glint so it catches the eye among the debris.
	sprite.modulate = Color(1, 1, 1).lerp(Color(1.45, 1.25, 0.9), (sin(_time * 2.6) * 0.5 + 0.5) * 0.7)


func interact(by: Node2D) -> void:
	enabled = false
	taken.emit(self)
	super.interact(by)
	queue_free()
