class_name AbbasidGame
extends Node
## The session: the front door (title, pause, settings, results), the level in play and the hero
## in it, the camera, the HUD and conversations, saving and loading, death and return, and the
## story of Chapter I. It wires gameplay signals to presentation (sound, effects, camera shake,
## hit-stop) and never decides a blow. The story itself is data: each level names its objectives,
## its ambushes, who gives what, where its exit leads and the card told on the way.

enum State {TITLE, CARD, PLAYING, PAUSED, DIALOGUE, READING, DEAD, ENDING, COMPLETE}

const FIRST_LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
const WARRIOR: PackedScene = preload("res://features/warrior/warrior.tscn")
const REFUGEE_FRAMES: Array[String] = [
	"res://assets/npcs/refugee_man/refugee_man_frames.tres",
	"res://assets/npcs/refugee_woman/refugee_woman_frames.tres",
]
## Manuscripts in the whole chapter, across its four levels.
const MANUSCRIPTS_TOTAL: int = 13
## Every technique the hero can learn in the chapter.
const TECHNIQUES: Array[StringName] = [&"bash", &"plunge", &"roll_cut", &"knives"]
## The glow of a soldier open to a finisher.
const FINISH_GLOW: Color = Color(1.0, 0.16, 0.1)
## The glint of a low sweep (jump it or roll): amber, beside the red of a blow no shield stops.
const LOW_GLINT: Color = Color(1.0, 0.68, 0.22)
## Townspeople in the chapter kneeling under a headsman's sabre, who can be saved.
const CAPTIVES_TOTAL: int = 7
const DEATH_DELAY: float = 2.4
const FADE_TIME: float = 0.6

## Checks start straight in a level, without the title, the intro or fades.
static var start_in_level: String = ""
static var start_checkpoint: StringName = &""

## How to use a technique just learned, shown once play resumes.
var _technique_hint: String = ""
var state: State = State.TITLE
var level: Level
var level_path: String = ""
var hero: Warrior
var save: SaveGame = SaveGame.new()
var _settings_return: MenuScreen
var _talking: Npc
var _boss: MongolSoldier

@onready var settings: GameSettings = $Settings
@onready var glyphs: InputGlyphs = $Glyphs
@onready var world: Node2D = $World
@onready var vfx: VfxDirector = $Vfx
@onready var gore: GoreDirector = $Gore
@onready var camera: GameCamera = $Camera
@onready var sounds: SoundDirector = $Sounds
@onready var music: MusicDirector = $Music
@onready var hit_stop: HitStop = $HitStop
@onready var hud: Hud = $Hud
@onready var dialogue: DialogueBox = $Dialogue
@onready var title: TitleScreen = $Menus/Title
@onready var pause_menu: MenuScreen = $Menus/Pause
@onready var settings_screen: SettingsScreen = $Menus/Settings
@onready var game_over: ResultScreen = $Menus/GameOver
@onready var complete: ResultScreen = $Menus/Complete
@onready var reader: ManuscriptReader = $Menus/Reader
@onready var card: StoryCard = $Menus/Card
@onready var fade: ColorRect = $Fade/Black


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	world.process_mode = Node.PROCESS_MODE_PAUSABLE
	vfx.process_mode = Node.PROCESS_MODE_PAUSABLE
	gore.process_mode = Node.PROCESS_MODE_PAUSABLE
	gore.piece_landed.connect(_on_piece_landed)
	camera.process_mode = Node.PROCESS_MODE_PAUSABLE
	hud.glyphs = glyphs
	settings_screen.settings = settings
	settings.changed.connect(_on_settings_changed)
	_on_settings_changed()
	for screen: MenuScreen in [title, pause_menu, settings_screen, game_over, complete, reader]:
		screen.chosen.connect(_on_menu)
	card.finished.connect(_on_card_finished)
	dialogue.finished.connect(_on_dialogue_finished)
	if start_in_level != "":
		save = SaveGame.new()
		save.level = start_in_level
		_enter_level(start_in_level, start_checkpoint, false, false)
	else:
		show_title()


func _process(delta: float) -> void:
	if state == State.PLAYING:
		save.play_time += delta / maxf(Engine.time_scale, 0.001)
	_update_finish_prompt()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"pause") and state == State.PLAYING:
		get_viewport().set_input_as_handled()
		_pause()


# --- The front door ---------------------------------------------------------------------------------

