class_name GameSettings
extends Node
## The player's settings: each sound bus's volume; the display (fullscreen, the window's scale, vsync,
## brightness); how much impacts shake the screen, whether the screen flashes and time stops and slows on
## great blows, the warnings' colours (standard or for colour-blind eyes); how much gore is shown; whether the
## charged cleave is held or toggled; when the moves are named in a fight and how lessons are given; the
## language (the system's, until chosen); and the buttons the player has bound to each action. Loaded at start,
## saved whenever one changes; `changed` tells the session. Nothing but settings is kept here.

signal changed

const FILE: String = "settings.cfg"
const BUSES: Array[StringName] = [&"Master", &"Music", &"Effects", &"Ambience"]
const VOLUME_STEPS: int = 10
const LANGUAGES: Array[String] = ["en", "ar"]
## The window's size is the game's 640 x 360 times this (0: as the system opens it).
const WINDOW_SCALES: Array[int] = [0, 2, 3, 4]
const BRIGHTNESS_STEPS: Array[float] = [0.8, 0.9, 1.0, 1.1, 1.2]
## The actions a player may bind to other buttons (the menus' own keep theirs).
const REBINDABLE: Array[StringName] = [&"move_left", &"move_right", &"move_down", &"jump", &"attack", &"heavy_attack",
	&"block", &"dodge", &"art", &"art_2", &"throw", &"heal", &"interact", &"pause"]

## When a learned move is named over the hero as its moment comes: until he has used it a few times,
## always, or never.
enum Prompts {LEARNING, ALWAYS, OFF}
## How lessons are given: whole (and new techniques and first warnings stop the game), their first sentence
## only (nothing stops the game), or not at all (kept in the Guide all the same).
enum LessonMode {FULL, SHORT, OFF}

var volumes: Dictionary[StringName, int] = {&"Master": 8, &"Music": 7, &"Effects": 8, &"Ambience": 7}
var fullscreen: bool = false
var window_scale: int = 0
var vsync: bool = true
var brightness: float = 1.0
## 1.0 full, 0.5 reduced, 0.0 none.
var shake: float = 1.0
## Flashes: a blow's white flash, the parry's burst, the bloom of a great blow (off for eyes that need it).
var flashes: bool = true
## Time stopped a heartbeat on a heavy blow and slowed on a parry, a close call, an Art, a finisher.
var time_effects: bool = true
## The warnings in colours told apart by colour-blind eyes (and the finisher's glow with them).
var colourblind: bool = false
## Full gore (killing blows cut men apart, blood pools) or reduced (plain deaths, little blood).
var gore: bool = true
## The charged cleave: held down (false), or one press to begin it and the next to let it go (true).
var charge_toggle: bool = false
var move_prompts: Prompts = Prompts.LEARNING
var lessons: LessonMode = LessonMode.FULL
var language: String = "en"
## Whether a playtest log is written (user://playlogs: the blows, falls and time per street; kept on this computer).
var playtest_log: bool = true
## Each rebound action's buttons ("key:<code>", "mouse:<button>", "pad:<button>", "axis:<axis>:<sign>"); the
## actions not here keep the project's.
var bindings: Dictionary[StringName, PackedStringArray] = {}
var _fullscreen_chosen: bool = false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	load_settings()


static func file_path() -> String:
	return "user://%s%s" % [OS.get_environment("ABBASID_USER_PREFIX"), FILE]


func load_settings() -> void:
	var file: ConfigFile = ConfigFile.new()
	# Until a language is chosen, the system's (Arabic if it speaks Arabic).
	language = "ar" if OS.get_locale_language() == "ar" else "en"
	if file.load(file_path()) == OK:
		for bus: StringName in BUSES:
			var stored: int = file.get_value("audio", String(bus).to_lower(), volumes[bus])
			volumes[bus] = clampi(stored, 0, VOLUME_STEPS)
		_fullscreen_chosen = file.has_section_key("display", "fullscreen")
		fullscreen = file.get_value("display", "fullscreen", fullscreen)
		window_scale = file.get_value("display", "window_scale", window_scale)
		vsync = file.get_value("display", "vsync", vsync)
		brightness = file.get_value("display", "brightness", brightness)
		shake = file.get_value("accessibility", "shake", shake)
		flashes = file.get_value("accessibility", "flashes", flashes)
		time_effects = file.get_value("accessibility", "time_effects", time_effects)
		colourblind = file.get_value("accessibility", "colourblind", colourblind)
		gore = file.get_value("content", "gore", gore)
		charge_toggle = file.get_value("accessibility", "charge_toggle", charge_toggle)
		var prompts: int = file.get_value("interface", "move_prompts", move_prompts)
		move_prompts = clampi(prompts, 0, Prompts.size() - 1) as Prompts
		var mode: int = file.get_value("interface", "lessons", lessons)
		lessons = clampi(mode, 0, LessonMode.size() - 1) as LessonMode
		language = file.get_value("interface", "language", language)
		playtest_log = file.get_value("interface", "playtest_log", playtest_log)
		bindings.clear()
		if file.has_section("controls"):
			for key: String in file.get_section_keys("controls"):
				var names: PackedStringArray = file.get_value("controls", key, PackedStringArray())
				bindings[StringName(key)] = names
	_apply()
	changed.emit()


