class_name AbbasidGame
extends Node
## The session: the front door (title, pause, settings, results), the level in play and the hero
## in it, the camera, the HUD and conversations, saving and loading, death and return, and the
## story of Chapter I. How the fighting looks and sounds is its CombatPresentation's (app/combat_presentation.gd),
## which it binds to each fighter; it never decides a blow. The story itself is data: each level names its objectives,
## its ambushes, who gives what, where its exit leads and the card told on the way. It keeps the
## hero's growth too (a Progression over the save): the Honour his deeds earn, the lamp menu where he
## spends it, the keepsakes given to him, and applies what he has become to the hero.

enum State {TITLE, CARD, PLAYING, PAUSED, DIALOGUE, READING, DEAD, ENDING, COMPLETE, LAMP, LESSON}

const FIRST_LEVEL: String = "res://features/levels/fallen_market/fallen_market.tscn"
const WARRIOR: PackedScene = preload("res://features/warrior/warrior.tscn")
## The technique tree, the keepsakes, and what Honour each deed is worth.
const CATALOG: ProgressionCatalog = preload("res://features/progression/catalog.tres")
## Health the hero gains for each level of the chapter left behind.
const VIGOUR: float = 10.0
## The chapter's levels, in order (the health gained counts those left behind).
const LEVEL_IDS: Array[StringName] = [&"fallen_market", &"streets_of_ash", &"scholars_quarter", &"last_gate"]
const RELIC: PackedScene = preload("res://features/levels/relic.tscn")
const REFUGEE_FRAMES: Array[String] = [
	"res://assets/npcs/refugee_man/refugee_man_frames.tres",
	"res://assets/npcs/refugee_woman/refugee_woman_frames.tres",
]
## Manuscripts in the whole chapter, across its four levels.
const MANUSCRIPTS_TOTAL: int = 16
## Every technique the hero can learn in the chapter.
const TECHNIQUES: Array[StringName] = [&"sweep", &"bash", &"plunge", &"roll_cut", &"knives", &"charge", &"pommel", &"whirl",
	&"delayed_cut", &"executioner", &"running_thrust", &"storm", &"pierce", &"naft", &"second_wind", &"judgment",
	&"kick", &"low_cut", &"rising_cleave", &"running_slash", &"guarded_thrust", &"down_stab", &"windmill"]
## Townspeople in the chapter kneeling under a headsman's sabre, who can be saved.
const CAPTIVES_TOTAL: int = 7
const DEATH_DELAY: float = 2.4
## How near a soldier's first warning of a colour must be for its lesson to stop the game.
const WARNING_LESSON_RANGE: float = 300.0
## How near the first unlit lamp and the first person with something to say must be to be pointed out, and how
## long into a street before they are (its first moment is for moving).
const FIRST_MEETING_RANGE: float = 150.0
const FIRST_MEETING_DELAY: float = 1.5
## How near someone with something to say must be to call out to him.
const CALL_RANGE: float = 230.0
## What each warning's card shows: its title, its words, the move that answers it (MoveDemos).
const WARNING_LESSONS: Array[Array] = [
	["LESSON_WARN_WHITE", "HINT_WARN_WHITE", &"guard"],
	["LESSON_WARN_AMBER", "HINT_WARN_AMBER", &"roll"],
	["LESSON_WARN_VIOLET", "HINT_WARN_VIOLET", &"roll"],
	["LESSON_WARN_RED", "HINT_WARN_RED", &"roll"],
]
## The lamp's card shows the niche alight.
const LAMP_PICTURE: Texture2D = preload("res://assets/environments/market/props/lamp_niche.png")
const FADE_TIME: float = 0.6

## Checks start straight in a level, without the title, the intro or fades.
static var start_in_level: String = ""
static var start_checkpoint: StringName = &""

## Lessons that stop the game, waiting for a quiet moment: {"kind": "technique", "id": ...}, {"kind": "lamp"},
## {"kind": "warning", "tell": ...}.
var _cards: Array[Dictionary] = []
## What to do once the lesson on the screen is read (the first lamp's card opens the lamp menu), or nothing.
var _after_card: Callable = Callable()
## The objective shown (a translation key), to announce it when it changes.
var _last_objective: String = ""
## The person the interact button would speak to now (glowing softly), or null.
var _near_npc: Npc
## The last blow that landed on him (what felled him, for the game over's tip).
var _last_blow: HitData
## The remedies he had when last told, so one drunk is told to the playtest log (a lamp refills them).
var _remedies_seen: int = 0
## Seconds in play since the level was entered.
var _level_time: float = 0.0
var state: State = State.TITLE
var level: Level
var level_path: String = ""
var hero: Warrior
var save: SaveGame = SaveGame.new()
var _settings_return: MenuScreen
var _talking: Npc
var _boss: MongolSoldier
## The hero's growth, kept in the save.
var progression: Progression
## How the game is played, written for playtests (shared/playtest/play_log.gd).
var play_log: PlayLog
## How the fighting looks and sounds (app/combat_presentation.gd), bound to each fighter as he enters.
var presentation: CombatPresentation
## The nodes bought before the lamp menu opened (those bought by it are taught as he rises).
var _bought_before: Array[StringName] = []

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
@onready var pause_menu: PauseMenu = $Menus/Pause
@onready var settings_screen: SettingsScreen = $Menus/Settings
@onready var game_over: ResultScreen = $Menus/GameOver
@onready var complete: ResultScreen = $Menus/Complete
@onready var reader: ManuscriptReader = $Menus/Reader
@onready var card: StoryCard = $Menus/Card
@onready var lamp_menu: LampMenu = $Menus/Lamp
@onready var techniques_screen: TechniquesScreen = $Menus/Techniques
@onready var guide_screen: GuideScreen = $Menus/Guide
@onready var journal_screen: JournalScreen = $Menus/Journal
@onready var codex_screen: CodexScreen = $Menus/Codex
@onready var lesson_screen: LessonScreen = $Menus/Lesson
@onready var fade: ColorRect = $Fade/Black


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	play_log = PlayLog.new()
	play_log.name = "PlayLog"
	add_child(play_log)
	presentation = CombatPresentation.new()
	presentation.name = "Presentation"
	add_child(presentation)
	presentation.setup(self)
	world.process_mode = Node.PROCESS_MODE_PAUSABLE
	vfx.process_mode = Node.PROCESS_MODE_PAUSABLE
	gore.process_mode = Node.PROCESS_MODE_PAUSABLE
	camera.process_mode = Node.PROCESS_MODE_PAUSABLE
	hud.glyphs = glyphs
	settings_screen.settings = settings
	settings_screen.glyphs = glyphs
	settings.changed.connect(_on_settings_changed)
	_on_settings_changed()
	techniques_screen.glyphs = glyphs
	lamp_menu.glyphs = glyphs
	reader.glyphs = glyphs
	guide_screen.glyphs = glyphs
	lesson_screen.glyphs = glyphs
	codex_screen.glyphs = glyphs
	game_over.glyphs = glyphs
	card.glyphs = glyphs
	Input.joy_connection_changed.connect(_on_joy_connection_changed)
	hud.lessons.shown.connect(_on_lesson_shown)
	for screen: MenuScreen in [title, pause_menu, settings_screen, game_over, complete, reader, lamp_menu,
			techniques_screen, guide_screen, lesson_screen, journal_screen, codex_screen]:
		screen.chosen.connect(_on_menu)
	card.finished.connect(_on_card_finished)
	# A cinematic asks for its sounds.
	card.cue.connect(_on_card_cue)
	card.ambience.connect(music.play_ambience)
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
		play_log.played(delta / maxf(Engine.time_scale, 0.001))
	# The cursor is for the menus; in play it is out of the way.
	var cursor: Input.MouseMode = Input.MOUSE_MODE_HIDDEN if state == State.PLAYING else Input.MOUSE_MODE_VISIBLE
	if Input.mouse_mode != cursor and DisplayServer.get_name() != "headless":
		Input.mouse_mode = cursor
	_update_messages()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed(&"pause") and state == State.PLAYING:
		get_viewport().set_input_as_handled()
		_pause()
	elif event.is_action_pressed(&"pause") and state == State.PAUSED and pause_menu.visible:
		# The button that paused the game takes it out of the pause again.
		get_viewport().set_input_as_handled()
		_resume_play()
	elif event.is_action_pressed(&"pause") and state == State.LAMP:
		# Whatever the lamp menu shows, the pause button always lets him rise.
		get_viewport().set_input_as_handled()
		_leave_lamp()


