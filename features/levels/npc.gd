class_name Npc
extends Interactable
## Someone of Baghdad the hero can speak to, always. Talking asks the session to play the NPC's
## dialogue; an NPC may wait on a story flag (the bookseller on the soldiers at his door), and until
## it is set they say only what fits the moment (their "_waiting" dialogue), handing nothing over.

signal talk_requested(npc: Npc)

@export var npc_id: StringName = &"npc"
## The dialogue to play (DialogueLibrary key).
@export var dialogue: StringName = &""
## The flag their story waits on (before it, they say only their waiting words), or empty.
@export var requires: StringName = &""
## The flag the first conversation sets (something given: a satchel, a key), or empty, and the
## notice (a translation key) that announces it.
@export var gives_flag: StringName = &""
@export var gives_notice: String = ""
## What their gift teaches the hero (knives), or nothing.
@export var teaches: StringName = &""
@export var idle_animation: StringName = &"idle"
@export var talk_animation: StringName = &"talk"
## Played instead of idle while the NPC waits on `requires` (a captive, kneeling and bound), or empty.
@export var waiting_animation: StringName = &""

## True once what they wait on has happened: their story can go on.
var ready_to_speak: bool = true
@export var face: float = 1.0
@export var frames: SpriteFrames

@onready var sprite: AnimatedSprite2D = $Sprite


func _ready() -> void:
	super._ready()
	reach = false
	prompt = "PROMPT_TALK"
	if frames != null:
		sprite.sprite_frames = frames
	sprite.flip_h = face < 0.0
	ready_to_speak = requires == &""
	_play_idle()


func refresh(flags: Array[StringName]) -> void:
	ready_to_speak = requires == &"" or requires in flags
	if not sprite.animation == talk_animation:
		_play_idle()


func interact(by: Node2D) -> void:
	talk_requested.emit(self)
	super.interact(by)


func set_talking(on: bool) -> void:
	# Still bound, still waiting: they speak where they are.
	if on and (ready_to_speak or waiting_animation == &""):
		play(talk_animation)
	else:
		_play_idle()


func _play_idle() -> void:
	play(waiting_animation if not ready_to_speak and waiting_animation != &"" else idle_animation)


func play(animation: StringName) -> void:
	if sprite.sprite_frames.has_animation(animation):
		sprite.play(animation)
