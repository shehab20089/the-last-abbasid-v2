class_name Level
extends Node2D
## One authored stretch of Baghdad: its bounds, where the hero starts, its checkpoints, the
## soldiers to reset when the hero falls, and the story beats its triggers and people raise. The
## session (app/main.gd) instances it, places the hero and listens to its signals; the level never
## reaches into the session.

## The hero rested at a lamp.
signal checkpoint_reached(checkpoint: Checkpoint)
## A manuscript was taken.
signal manuscript_found(manuscript: Manuscript)
## The hero asked someone to speak.
signal talk_requested(npc: Npc)
## A trigger fired: a hint (hint is a translation key) or a story event (event is an id).
signal trigger_entered(trigger: StoryTrigger)
## The hero used the exit and its requirement is met.
signal exit_requested
## Every soldier of a group has fallen.
signal group_cleared(group: StringName)
## A captive under a soldier's sabre was beheaded before the hero could stop it.
signal captive_killed(captive: Captive)
## A captive got away (their executioner killed or turned from his work, or their captors beaten).
signal captive_saved(captive: Captive)
## A guardsman's token or a lost keepsake was picked up.
signal relic_found(relic: Relic)

@export var level_id: StringName = &"level"
@export var title_key: String = "LEVEL"
## Playable rectangle in level space: the camera never shows beyond it.
@export var bounds: Rect2 = Rect2(0, 0, 4800, 544)
@export var music: StringName = &""
@export var ambience: StringName = &""
@export var next_level: String = ""
## The story card told when the hero leaves through the exit (a DialogueLibrary key) and the title
## it shows (a translation key: the next level's name).
@export var exit_card: StringName = &""
@export var exit_title: String = ""
## The objective for the story so far, as "flag|KEY" entries: the first whose flag is set wins;
## an entry with an empty flag is the objective before any of them.
@export var objectives: PackedStringArray = PackedStringArray()
## The techniques the hero has learned before he comes here (in the levels before this one).
@export var known_techniques: PackedStringArray = PackedStringArray()
## How much tougher its soldiers are than the first level's: health, then poise (a boss excepted).
@export var toughness: Vector2 = Vector2.ONE
## How much more eagerly its soldiers fight (MongolSoldier.aggression): shorter pauses between blows, guards
## raised more readily.
@export var aggression: float = 1.0
## What is to be found here (for the Journal): its pages, its guardsmen's tokens, the captives under a sabre.
@export var manuscript_ids: PackedStringArray = PackedStringArray()
@export var relic_ids: PackedStringArray = PackedStringArray()
@export var captive_ids: PackedStringArray = PackedStringArray()

## The boss's arena, if this level has one.
var arena: BossArena
## Captives and other townspeople who react to the story, if any.
var people: Node2D

var _group_alive: Dictionary[StringName, int] = {}

@onready var player_start: Marker2D = $PlayerStart
@onready var enemies: Node2D = $Enemies
@onready var interactables: Node2D = $Interactables
@onready var triggers: Node2D = $Triggers


func _ready() -> void:
	arena = get_node_or_null(^"Arena") as BossArena
	people = get_node_or_null(^"People") as Node2D
	for node: Node in interactables.get_children():
		if node is Checkpoint:
			(node as Checkpoint).rested.connect(_on_checkpoint_rested)
		elif node is Manuscript:
			(node as Manuscript).taken.connect(_on_manuscript_taken)
		elif node is Npc:
			(node as Npc).talk_requested.connect(_on_npc_talk)
		elif node is LevelExit:
			(node as LevelExit).exit_requested.connect(_on_exit_requested)
		elif node is Relic:
			(node as Relic).taken.connect(_on_relic_taken)
	for node: Node in triggers.get_children():
		var trigger: StoryTrigger = node as StoryTrigger
		if trigger != null:
			trigger.entered.connect(_on_trigger_entered)
	for soldier: MongolSoldier in soldiers():
		var group: StringName = soldier.get_meta(&"group", &"")
		if group != &"":
			var count: int = _group_alive.get(group, 0)
			_group_alive[group] = count + 1
			soldier.died.connect(_on_group_soldier_died.bind(group))
		# An ambusher out of sight (in a doorway, round a corner) is not there until he springs.
		if soldier.get_meta(&"hidden", false):
			soldier.visible = false
			soldier.process_mode = Node.PROCESS_MODE_DISABLED
		_link_executioner(soldier)
	if people != null:
		for node: Node in people.get_children():
			var captive: Captive = node as Captive
			if captive != null:
				captive.killed.connect(_on_captive_killed)
				captive.escaped.connect(_on_captive_escaped)