func show_title() -> void:
	_unload_level()
	get_tree().paused = false
	hit_stop.clear()
	state = State.TITLE
	hud.set_gameplay_visible(false)
	_close_menus()
	title.has_save = SaveGame.exists()
	title.open()
	music.play_music(&"title")
	music.play_ambience(&"wind")
	fade.color.a = 0.0


func _on_menu(action: StringName) -> void:
	match action:
		&"focus", &"step":
			sounds.play(&"ui_move", -6.0)
			return
		&"back", &"resume", &"close", &"cancel_new":
			sounds.play(&"ui_back", -3.0)
		_:
			sounds.play(&"ui_select", -3.0)
	match action:
		&"continue":
			_continue_game()
		&"new_game":
			if SaveGame.exists():
				title.ask_new_game()
			else:
				_new_game()
		&"confirm_new":
			_new_game()
		&"cancel_new":
			title.cancel_confirm()
		&"settings":
			_open_settings()
		&"back":
			_close_settings()
		&"quit":
			get_tree().quit()
		&"resume":
			_resume_play()
		&"return_lamp", &"rise":
			_respawn()
		&"quit_title":
			_quit_to_title()
		&"close":
			_resume_play()


func _new_game() -> void:
	SaveGame.erase()
	save = SaveGame.new()
	save.level = FIRST_LEVEL
	title.close()
	state = State.CARD
	card.play(&"intro", _card_lines(&"intro"), "CHAPTER_1_TITLE")


func _continue_game() -> void:
	save = SaveGame.load_game()
	title.close()
	_enter_level(save.level if save.level != "" else FIRST_LEVEL, save.checkpoint, true, true)


func _on_card_finished(id: StringName) -> void:
	match id:
		&"intro":
			_enter_level(FIRST_LEVEL, &"", true, true)
		&"ending":
			_show_complete()
		_:
			# A card between levels: the save already points at the next one.
			_enter_level(save.level, save.checkpoint, true, true)


func _open_settings() -> void:
	_settings_return = title if state == State.TITLE else pause_menu
	_settings_return.close()
	settings_screen.open()


func _close_settings() -> void:
	settings_screen.close()
	if _settings_return != null:
		_settings_return.open()


func _close_menus() -> void:
	for screen: MenuScreen in [title, pause_menu, settings_screen, game_over, complete, reader]:
		screen.close()


func _on_settings_changed() -> void:
	camera.shake_scale = settings.shake
	gore.full = settings.gore
	MongolSoldier.dismemberment = settings.gore


func _card_lines(id: StringName) -> Array[String]:
	var keys: Array[String] = []
	for line: PackedStringArray in DialogueLibrary.lines(id):
		keys.append(line[1])
	return keys


# --- Levels -----------------------------------------------------------------------------------------

## Loads a level and puts the hero in it; `announce` shows the name of the place.
func _enter_level(path: String, checkpoint: StringName, fade_in: bool, announce: bool) -> void:
	_close_menus()
	if fade_in:
		await _fade_to(1.0)
	get_tree().paused = false
	hit_stop.clear()
	_unload_level()
	var scene: PackedScene = load(path) as PackedScene
	level = scene.instantiate() as Level
	level_path = path
	world.add_child(level)
	_setup_level(checkpoint)
	state = State.PLAYING
	hud.set_gameplay_visible(true)
	hud.suspend_prompt(false)
	if announce:
		hud.show_location(tr(level.title_key))
	if fade_in:
		await _fade_to(0.0)
	else:
		fade.color.a = 0.0


func _setup_level(checkpoint: StringName) -> void:
	level.apply_progress(save.lit, save.manuscripts, save.flags)
	hero = WARRIOR.instantiate() as Warrior
	level.add_child(hero)
	level.move_child(hero, level.enemies.get_index() + 1)
	hero.set_techniques(_known_techniques())
	hero.respawn(level.spawn_point(checkpoint), 1.0)
	_wire_hero()
	for soldier: MongolSoldier in level.soldiers():
		_wire_soldier(soldier)
	level.checkpoint_reached.connect(_on_checkpoint)
	level.manuscript_found.connect(_on_manuscript)
	level.talk_requested.connect(_on_talk)
	level.trigger_entered.connect(_on_trigger)
	level.exit_requested.connect(_on_exit)
	level.group_cleared.connect(_on_group_cleared)
	level.captive_killed.connect(_on_captive_killed)
	level.captive_saved.connect(_on_captive_saved)
	_refresh_story()
	_boss = null
	hud.hide_boss()
	camera.set_bounds(level.bounds)
	camera.target = hero
	camera.snap()
	hud.bind(hero)
	hud.set_manuscripts(save.manuscripts.size(), MANUSCRIPTS_TOTAL)
	music.play_music(level.music)
	music.play_ambience(level.ambience)
	vfx.clear()
	gore.clear()
	gore.set_ground_layer(level.get_node_or_null(^"Props") as Node2D)


