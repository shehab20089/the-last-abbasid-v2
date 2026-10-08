class_name Hurtbox
extends Area2D
## Where a combatant can be struck. Monitorable only; hitboxes look for it.

@export var owner_body: Combatant


func _ready() -> void:
	monitoring = false
	monitorable = true
	if owner_body == null:
		owner_body = get_parent() as Combatant
