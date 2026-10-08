class_name MenuScreen
extends Control
## A menu screen: every Button under it that carries an "action" metadata entry reports that
## action through `chosen` when pressed. Opening a screen focuses its first visible button, so a
## keyboard or gamepad can drive it at once. Back (ui_cancel) reports &"back".

signal chosen(action: StringName)

## The action Back reports, or empty when Back does nothing here.
@export var back_action: StringName = &"back"


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


func _on_focus() -> void:
	chosen.emit(&"focus")


static func _buttons(node: Node) -> Array[Button]:
	var found: Array[Button] = []
	for child: Node in node.get_children():
		var button: Button = child as Button
		if button != null:
			found.append(button)
		found.append_array(_buttons(child))
	return found
