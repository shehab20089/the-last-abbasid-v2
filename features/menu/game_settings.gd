class_name GameSettings
extends Node
## The player's settings: each sound bus's volume, fullscreen, how much impacts shake the screen,
## how much gore is shown, and the language. Loaded at start, saved whenever one changes; `changed` tells the session.
## Nothing but settings is kept here.

signal changed

const FILE: String = "settings.cfg"
const BUSES: Array[StringName] = [&"Master", &"Music", &"Effects", &"Ambience"]
const VOLUME_STEPS: int = 10
const LANGUAGES: Array[String] = ["en", "ar"]

var volumes: Dictionary[StringName, int] = {&"Master": 8, &"Music": 7, &"Effects": 8, &"Ambience": 7}
var fullscreen: bool = false
## 1.0 full, 0.5 reduced, 0.0 none.
var shake: float = 1.0
## Full gore (killing blows cut men apart, blood pools) or reduced (plain deaths, little blood).
var gore: bool = true
var language: String = "en"
var _fullscreen_chosen: bool = false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	load_settings()


static func file_path() -> String:
	return "user://%s%s" % [OS.get_environment("ABBASID_USER_PREFIX"), FILE]


func load_settings() -> void:
	var file: ConfigFile = ConfigFile.new()
	if file.load(file_path()) == OK:
		for bus: StringName in BUSES:
			var stored: int = file.get_value("audio", String(bus).to_lower(), volumes[bus])
			volumes[bus] = clampi(stored, 0, VOLUME_STEPS)
		_fullscreen_chosen = file.has_section_key("display", "fullscreen")
		fullscreen = file.get_value("display", "fullscreen", fullscreen)
		shake = file.get_value("accessibility", "shake", shake)
		gore = file.get_value("content", "gore", gore)
		language = file.get_value("interface", "language", language)
	_apply()
	changed.emit()


func save() -> void:
	var file: ConfigFile = ConfigFile.new()
	for bus: StringName in BUSES:
		file.set_value("audio", String(bus).to_lower(), volumes[bus])
	if _fullscreen_chosen:
		file.set_value("display", "fullscreen", fullscreen)
	file.set_value("accessibility", "shake", shake)
	file.set_value("content", "gore", gore)
	file.set_value("interface", "language", language)
	file.save(file_path())


func set_volume(bus: StringName, steps: int) -> void:
	if volumes.has(bus):
		volumes[bus] = clampi(steps, 0, VOLUME_STEPS)
		_commit()


func set_fullscreen(on: bool) -> void:
	fullscreen = on
	_fullscreen_chosen = true
	_commit()


func set_shake(amount: float) -> void:
	shake = clampf(amount, 0.0, 1.0)
	_commit()


func set_gore(full: bool) -> void:
	gore = full
	_commit()


func set_language(code: String) -> void:
	if code in LANGUAGES:
		language = code
		_commit()


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
	if _fullscreen_chosen and DisplayServer.get_name() != "headless":
		var mode: DisplayServer.WindowMode = (DisplayServer.WINDOW_MODE_FULLSCREEN if fullscreen
			else DisplayServer.WINDOW_MODE_WINDOWED)
		if DisplayServer.window_get_mode() != mode:
			DisplayServer.window_set_mode(mode)