func save() -> void:
	var file: ConfigFile = ConfigFile.new()
	for bus: StringName in BUSES:
		file.set_value("audio", String(bus).to_lower(), volumes[bus])
	if _fullscreen_chosen:
		file.set_value("display", "fullscreen", fullscreen)
	file.set_value("display", "window_scale", window_scale)
	file.set_value("display", "vsync", vsync)
	file.set_value("display", "brightness", brightness)
	file.set_value("accessibility", "shake", shake)
	file.set_value("accessibility", "flashes", flashes)
	file.set_value("accessibility", "time_effects", time_effects)
	file.set_value("accessibility", "colourblind", colourblind)
	file.set_value("content", "gore", gore)
	file.set_value("accessibility", "charge_toggle", charge_toggle)
	file.set_value("interface", "move_prompts", int(move_prompts))
	file.set_value("interface", "lessons", int(lessons))
	file.set_value("interface", "language", language)
	file.set_value("interface", "playtest_log", playtest_log)
	for action: StringName in bindings:
		file.set_value("controls", String(action), bindings[action])
	file.save(file_path())


func set_volume(bus: StringName, steps: int) -> void:
	if volumes.has(bus):
		volumes[bus] = clampi(steps, 0, VOLUME_STEPS)
		_commit()


func set_fullscreen(on: bool) -> void:
	fullscreen = on
	_fullscreen_chosen = true
	_commit()


func set_window_scale(scale: int) -> void:
	window_scale = scale if scale in WINDOW_SCALES else 0
	_commit()


func set_vsync(on: bool) -> void:
	vsync = on
	_commit()


func set_brightness(value: float) -> void:
	brightness = clampf(value, 0.7, 1.3)
	_commit()


func set_shake(amount: float) -> void:
	shake = clampf(amount, 0.0, 1.0)
	_commit()


func set_flashes(on: bool) -> void:
	flashes = on
	_commit()


func set_time_effects(on: bool) -> void:
	time_effects = on
	_commit()


func set_colourblind(on: bool) -> void:
	colourblind = on
	_commit()


func set_gore(full: bool) -> void:
	gore = full
	_commit()


func set_charge_toggle(on: bool) -> void:
	charge_toggle = on
	_commit()


func set_move_prompts(next: Prompts) -> void:
	move_prompts = next
	_commit()


func set_lessons(next: LessonMode) -> void:
	lessons = next
	_commit()


func set_playtest_log(on: bool) -> void:
	playtest_log = on
	_commit()


func set_language(code: String) -> void:
	if code in LANGUAGES:
		language = code
		_commit()


## Binds `event` to `action` in place of the action's first button of the same kind (keyboard and mouse, or
## pad); the same button is taken from any other action that had it, so a button does one thing.
func rebind(action: StringName, event: InputEvent) -> void:
	if not action in REBINDABLE:
		return
	var name: String = event_name(event)
	if name == "":
		return
	var pad: bool = name.begins_with("pad:") or name.begins_with("axis:")
	for other: StringName in REBINDABLE:
		var names: PackedStringArray = _names_of(other)
		if other != action and names.has(name):
			names.remove_at(names.find(name))
			bindings[other] = names
	var mine: PackedStringArray = _names_of(action)
	var replaced: bool = false
	for i: int in mine.size():
		var old_pad: bool = mine[i].begins_with("pad:") or mine[i].begins_with("axis:")
		if old_pad == pad:
			mine[i] = name
			replaced = true
			break
	if not replaced:
		mine.insert(0, name)
	bindings[action] = mine
	_commit()


## Every action back to the project's own buttons.
func reset_bindings() -> void:
	bindings.clear()
	_commit()


