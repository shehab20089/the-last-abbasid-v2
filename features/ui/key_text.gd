class_name KeyText
extends VBoxContainer
## A few lines of text with the buttons drawn as keys among the words: "{attack} Strike" becomes the attack
## button's cap and the word. Words wrap at the width given; the flow follows the language's direction; a
## line break starts a new paragraph; words between asterisks are drawn in gold. Shown again when the device
## changes (the caps are the new device's).

const FONT: Font = preload("res://assets/fonts/abbasid_text.tres")
const GOLD: Color = Color(1.0, 0.84, 0.48)

var glyphs: InputGlyphs
var font: Font = FONT
var font_size: int = 12
var color: Color = Color(0.94, 0.9, 0.8)
var emphasis: Color = GOLD
var centred: bool = false
## The text shown (translated, with its {action} tokens), to lay out again for another device.
var _text: String = ""


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_theme_constant_override(&"separation", 1)


## Shows the translation of `key`.
func show_key(key: String) -> void:
	show_text(tr(key))


## Shows `text` (already translated), its {action} tokens drawn as caps.
func show_text(text: String) -> void:
	_text = text
	for child: Node in get_children():
		remove_child(child)
		child.queue_free()
	var gold: bool = false
	for paragraph: String in text.split("\n"):
		var flow: HFlowContainer = HFlowContainer.new()
		flow.mouse_filter = Control.MOUSE_FILTER_IGNORE
		flow.alignment = FlowContainer.ALIGNMENT_CENTER if centred else FlowContainer.ALIGNMENT_BEGIN
		flow.add_theme_constant_override(&"h_separation", _space())
		flow.add_theme_constant_override(&"v_separation", 1)
		add_child(flow)
		for written: String in paragraph.split(" ", false):
			var word: String = written
			var ends: bool = word.ends_with("*") and word.length() > 1
			if word.begins_with("*"):
				gold = true
				word = word.substr(1)
			if ends:
				word = word.substr(0, word.length() - 1)
			flow.add_child(_word(word, gold))
			if ends:
				gold = false


## The text shown (translated, with its {action} tokens).
func shown_text() -> String:
	return _text


## Lays the same text out again (the device has changed: other caps).
func refresh() -> void:
	if _text != "":
		show_text(_text)


func _space() -> int:
	return roundi(font.get_string_size(" ", HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x)


## A word: a label, or a row of labels and caps when it holds {action} tokens.
func _word(word: String, gold: bool) -> Control:
	if word.find("{") < 0:
		return _label(word, gold)
	var row: HBoxContainer = HBoxContainer.new()
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	row.add_theme_constant_override(&"separation", 1)
	var rest: String = word
	while rest != "":
		var start: int = rest.find("{")
		var end: int = rest.find("}", start) if start >= 0 else -1
		if start < 0 or end < 0:
			row.add_child(_label(rest, gold))
			break
		if start > 0:
			row.add_child(_label(rest.substr(0, start), gold))
		var action: StringName = StringName(rest.substr(start + 1, end - start - 1))
		var caps: Array[Array] = glyphs.caps(action) if glyphs != null else []
		if caps.is_empty():
			row.add_child(_label("[%s]" % action, gold))
		for i: int in caps.size():
			if i > 0:
				row.add_child(_label("+", gold))
			var cap: Array = caps[i]
			var text: String = cap[0]
			var kind: KeyCaps.Kind = cap[1]
			row.add_child(KeyCaps.make(text, kind))
		rest = rest.substr(end + 1)
	return row


func _label(text: String, gold: bool) -> Label:
	var label: Label = Label.new()
	label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	label.text = text
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	label.add_theme_font_override(&"font", font)
	label.add_theme_font_size_override(&"font_size", font_size)
	label.add_theme_color_override(&"font_color", emphasis if gold else color)
	label.add_theme_color_override(&"font_shadow_color", Color(0.02, 0.016, 0.03, 1.0))
	label.add_theme_constant_override(&"shadow_offset_x", 1)
	label.add_theme_constant_override(&"shadow_offset_y", 1)
	return label