func _unload_level() -> void:
	camera.target = null
	vfx.clear()
	gore.clear()
	if level != null:
		world.remove_child(level)
		level.queue_free()
	level = null
	hero = null


func _pause() -> void:
	state = State.PAUSED
	get_tree().paused = true
	hero.input.clear()
	hud.suspend_prompt(true)
	pause_menu.open()


func _pause_for(next: State) -> void:
	state = next
	get_tree().paused = true
	hud.suspend_prompt(true)
	if hero != null:
		hero.input.clear()


func _resume_play() -> void:
	_close_menus()
	get_tree().paused = false
	state = State.PLAYING
	hud.suspend_prompt(false)
	if hero != null:
		hero.input.hold_off(0.2)
	if _technique_hint != "":
		hud.show_hint(_technique_hint)
		_technique_hint = ""


func _respawn() -> void:
	_enter_level(level_path if level_path != "" else FIRST_LEVEL, save.checkpoint, true, false)


func _quit_to_title() -> void:
	if save.level != "":
		save.write()
	await _fade_to(1.0)
	show_title()


func _fade_to(alpha: float) -> void:
	var tween: Tween = create_tween()
	# Fades run in real time, whatever a hit-stop or a slow fall is doing to the world.
	tween.set_ignore_time_scale(true)
	tween.tween_property(fade, "color:a", alpha, FADE_TIME)
	await tween.finished


func _real_delay(seconds: float) -> void:
	await get_tree().create_timer(seconds, true, false, true).timeout


# --- The hero and the soldiers: presentation ---------------------------------------------------------

func _wire_hero() -> void:
	_wire_combatant(hero)
	hero.died.connect(_on_hero_died)
	hero.jumped.connect(sounds.play.bind(&"jump", -6.0))
	hero.footstep.connect(sounds.play.bind(&"footstep", -12.0))
	hero.landed.connect(_on_hero_landed)
	hero.rolled.connect(_on_hero_rolled)
	hero.healed.connect(_on_hero_healed)
	hero.interacted.connect(_on_hero_interacted)
	hero.finisher_started.connect(_on_finisher_started)
	hero.finisher_struck.connect(_on_finisher_struck)
	hero.finisher_ended.connect(_on_finisher_ended)
	hero.plunge_landed.connect(_on_plunge_landed)
	hero.thrown.connect(_on_knife_thrown)


func _wire_soldier(soldier: MongolSoldier) -> void:
	_wire_combatant(soldier)
	soldier.died.connect(_on_soldier_died.bind(soldier))
	if soldier.get_meta(&"activity", &"") == &"stab":
		soldier.sprite.frame_changed.connect(_on_stab_frame.bind(soldier))
	soldier.projectile_spawned.connect(_on_projectile)
	soldier.surprised.connect(_on_soldier_surprised)
	var brain: EnemyBrain = soldier.get_node_or_null(^"Brain") as EnemyBrain
	if brain != null:
		brain.alerted.connect(sounds.play.bind(&"enemy_alert", -5.0))


## A soldier falls: cut apart if the blow took something off him, and bleeding where he lies (a
## finisher has already cut him, frame by frame).
func _on_soldier_died(soldier: MongolSoldier) -> void:
	sounds.play(&"enemy_death", -2.0)
	if soldier.in_finisher:
		gore.bleed_out(soldier, soldier.sprite, soldier.gore_set, soldier.facing, soldier.severed)
		return
	# The blade that killed him is wet with it for a while.
	var trail: SwordTrail = hero.get_node_or_null(^"Sprite/Trail") as SwordTrail if hero != null else null
	if trail != null and settings.gore:
		trail.bloodied = 6.0
	if soldier.severed != &"":
		var blow: float = soldier.killing_hit.direction if soldier.killing_hit != null else -soldier.facing
		var fury: float = 3.0 if soldier.profile.armoured_body else 1.0
		gore.cut_down(soldier, soldier.sprite, soldier.gore_set, soldier.severed, soldier.facing, blow, fury)
		sounds.play(&"sever", -1.0)
		hit_stop.trigger(0.09)
	gore.bleed_out(soldier, soldier.sprite, soldier.gore_set, soldier.facing, soldier.severed)


