@tool
class_name KeepsakeDefinition
extends Resource
## Something of someone's: given by one the hero saved, or found where it was lost. Worn (two at once,
## three with the Shield's last node), it changes how he fights. Read-only.

@export var id: StringName = &"keepsake"
@export var modifiers: Modifiers
@export var name_key: String = ""
@export var description_key: String = ""
## Whose it was, or where it lay (a translation key).
@export var source_key: String = ""
@export var icon: Texture2D
