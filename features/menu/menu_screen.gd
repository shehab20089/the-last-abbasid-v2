class_name MenuScreen
extends Control
## A menu screen: every Button under it that carries an "action" metadata entry reports that
## action through `chosen` when pressed. Opening a screen focuses its first visible button, so a
## keyboard or gamepad can drive it at once. Back (ui_cancel) reports &"back".

signal chosen(action: StringName)

## The action Back reports, or empty when Back does nothing here.
@export var back_action: StringName = &"back"

## The button last in focus: coming back to the screen (from a page it opened), focus returns to it.
var _remembered: Button


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	layout_direction = Control.LAYOUT_DIRECTION_LOCALE
	visible = false
	for button: Button in _buttons(self):
		if button.has_meta(&"action"):
			var action: StringName = button.get_meta(&"action")
			button.pressed.connect(_on_button.bind(action))
		button.mouse_entered.connect(button.grab_focus)
		button.focus_entered.connect(_on_focus)


func open() -> void:
	visible = true
	opened()
	focus_first()


func close() -> void:
	visible = false


## Called when the screen opens, before focus; subclasses refresh their contents here.
func opened() -> void:
	pass


func focus_first() -> void:
	if _remembered != null and is_instance_valid(_remembered) and _remembered.is_visible_in_tree() and not _remembered.disabled:
		_remembered.grab_focus()
		return
	for button: Button in _buttons(self):
		if button.is_visible_in_tree() and not button.disabled:
			button.grab_focus()
			return


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event.is_action_pressed(&"ui_cancel") and back_action != &"":
		get_viewport().set_input_as_handled()
		chosen.emit(back_action)


func _on_button(action: StringName) -> void:
	chosen.emit(action)


## Opened afresh (not come back to): focus starts at the first button again.
func forget_focus() -> void:
	_remembered = null


func _on_focus() -> void:
	var owner: Control = get_viewport().gui_get_focus_owner() if is_inside_tree() else null
	if owner is Button and is_ancestor_of(owner):
		_remembered = owner as Button
	chosen.emit(&"focus")


static func _buttons(node: Node) -> Array[Button]:
	var found: Array[Button] = []
	for child: Node in node.get_children():
		var button: Button = child as Button
		if button != null:
			found.append(button)
		found.append_array(_buttons(child))
	return found