## The sabre fell before the hero could stop it.
func _on_captive_killed(captive: Captive) -> void:
	gore.cut_down(captive, captive, captive.gore_set, &"head", captive.facing(), captive.facing())
	gore.bleed_out(captive, captive, captive.gore_set, captive.facing())
	sounds.play(&"sever")
	hit_stop.trigger(0.08)
	camera.shake(1.5)
	if captive.captive_id != &"":
		save.set_flag(StringName("lost_%s" % captive.captive_id))
	_say("SPEAKER_YUSUF", "YUSUF_TOO_LATE")


## Someone the soldiers would have killed got away.
func _on_captive_saved(captive: Captive) -> void:
	if captive.captive_id == &"":
		return
	save.set_flag(StringName("saved_%s" % captive.captive_id))
	if captive.thanks != "":
		_say("SPEAKER_CAPTIVE", captive.thanks)


## A soldier stabbing at a body on the street: blood with each thrust.
func _on_stab_frame(soldier: MongolSoldier) -> void:
	if soldier.dead or soldier.sprite.animation != &"stab" or soldier.sprite.frame != 1:
		return
	# Only where it can be seen (the street keeps only so many marks).
	if hero == null or absf(soldier.global_position.x - hero.global_position.x) > 420.0:
		return
	var at: Vector2 = soldier.global_position + Vector2(soldier.facing * 20.0, -5.0)
	gore.spatter(at, soldier.facing, soldier.global_position.y, 1)
	sounds.play(&"sever", -16.0)


# --- Finishers ------------------------------------------------------------------------------------

## A scripted kill begins. The last soldier standing gets the full one: the bars close in, a sting,
## and the street holds its breath. While others still fight, it plays quick and plain.
func _on_finisher_started(_target: Combatant, _finisher: FinisherDefinition) -> void:
	hud.set_finish_prompt(false)
	if hero.finisher_cinematic:
		hud.cinematic_bars(true)
		sounds.play(&"finisher")
		camera.shake(1.5)
	else:
		sounds.play(&"finisher", -10.0)


## A finisher's blow: what it cuts off flies, or the blood bursts from a thrust; time slows on it.
func _on_finisher_struck(target: Combatant, finisher: FinisherDefinition, frame: int, cut: StringName) -> void:
	var soldier: MongolSoldier = target as MongolSoldier
	if soldier == null:
		return
	var full: bool = hero.finisher_cinematic
	if full and frame >= finisher.slow_from and frame <= finisher.slow_to:
		hit_stop.slow(0.3, 0.7)
	if cut != &"":
		gore.cut_down(soldier, soldier.sprite, soldier.gore_set, cut, soldier.facing, hero.facing, 1.6 if full else 1.2)
		sounds.play(&"sever")
		hit_stop.trigger(0.11 if full else 0.07)
		camera.shake(4.5 if full else 3.0)
	else:
		var middle: Vector2 = soldier.global_position + Vector2(0.0, -40.0)
		var last: bool = frame == finisher.burst_frames[finisher.burst_frames.size() - 1]
		gore.burst(soldier, soldier.sprite, soldier.gore_set, middle, hero.facing, last)
		sounds.play(&"sever", -4.0)
		hit_stop.trigger(0.08 if full else 0.05)
		camera.shake(3.0 if full else 2.0)
	if settings.gore:
		var trail: SwordTrail = hero.get_node_or_null(^"Sprite/Trail") as SwordTrail
		if trail != null:
			trail.bloodied = 6.0


func _on_finisher_ended(_target: Combatant) -> void:
	hud.cinematic_bars(false)


func _on_knife_thrown(knife: Node2D) -> void:
	sounds.play(&"sword_swing", -6.0)
	var thrown: ThrownKnife = knife as ThrownKnife
	if thrown != null:
		thrown.impacted.connect(_on_arrow_impacted)


## The plunge strikes the street: dust thrown both ways, the ground shakes.
func _on_plunge_landed() -> void:
	sounds.play(&"land", -1.0)
	vfx.play(&"dust", hero.global_position, false, true)
	vfx.play(&"dust", hero.global_position, true, true)
	camera.shake(3.5)


## The soldier a finisher would take glows red, and the prompt shows, while he stands open.
func _update_finish_prompt() -> void:
	var target: Combatant = hero.finisher_target if hero != null and state == State.PLAYING else null
	hud.set_finish_prompt(target != null)
	if target != null:
		var pulse: float = 0.24 + 0.12 * sin(Time.get_ticks_msec() * 0.012)
		target.glow(pulse, FINISH_GLOW)


func _on_piece_landed(_at: Vector2) -> void:
	sounds.play(&"body_drop", -8.0)


