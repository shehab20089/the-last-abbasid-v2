class_name ManuscriptReader
extends MenuScreen
## Shows a rescued manuscript: its title and its words, on a parchment panel. A page of a treatise that
## teaches a move shows the move as well: Yusuf performs it on a small stage while the buttons that make
## it light up, with how to do it beneath.

## The buttons' names for the device in use.
var glyphs: InputGlyphs
var _preview: MovePreview
var _how: KeyText

@onready var title: Label = %Title
@onready var body: Label = %Body
@onready var panel: PanelContainer = $Panel


func _ready() -> void:
	super._ready()
	var list: VBoxContainer = body.get_parent() as VBoxContainer
	_preview = MovePreview.new()
	_preview.stage_height = 104.0
	list.add_child(_preview)
	list.move_child(_preview, body.get_index() + 1)
	_how = KeyText.new()
	_how.custom_minimum_size = Vector2(316, 0)
	_how.color = Color(1.0, 0.9, 0.66)
	list.add_child(_how)
	list.move_child(_how, _preview.get_index() + 1)


## Opens a manuscript; `teaches` names the move a page of a treatise teaches, shown beneath its words.
func read(manuscript_id: StringName, teaches: StringName = &"") -> void:
	var key: String = "MANUSCRIPT_%s" % String(manuscript_id).to_upper()
	title.text = tr(key + "_TITLE")
	body.text = tr(key + "_TEXT")
	var demo: Dictionary = MoveDemos.of(teaches)
	_preview.visible = not demo.is_empty()
	_how.visible = teaches != &""
	if teaches != &"":
		var how: String = "HINT_LEARNED_%s" % String(teaches).to_upper()
		_how.glyphs = glyphs
		_how.show_key(how)
		_preview.glyphs = glyphs
		_preview.show_demo(demo)
	# A page that shows a move stands higher, so the whole of it is on the screen.
	panel.offset_top = 96.0 if demo.is_empty() else 24.0
	panel.offset_bottom = panel.offset_top + 140.0
	open()