# --- The front door ---------------------------------------------------------------------------------

func show_title() -> void:
	_unload_level()
	get_tree().paused = false
	hit_stop.clear()
	state = State.TITLE
	hud.set_gameplay_visible(false)
	_close_menus()
	title.has_save = SaveGame.exists()
	title.save_place = _save_place() if title.has_save else ""
	title.open()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	music.play_music(&"title")
	music.play_ambience(&"wind")
	fade.color.a = 0.0


func _on_menu(action: StringName) -> void:
	match action:
		&"focus", &"step":
			sounds.play(&"ui_move", -6.0)
			return
		&"back", &"resume", &"close", &"cancel_new", &"respec", &"cancel_ask":
			sounds.play(&"ui_back", -3.0)
		&"techniques_back", &"guide_back", &"journal_back", &"codex_back":
			sounds.play(&"ui_back", -3.0)
		&"refused":
			sounds.play(&"art_refused", -4.0)
			return
		&"bought":
			sounds.play(&"honour", -2.0)
			return
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
		&"leave":
			_leave_lamp()
		&"techniques":
			pause_menu.close()
			techniques_screen.open_for(hero, save.honour)
		&"techniques_back":
			techniques_screen.close()
			pause_menu.open()
		&"guide":
			pause_menu.close()
			guide_screen.open_with(save.lessons)
		&"guide_back":
			guide_screen.close()
			pause_menu.open()
		&"journal":
			pause_menu.close()
			journal_screen.open_with(_journal())
		&"journal_back":
			journal_screen.close()
			pause_menu.open()
		&"codex":
			pause_menu.close()
			codex_screen.open_with(save.manuscripts)
		&"codex_back":
			codex_screen.close()
			pause_menu.open()
		&"lesson_done":
			_close_card()


func _new_game() -> void:
	SaveGame.erase()
	save = SaveGame.new()
	save.level = FIRST_LEVEL
	_master_journey()
	title.close()
	state = State.CARD
	play_log.event("card", "intro begins")
	card.play(&"intro", _card_lines(&"intro"), "CHAPTER_1_TITLE")


func _continue_game() -> void:
	save = SaveGame.load_game()
	_master_journey()
	title.close()
	_enter_level(save.level if save.level != "" else FIRST_LEVEL, save.checkpoint, true, true)


## A journey begun after the chapter was finished is a master's: the master's techniques open on the tree and are
## taught on the way (docs/combat_focus_plan.md).
func _master_journey() -> void:
	if SaveGame.is_master():
		save.set_flag(&"master")


func _on_card_finished(id: StringName) -> void:
	play_log.event("card", "%s ends" % id)
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
	for screen: MenuScreen in [title, pause_menu, settings_screen, game_over, complete, reader, lamp_menu,
			techniques_screen, guide_screen, lesson_screen, journal_screen, codex_screen]:
		screen.close()


func _on_settings_changed() -> void:
	camera.shake_scale = settings.shake
	if hero != null:
		hero.charge_toggle = settings.charge_toggle
	gore.full = settings.gore
	MongolSoldier.dismemberment = settings.gore
	# Access: time stopped and slowed, flashes, the warnings' colours, the picture's brightness.
	hit_stop.enabled = settings.time_effects
	if not settings.time_effects:
		hit_stop.clear()
	Combatant.flash_scale = 1.0 if settings.flashes else 0.3
	vfx.calm = not settings.flashes
	presentation.apply_settings()
	var post: ShaderMaterial = grade()
	if post != null:
		post.set_shader_parameter(&"brightness", settings.brightness)
	card.cinematic.brightness = settings.brightness
	# The playtest log, as the player chose (never while the checks run: they turn it on themselves).
	play_log.enabled = settings.playtest_log and (OS.get_environment("ABBASID_USER_PREFIX") == "" or play_log.in_checks)
	card.cinematic.calm = not settings.flashes
	# Another language: the objective and the names over the world in it at once.
	if level != null and hero != null:
		hud.set_objective(_last_objective)


## The post-process's material (the grade over the world).
func grade() -> ShaderMaterial:
	var rect: CanvasItem = get_node_or_null(^"Post/Grade") as CanvasItem
	return rect.material as ShaderMaterial if rect != null else null


