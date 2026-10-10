class_name PlayLog
extends Node
## A record of how the game is played, for playtests: each blow swung and taken, each fall, kill, Art, finisher,
## lamp, lesson, captive and story card, with when and where, and the time played on each street. The events go to
## user://playlogs/<start>.csv as they happen; a summary a person can read (time per street, falls and what felled
## him, the blows he chose, how each warning was answered) goes to <start>.txt whenever a street is left, the game
## is paused or closed. It stays on this computer. It knows no gameplay types: the session tells it, in words, what
## happened.

const FOLDER: String = "playlogs"
const TELLS: Array[String] = ["white", "amber", "violet", "red"]

## Whether anything is written (the player's setting; off while the checks run, unless `in_checks`).
var enabled: bool = true
## A check that tests the log keeps it on while the checks run.
var in_checks: bool = false

var _file: FileAccess
var _stamp: String = ""
var _started_ms: int = 0
var _level: String = ""
## The streets in the order they were entered, the seconds played on each, and every count, keyed
## "street|kind|detail".
var _levels: PackedStringArray = PackedStringArray()
var _played: Dictionary[String, float] = {}
var _counts: Dictionary[String, int] = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS


## The folder the logs are written to, for this player (the checks keep theirs apart).
static func folder() -> String:
	return "user://%s%s" % [OS.get_environment("ABBASID_USER_PREFIX"), FOLDER]


## The CSV file this session writes to ("" until something has been written).
func file_path() -> String:
	return folder().path_join(_stamp + ".csv") if _stamp != "" else ""


func summary_path() -> String:
	return folder().path_join(_stamp + ".txt") if _stamp != "" else ""


## A street is entered: what follows is counted under it.
func enter_level(level: String) -> void:
	_level = level
	if not _levels.has(level):
		_levels.append(level)
	event("enter", level)


## Seconds of play on the street (the session counts only time in play, not menus or cards).
func played(seconds: float) -> void:
	if enabled and _level != "":
		_played[_level] = _played.get(_level, 0.0) + seconds


## Something happened: written as a line (seconds since the start, street, x, what, detail) and counted.
func event(kind: String, detail: String = "", x: float = NAN) -> void:
	if not enabled:
		return
	count(kind, detail)
	if not _open():
		return
	var seconds: float = (Time.get_ticks_msec() - _started_ms) / 1000.0
	var where: String = "" if is_nan(x) else str(roundi(x / 16.0))
	_file.store_line("%.2f,%s,%s,%s,%s" % [seconds, _level, where, kind, detail.replace(",", ";")])
	_file.flush()


## Counted, not written as a line (for things that happen many times a second).
func count(kind: String, detail: String = "") -> void:
	if not enabled:
		return
	var key: String = "%s|%s|%s" % [_level, kind, detail]
	_counts[key] = _counts.get(key, 0) + 1


## The warning a blow carries, as a word (white, amber, violet, red).
static func tell_name(tell: int) -> String:
	return TELLS[clampi(tell, 0, TELLS.size() - 1)]


## Writes the summary a person can read: per street, the time played, falls and what felled him, kills, the
## blows he swung most, the Arts, finishers and techniques, how each warning was answered, lamps, captives.
func write_summary() -> void:
	if not enabled or not _open():
		return
	var lines: PackedStringArray = PackedStringArray()
	lines.append("The Last Abbasid: playtest log, %s" % _stamp)
	lines.append("Times are of play only (menus, conversations and story cards left out). Positions are in tiles.")
	lines.append("")
	for level: String in _levels:
		var seconds: float = _played.get(level, 0.0)
		lines.append("== %s, played %s" % [level.to_upper(), _clock(seconds)])
		lines.append(_line(level, "fall", "Falls"))
		lines.append(_line(level, "kill", "Kills"))
		lines.append(_line(level, "swing", "Blows swung"))
		lines.append(_line(level, "technique", "Techniques used"))
		lines.append(_line(level, "art", "Arts"))
		lines.append(_line(level, "finisher", "Finishers"))
		lines.append(_line(level, "warning", "Warnings and his answers"))
		lines.append(_line(level, "landed", "His blows met"))
		lines.append(_line(level, "breath", "Breath"))
		lines.append(_line(level, "roll", "Rolls"))
		lines.append(_line(level, "lamp", "Lamps"))
		lines.append(_line(level, "captive", "Captives"))
		lines.append(_line(level, "cleared", "Fights won"))
		lines.append(_line(level, "lesson", "Lessons shown"))
		lines.append("")
	var summary: FileAccess = FileAccess.open(summary_path(), FileAccess.WRITE)
	if summary != null:
		summary.store_string("\n".join(lines))


## The totals of one kind on one street, most first: "Kills (12): swordsman ×7, archer ×5".
func _line(level: String, kind: String, label: String) -> String:
	var prefix: String = "%s|%s|" % [level, kind]
	var found: Dictionary[String, int] = {}
	var total: int = 0
	for key: String in _counts:
		if key.begins_with(prefix):
			var detail: String = key.substr(prefix.length())
			found[detail] = _counts[key]
			total += _counts[key]
	if total == 0:
		return "%s: none" % label
	var details: Array[String] = []
	for detail: String in found:
		details.append(detail)
	details.sort_custom(func(a: String, b: String) -> bool: return found[a] > found[b])
	var parts: PackedStringArray = PackedStringArray()
	for detail: String in details:
		parts.append("%s ×%d" % [detail if detail != "" else "-", found[detail]])
	return "%s (%d): %s" % [label, total, ", ".join(parts)]


static func _clock(seconds: float) -> String:
	var whole: int = roundi(seconds)
	return "%d:%02d" % [floori(whole / 60.0), whole % 60]


func _open() -> bool:
	if _file != null:
		return true
	if _stamp == "":
		_stamp = Time.get_datetime_string_from_system(false, true).replace(":", "-").replace(" ", "_")
		_started_ms = Time.get_ticks_msec()
	DirAccess.make_dir_recursive_absolute(folder())
	_file = FileAccess.open(file_path(), FileAccess.WRITE)
	if _file == null:
		enabled = false
		return false
	_file.store_line("seconds,street,tile,event,detail")
	return true


func _notification(what: int) -> void:
	if what == NOTIFICATION_WM_CLOSE_REQUEST or what == NOTIFICATION_PREDELETE:
		if _file != null:
			write_summary()
			_file.close()
			_file = null