## A first strike on a soldier who never saw it coming: he dies before he can turn.
func _on_soldier_surprised() -> void:
	sounds.play(&"guard_break", -3.0)
	hit_stop.trigger(0.12)
	camera.shake(2.4)


func _wire_combatant(combatant: Combatant) -> void:
	combatant.struck.connect(_on_struck.bind(combatant))
	combatant.swung.connect(_on_swung)
	combatant.telegraphed.connect(_on_telegraphed.bind(combatant))


func _on_struck(hit: HitData, outcome: HitData.Outcome, target: Combatant) -> void:
	var guard_point: Vector2 = target.global_position + Vector2(target.facing * 13.0, -46.0)
	var shake: float = hit.attack.camera_shake if hit.attack != null else 1.5
	match outcome:
		HitData.Outcome.HIT:
			var thrown_left: bool = hit.direction < 0.0
			var impact: StringName = hit.attack.impact_effect if hit.attack != null else &"hit_pierce"
			vfx.play(impact, hit.position, thrown_left)
			vfx.play(&"hit_spark", hit.position)
			vfx.play(&"blood_spray", hit.position, thrown_left)
			if settings.gore:
				vfx.play(&"hit_flecks", hit.position, thrown_left)
			gore.spatter(hit.position, hit.direction, target.global_position.y)
			if hit.knockback >= 200.0:
				# A blow that shoves him back raises dust where his heels drag.
				vfx.play(&"dust", target.global_position, thrown_left, true)
			sounds.play(hit.attack.hit_cue if hit.attack != null else &"arrow_hit")
			sounds.play(&"hero_hurt" if target == hero else &"enemy_hurt", -3.0)
			hit_stop.trigger(hit.hit_stop)
			camera.shake(shake + (1.5 if target == hero else 0.0))
		HitData.Outcome.BLOCKED:
			vfx.play(&"block_spark", guard_point, target.facing < 0.0)
			sounds.play(&"shield_block")
			hit_stop.trigger(0.045)
			camera.shake(1.0)
		HitData.Outcome.PARRIED:
			vfx.play(&"parry_flash", guard_point)
			sounds.play(&"parry")
			hit_stop.trigger(0.14)
			camera.shake(3.0)
		HitData.Outcome.GUARD_BROKEN:
			vfx.play(&"block_spark", guard_point, target.facing < 0.0)
			vfx.play(&"hit_spark", guard_point)
			sounds.play(&"guard_break")
			hit_stop.trigger(0.1)
			camera.shake(3.0)


func _on_swung(attack: AttackDefinition) -> void:
	sounds.play(attack.swing_cue, -2.0)


func _on_telegraphed(attack: AttackDefinition, combatant: Combatant) -> void:
	var tip: Vector2 = Vector2(12, -62)
	if combatant.hitboxes != null:
		var known: Vector2 = combatant.hitboxes.tip(attack.animation, combatant.sprite.frame)
		if known != Vector2.INF:
			tip = known
	# Blows a shield cannot answer (an unblockable smash, a charge that cannot be parried) glint red; a
	# low sweep that passes under a standing guard (jump it or roll) glints amber.
	var dire: bool = attack.unblockable or not attack.parryable
	var colour: Color = Color(1.0, 0.32, 0.22) if dire else (LOW_GLINT if attack.low else Color.WHITE)
	vfx.play(&"glint", combatant.global_position + Vector2(tip.x * combatant.facing, tip.y), false, false, colour)
	if dire:
		# The whole body flushes red too, so the warning reads at a glance.
		combatant.flash(0.7, Color(1.0, 0.22, 0.12))
	elif attack.low:
		combatant.flash(0.5, LOW_GLINT)
	var warning: bool = (dire or attack.low) and sounds.has_cue(&"enemy_tell_dire")
	sounds.play(&"enemy_tell_dire" if warning else &"enemy_tell", -6.0)


func _on_projectile(projectile: Node2D) -> void:
	var arrow: Arrow = projectile as Arrow
	if arrow != null:
		sounds.play(&"bow_release", -3.0)
		arrow.impacted.connect(_on_arrow_impacted)
	var pot: FirePot = projectile as FirePot
	if pot != null:
		pot.burst.connect(_on_pot_burst)


## A fire pot breaks: clay and naphtha, and the fire takes.
func _on_pot_burst(at: Vector2, _outcome: int) -> void:
	sounds.play(&"pot_burst", -2.0)
	vfx.play(&"dust", at, false, true)
	camera.shake(2.0)