func _on_card_cue(cue: StringName) -> void:
	sounds.play(cue)


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
	hud.clear_messages()
	_cards.clear()
	_after_card = Callable()
	_last_objective = ""
	_near_npc = null
	_level_time = 0.0
	_last_blow = null
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
	save.set_flag(StringName("reached_%s" % level.level_id))
	play_log.enter_level(level.level_id)
	_apply_growth()
	_apply_vigour()
	hero.charge_toggle = settings.charge_toggle
	hero.respawn(level.spawn_point(checkpoint), 1.0)
	hero.set_resolve(save.resolve)
	_wire_hero()
	for soldier: MongolSoldier in level.soldiers():
		soldier.toughen(level.toughness.x, level.toughness.y)
		soldier.set_aggression(level.aggression)
		_wire_soldier(soldier)
	level.checkpoint_reached.connect(_on_checkpoint)
	level.manuscript_found.connect(_on_manuscript)
	level.talk_requested.connect(_on_talk)
	level.trigger_entered.connect(_on_trigger)
	level.exit_requested.connect(_on_exit)
	level.group_cleared.connect(_on_group_cleared)
	level.captive_killed.connect(_on_captive_killed)
	level.captive_saved.connect(_on_captive_saved)
	level.relic_found.connect(_on_relic_found)
	_lay_lost_keepsakes()
	_refresh_story()
	_boss = null
	hud.hide_boss()
	camera.set_bounds(level.bounds)
	camera.target = hero
	camera.snap()
	hud.bind(hero)
	hud.markers.level = level
	hud.markers.point_out()
	_refresh_objective_target()
	hud.coach.save = save
	hud.coach.settings = settings
	if not hud.coach.named.is_connected(_on_coach_named):
		hud.coach.named.connect(_on_coach_named)
	hud.set_manuscripts(save.manuscripts.size(), MANUSCRIPTS_TOTAL)
	hud.set_honour(save.honour, false)
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
	play_log.write_summary()
	state = State.PAUSED
	get_tree().paused = true
	hero.input.clear()
	hud.suspend_prompt(true)
	pause_menu.forget_focus()
	pause_menu.open()


## The window lost the player's attention (another window, a pad pulled out): the game waits for him.
func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_FOCUS_OUT and state == State.PLAYING and hero != null:
		_pause()


func _on_joy_connection_changed(_device: int, connected: bool) -> void:
	if not connected and state == State.PLAYING and hero != null:
		_pause()


## Where the saved journey stands, for the title's Continue: the street and how long it has been played.
func _save_place() -> String:
	var saved: SaveGame = SaveGame.load_game()
	var id: String = saved.level.get_file().get_basename()
	var minutes: int = int(saved.play_time / 60.0)
	var place: String = tr("LEVEL_%s" % id.to_upper()) if id != "" else ""
	return "%s · %d:%02d" % [place, floori(minutes / 60.0), minutes % 60] if place != "" else ""


## What the Journal shows: the objective, this street and what is to be found in it, its people, the chapter.
func _journal() -> Dictionary:
	var counts: Array = []
	var lamps: int = 0
	var lit: int = 0
	var people: Array = []
	for node: Node in level.interactables.get_children():
		var lamp: Checkpoint = node as Checkpoint
		if lamp != null:
			lamps += 1
			if lamp.checkpoint_id in save.lit:
				lit += 1
		var npc: Npc = node as Npc
		if npc != null:
			var how: String = "JOURNAL_HAS_NEWS" if npc.has_news() else ("JOURNAL_WAITING" if not npc.ready_to_speak else "JOURNAL_SPOKEN")
			people.append([tr(npc.display_name()), how])
	counts.append(["JOURNAL_LAMPS", lit, lamps])
	var pages: int = 0
	for id: String in level.manuscript_ids:
		if StringName(id) in save.manuscripts:
			pages += 1
	counts.append(["JOURNAL_PAGES", pages, level.manuscript_ids.size()])
	var tokens: int = 0
	for id: String in level.relic_ids:
		if save.has_flag(StringName("relic_%s" % id)):
			tokens += 1
	counts.append(["JOURNAL_TOKENS", tokens, level.relic_ids.size()])
	var saved: int = 0
	for id: String in level.captive_ids:
		if save.has_flag(StringName("saved_%s" % id)):
			saved += 1
	counts.append(["JOURNAL_CAPTIVES", saved, level.captive_ids.size()])
	var chapter: Array = []
	for id: StringName in LEVEL_IDS:
		var where: String = "here" if id == level.level_id else ("done" if save.has_flag(StringName("%s_complete" % id)) else "ahead")
		chapter.append([tr("LEVEL_%s" % String(id).to_upper()), where])
	return {"objective": tr(objective()), "street": tr(level.title_key), "counts": counts, "people": people,
		"chapter": chapter}


## Writes the journey down. Only a write that took is shown as saved (a lamp turns a moment in the corner of
## the screen); one that failed says so, and everything stays in memory, so the next save (the next lamp, the
## next street) can still write it. True when it was written.
func _save_game() -> bool:
	var result: Error = save.write()
	if result != OK:
		push_warning("The journey could not be saved to %s: %s" % [SaveGame.file_path(), error_string(result)])
		# Said once while it shows (a rest at a lamp saves twice).
		if not hud.notices.texts().has(tr(&"NOTICE_SAVE_FAILED")):
			hud.notice(tr(&"NOTICE_SAVE_FAILED"))
		return false
	if hero != null:
		hud.saved()
	return true


func _pause_for(next: State) -> void:
	state = next
	get_tree().paused = true
	hud.suspend_prompt(true)
	if hero != null:
		hero.input.clear()


## Back to play; the devices are ignored for `hold` seconds (so the button that closed a menu does not act).
func _resume_play(hold: float = 0.2) -> void:
	_close_menus()
	get_tree().paused = false
	state = State.PLAYING
	hud.suspend_prompt(false)
	if hero != null:
		hero.input.hold_off(hold)


func _respawn() -> void:
	_enter_level(level_path if level_path != "" else FIRST_LEVEL, save.checkpoint, true, false)


func _quit_to_title() -> void:
	if save.level != "":
		_save_game()
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


# --- The hero and the soldiers -----------------------------------------------------------------------

## The hero's signals the session keeps (the story, his growth, the playtest log); how he looks and sounds is the
## presentation's (bound last).
func _wire_hero() -> void:
	_wire_combatant(hero)
	hero.interactable_changed.connect(_on_target_changed)
	hero.died.connect(_on_hero_died)
	hero.rolled.connect(_on_hero_rolled)
	hero.health_changed.connect(_on_hero_health)
	hero.remedies_changed.connect(_on_hero_remedies)
	_remedies_seen = hero.remedies
	hero.interacted.connect(_on_hero_interacted)
	hero.finisher_started.connect(_on_finisher_started)
	hero.art_started.connect(_on_art_started)
	hero.technique_used.connect(_on_technique_used)
	hero.steady_breath.connect(_on_steady_breath)
	hero.close_call.connect(_on_close_call)
	hero.knocked_down.connect(_on_knocked_down.bind(hero))
	hero.glanced.connect(_on_glanced)
	presentation.bind_hero(hero)


## A soldier's signals the session keeps (his death's rewards, the playtest log, the lessons); how he looks and
## sounds is the presentation's (bound last).
func _wire_soldier(soldier: MongolSoldier) -> void:
	_wire_combatant(soldier)
	soldier.died.connect(_on_soldier_died.bind(soldier))
	soldier.projectile_spawned.connect(_on_projectile)
	soldier.knocked_down.connect(_on_knocked_down.bind(soldier))
	presentation.bind_soldier(soldier)