func soldiers() -> Array[MongolSoldier]:
	var result: Array[MongolSoldier] = []
	for node: Node in enemies.get_children():
		var soldier: MongolSoldier = node as MongolSoldier
		if soldier != null:
			result.append(soldier)
	return result


func checkpoint(id: StringName) -> Checkpoint:
	for node: Node in interactables.get_children():
		var lamp: Checkpoint = node as Checkpoint
		if lamp != null and lamp.checkpoint_id == id:
			return lamp
	return null


## The objective (a translation key) for the story so far.
func objective(flags: Array[StringName]) -> String:
	var entry: PackedStringArray = _objective_entry(flags)
	return entry[1] if entry.size() > 1 else ""


## Where the objective points for the story so far: "npc:<id>" (a person), "exit" (the way out),
## "col:<column>:<NAME_KEY>" (a place on the street), "group:<group>" (the soldiers of a group), or empty.
func objective_target(flags: Array[StringName]) -> String:
	var entry: PackedStringArray = _objective_entry(flags)
	return entry[2] if entry.size() > 2 else ""


## The objectives entry ("flag|KEY|target") that holds for the story so far: the first whose flag is set,
## or the one with an empty flag.
func _objective_entry(flags: Array[StringName]) -> PackedStringArray:
	var fallback: PackedStringArray = PackedStringArray()
	for entry: String in objectives:
		var parts: PackedStringArray = entry.split("|")
		if parts.size() < 2:
			continue
		if parts[0] == "":
			fallback = parts
		elif StringName(parts[0]) in flags:
			return parts
	return fallback


## The person here with this id, or null.
func npc(id: StringName) -> Npc:
	for node: Node in interactables.get_children():
		var person: Npc = node as Npc
		if person != null and person.npc_id == id:
			return person
	return null


## The way out of the level, or null.
func exit() -> LevelExit:
	for node: Node in interactables.get_children():
		var gate: LevelExit = node as LevelExit
		if gate != null:
			return gate
	return null


## The height of the street (where the hero starts).
func street_y() -> float:
	return player_start.global_position.y


## Where the hero appears: at a lit lamp, or at the start.
func spawn_point(checkpoint_id: StringName) -> Vector2:
	var lamp: Checkpoint = checkpoint(checkpoint_id) if checkpoint_id != &"" else null
	return lamp.global_position + Vector2(18, 0) if lamp != null else player_start.global_position


## Wakes every soldier of a group (an ambush springs).
func wake_group(group: StringName) -> void:
	for soldier: MongolSoldier in soldiers():
		var member: StringName = soldier.get_meta(&"group", &"")
		if member == group and not soldier.dead:
			if not soldier.visible:
				soldier.visible = true
				soldier.process_mode = Node.PROCESS_MODE_INHERIT
			var brain: EnemyBrain = soldier.get_node_or_null(^"Brain") as EnemyBrain
			if brain != null:
				brain.wake(true)


## Turns every soldier of a group to the hero, as a shout would (a captive cries out for help).
func alarm_group(group: StringName) -> void:
	for soldier: MongolSoldier in soldiers():
		var member: StringName = soldier.get_meta(&"group", &"")
		if member == group and not soldier.dead:
			var brain: EnemyBrain = soldier.get_node_or_null(^"Brain") as EnemyBrain
			if brain != null:
				brain.hear_alarm()