func _on_arrow_impacted(at: Vector2, outcome: int) -> void:
	if outcome == -1:
		sounds.play(&"arrow_thunk", -4.0)
		vfx.play(&"dust", at, false, true)


func _on_hero_landed(speed: float) -> void:
	if speed > 220.0:
		sounds.play(&"land", -4.0)
		vfx.play(&"dust", hero.global_position, false, true)


func _on_hero_rolled() -> void:
	sounds.play(&"roll", -3.0)
	vfx.play(&"dust", hero.global_position, hero.facing < 0.0, true)


func _on_hero_healed(_amount: float) -> void:
	sounds.play(&"heal")


func _on_hero_died() -> void:
	state = State.DEAD
	sounds.play(&"hero_death")
	gore.bleed_out(hero, hero.sprite, null, hero.facing)
	music.play_music(&"")
	save.deaths += 1
	if save.level != "":
		save.write()
	await _real_delay(DEATH_DELAY)
	if state != State.DEAD:
		return
	hud.set_gameplay_visible(false)
	game_over.show_result("GAME_OVER_TITLE", "GAME_OVER_LINE")


# --- Lamps, pages and people -----------------------------------------------------------------------

func _on_checkpoint(lamp: Checkpoint) -> void:
	var first: bool = not lamp.checkpoint_id in save.lit
	if first:
		save.lit.append(lamp.checkpoint_id)
	save.checkpoint = lamp.checkpoint_id
	save.level = level_path
	save.write()
	hero.rest()
	sounds.play(&"lamp_light" if first else &"checkpoint_rest")
	hud.notice(tr(&"NOTICE_LAMP_LIT") if first else tr(&"NOTICE_RESTED"))


## What the hero knows here: what the levels before taught him, and what he has learned since.
func _known_techniques() -> Array[StringName]:
	var known: Array[StringName] = []
	for technique: StringName in TECHNIQUES:
		if level.known_techniques.has(String(technique)) or save.has_flag(StringName("knows_%s" % technique)):
			known.append(technique)
	# A gift already given (a save from before it taught anything) still teaches.
	for node: Node in level.interactables.get_children():
		var npc: Npc = node as Npc
		if npc != null and npc.teaches != &"" and save.has_flag(npc.gives_flag) and not known.has(npc.teaches):
			known.append(npc.teaches)
	return known


## A technique learned (a page of the treatise, a gift): his from now on, with its notice; how to use
## it is shown once play resumes.
func _learn(technique: StringName) -> void:
	save.set_flag(StringName("knows_%s" % technique))
	hero.learn(technique)
	hud.notice(tr(StringName("NOTICE_LEARNED_%s" % String(technique).to_upper())))
	_technique_hint = "HINT_LEARNED_%s" % String(technique).to_upper()


func _on_manuscript(page: Manuscript) -> void:
	if page.teaches != &"":
		_learn(page.teaches)
	if not page.manuscript_id in save.manuscripts:
		save.manuscripts.append(page.manuscript_id)
	save.write()
	hud.set_manuscripts(save.manuscripts.size(), MANUSCRIPTS_TOTAL)
	sounds.play(&"manuscript")
	_pause_for(State.READING)
	reader.read(page.manuscript_id)


func _on_talk(npc: Npc) -> void:
	var id: StringName = npc.dialogue
	var after: StringName = StringName("%s_after" % npc.dialogue)
	var waiting: StringName = StringName("%s_waiting" % npc.dialogue)
	if not npc.ready_to_speak:
		# What they wait on has not happened yet: a word for the moment, nothing more.
		id = waiting if DialogueLibrary.has(waiting) else &"waiting"
	elif save.has_flag(StringName("talked_%s" % npc.npc_id)) and DialogueLibrary.has(after):
		id = after
	_talking = npc
	npc.process_mode = Node.PROCESS_MODE_ALWAYS
	npc.set_talking(true)
	hero.set_facing(signf(npc.global_position.x - hero.global_position.x))
	_pause_for(State.DIALOGUE)
	dialogue.play(id, DialogueLibrary.lines(id))


func _on_dialogue_finished(id: StringName) -> void:
	var npc: Npc = _talking
	_talking = null
	# A word while they still wait on something is not their conversation: nothing is remembered.
	if npc != null and is_instance_valid(npc):
		npc.set_talking(false)
		npc.process_mode = Node.PROCESS_MODE_INHERIT
	if npc != null and is_instance_valid(npc) and npc.ready_to_speak:
		save.set_flag(StringName("talked_%s" % npc.npc_id))
		# The first conversation may hand something over (Ibrahim's satchel).
		if id == npc.dialogue and npc.gives_flag != &"" and not save.has_flag(npc.gives_flag):
			save.set_flag(npc.gives_flag)
			if npc.gives_notice != "":
				hud.notice(tr(npc.gives_notice))
			sounds.play(&"manuscript")
			if npc.teaches != &"":
				_learn(npc.teaches)
	_refresh_story()
	save.write()
	_resume_play()


