class_name PauseMenu
extends MenuScreen
## The game paused: Resume, the Guide, the Journal, the Codex, the Techniques, Settings, and the two ways out
## that cost something (back to the last lamp, out to the title), each asked once before it is done. The pause
## button, or Back, resumes.

## The ways out that are asked about first, and the question each asks.
const ASKED: Dictionary[StringName, String] = {
	&"return_lamp": "CONFIRM_RETURN_LAMP",
	&"quit_title": "CONFIRM_QUIT_TITLE",
}

var _asking: StringName = &""
var _list: VBoxContainer
var _confirm: VBoxContainer
var _question: Label
var _no: Button
var _yes: Button


func _ready() -> void:
	super._ready()
	_list = get_node(^"Panel/List") as VBoxContainer
	_confirm = VBoxContainer.new()
	_confirm.add_theme_constant_override(&"separation", 6)
	_confirm.visible = false
	_list.get_parent().add_child(_confirm)
	_question = Label.new()
	_question.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_question.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_question.custom_minimum_size = Vector2(160, 0)
	_confirm.add_child(_question)
	var choices: HBoxContainer = HBoxContainer.new()
	choices.alignment = BoxContainer.ALIGNMENT_CENTER
	choices.add_theme_constant_override(&"separation", 8)
	_confirm.add_child(choices)
	_no = Button.new()
	_no.text = "MENU_NO"
	_no.pressed.connect(_answer.bind(false))
	_no.focus_entered.connect(_on_focus)
	_no.mouse_entered.connect(_no.grab_focus)
	choices.add_child(_no)
	_yes = Button.new()
	_yes.text = "MENU_YES"
	_yes.pressed.connect(_answer.bind(true))
	_yes.focus_entered.connect(_on_focus)
	_yes.mouse_entered.connect(_yes.grab_focus)
	choices.add_child(_yes)


func opened() -> void:
	_show_question(&"")


## Whether it is asking about a way out now.
func is_asking() -> bool:
	return _asking != &""


func _on_button(action: StringName) -> void:
	if ASKED.has(action) and _asking == &"":
		_show_question(action)
		chosen.emit(&"step")
		return
	chosen.emit(action)


func _answer(yes: bool) -> void:
	var action: StringName = _asking
	_show_question(&"")
	if yes:
		chosen.emit(action)
	else:
		chosen.emit(&"cancel_ask")


func _show_question(action: StringName) -> void:
	_asking = action
	_list.visible = action == &""
	_confirm.visible = action != &""
	if action != &"":
		_question.text = ASKED[action]
		_no.grab_focus()
	elif visible:
		focus_first()


func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event.is_action_pressed(&"ui_cancel"):
		get_viewport().set_input_as_handled()
		if _asking != &"":
			_answer(false)
		else:
			chosen.emit(back_action)
