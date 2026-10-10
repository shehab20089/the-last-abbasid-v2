class_name ResultScreen
extends MenuScreen
## The game-over and chapter-complete screens: a heading, a line, optional statistics, a tip (its buttons drawn
## as keys, in the reading order of the language), and the choices that follow.

## The buttons' names for the device in use (for the tip).
var glyphs: InputGlyphs
var _tip: KeyText

@onready var heading: Label = %Heading
@onready var line: Label = %Line
@onready var stats: Label = %Stats


func _ready() -> void:
	super._ready()
	_tip = KeyText.new()
	_tip.centred = true
	_tip.font_size = 12
	_tip.color = Color(1.0, 0.9, 0.66)
	_tip.visible = false
	stats.get_parent().add_child(_tip)
	stats.get_parent().move_child(_tip, stats.get_index() + 1)


## Shows the screen; `tip_key` (with {action} tokens) is a lesson drawn from how the game ended, or none.
func show_result(heading_key: String, line_key: String, stat_text: String = "", tip_key: String = "") -> void:
	heading.text = tr(heading_key)
	line.text = tr(line_key)
	stats.text = stat_text
	stats.visible = stat_text != ""
	_tip.glyphs = glyphs
	_tip.visible = tip_key != ""
	if tip_key != "":
		_tip.show_key(tip_key)
	open()