func _on_hero_interacted(target: Interactable) -> void:
	var gate: LevelExit = target as LevelExit
	if gate != null and not gate.unlocked:
		_say("SPEAKER_YUSUF", gate.locked_line)


# --- The story --------------------------------------------------------------------------------------

func objective() -> String:
	return level.objective(save.flags) if level != null else ""


func _refresh_story() -> void:
	hud.set_objective(objective())
	level.refresh_people(save.flags)
	for node: Node in level.interactables.get_children():
		var npc: Npc = node as Npc
		if npc != null:
			npc.refresh(save.flags)
		var gate: LevelExit = node as LevelExit
		if gate != null:
			gate.refresh(save.flags)


## Shows a line as a notice: "Speaker: line", or the line alone for narration (translation keys).
func _say(speaker: String, line: String) -> void:
	if line == "":
		return
	hud.notice("%s: %s" % [tr(speaker), tr(line)] if speaker != "" else tr(line))


func _on_trigger(trigger: StoryTrigger) -> void:
	match trigger.event:
		&"refugees":
			_spawn_refugees()
		&"ambush":
			if save.has_flag(StringName("%s_cleared" % trigger.group)):
				return
			save.set_flag(trigger.group)
			level.wake_group(trigger.group)
			sounds.play(&"ambush_sting")
			music.play_music(&"combat")
			_refresh_story()
		&"boss":
			if not _begin_boss():
				return
		&"alarm":
			level.alarm_group(trigger.group)
	if trigger.hint != "":
		hud.show_hint(trigger.hint)
	_say(trigger.speaker, trigger.line)


func _on_group_cleared(group: StringName) -> void:
	var before: String = objective()
	save.set_flag(StringName("%s_cleared" % group))
	save.write()
	if _boss != null and _boss.get_meta(&"group", &"") == group:
		return  # The boss's fall has its own moment.
	music.play_music(level.music)
	# Not every group is the objective (a soldier over a captive): announce only a real change.
	if objective() != before:
		hud.notice(tr(&"NOTICE_OBJECTIVE"))
	_refresh_story()


## Townspeople running past the hero from the soldiers; the man last of them does not make it (an
## arrow from the dark, unless gore is reduced).
func _spawn_refugees() -> void:
	for i: int in REFUGEE_FRAMES.size():
		var runner: FleeingCivilian = FleeingCivilian.new()
		runner.sprite_frames = load(REFUGEE_FRAMES[i]) as SpriteFrames
		runner.speed = 150.0 + i * 20.0
		runner.position = Vector2(hero.global_position.x + 360.0 + i * 50.0, hero.global_position.y)
		if i == 0 and settings.gore:
			runner.position.x += 90.0
			runner.shot_after = 1.35
			runner.fell.connect(_on_runner_fell)
		level.add_child(runner)
		level.move_child(runner, level.enemies.get_index())


func _on_runner_fell(runner: FleeingCivilian) -> void:
	sounds.play(&"arrow_hit")
	gore.spatter(runner.global_position + Vector2(-runner.direction * 6.0, -46.0), runner.direction, runner.global_position.y, 4)
	gore.bleed_out(runner, runner, null, runner.direction)


## The way out: on to the next level through its story card, or, from the last, the chapter's end.
func _on_exit() -> void:
	state = State.ENDING
	hit_stop.clear()
	hero.set_cinematic(true)
	sounds.play(&"gate_open")
	save.set_flag(StringName("%s_complete" % level.level_id))
	var next: String = level.next_level
	var story: StringName = level.exit_card if level.exit_card != &"" else &"ending"
	var heading: String = level.exit_title
	if next != "":
		save.level = next
		save.checkpoint = &""
	save.write()
	music.play_music(&"ending" if next == "" else &"")
	await _real_delay(1.6)
	await _fade_to(1.0)
	hud.set_gameplay_visible(false)
	_unload_level()
	card.play(story if next != "" else &"ending", _card_lines(story if next != "" else &"ending"), heading)
	fade.color.a = 0.0


