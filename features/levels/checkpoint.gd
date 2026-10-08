class_name Checkpoint
extends Interactable
## A lamp in a prayer niche. Lighting it (or resting by it once lit) remembers the hero's way:
## he returns here when he falls, his remedies refilled.

signal rested(checkpoint: Checkpoint)

@export var checkpoint_id: StringName = &"lamp"

var lit: bool = false

@onready var sprite: AnimatedSprite2D = $Sprite
@onready var light: PointLight2D = $Light


func _ready() -> void:
	super._ready()
	set_lit(false, false)


func interact(by: Node2D) -> void:
	set_lit(true, true)
	rested.emit(self)
	super.interact(by)


func set_lit(on: bool, animate: bool) -> void:
	lit = on
	prompt = "PROMPT_REST" if on else "PROMPT_LIGHT_LAMP"
	sprite.play(&"lit" if on else &"dark")
	light.visible = on
	if on and animate:
		light.energy = 0.0
		var tween: Tween = create_tween()
		tween.tween_property(light, "energy", 1.0, 0.6)