## A soldier falls: counted, and what killing him earns (how he falls is the presentation's).
func _on_soldier_died(soldier: MongolSoldier) -> void:
	play_log.event("kill", _kind(soldier), soldier.global_position.x)
	_reward_kill(soldier)
	_honour_kill(soldier)


## The sabre fell before the hero could stop it.
func _on_captive_killed(captive: Captive) -> void:
	play_log.event("captive", "lost %s" % captive.name, captive.global_position.x)
	_lay_keepsake(captive)
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
	play_log.event("captive", "saved %s" % captive.name, captive.global_position.x)
	if captive.captive_id == &"":
		# Freed with their captors beaten.
		_earn(CATALOG.person_freed, StringName("freed_%s_%s" % [level.level_id, captive.name]))
		return
	save.set_flag(StringName("saved_%s" % captive.captive_id))
	_earn(CATALOG.captive_saved, StringName("honour_saved_%s" % captive.captive_id))
	if captive.keepsake != &"":
		_give_keepsake(captive.keepsake)
	if hero != null:
		hero.gain_resolve(hero.profile.resolve_saved)
	if captive.thanks != "":
		_say("SPEAKER_CAPTIVE", captive.thanks)


## A soldier the hero killed: resolve for it (a finisher has already paid its own), and whatever the
## dead man carried that the hero can use (the engineer's naphtha).
func _reward_kill(soldier: MongolSoldier) -> void:
	if hero == null or soldier.in_finisher:
		return
	var hit: HitData = soldier.killing_hit
	if hit == null or hit.attacker != hero:
		return
	var stealthy: bool = hit.surprise or (hit.attack != null and (hit.attack == hero.profile.plunge
		or hit.attack == hero.profile.plunge_landing))
	hero.gain_resolve(hero.profile.resolve_surprise_kill if stealthy else hero.profile.resolve_kill)
	# Unseen: a man who never saw him coming gives back blood and resolve.
	if stealthy:
		if hero.mods.stealth_heal > 0.0:
			hero.heal(hero.mods.stealth_heal)
		hero.gain_resolve(hero.mods.stealth_resolve)
	var spoil: StringName = soldier.profile.drops_technique
	if spoil != &"" and not hero.knows(spoil):
		_learn(spoil, true)
		_save_game()


## Honour for a soldier the hero killed, once for each man: more for one he finished, took unawares or
## struck from above, and for one killed by a riposte or an Art.
func _honour_kill(soldier: MongolSoldier) -> void:
	if hero == null or level == null:
		return
	var hit: HitData = soldier.killing_hit
	var by_hero: bool = soldier.in_finisher or (hit != null and hit.attacker == hero)
	if not by_hero:
		return
	var amount: int = CATALOG.kill
	if soldier.in_finisher or (hit != null and (hit.surprise or hit.attack == hero.profile.plunge
			or hit.attack == hero.profile.plunge_landing)):
		amount += CATALOG.bold_kill
	elif hit != null and (hit.riposte or hero.state == Warrior.State.ART):
		amount += CATALOG.skilled_kill
	_earn(amount, StringName("slain_%s_%s" % [level.level_id, soldier.name]), false)


## Honour earned for a deed (once, when `once` names it): the count shines and a bell sounds.
func _earn(amount: int, once: StringName = &"", announce: bool = true) -> void:
	_sync_progression()
	if not progression.earn(amount, once):
		return
	hud.set_honour(save.honour, true)
	sounds.play(&"honour", -8.0 if not announce else -3.0)
	if announce:
		hud.notice(tr("NOTICE_HONOUR") % amount)


# --- In the fight: lessons, messages and the log -------------------------------------------------

## A scripted kill begins, for the playtest log (how it plays is the presentation's).
func _on_finisher_started(_target: Combatant, finisher: FinisherDefinition) -> void:
	play_log.event("finisher", finisher.resource_path.get_file().get_basename(), hero.global_position.x)


## An Art spent, for the playtest log (its moment is the presentation's).
func _on_art_started(art: ArtDefinition) -> void:
	play_log.event("art", art.resource_path.get_file().get_basename(), hero.global_position.x)


## The coach named a move: counted, so it gives up on one never taken up.
func _on_coach_named(technique: StringName) -> void:
	save.note_shown(technique)


## One more use of a learned technique (the coach stops naming it once it is in his hands).
func _on_technique_used(technique: StringName) -> void:
	play_log.count("technique", technique)
	save.practise(technique)


## The shield raised in the glint, for the playtest log.
func _on_steady_breath() -> void:
	play_log.count("breath", "steady breath")


## Rolled just as the blow came, for the playtest log; the first time, what it is.
func _on_close_call(_hit: HitData) -> void:
	play_log.count("breath", "close call")
	if not save.has_flag(&"seen_close_call"):
		save.set_flag(&"seen_close_call")
		_hint("HINT_CLOSE_CALL")


## A light blow glanced off a raised shield: the first time, the answers are named.
func _on_glanced() -> void:
	if not save.has_flag(&"seen_glance"):
		save.set_flag(&"seen_glance")
		_hint("HINT_GLANCE")


## A man thrown off his feet: the first soldier, what the heavy button does over a man down.
func _on_knocked_down(body: Combatant) -> void:
	if body != hero and not save.has_flag(&"seen_ground_stroke"):
		save.set_flag(&"seen_ground_stroke")
		_hint("HINT_GROUND_STAB")


## The blows the session keeps track of (the playtest log, what felled him, the first warnings' lessons).
func _wire_combatant(combatant: Combatant) -> void:
	combatant.struck.connect(_on_struck.bind(combatant))
	combatant.swung.connect(_on_swung.bind(combatant))
	combatant.telegraphed.connect(_on_telegraphed.bind(combatant))


## What felled him, read from the last blow that landed on him: the tip the game-over screen gives.
func _fall_tip() -> String:
	if hero != null and hero.stamina <= 0.5:
		return "TIP_BREATH"
	var hit: HitData = _last_blow
	if hit == null:
		return "TIP_REMEDY"
	# Fire (a burning street, a pot of naphtha) has no hand behind it, or comes from afar unblockable; an arrow from afar.
	var far: bool = (hit.attacker == null or not is_instance_valid(hit.attacker)
		or hit.attacker.global_position.distance_to(hero.global_position) > 160.0)
	if far:
		return "TIP_FIRE" if hit.unblockable or hit.attacker == null else "TIP_ARROW"
	if hit.attack == null:
		return "TIP_REMEDY"
	match hit.attack.tell():
		AttackDefinition.Tell.LOW:
			return "TIP_AMBER"
		AttackDefinition.Tell.BREAK:
			return "TIP_VIOLET"
		AttackDefinition.Tell.DIRE:
			return "TIP_RED"
	return "TIP_WHITE"


