@tool
class_name TechniqueDefinition
extends Resource
## One node of the technique tree, bought with Honour at a lamp: a move he learns (`grants`), a way he
## fights (`modifiers`), or both. A node needs the one before it in its branch, and may wait on the
## story (`requires_flag`) or on a technique the story teaches (`requires_known`). Read-only.

enum Branch {BLADE, SHIELD, SHADOW}

@export var id: StringName = &"node"
@export var branch: Branch = Branch.BLADE
## Its place in the branch, 1 to 5.
@export var tier: int = 1
@export var cost: int = 60
## The node before it in its branch, or nothing for the first.
@export var requires: StringName = &""
## A story flag it waits on (the hero has reached a place), and the translation key that says so.
@export var requires_flag: StringName = &""
@export var requires_flag_key: String = ""
## A technique the story must have taught him first (the bash, the knives, the plunge).
@export var requires_known: StringName = &""
## The technique (a move or an Art) it teaches, or nothing.
@export var grants: StringName = &""
## The move a preview shows for it (MoveDemos): what it teaches, or for a way of fighting the move it
## changes; nothing for one no move shows.
@export var demo: StringName = &""
@export var modifiers: Modifiers
@export var name_key: String = ""
@export var description_key: String = ""
@export var icon: Texture2D
