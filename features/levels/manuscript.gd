class_name Manuscript
extends Interactable
## A page or a codex rescued from the fires. Taking it adds it to the hero's collection, where it
## can be read (its text is a translation key: MANUSCRIPT_<ID>_TITLE / _TEXT).

signal taken(manuscript: Manuscript)

@export var manuscript_id: StringName = &"page"
## A page of a treatise on the arts of war teaches a technique (bash, plunge, roll_cut), or nothing.
@export var teaches: StringName = &""

var _time: float = 0.0

@onready var sprite: Sprite2D = $Sprite


func _ready() -> void:
	super._ready()
	prompt = "PROMPT_TAKE"


func _process(delta: float) -> void:
	_time += delta
	# A slow glint so the page catches the eye among the debris.
	sprite.modulate = Color(1, 1, 1).lerp(Color(1.35, 1.25, 1.0), (sin(_time * 3.0) * 0.5 + 0.5) * 0.6)


func interact(by: Node2D) -> void:
	enabled = false
	taken.emit(self)
	super.interact(by)
	queue_free()
