class_name LessonCard
extends Control
## The lessons of play, one at a time, at the top of the screen between the HUD's row and the hero's head: a
## framed card with its title and what to do, the buttons drawn as keys. Each waits its turn (none is cut off
## by the next, none lost), stays long enough to be read (longer for more words), and its clock stops, and the
## card hides, while the game waits on a menu or a conversation. In a fight a lesson shows its first sentence
## (what to do) and the whole of it once the street is quiet. `shown` tells the session (a soft sound, the
## Guide).

signal shown(key: String)

const TOP: float = 56.0
const WIDTH: float = 300.0
## How long a lesson stays: a base, a second for every 15 characters, within these bounds (real seconds).
const BASE_TIME: float = 2.5
const PER_CHARACTER: float = 1.0 / 15.0
const MIN_TIME: float = 4.0
const MAX_TIME: float = 12.0
const FADE_IN: float = 6.0
const FADE_OUT: float = 3.0
## Lessons waiting beyond this many: the oldest is let go (it is kept in the Guide all the same).
const MAX_WAITING: int = 4
const TITLE_COLOR: Color = Color(1.0, 0.84, 0.48)

var glyphs: InputGlyphs:
	set(value):
		glyphs = value
		if _text != null:
			_text.glyphs = value
## Set by the session: a soldier near the hero is in the fight.
var fighting: bool = false
## Set by the HUD while the name of a place is shown (the next lesson waits for it).
var held: bool = false
## Each waiting lesson: {"key": String, "short": bool, "quiet": bool (only once no one fights)}.
var _queue: Array[Dictionary] = []
var _key: String = ""
var _short: bool = false
var _left: float = 0.0
var _alpha: float = 0.0
var _panel: PanelContainer
var _title: Label
var _text: KeyText


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_panel = PanelContainer.new()
	_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel.custom_minimum_size = Vector2(WIDTH, 0.0)
	add_child(_panel)
	var list: VBoxContainer = VBoxContainer.new()
	list.mouse_filter = Control.MOUSE_FILTER_IGNORE
	list.add_theme_constant_override(&"separation", 2)
	_panel.add_child(list)
	_title = Label.new()
	_title.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title.add_theme_font_override(&"font", KeyText.FONT)
	_title.add_theme_font_size_override(&"font_size", 12)
	_title.add_theme_color_override(&"font_color", TITLE_COLOR)
	list.add_child(_title)
	_text = KeyText.new()
	_text.centred = true
	_text.glyphs = glyphs
	list.add_child(_text)
	_panel.visible = false


## A lesson to show (a translation key with {action} tokens): it waits its turn, and in a fight shows its
## first sentence now and the whole of it once no one fights.
func push(key: String, short_only: bool = false) -> void:
	if key == _key and not _short:
		return
	for waiting: Dictionary in _queue:
		var queued: String = waiting["key"]
		var short: bool = waiting["short"]
		if queued == key and not short:
			return
	var text: String = tr(key)
	if short_only:
		_queue.append({"key": key, "short": _first_sentence(text) != text, "quiet": false})
	elif fighting and _first_sentence(text) != text:
		_queue.append({"key": key, "short": true, "quiet": false})
		_queue.append({"key": key, "short": false, "quiet": true})
	else:
		_queue.append({"key": key, "short": false, "quiet": false})
	while _queue.size() > MAX_WAITING:
		_queue.pop_front()


## Forgets every lesson waiting and hides the one shown (a level left, the hero fallen).
func clear() -> void:
	_queue.clear()
	_key = ""
	_left = 0.0
	_alpha = 0.0
	_panel.visible = false


## The lesson shown now (its key), or empty.
func current() -> String:
	return _key


## The text shown now.
func current_text() -> String:
	return _text.shown_text() if _key != "" else ""


func waiting() -> int:
	return _queue.size()


## Shows the buttons of the device now in use.
func refresh_keys() -> void:
	_text.refresh()


func _process(delta: float) -> void:
	# While the game waits (a menu, a page, a conversation) the card hides and its clock stops.
	if get_tree().paused:
		_panel.visible = false
		return
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	if _key == "" and not held:
		_begin_next()
	if _key != "":
		_left -= real
		if _left <= 0.0:
			_alpha = maxf(0.0, _alpha - real * FADE_OUT)
			if _alpha <= 0.0:
				_key = ""
				if not held:
					_begin_next()
		else:
			_alpha = minf(1.0, _alpha + real * FADE_IN)
	_panel.visible = _key != "" and _alpha > 0.0
	_panel.modulate.a = _alpha
	if _panel.visible:
		# Its words wrap only once laid out: the card is fitted to them every frame.
		_panel.reset_size()
		var screen: Vector2 = get_viewport_rect().size
		_panel.position = Vector2(roundf((screen.x - _panel.size.x) * 0.5), TOP)


func _begin_next() -> void:
	for i: int in _queue.size():
		var next: Dictionary = _queue[i]
		var quiet: bool = next["quiet"]
		if quiet and fighting:
			continue
		_queue.remove_at(i)
		var key: String = next["key"]
		var short: bool = next["short"]
		_show(key, short)
		return


func _show(key: String, short: bool) -> void:
	_key = key
	_short = short
	var text: String = tr(key)
	if short:
		text = _first_sentence(text)
	var title: String = Lessons.title_of(key)
	_title.text = tr(title) if title != "" else ""
	_title.visible = title != ""
	_text.show_text(text)
	_panel.reset_size()
	_left = clampf(BASE_TIME + text.length() * PER_CHARACTER, MIN_TIME, MAX_TIME)
	_alpha = 0.0
	shown.emit(key)


## The first sentence of a lesson (in a fight, what to do).
static func _first_sentence(text: String) -> String:
	var end: int = text.find(". ")
	return text.substr(0, end + 1) if end > 0 else text