## A blow met: for the playtest log, and the last that landed on him (what felled him).
func _on_struck(hit: HitData, outcome: HitData.Outcome, target: Combatant) -> void:
	_log_blow(hit, outcome, target)
	if target == hero and outcome == HitData.Outcome.HIT:
		_last_blow = hit


## A blow begun, for the playtest log.
func _on_swung(attack: AttackDefinition, combatant: Combatant) -> void:
	if combatant == hero:
		play_log.event("swing", _blow_name(attack), hero.global_position.x)
	elif combatant is MongolSoldier:
		# Every soldier's blow is begun at him: one that never touches him was avoided (jumped, stepped from).
		play_log.count("aimed", _blow_name(attack))


## A soldier winds up a blow (its warning is the presentation's): the first of each colour is taught.
func _on_telegraphed(attack: AttackDefinition, combatant: Combatant) -> void:
	_first_warning(attack.tell(), combatant)


## The first warning of each colour the hero meets stops the game: what it means and how to answer it, with the
## sign beside it (the soldier's wind-up waits; the answer is still in time once the card is read).
func _first_warning(tell: int, combatant: Combatant) -> void:
	if combatant == hero or hero == null or state != State.PLAYING:
		return
	if absf(combatant.global_position.x - hero.global_position.x) > WARNING_LESSON_RANGE:
		return
	var seen: StringName = StringName("seen_warning_%d" % tell)
	if save.has_flag(seen):
		return
	save.set_flag(seen)
	if settings.lessons != GameSettings.LessonMode.FULL:
		var lesson: Array = WARNING_LESSONS[tell]
		var key: String = lesson[1]
		_hint(key)
		return
	_show_card({"kind": "warning", "tell": tell})


## A lesson: it waits its turn at the top of the screen (in a fight its first sentence, the rest after), and
## is kept for the Guide.
func _hint(key: String) -> void:
	if key == "":
		return
	save.note_lesson(StringName(key))
	# Lessons set off are only kept (in the Guide); set short, only their first sentence is shown.
	if settings.lessons == GameSettings.LessonMode.OFF:
		return
	hud.lessons.fighting = _fighting()
	hud.lessons.push(key, settings.lessons == GameSettings.LessonMode.SHORT)


## A lesson came onto the screen: a soft sound.
func _on_lesson_shown(key: String) -> void:
	play_log.event("lesson", key)
	sounds.play(&"lesson", -8.0)


## Every frame: the time on this street counts; the lessons and the signs know whether he fights; a lesson card waiting for the quiet shows;
## the first lamp and the first person with something to say are pointed out as he comes near them.
func _update_messages() -> void:
	if hero == null or level == null:
		return
	if state == State.PLAYING:
		_level_time += get_process_delta_time() / maxf(Engine.time_scale, 0.001)
	var fighting: bool = state == State.PLAYING and _fighting()
	hud.lessons.fighting = fighting
	hud.markers.fighting = fighting
	if state != State.PLAYING:
		return
	_refresh_objective_target()
	if not fighting and not _cards.is_empty() and hero.is_on_floor():
		var card: Dictionary = _cards.pop_front()
		_show_card(card)
		return
	_first_meetings()


## The first unlit lamp and the first person with something to say he comes near: what they are (not in his first
## moment on a street, which is for moving).
func _first_meetings() -> void:
	if _level_time < FIRST_MEETING_DELAY:
		return
	for node: Node in level.interactables.get_children():
		var thing: Interactable = node as Interactable
		if thing == null:
			continue
		var distance: float = absf(thing.global_position.x - hero.global_position.x)
		var npc: Npc = thing as Npc
		if npc != null and npc.has_news() and distance < CALL_RANGE:
			_call_out(npc)
		if distance > FIRST_MEETING_RANGE:
			continue
		var lamp: Checkpoint = thing as Checkpoint
		if lamp != null and not lamp.lit and not save.has_flag(&"seen_lamp_lesson"):
			save.set_flag(&"seen_lamp_lesson")
			_hint("HINT_LAMP")
		if npc != null and npc.has_news() and not save.has_flag(&"seen_people_lesson"):
			save.set_flag(&"seen_people_lesson")
			_hint("HINT_PEOPLE")


## Someone with something to say calls to him as he first comes near (once): "Yusuf! Here, by the cart!"
func _call_out(npc: Npc) -> void:
	var called: StringName = StringName("called_%s" % npc.npc_id)
	if save.has_flag(called):
		return
	save.set_flag(called)
	var line: String = "%s_CALL" % String(npc.dialogue).to_upper()
	if tr(line) != line:
		_say(npc.display_name(), line)


## A soldier near the hero is in the fight.
func _fighting() -> bool:
	if hero == null or level == null:
		return false
	for soldier: MongolSoldier in level.soldiers():
		if soldier.in_fight() and absf(soldier.global_position.x - hero.global_position.x) < 320.0:
			return true
	return false


## An arrow loosed or a pot thrown, for the playtest log.
func _on_projectile(projectile: Node2D) -> void:
	if projectile is Arrow:
		play_log.count("aimed", "arrow")
	if projectile is FirePot:
		play_log.count("aimed", "fire_pot")


## A roll, for the playtest log.
func _on_hero_rolled() -> void:
	play_log.count("roll")


## His health, for the playtest log (the lowest on each street).
func _on_hero_health(current: float, maximum: float) -> void:
	if maximum > 0.0:
		play_log.health(current / maximum)


## A remedy drunk (the count falls; a lamp's refill is not one), for the playtest log.
func _on_hero_remedies(count: int, _maximum: int) -> void:
	if count < _remedies_seen:
		play_log.event("remedy", "", hero.global_position.x)
	_remedies_seen = count


func _on_hero_died() -> void:
	var felled_by: String = "%s: %s" % [_kind(_last_blow.attacker), _hit_name(_last_blow)] if _last_blow != null else "unknown"
	play_log.event("fall", felled_by, hero.global_position.x)
	play_log.write_summary()
	state = State.DEAD
	music.play_music(&"")
	save.deaths += 1
	if save.level != "":
		_save_game()
	await _real_delay(DEATH_DELAY)
	if state != State.DEAD:
		return
	hud.set_gameplay_visible(false)
	var rise: String = tr(&"GAME_OVER_RISE_LAMP") if save.checkpoint != &"" else tr(&"GAME_OVER_RISE_START")
	game_over.show_result("GAME_OVER_TITLE", "GAME_OVER_LINE", rise, _fall_tip())


# --- Lamps, pages and people -----------------------------------------------------------------------

