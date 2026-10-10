@tool
class_name ProgressionCatalog
extends Resource
## The chapter's technique tree (fifteen nodes in three branches), its keepsakes, and what Honour each
## deed is worth. Read-only; the session and the lamp menu read it through a Progression.

@export var nodes: Array[TechniqueDefinition] = []
@export var keepsakes: Array[KeepsakeDefinition] = []
## Keepsakes he can wear before the Shield's last node adds one.
@export var keepsake_slots: int = 2

@export_group("Honour")
## A captive saved from the headsman's sabre; someone freed from their captors.
@export var captive_saved: int = 30
@export var person_freed: int = 10
## A manuscript rescued, and a leaf of the treatise on arms.
@export var page: int = 15
@export var treatise_page: int = 20
## A guardsman's token found.
@export var token: int = 25
## A soldier killed; more for one finished, taken unawares or struck from above, and for one killed by a
## riposte or an Art.
@export var kill: int = 4
@export var bold_kill: int = 4
@export var skilled_kill: int = 2
## A level left behind.
@export var level_completed: int = 40
