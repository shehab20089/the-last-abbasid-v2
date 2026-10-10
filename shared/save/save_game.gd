class_name SaveGame
extends RefCounted
## The player's progress, kept in the user data folder: the level and lamp to return to, the lamps
## lit, the manuscripts rescued, the story so far, the hero's growth (Honour, the techniques bought,
## keepsakes, Arts, resolve, how often he has used each technique) and a few statistics. Settings live elsewhere
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
## The hero's resolve as he last rested (he returns to a lamp with it).
var resolve: float = 0.0
## The Arts he carries (two at most), the art button's first.
var arts: Array[StringName] = []
## Honour held, the tree's nodes bought with it, the keepsakes owned and those worn.
var honour: int = 0
var bought: Array[StringName] = []
var keepsakes: Array[StringName] = []
var worn: Array[StringName] = []
## How many times he has used each learned technique (the coach names a move until it is in his hands).
var practice: Dictionary[StringName, int] = {}
## How many times the coach has named each move (it gives up on one never taken up).
var shown: Dictionary[StringName, int] = {}
## The lessons met, in the order met (their text keys): the Guide keeps them.
var lessons: Array[StringName] = []


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
	var lesson_names: PackedStringArray = file.get_value("progress", "lessons", PackedStringArray())
	data.lessons = _names(lesson_names)
	data.deaths = file.get_value("stats", "deaths", 0)
	data.play_time = file.get_value("stats", "play_time", 0.0)
	data.resolve = file.get_value("hero", "resolve", 0.0)
	var art_names: PackedStringArray = file.get_value("hero", "arts", PackedStringArray())
	data.arts = _names(art_names)
	data.honour = file.get_value("hero", "honour", 0)
	var bought_names: PackedStringArray = file.get_value("hero", "bought", PackedStringArray())
	data.bought = _names(bought_names)
	var keepsake_names: PackedStringArray = file.get_value("hero", "keepsakes", PackedStringArray())
	data.keepsakes = _names(keepsake_names)
	var worn_names: PackedStringArray = file.get_value("hero", "worn", PackedStringArray())
	data.worn = _names(worn_names)
	var counts: Dictionary = file.get_value("hero", "practice", {})
	for key: Variant in counts:
		var count: int = counts[key]
		data.practice[StringName(str(key))] = count
	var named: Dictionary = file.get_value("hero", "coach_shown", {})
	for key: Variant in named:
		var times: int = named[key]
		data.shown[StringName(str(key))] = times
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
	file.set_value("progress", "lessons", _strings(lessons))
	file.set_value("stats", "deaths", deaths)
	file.set_value("stats", "play_time", play_time)
	file.set_value("hero", "resolve", resolve)
	file.set_value("hero", "arts", _strings(arts))
	file.set_value("hero", "honour", honour)
	file.set_value("hero", "bought", _strings(bought))
	file.set_value("hero", "keepsakes", _strings(keepsakes))
	file.set_value("hero", "worn", _strings(worn))
	var counts: Dictionary = {}
	for technique: StringName in practice:
		counts[String(technique)] = practice[technique]
	file.set_value("hero", "practice", counts)
	var named: Dictionary = {}
	for technique: StringName in shown:
		named[String(technique)] = shown[technique]
	file.set_value("hero", "coach_shown", named)
	return file.save(file_path())


func has_flag(flag: StringName) -> bool:
	return flag in flags


func set_flag(flag: StringName) -> void:
	if not flag in flags:
		flags.append(flag)


## A lesson met (kept for the Guide); true the first time.
func note_lesson(key: StringName) -> bool:
	if key in lessons:
		return false
	lessons.append(key)
	return true


## Counts one more use of a technique.
func practise(technique: StringName) -> void:
	practice[technique] = times_used(technique) + 1


func times_used(technique: StringName) -> int:
	return practice.get(technique, 0)


## Counts one more time the coach named a move.
func note_shown(technique: StringName) -> void:
	shown[technique] = times_shown(technique) + 1


func times_shown(technique: StringName) -> int:
	return shown.get(technique, 0)


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