func _on_checkpoint(lamp: Checkpoint) -> void:
	play_log.event("lamp", lamp.checkpoint_id, lamp.global_position.x)
	var first: bool = not lamp.checkpoint_id in save.lit
	if first:
		save.lit.append(lamp.checkpoint_id)
	save.checkpoint = lamp.checkpoint_id
	save.level = level_path
	save.resolve = hero.resolve
	_save_game()
	hero.rest()
	sounds.play(&"lamp_light" if first else &"checkpoint_rest")
	hud.markers.point_out()
	# The first lamp of all: what a lamp is, before its menu.
	if not save.has_flag(&"seen_lamp_card"):
		save.set_flag(&"seen_lamp_card")
		if settings.lessons == GameSettings.LessonMode.FULL:
			_after_card = _open_lamp
			_show_card({"kind": "lamp"})
			return
		_hint("HINT_LAMP_CARD")
	_open_lamp()


## By the lamp: the tree, the keepsakes and the Arts, until he rises.
func _open_lamp() -> void:
	_sync_progression()
	progression.known = _story_techniques()
	_bought_before = save.bought.duplicate()
	_pause_for(State.LAMP)
	lamp_menu.open_for(progression, _known_arts())


## He rises from the lamp: what he chose is his.
func _leave_lamp() -> void:
	lamp_menu.close()
	_apply_growth()
	# What he bought here is told (its lesson waits its turn at the top of the screen).
	for id: StringName in save.bought:
		var bought: TechniqueDefinition = progression.node(id)
		if id in _bought_before or bought == null:
			continue
		hud.notice(tr("NOTICE_BOUGHT") % tr(bought.name_key))
		if bought.grants != &"":
			_hint("HINT_LEARNED_%s" % String(bought.grants).to_upper())
	hero.rest()
	if _save_game():
		hud.notice(tr(&"NOTICE_SAVED"))
	_resume_play()
	# The first rest: what Honour is, and how it is spent.
	if not save.has_flag(&"seen_lamp_menu"):
		save.set_flag(&"seen_lamp_menu")
		_hint("HINT_LAMP_MENU")


## Each level of the chapter left behind has hardened him: more health.
func _apply_vigour() -> void:
	var behind: int = 0
	for id: StringName in LEVEL_IDS:
		if save.has_flag(StringName("%s_complete" % id)):
			behind += 1
	hero.max_health = hero.profile.max_health + VIGOUR * behind
	var told: StringName = StringName("vigour_%d" % behind)
	if behind > 0 and not save.has_flag(told):
		save.set_flag(told)
		hud.notice(tr("NOTICE_VIGOUR") % int(VIGOUR))


## The Arts he knows, in the order they come.
func _known_arts() -> Array[ArtDefinition]:
	var out: Array[ArtDefinition] = []
	for art: ArtDefinition in hero.profile.arts:
		if hero.knows(art.id):
			out.append(art)
	return out


## The save's growth, as rules (made anew when the save is).
func _sync_progression() -> void:
	if progression == null or progression.save != save:
		progression = Progression.new(CATALOG, save)


## What he has learned and earned, given to the hero: the techniques (taught and bought), what his
## nodes and keepsakes do to him, the Arts he carries.
func _apply_growth() -> void:
	_sync_progression()
	progression.known = _story_techniques()
	hero.set_techniques(_known_techniques())
	hero.set_modifiers(progression.modifiers())
	hero.art_slots = save.arts.duplicate()
	# The Arts he carries, as he will carry them (an empty hand takes the next Art he knows).
	save.arts.clear()
	for art: ArtDefinition in hero.carried_arts():
		save.arts.append(art.id)
	hero.art_slots = save.arts.duplicate()
	hud.set_arts(hero.carried_arts(), hero.has_resolve())
	hud.set_honour(save.honour, false)


## A keepsake given (by one he saved) or found: his, worn if a slot is free.
func _give_keepsake(id: StringName) -> void:
	_sync_progression()
	if not progression.give_keepsake(id):
		return
	var keepsake: KeepsakeDefinition = progression.keepsake(id)
	hud.notice(tr("NOTICE_KEEPSAKE") % tr(keepsake.name_key))
	sounds.play(&"honour", -2.0)
	if hero != null:
		hero.set_modifiers(progression.modifiers())
	if not save.has_flag(&"seen_keepsake"):
		save.set_flag(&"seen_keepsake")
		_hint("HINT_KEEPSAKE")


## A token or a keepsake picked up.
func _on_relic_found(relic: Relic) -> void:
	save.set_flag(StringName("relic_%s" % relic.relic_id))
	if relic.keepsake != &"":
		_give_keepsake(relic.keepsake)
	else:
		_earn(CATALOG.token, StringName("honour_relic_%s" % relic.relic_id))
		hud.notice(tr("NOTICE_TOKEN") % CATALOG.token)
	_save_game()


## One the soldiers killed had a keepsake about them: it lies where they fell, to be taken.
func _lay_keepsake(captive: Captive) -> void:
	if captive.keepsake == &"" or level == null:
		return
	_sync_progression()
	var id: StringName = StringName("%s_keepsake" % captive.captive_id)
	if progression.owns(captive.keepsake) or save.has_flag(StringName("relic_%s" % id)):
		return
	var relic: Relic = RELIC.instantiate() as Relic
	relic.relic_id = id
	relic.keepsake = captive.keepsake
	relic.position = level.to_local(captive.global_position) + Vector2(14.0 * captive.facing(), 0.0)
	level.add_relic.call_deferred(relic)


## Keepsakes still lying beside those the hero did not save (a level entered again).
func _lay_lost_keepsakes() -> void:
	if level.people == null:
		return
	for node: Node in level.people.get_children():
		var captive: Captive = node as Captive
		if captive != null and captive.captive_id != &"" and save.has_flag(StringName("lost_%s" % captive.captive_id)):
			_lay_keepsake(captive)


## What the hero knows here: what the story taught him, and what he bought at the lamps.
func _known_techniques() -> Array[StringName]:
	var known: Array[StringName] = _story_techniques()
	_sync_progression()
	for granted: StringName in progression.granted():
		if not granted in known:
			known.append(granted)
	return known


## What the story taught him: what the levels before taught him, and what he has learned since.
func _story_techniques() -> Array[StringName]:
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


## A technique learned (a lesson on the street, a gift, a spoil, a page of the treatise): his from now on, with
## its notice; how to use it is a card that stops the game at the first quiet moment (a page shows it already).
func _learn(technique: StringName, card: bool = true) -> void:
	var first_art: bool = not hero.has_resolve()
	save.set_flag(StringName("knows_%s" % technique))
	hero.learn(technique)
	if hero.art_by_id(technique) != null:
		_carry_art(technique)
	if hero.has_resolve():
		# His first Art: the resolve meter shows, already half full.
		if first_art:
			hero.set_resolve(maxf(hero.resolve, hero.profile.resolve_kept))
		hud.set_arts(hero.carried_arts(), true)
	hud.notice(tr(StringName("NOTICE_LEARNED_%s" % String(technique).to_upper())))
	var lesson: StringName = StringName("HINT_LEARNED_%s" % String(technique).to_upper())
	save.note_lesson(lesson)
	if card and settings.lessons == GameSettings.LessonMode.FULL:
		_cards.append({"kind": "technique", "id": technique})
	elif card:
		_hint(String(lesson))


