class_name Progression
extends RefCounted
## The hero's growth between fights: the Honour he holds, the technique tree he buys from at lamps, the
## keepsakes he owns and wears, and the two Arts he carries. Rules only: the save holds the state, the
## session applies the result to the hero, and the lamp menu shows it and asks for changes.

## Something changed (Honour earned or spent, a node bought, a keepsake worn, an Art carried).
signal changed

enum NodeState {BOUGHT, OPEN, TOO_DEAR, LOCKED}

var catalog: ProgressionCatalog
var save: SaveGame
## What the story has taught him (nodes that wait on a technique read it).
var known: Array[StringName] = []


func _init(from: ProgressionCatalog, into: SaveGame) -> void:
	catalog = from
	save = into


# --- Honour -----------------------------------------------------------------------------------------

func honour() -> int:
	return save.honour


## Honour earned (once for each deed, when `once` names it: a flag kept in the save).
func earn(amount: int, once: StringName = &"") -> bool:
	if amount <= 0:
		return false
	if once != &"":
		if save.has_flag(once):
			return false
		save.set_flag(once)
	save.honour += amount
	changed.emit()
	return true


# --- The tree ---------------------------------------------------------------------------------------

func node(id: StringName) -> TechniqueDefinition:
	for each: TechniqueDefinition in catalog.nodes:
		if each.id == id:
			return each
	return null


## The nodes of one branch (a TechniqueDefinition.Branch), from the first to the last.
func branch(which: int) -> Array[TechniqueDefinition]:
	var out: Array[TechniqueDefinition] = []
	for each: TechniqueDefinition in catalog.nodes:
		if int(each.branch) == which:
			out.append(each)
	out.sort_custom(func(a: TechniqueDefinition, b: TechniqueDefinition) -> bool: return a.tier < b.tier)
	return out


func bought(id: StringName) -> bool:
	return id in save.bought


func state_of(each: TechniqueDefinition) -> NodeState:
	if bought(each.id):
		return NodeState.BOUGHT
	if lock_reason(each) != "":
		return NodeState.LOCKED
	return NodeState.OPEN if save.honour >= each.cost else NodeState.TOO_DEAR


## Why a node cannot be bought yet (a translation key), or "" when nothing stands in the way but its price.
func lock_reason(each: TechniqueDefinition) -> String:
	if each.requires != &"" and not bought(each.requires):
		return "LOCK_PREVIOUS"
	if each.requires_known != &"" and not each.requires_known in known:
		return "LOCK_KNOWN_%s" % String(each.requires_known).to_upper()
	if each.requires_flag != &"" and not save.has_flag(each.requires_flag):
		return each.requires_flag_key
	return ""


func can_buy(each: TechniqueDefinition) -> bool:
	return state_of(each) == NodeState.OPEN


func buy(each: TechniqueDefinition) -> bool:
	if not can_buy(each):
		return false
	save.honour -= each.cost
	save.bought.append(each.id)
	changed.emit()
	return true


## Every node given back for what it cost (free, at any lamp). Returns the Honour returned.
func respec() -> int:
	var refund: int = 0
	for id: StringName in save.bought:
		var each: TechniqueDefinition = node(id)
		if each != null:
			refund += each.cost
	if save.bought.is_empty():
		return 0
	save.bought.clear()
	save.honour += refund
	# Keepsakes worn past the slots the tree gave are taken off; Arts no longer known are put down.
	while save.worn.size() > slots():
		save.worn.pop_back()
	changed.emit()
	return refund


## The techniques (moves and Arts) the bought nodes teach.
func granted() -> Array[StringName]:
	var out: Array[StringName] = []
	for id: StringName in save.bought:
		var each: TechniqueDefinition = node(id)
		if each != null and each.grants != &"":
			out.append(each.grants)
	return out


## Everything the bought nodes and the worn keepsakes do to him, as one.
func modifiers() -> Modifiers:
	var parts: Array[Modifiers] = []
	for id: StringName in save.bought:
		var each: TechniqueDefinition = node(id)
		if each != null and each.modifiers != null:
			parts.append(each.modifiers)
	for id: StringName in save.worn:
		var worn: KeepsakeDefinition = keepsake(id)
		if worn != null and worn.modifiers != null:
			parts.append(worn.modifiers)
	return Modifiers.combine(parts)


# --- Keepsakes --------------------------------------------------------------------------------------

func keepsake(id: StringName) -> KeepsakeDefinition:
	for each: KeepsakeDefinition in catalog.keepsakes:
		if each.id == id:
			return each
	return null


## How many keepsakes he can wear (the Shield's last node adds one).
func slots() -> int:
	var extra: int = 0
	for id: StringName in save.bought:
		var each: TechniqueDefinition = node(id)
		if each != null and each.modifiers != null:
			extra += each.modifiers.keepsake_slots
	return catalog.keepsake_slots + extra


func owns(id: StringName) -> bool:
	return id in save.keepsakes


func wears(id: StringName) -> bool:
	return id in save.worn


## A keepsake given or found: his, and worn at once if a slot is free. False if he had it already.
func give_keepsake(id: StringName) -> bool:
	if keepsake(id) == null or owns(id):
		return false
	save.keepsakes.append(id)
	if save.worn.size() < slots():
		save.worn.append(id)
	changed.emit()
	return true


## Puts a keepsake on, or takes it off. False when every slot is taken.
func toggle_wear(id: StringName) -> bool:
	if not owns(id):
		return false
	if wears(id):
		save.worn.erase(id)
	elif save.worn.size() < slots():
		save.worn.append(id)
	else:
		return false
	changed.emit()
	return true


# --- Arts -------------------------------------------------------------------------------------------

## Carries `art` in `slot` (0 the art button, 1 the second); one already in the other slot trades places.
func carry_art(slot: int, art: StringName) -> void:
	while save.arts.size() < 2:
		save.arts.append(&"")
	var other: int = 1 - slot
	if save.arts[other] == art:
		save.arts[other] = save.arts[slot]
	save.arts[slot] = art
	while not save.arts.is_empty() and save.arts.back() == &"":
		save.arts.pop_back()
	changed.emit()
