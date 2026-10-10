class_name StoryTrigger
extends Area2D
## An invisible stretch of street that starts something when the hero walks into it: a hint, a
## story event, an ambush.

signal entered(trigger: StoryTrigger)

@export var trigger_id: String = "trigger"
## A translation key shown as a hint, or empty.
@export var hint: String = ""
## A story event id handled by the session, or empty: "refugees", "ambush" (wakes `group`), "alarm"
## (turns `group` to the hero), "boss".
@export var event: StringName = &""
## The soldiers an ambush wakes (their level metadata "group").
@export var group: StringName = &""
## A line shown as a notice when the trigger fires (a translation key), and who says it (a
## translation key, or empty for narration).
@export var line: String = ""
@export var speaker: String = ""
## A technique the hero learns here if no one has taught it to him yet (a lesson he walked past).
@export var teaches: StringName = &""
@export var once: bool = true

var _fired: bool = false


func _ready() -> void:
	collision_layer = 0
	collision_mask = 2
	monitorable = false
	body_entered.connect(_on_body_entered)


func disarm() -> void:
	_fired = true
	set_deferred(&"monitoring", false)


func _on_body_entered(body: Node2D) -> void:
	if _fired or not body is Warrior:
		return
	if once:
		disarm()
	entered.emit(self)