func _show_complete() -> void:
	_close_menus()
	state = State.COMPLETE
	get_tree().paused = true
	var seconds: int = int(save.play_time)
	var saved: int = 0
	for flag: StringName in save.flags:
		if String(flag).begins_with("saved_"):
			saved += 1
	var stats: String = "%s %d:%02d     %s %d     %s %d/%d     %s %d/%d" % [tr(&"STATS_TIME"), floori(seconds / 60.0),
		seconds % 60, tr(&"STATS_DEATHS"), save.deaths, tr(&"STATS_MANUSCRIPTS"), save.manuscripts.size(), MANUSCRIPTS_TOTAL,
		tr(&"STATS_SAVED"), saved, CAPTIVES_TOTAL]
	complete.show_result("CHAPTER_COMPLETE", "CHAPTER_1_TITLE", stats + "\n\n" + tr(&"CHAPTER_COMPLETE_NEXT"))


# --- The boss ---------------------------------------------------------------------------------------

## The arena closes behind the hero and its boss roars; false if there is no fight to begin.
func _begin_boss() -> bool:
	var arena: BossArena = level.arena
	if arena == null or arena.closed:
		return false
	var boss: MongolSoldier = arena.boss()
	if boss == null or boss.dead:
		return false
	var brain: CaptainBrain = boss.get_node_or_null(^"Brain") as CaptainBrain
	if brain == null:
		return false
	_boss = boss
	arena.close()
	camera.set_bounds(arena.camera_bounds)
	brain.phase_changed.connect(_on_boss_phase)
	boss.health_changed.connect(_on_boss_health)
	boss.beaten.connect(_on_boss_beaten)
	boss.died.connect(_on_boss_died)
	hud.show_boss(tr(boss.profile.display_name), boss.health, boss.max_health)
	music.play_music(&"boss")
	sounds.play(&"boss_roar")
	camera.shake(3.0)
	hero.set_cinematic(true)
	hero.set_facing(signf(boss.global_position.x - hero.global_position.x))
	brain.begin_fight()
	_release_hero_after(CaptainBrain.ROAR_TIME)
	return true


func _release_hero_after(seconds: float) -> void:
	var held: Warrior = hero
	await _real_delay(seconds)
	if held != null and is_instance_valid(held) and held == hero:
		held.set_cinematic(false)


func _on_boss_health(current: float, _maximum: float) -> void:
	hud.update_boss(current)


func _on_boss_phase(_phase: int) -> void:
	sounds.play(&"boss_roar")
	camera.shake(4.0)
	_say("SPEAKER_TOQTO", "TOQTO_PHASE")


## The blow that would have killed him brings him to his knee instead, propped on his sabre. A last
## word, in slow time; then Yusuf steps in, and his stroke takes the Captain's head.
func _on_boss_beaten() -> void:
	var boss: MongolSoldier = _boss
	if boss == null:
		return
	hero.set_cinematic(true)
	hero.set_facing(signf(boss.global_position.x - hero.global_position.x))
	hit_stop.slow(0.4, 1.0)
	camera.shake(4.0)
	music.play_music(&"")
	sounds.play(&"boss_roar", -8.0)
	_say("SPEAKER_TOQTO", "TOQTO_FALL")
	await _real_delay(2.6)
	if _boss != boss or not is_instance_valid(boss) or boss.dead or hero == null:
		return
	# Yusuf beside him, and the stroke.
	var side: float = signf(hero.global_position.x - boss.global_position.x)
	if side == 0.0:
		side = -boss.facing
	hero.global_position.x = boss.global_position.x + side * 52.0
	hero.set_facing(-side)
	hero.cinematic_strike(&"heavy")
	await _real_delay(0.3)
	if _boss != boss or not is_instance_valid(boss) or boss.dead:
		return
	hit_stop.slow(0.22, 1.6)
	camera.shake(7.0)
	boss.finish()


## He falls; then the arena opens and the way on is clear.
func _on_boss_died() -> void:
	var fallen: Level = level
	hit_stop.slow(0.3, 1.2)
	camera.shake(5.0)
	sounds.play(&"boss_fall")
	music.play_music(&"")
	await _real_delay(1.4)
	if level != fallen or level == null:
		return
	hud.hide_boss()
	await _real_delay(1.6)
	if level != fallen or level == null:
		return
	if level.arena != null:
		level.arena.open()
	camera.set_bounds(level.bounds)
	_boss = null
	if hero != null:
		hero.set_cinematic(false)
	_say("SPEAKER_YUSUF", "YUSUF_AFTER_TOQTO")
	music.play_music(level.music)
	_refresh_story()