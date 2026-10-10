class_name PlayLog
extends Node
## A record of how the game is played, for playtests: each blow swung and taken, each fall, kill, Art, finisher,
## lamp, lesson, captive and story card, with when and where, and the time played on each street. The events go to
## user://playlogs/<start>.csv as they happen; a summary a person can read (time per street, falls and what felled
## him, his lowest health and the remedies he drank, the blows he chose and the damage each dealt, every blow begun
## at him and how it ended, avoided too, how each warning was answered) goes to <start>.txt whenever a street is
## left, the game is paused or closed. It stays on this computer. It knows no gameplay types: the session tells it,
## in words, what happened.

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
## Sums, keyed as the counts are (the damage each of his blows dealt).
var _sums: Dictionary[String, float] = {}
## The lowest share of his health on each street.
var _lowest: Dictionary[String, float] = {}


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


## Added up, not counted (the damage a blow dealt).
func add(kind: String, detail: String, amount: float) -> void:
	if not enabled:
		return
	var key: String = "%s|%s|%s" % [_level, kind, detail]
	_sums[key] = _sums.get(key, 0.0) + amount


## His health, as a share of its whole: the lowest on each street is kept.
func health(share: float) -> void:
	if enabled and _level != "":
		var lowest: float = _lowest.get(_level, 1.0)
		_lowest[_level] = minf(lowest, share)


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
		var lowest: float = _lowest.get(level, 1.0)
		lines.append("Lowest health: %d%%" % roundi(lowest * 100.0))
		lines.append(_line(level, "remedy", "Remedies drunk"))
		lines.append(_line(level, "kill", "Kills"))
		lines.append(_line(level, "swing", "Blows swung"))
		lines.append(_damage(level))
		lines.append(_line(level, "technique", "Techniques used"))
		lines.append(_line(level, "art", "Arts"))
		lines.append(_line(level, "finisher", "Finishers"))
		lines.append(_blows_at(level))
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


## The counts of one kind on one street, by detail.
func _found(level: String, kind: String) -> Dictionary[String, int]:
	var prefix: String = "%s|%s|" % [level, kind]
	var found: Dictionary[String, int] = {}
	for key: String in _counts:
		if key.begins_with(prefix):
			found[key.substr(prefix.length())] = _counts[key]
	return found


## The damage each of his blows dealt on one street (blows that landed, before armour), most first, with its share.
func _damage(level: String) -> String:
	var prefix: String = "%s|damage|" % level
	var dealt: Dictionary[String, float] = {}
	var total: float = 0.0
	for key: String in _sums:
		if key.begins_with(prefix):
			dealt[key.substr(prefix.length())] = _sums[key]
			total += _sums[key]
	if total <= 0.0:
		return "Damage he dealt: none"
	var names: Array[String] = []
	for blow: String in dealt:
		names.append(blow)
	names.sort_custom(func(a: String, b: String) -> bool: return dealt[a] > dealt[b])
	var parts: PackedStringArray = PackedStringArray()
	for blow: String in names:
		parts.append("%s %d (%d%%)" % [blow, roundi(dealt[blow]), roundi(dealt[blow] / total * 100.0)])
	return "Damage he dealt (%d): %s" % [roundi(total), ", ".join(parts)]


## Every blow begun at him on one street and how it ended, a blow that never touched him counted as avoided:
## "captain_slash_a ×22: hit 18, dodged 3, avoided 1". (Fire on the street is not begun at him: only met.)
func _blows_at(level: String) -> String:
	var aimed: Dictionary[String, int] = _found(level, "aimed")
	var met: Dictionary[String, int] = _found(level, "met")
	var endings: Dictionary[String, Array] = {}
	var touched: Dictionary[String, int] = {}
	for key: String in met:
		var blow: String = key.get_slice(": ", 0)
		if not endings.has(blow):
			endings[blow] = []
		endings[blow].append("%s %d" % [key.get_slice(": ", 1), met[key]])
		touched[blow] = touched.get(blow, 0) + met[key]
	var names: Array[String] = []
	for blow: String in aimed:
		names.append(blow)
	for blow: String in touched:
		if not names.has(blow):
			names.append(blow)
	if names.is_empty():
		return "Blows at him: none"
	var total: int = 0
	var count_of: Dictionary[String, int] = {}
	for blow: String in names:
		var begun: int = aimed.get(blow, 0)
		var met_him: int = touched.get(blow, 0)
		count_of[blow] = maxi(begun, met_him)
		total += count_of[blow]
	names.sort_custom(func(a: String, b: String) -> bool: return count_of[a] > count_of[b])
	var parts: PackedStringArray = PackedStringArray()
	for blow: String in names:
		var how: Array = endings.get(blow, [])
		var begun: int = aimed.get(blow, 0)
		var met_him: int = touched.get(blow, 0)
		var avoided: int = begun - met_him
		if avoided > 0:
			how.append("avoided %d" % avoided)
		parts.append("%s ×%d: %s" % [blow, count_of[blow], ", ".join(PackedStringArray(how))])
	return "Blows at him (%d):\n  %s" % [total, "\n  ".join(parts)]


## The totals of one kind on one street, most first: "Kills (12): swordsman ×7, archer ×5".
func _line(level: String, kind: String, label: String) -> String:
	var found: Dictionary[String, int] = _found(level, kind)
	var total: int = 0
	for detail: String in found:
		total += found[detail]
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