## Someone explains a move he already has (Hamid: the parry and the riposte): a card that shows it performed, or
## its words at the top of the screen when lessons are short; kept for the Guide either way.
func _counsel(move: StringName) -> void:
	var lesson: StringName = StringName("HINT_COUNSEL_%s" % String(move).to_upper())
	save.note_lesson(lesson)
	if settings.lessons == GameSettings.LessonMode.FULL:
		_cards.append({"kind": "counsel", "id": move})
	else:
		_hint(String(lesson))


## A new Art is carried at once: into an empty hand, or in place of the second (a lamp lets him choose).
func _carry_art(art: StringName) -> void:
	if art in save.arts:
		return
	if save.arts.size() < 2:
		save.arts.append(art)
	else:
		save.arts[1] = art
	hero.art_slots = save.arts.duplicate()


func _on_manuscript(page: Manuscript) -> void:
	if page.teaches != &"":
		_learn(page.teaches, false)
	if not page.manuscript_id in save.manuscripts:
		save.manuscripts.append(page.manuscript_id)
		var worth: int = CATALOG.treatise_page if page.teaches != &"" else CATALOG.page
		_earn(roundi(worth * hero.mods.page_honour), StringName("honour_page_%s" % page.manuscript_id), false)
	_save_game()
	hud.set_manuscripts(save.manuscripts.size(), MANUSCRIPTS_TOTAL)
	sounds.play(&"manuscript")
	_pause_for(State.READING)
	reader.read(page.manuscript_id, page.teaches)


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
			if npc.counsel != &"":
				_counsel(npc.counsel)
		if id == npc.dialogue and npc.gives_keepsake != &"":
			_give_keepsake(npc.gives_keepsake)
	_refresh_story()
	_save_game()
	_resume_play()


func _on_hero_interacted(target: Interactable) -> void:
	var gate: LevelExit = target as LevelExit
	if gate != null and not gate.unlocked:
		_say("SPEAKER_YUSUF", gate.locked_line_for(save.flags))


## The person the interact button would speak to glows softly.
func _on_target_changed(target: Interactable) -> void:
	if _near_npc != null and is_instance_valid(_near_npc):
		_near_npc.highlight(false)
	_near_npc = target as Npc
	if _near_npc != null:
		_near_npc.highlight(true)


# --- Lessons that stop the game ---------------------------------------------------------------------

## Shows a lesson card now, the game paused under it: a technique learned, the first lamp, a warning.
func _show_card(card: Dictionary) -> void:
	var kind: String = card.get("kind", "")
	_pause_for(State.LESSON)
	match kind:
		"technique":
			var technique: StringName = card["id"]
			var art: bool = hero.art_by_id(technique) != null
			var key: String = "HINT_LEARNED_%s" % String(technique).to_upper()
			lesson_screen.show_lesson(tr(&"LESSON_NEW_ART" if art else &"LESSON_NEW_TECHNIQUE"),
				tr(Lessons.technique_name(technique)), key, _card_demo(technique))
		"counsel":
			var move: StringName = card["id"]
			var name: String = String(move).to_upper()
			lesson_screen.show_lesson(tr(&"LESSON_COUNSEL_HEADING"), tr("COUNSEL_%s_TITLE" % name), "HINT_COUNSEL_%s" % name,
				MoveDemos.of(move))
		"lamp":
			var niche: AtlasTexture = AtlasTexture.new()
			niche.atlas = LAMP_PICTURE
			niche.region = Rect2(80, 0, 40, 64)
			save.note_lesson(&"HINT_LAMP_CARD")
			lesson_screen.show_lesson(tr(&"LESSON_LAMP_HEADING"), tr(&"LESSON_LAMP_CARD"), "HINT_LAMP_CARD", {}, niche)
		"warning":
			var tell: int = card["tell"]
			var lesson: Array = WARNING_LESSONS[tell]
			var title: String = lesson[0]
			var key: String = lesson[1]
			var demo: StringName = lesson[2]
			save.note_lesson(StringName(key))
			lesson_screen.show_lesson(tr(&"LESSON_WARNING_HEADING"), tr(title), key, MoveDemos.of(demo), null,
				CombatPresentation.TELL_GLINTS[tell], presentation.tell_colours[tell])
	sounds.play(&"manuscript", -6.0)


## The lesson read: on to what waits on it (the lamp menu), or back to play at once (a warning's blow is
## still coming, so the devices are hardly held off).
func _close_card() -> void:
	lesson_screen.close()
	var after: Callable = _after_card
	_after_card = Callable()
	if after.is_valid():
		after.call()
		return
	_resume_play(0.06)


## A technique's demo; an Art carried second is shown on the second Art's own button.
func _card_demo(technique: StringName) -> Dictionary:
	var demo: Dictionary = MoveDemos.of(technique)
	var arts: Array[ArtDefinition] = hero.carried_arts()
	if arts.size() > 1 and arts[1].id == technique:
		return MoveDemos.with_art_button(demo, &"art_2")
	return demo


# --- The story --------------------------------------------------------------------------------------

## Where the objective points, for the signs over the world: a person, the way out, a place, a group's
## soldiers (the nearest still standing).
func _refresh_objective_target() -> void:
	if level == null or hero == null:
		return
	var spec: String = level.objective_target(save.flags)
	var node: Node2D = null
	var point: Vector2 = Vector2.INF
	var name: String = ""
	var parts: PackedStringArray = spec.split(":")
	match parts[0]:
		"npc":
			var person: Npc = level.npc(StringName(parts[1])) if parts.size() > 1 else null
			if person != null:
				node = person
				name = tr(person.display_name())
		"exit":
			var gate: LevelExit = level.exit()
			if gate != null:
				node = gate
				name = tr(gate.locked_prompt)
		"col":
			if parts.size() > 1:
				point = Vector2(float(parts[1]) * 16.0, level.street_y())
				name = tr(parts[2]) if parts.size() > 2 else ""
		"group":
			var nearest: float = INF
			for soldier: MongolSoldier in level.soldiers():
				var group: StringName = soldier.get_meta(&"group", &"")
				var distance: float = absf(soldier.global_position.x - hero.global_position.x)
				if parts.size() > 1 and group == StringName(parts[1]) and not soldier.dead and soldier.visible and distance < nearest:
					nearest = distance
					node = soldier
			name = tr(&"MARKER_SOLDIERS")
	hud.markers.objective_node = node
	hud.markers.objective_point = point
	hud.markers.objective_name = name