## A button as the settings file keeps it, or empty for one that cannot be bound.
static func event_name(event: InputEvent) -> String:
	var key: InputEventKey = event as InputEventKey
	if key != null:
		var code: Key = key.physical_keycode if key.physical_keycode != KEY_NONE else key.keycode
		return "key:%d" % code
	var mouse: InputEventMouseButton = event as InputEventMouseButton
	if mouse != null:
		return "mouse:%d" % mouse.button_index
	var button: InputEventJoypadButton = event as InputEventJoypadButton
	if button != null:
		return "pad:%d" % button.button_index
	var motion: InputEventJoypadMotion = event as InputEventJoypadMotion
	if motion != null and absf(motion.axis_value) > 0.5:
		return "axis:%d:%d" % [motion.axis, 1 if motion.axis_value > 0.0 else -1]
	return ""


## The button a settings name stands for, or null.
static func event_from(name: String) -> InputEvent:
	var parts: PackedStringArray = name.split(":")
	if parts.size() < 2:
		return null
	match parts[0]:
		"key":
			var key: InputEventKey = InputEventKey.new()
			key.physical_keycode = int(parts[1]) as Key
			return key
		"mouse":
			var mouse: InputEventMouseButton = InputEventMouseButton.new()
			mouse.button_index = int(parts[1]) as MouseButton
			return mouse
		"pad":
			var button: InputEventJoypadButton = InputEventJoypadButton.new()
			button.button_index = int(parts[1]) as JoyButton
			return button
		"axis":
			var motion: InputEventJoypadMotion = InputEventJoypadMotion.new()
			motion.axis = int(parts[1]) as JoyAxis
			motion.axis_value = float(parts[2]) if parts.size() > 2 else 1.0
			return motion
	return null


## An action's buttons as names: the player's, or the project's.
func _names_of(action: StringName) -> PackedStringArray:
	if bindings.has(action):
		return bindings[action].duplicate()
	var names: PackedStringArray = PackedStringArray()
	for event: InputEvent in _project_events(action):
		var name: String = event_name(event)
		if name != "":
			names.append(name)
	return names


## The project's own buttons for an action (as project.godot sets them).
static func _project_events(action: StringName) -> Array[InputEvent]:
	var events: Array[InputEvent] = []
	var setting: Dictionary = ProjectSettings.get_setting("input/%s" % action, {})
	var stored: Array = setting.get("events", [])
	for each: Variant in stored:
		if each is InputEvent:
			var event: InputEvent = each
			events.append(event)
	return events


func _commit() -> void:
	_apply()
	save()
	changed.emit()


func _apply() -> void:
	for bus: StringName in BUSES:
		var index: int = AudioServer.get_bus_index(bus)
		if index < 0:
			continue
		var steps: int = volumes[bus]
		AudioServer.set_bus_mute(index, steps == 0)
		AudioServer.set_bus_volume_db(index, linear_to_db(float(maxi(steps, 1)) / float(VOLUME_STEPS)))
	TranslationServer.set_locale(language)
	_apply_bindings()
	if DisplayServer.get_name() == "headless":
		return
	if _fullscreen_chosen:
		var mode: DisplayServer.WindowMode = (DisplayServer.WINDOW_MODE_FULLSCREEN if fullscreen
			else DisplayServer.WINDOW_MODE_WINDOWED)
		if DisplayServer.window_get_mode() != mode:
			DisplayServer.window_set_mode(mode)
	if window_scale > 0 and DisplayServer.window_get_mode() == DisplayServer.WINDOW_MODE_WINDOWED:
		var size: Vector2i = Vector2i(640, 360) * window_scale
		if DisplayServer.window_get_size() != size:
			DisplayServer.window_set_size(size)
			var screen: Rect2i = DisplayServer.screen_get_usable_rect()
			DisplayServer.window_set_position(screen.position + (screen.size - size) / 2)
	DisplayServer.window_set_vsync_mode(DisplayServer.VSYNC_ENABLED if vsync else DisplayServer.VSYNC_DISABLED)


## Each rebindable action's buttons: the player's where he chose them, the project's otherwise.
func _apply_bindings() -> void:
	for action: StringName in REBINDABLE:
		if not InputMap.has_action(action):
			continue
		InputMap.action_erase_events(action)
		if bindings.has(action):
			for name: String in bindings[action]:
				var event: InputEvent = event_from(name)
				if event != null:
					InputMap.action_add_event(action, event)
		else:
			for event: InputEvent in _project_events(action):
				InputMap.action_add_event(action, event)