## Marks what the hero has already done (from the save): lamps lit, pages taken, people met,
## groups defeated.
func apply_progress(lit: Array[StringName], taken: Array[StringName], flags: Array[StringName]) -> void:
	for node: Node in interactables.get_children():
		var lamp: Checkpoint = node as Checkpoint
		if lamp != null and lamp.checkpoint_id in lit:
			lamp.set_lit(true, false)
		var page: Manuscript = node as Manuscript
		if page != null and page.manuscript_id in taken:
			page.queue_free()
		var npc: Npc = node as Npc
		if npc != null:
			npc.refresh(flags)
		var relic: Relic = node as Relic
		if relic != null and StringName("relic_%s" % relic.relic_id) in flags:
			relic.queue_free()
	for node: Node in triggers.get_children():
		var trigger: StoryTrigger = node as StoryTrigger
		if trigger == null:
			continue
		# An ambush springs again until its soldiers have fallen (the hero fell mid-fight); a cry for
		# help is not raised again once the soldiers it was raised against are dead.
		var for_group: bool = trigger.event == &"ambush" or trigger.event == &"alarm"
		var done: StringName = StringName("%s_cleared" % trigger.group) if for_group else StringName(trigger.trigger_id)
		if trigger.once and done in flags:
			trigger.disarm()
	for soldier: MongolSoldier in soldiers():
		var group: StringName = soldier.get_meta(&"group", &"")
		if group != &"" and StringName("%s_cleared" % group) in flags:
			soldier.queue_free()
			_group_alive.erase(group)
	# Captives already freed are long gone; one already saved from the sabre too, and one already
	# beheaded lies where they fell. Either way their executioner has nothing left to do.
	if people != null:
		for node: Node in people.get_children():
			var captive: Captive = node as Captive
			if captive == null:
				continue
			if captive.freed_by != &"" and captive.freed_by in flags:
				captive.queue_free()
				continue
			if captive.captive_id == &"":
				continue
			var saved: bool = StringName("saved_%s" % captive.captive_id) in flags
			var lost: bool = StringName("lost_%s" % captive.captive_id) in flags
			if saved or lost:
				_end_execution(captive)
				if saved:
					captive.queue_free()
				else:
					captive.lie_dead()


## A soldier set to behead a captive (his "victim" metadata names the captive's node): his stroke
## kills them; his death, or his turning to the fight, lets them run.
func _link_executioner(soldier: MongolSoldier) -> void:
	var victim: StringName = soldier.get_meta(&"victim", &"")
	if victim == &"" or people == null:
		return
	var captive: Captive = people.get_node_or_null(NodePath(String(victim))) as Captive
	if captive == null:
		return
	soldier.executed.connect(captive.behead)
	soldier.died.connect(captive.run_free)
	var brain: EnemyBrain = soldier.get_node_or_null(^"Brain") as EnemyBrain
	if brain != null:
		brain.alerted.connect(captive.run_free)


## The soldier who was to behead this captive goes back to plain guard.
func _end_execution(captive: Captive) -> void:
	for soldier: MongolSoldier in soldiers():
		if soldier.get_meta(&"victim", &"") == StringName(captive.name):
			var brain: EnemyBrain = soldier.get_node_or_null(^"Brain") as EnemyBrain
			if brain != null:
				brain.end_activity()


func _on_captive_killed(captive: Captive) -> void:
	captive_killed.emit(captive)


func _on_captive_escaped(captive: Captive) -> void:
	captive_saved.emit(captive)


## Lets the townspeople react to the story so far (freed captives run).
func refresh_people(flags: Array[StringName]) -> void:
	if people == null:
		return
	for node: Node in people.get_children():
		var captive: Captive = node as Captive
		if captive != null:
			captive.refresh(flags)


func _on_checkpoint_rested(lamp: Checkpoint) -> void:
	checkpoint_reached.emit(lamp)


func _on_manuscript_taken(page: Manuscript) -> void:
	manuscript_found.emit(page)


## A relic set down while the level plays (the beads of a captive who died): it can be picked up too.
func add_relic(relic: Relic) -> void:
	interactables.add_child(relic)
	relic.taken.connect(_on_relic_taken)


func _on_relic_taken(relic: Relic) -> void:
	relic_found.emit(relic)


func _on_npc_talk(npc: Npc) -> void:
	talk_requested.emit(npc)


func _on_trigger_entered(trigger: StoryTrigger) -> void:
	trigger_entered.emit(trigger)


func _on_exit_requested() -> void:
	exit_requested.emit()


func _on_group_soldier_died(group: StringName) -> void:
	var count: int = _group_alive.get(group, 1) - 1
	_group_alive[group] = count
	# Archers alone cannot hold a place: once the rest of their group has fallen they flee, so the
	# fight ends where the hero can see it end (no hunting a bowman left on some gallery).
	if count > 0:
		var left: Array[MongolSoldier] = []
		for soldier: MongolSoldier in soldiers():
			if not soldier.dead and soldier.get_meta(&"group", &"") == group:
				left.append(soldier)
		var archers: bool = true
		for soldier: MongolSoldier in left:
			archers = archers and soldier.projectile_scene != null
		if archers:
			var hero: Node2D = get_tree().get_first_node_in_group(&"player") as Node2D
			for soldier: MongolSoldier in left:
				var away: float = signf(soldier.global_position.x - hero.global_position.x) if hero != null else 1.0
				soldier.withdraw(away if away != 0.0 else 1.0)
			count = 0
	if count <= 0:
		_group_alive.erase(group)
		group_cleared.emit(group)