func objective() -> String:
	return level.objective(save.flags) if level != null else ""


func _refresh_story() -> void:
	var now: String = objective()
	# A new objective is announced, whatever changed it (a fight, a conversation, a gift, an ambush).
	var changed: bool = _last_objective != "" and now != _last_objective and now != ""
	_last_objective = now
	hud.set_objective(now, changed)
	if changed:
		hud.moment(tr(&"MOMENT_NEW_OBJECTIVE"), tr(now))
		hud.markers.point_out()
		if sounds.has_cue(&"objective"):
			sounds.play(&"objective", -4.0)
	level.refresh_people(save.flags)
	for node: Node in level.interactables.get_children():
		var npc: Npc = node as Npc
		if npc != null:
			npc.refresh(save.flags)
		var gate: LevelExit = node as LevelExit
		if gate != null:
			gate.refresh(save.flags)
	_refresh_objective_target()


## A line said in passing, low on the screen with the speaker named (translation keys; no speaker: narration).
func _say(speaker: String, line: String) -> void:
	if line == "":
		return
	hud.say(tr(speaker) if speaker != "" else "", tr(line))


func _on_trigger(trigger: StoryTrigger) -> void:
	# A trigger that waits on the story (a master's lesson) does nothing without it.
	if trigger.requires_flag != &"" and not save.has_flag(trigger.requires_flag):
		return
	# A lesson or a line once given is not given again on another life (the Guide keeps the lessons).
	if trigger.once and trigger.teaches == &"" and (trigger.event == &"" or trigger.event == &"refugees"):
		save.set_flag(StringName(trigger.trigger_id))
	# A lesson he walked past (Hamid's counsel) comes to him here instead.
	if trigger.teaches != &"" and hero != null and not hero.knows(trigger.teaches):
		_learn(trigger.teaches)
		_save_game()
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
		_hint(trigger.hint)
	_say(trigger.speaker, trigger.line)


func _on_group_cleared(group: StringName) -> void:
	play_log.event("cleared", group, hero.global_position.x if hero != null else NAN)
	var before: String = objective()
	save.set_flag(StringName("%s_cleared" % group))
	# Those the group held are free.
	for node: Node in level.interactables.get_children():
		var npc: Npc = node as Npc
		if npc != null and npc.requires == StringName("%s_cleared" % group):
			_earn(CATALOG.person_freed, StringName("freed_%s" % npc.npc_id))
	_save_game()
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
	play_log.event("left", level.level_id, hero.global_position.x)
	play_log.write_summary()
	state = State.ENDING
	hit_stop.clear()
	hero.set_cinematic(true)
	sounds.play(&"gate_open")
	save.set_flag(StringName("%s_complete" % level.level_id))
	_earn(CATALOG.level_completed, StringName("honour_level_%s" % level.level_id), false)
	var next: String = level.next_level
	var story: StringName = level.exit_card if level.exit_card != &"" else &"ending"
	var heading: String = level.exit_title
	if next != "":
		save.level = next
		save.checkpoint = &""
	save.resolve = hero.resolve
	_save_game()
	music.play_music(&"ending" if next == "" else &"")
	await _real_delay(1.6)
	await _fade_to(1.0)
	hud.set_gameplay_visible(false)
	_unload_level()
	play_log.event("card", "%s begins" % (story if next != "" else &"ending"))
	card.play(story if next != "" else &"ending", _card_lines(story if next != "" else &"ending"), heading)
	fade.color.a = 0.0


func _show_complete() -> void:
	# The chapter finished: every later journey is a master's (and this one, should it go on).
	SaveGame.record_master()
	save.set_flag(&"master")
	_close_menus()
	state = State.COMPLETE
	get_tree().paused = true
	var seconds: int = int(save.play_time)
	var saved: int = 0
	for flag: StringName in save.flags:
		if String(flag).begins_with("saved_"):
			saved += 1
	var lost: int = 0
	for flag: StringName in save.flags:
		if String(flag).begins_with("lost_"):
			lost += 1
	var stats: String = "%s %d:%02d     %s %d     %s %d/%d\n%s %d/%d     %s %d     %s %d" % [tr(&"STATS_TIME"),
		floori(seconds / 60.0), seconds % 60, tr(&"STATS_DEATHS"), save.deaths, tr(&"STATS_MANUSCRIPTS"),
		save.manuscripts.size(), MANUSCRIPTS_TOTAL, tr(&"STATS_SAVED"), saved, CAPTIVES_TOTAL, tr(&"STATS_LOST"), lost,
		tr(&"STATS_HONOUR"), save.honour]
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


# --- The playtest log ----------------------------------------------------------------------------------

## A blow on him (its warning and how he answered it: hit, blocked, parried, dodged, guard broken) or one of his
## meeting a man (and how the man took it), for the playtest log.
func _log_blow(hit: HitData, outcome: HitData.Outcome, target: Combatant) -> void:
	var outcomes: Array = HitData.Outcome.keys()
	var outcome_name: String = outcomes[outcome]
	var how: String = outcome_name.to_lower().replace("_", " ")
	if target == hero:
		# A blow with no attack of its own (an arrow, a fire pot, burning ground) is told by what dealt it.
		var warning: String = PlayLog.tell_name(int(hit.attack.tell())) if hit.attack != null else _hit_name(hit)
		play_log.count("warning", "%s %s" % [warning, how])
		play_log.event("taken", "%s %s: %s, %s" % [_kind(hit.attacker), _hit_name(hit), warning, how],
			hero.global_position.x)
		play_log.count("met", "%s: %s" % [_hit_name(hit), how])
	elif hit.attacker == hero:
		play_log.count("landed", "%s %s" % [_hit_name(hit), how])
		if outcome == HitData.Outcome.HIT:
			play_log.add("damage", _hit_name(hit), hit.damage)


## What kind of man a combatant is, for the playtest log (the soldier's profile, or Yusuf).
func _kind(combatant: Combatant) -> String:
	if combatant == null:
		return "unknown"
	if combatant == hero:
		return "yusuf"
	var soldier: MongolSoldier = combatant as MongolSoldier
	if soldier != null and soldier.profile != null:
		return soldier.profile.resource_path.get_file().get_basename()
	return String(combatant.name)


## A blow's name for the playtest log: its attack's (see _blow_name), or what dealt it (arrow, fire_pot, fire).
func _hit_name(hit: HitData) -> String:
	if hit.attack != null:
		return _blow_name(hit.attack)
	return String(hit.cause) if hit.cause != &"" else "arrow"


## A blow's name for the playtest log: its definition's file (light_1, heavy, archer_shot), or the arrow.
func _blow_name(attack: AttackDefinition) -> String:
	if attack == null:
		return "arrow"
	var file: String = attack.resource_path.get_file().get_basename()
	return file if file != "" else attack.display_name.to_snake_case()
