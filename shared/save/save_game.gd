class_name SaveGame
extends RefCounted
## The player's progress, kept in the user data folder: the level and lamp to return to, the lamps
## lit, the manuscripts rescued, the story so far and a few statistics. Settings live elsewhere
## (GameSettings). The ABBASID_USER_PREFIX environment variable keeps checks away from the
## player's own files (tools/run_godot_cli.mjs sets it).

const FILE: String = "save.cfg"

var level: String = ""
var checkpoint: StringName = &""
var lit: Array[StringName] = []
var manuscripts: Array[StringName] = []
var flags: Array[StringName] = []
var deaths: int = 0
var play_time: float = 0.0


static func file_path() -> String:
	return "user://%s%s" % [OS.get_environment("ABBASID_USER_PREFIX"), FILE]


static func exists() -> bool:
	return FileAccess.file_exists(file_path())


static func load_game() -> SaveGame:
	var data: SaveGame = SaveGame.new()
	var file: ConfigFile = ConfigFile.new()
	if file.load(file_path()) != OK:
		return data
	data.level = file.get_value("progress", "level", "")
	var checkpoint_name: String = file.get_value("progress", "checkpoint", "")
	data.checkpoint = StringName(checkpoint_name)
	var lit_names: PackedStringArray = file.get_value("progress", "lit", PackedStringArray())
	data.lit = _names(lit_names)
	var page_names: PackedStringArray = file.get_value("progress", "manuscripts", PackedStringArray())
	data.manuscripts = _names(page_names)
	var flag_names: PackedStringArray = file.get_value("progress", "flags", PackedStringArray())
	data.flags = _names(flag_names)
	data.deaths = file.get_value("stats", "deaths", 0)
	data.play_time = file.get_value("stats", "play_time", 0.0)
	return data


static func erase() -> void:
	if exists():
		DirAccess.remove_absolute(ProjectSettings.globalize_path(file_path()))


func write() -> Error:
	var file: ConfigFile = ConfigFile.new()
	file.set_value("progress", "level", level)
	file.set_value("progress", "checkpoint", String(checkpoint))
	file.set_value("progress", "lit", _strings(lit))
	file.set_value("progress", "manuscripts", _strings(manuscripts))
	file.set_value("progress", "flags", _strings(flags))
	file.set_value("stats", "deaths", deaths)
	file.set_value("stats", "play_time", play_time)
	return file.save(file_path())


func has_flag(flag: StringName) -> bool:
	return flag in flags


func set_flag(flag: StringName) -> void:
	if not flag in flags:
		flags.append(flag)


static func _names(values: PackedStringArray) -> Array[StringName]:
	var out: Array[StringName] = []
	for value: String in values:
		out.append(StringName(value))
	return out


static func _strings(values: Array[StringName]) -> PackedStringArray:
	var out: PackedStringArray = PackedStringArray()
	for value: StringName in values:
		out.append(String(value))
	return out
