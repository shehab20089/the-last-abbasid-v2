class_name MoveCoach
extends Control
## Names a learned move over the hero's head as its moment comes, with the button that makes it: the
## ender while a cut plays, the delayed cut a beat after the rising cut, the charge as the cleave's
## blade rises, the running thrust on the run, the bash behind the shield, the rolling cut late in a
## roll, the plunge in the air, and an Art he can pay for in a fight (on its own button). A move is named
## until the hero has used it a few times or it has been named a dozen times (or always, or never:
## GameSettings.move_prompts), and nothing is named while a soldier near him winds up a blow. Pure
## presentation: it reads the hero, the soldiers, the save and the settings (`named` tells the session).

## A move was named (the session counts it in the save).
signal named(technique: StringName)

## Uses after which a move is no longer named (while he is learning it), and the times it is named before
## the coach gives up on it, used or not.
const LEARNED_AFTER: int = 3
const RETIRE_AFTER: int = 12
## A soldier this near (px) winding up a blow silences the coach: the warning is what matters then.
const THREAT_RANGE: float = 170.0
## How long a prompt stays once its moment has passed, and how fast it comes and goes.
const LINGER: float = 0.35
const FADE_SPEED: float = 9.0
## How far above his feet the prompt floats.
const HEAD: float = 92.0
const EDGE: Color = Color(0.72, 0.56, 0.3, 0.9)
const KEY_EDGE: Color = Color(1.0, 0.86, 0.5)
const NAME_COLOR: Color = Color(1.0, 0.93, 0.78)
const HOLD_COLOR: Color = Color(0.9, 0.78, 0.55)
## Each technique named: [the button, "hold" when it is held down or "down" when it is pressed with down
## held, the name's key].
const MOVES: Dictionary[StringName, Array] = {
	&"pommel": [&"heavy_attack", "", "TECH_POMMEL"],
	&"whirl": [&"heavy_attack", "", "TECH_WHIRL"],
	&"executioner": [&"heavy_attack", "", "TECH_EXECUTIONER"],
	&"delayed_cut": [&"attack", "", "TECH_DELAYED_CUT"],
	&"running_thrust": [&"heavy_attack", "", "TECH_RUNNING_THRUST"],
	&"charge": [&"heavy_attack", "hold", "MOVE_CHARGE"],
	&"bash": [&"heavy_attack", "", "MOVE_BASH"],
	&"roll_cut": [&"attack", "", "MOVE_ROLL_CUT"],
	&"plunge": [&"heavy_attack", "", "MOVE_PLUNGE"],
	&"steady_breath": [&"block", "", "MOVE_STEADY_BREATH"],
	&"ground_stab": [&"heavy_attack", "", "MOVE_GROUND_STAB"],
	&"kick": [&"attack", "", "MOVE_KICK"],
	&"low_cut": [&"attack", "down", "MOVE_LOW_CUT"],
	&"sweep": [&"heavy_attack", "down", "MOVE_SWEEP"],
	&"rising_cleave": [&"heavy_attack", "", "MOVE_RISING_CLEAVE"],
	&"windmill": [&"heavy_attack", "", "MOVE_WINDMILL"],
	&"running_slash": [&"attack", "", "MOVE_RUNNING_SLASH"],
	&"guarded_thrust": [&"attack", "", "MOVE_GUARDED_THRUST"],
	&"riposte": [&"attack", "", "MOVE_RIPOSTE"],
	&"down_stab": [&"attack", "down", "MOVE_DOWN_STAB"],
}

var hero: Warrior
var save: SaveGame
var settings: GameSettings
var glyphs: InputGlyphs
## The technique named now (or fading out).
var shown: StringName = &""

var _panel: PanelContainer
var _key: Label
var _hold: Label
var _name: Label
var _linger: float = 0.0
var _alpha: float = 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	# It follows the hero on the screen; a right-to-left layout must not mirror it.
	layout_direction = Control.LAYOUT_DIRECTION_LTR
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build()


func _process(delta: float) -> void:
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	var wanted: StringName = wanted_technique()
	if wanted != &"":
		if wanted != shown:
			_name_move(wanted)
		_linger = LINGER
	else:
		_linger -= real
	_alpha = move_toward(_alpha, 1.0 if _linger > 0.0 and shown != &"" else 0.0, FADE_SPEED * real)
	_panel.modulate.a = _alpha
	_panel.visible = _alpha > 0.0
	if _panel.visible and hero != null and is_instance_valid(hero):
		_follow()


## The technique to name now: the first open one he is still learning (or any, set to always), or empty.
func wanted_technique() -> StringName:
	if hero == null or not is_instance_valid(hero) or not hero.is_inside_tree() or get_tree().paused:
		return &""
	if settings != null and settings.move_prompts == GameSettings.Prompts.OFF:
		return &""
	# A blow on its way, an Art or a finisher playing, or a man to finish (his own prompt, on the same button as
	# the ground stroke named a step before): the coach gives way at once, without lingering.
	if (_threatened() or hero.state == Warrior.State.ART or hero.state == Warrior.State.FINISHER
			or hero.finisher_target != null):
		_linger = 0.0
		return &""
	var learning: bool = settings == null or settings.move_prompts == GameSettings.Prompts.LEARNING
	for technique: StringName in hero.open_techniques():
		if move_of(technique).is_empty():
			continue
		if (learning and save != null and (save.times_used(technique) >= LEARNED_AFTER
				or save.times_shown(technique) >= RETIRE_AFTER)):
			continue
		return technique
	return &""


## A soldier near him is winding up a blow (his warning is on its way or showing).
func _threatened() -> bool:
	for node: Node in get_tree().get_nodes_in_group(&"enemies"):
		var soldier: Combatant = node as Combatant
		if soldier == null or soldier.dead or soldier.current_attack == null:
			continue
		if (soldier.sprite.frame < soldier.current_attack.active_from
				and absf(soldier.global_position.x - hero.global_position.x) < THREAT_RANGE):
			return true
	return false


## [the button, "hold" or "", the name's key] for a technique, or empty: an Art is on the art button in
## the first slot and the second Art's button in the second.
func move_of(technique: StringName) -> Array:
	if MOVES.has(technique):
		return MOVES[technique]
	if hero == null:
		return []
	var arts: Array[ArtDefinition] = hero.carried_arts()
	for i: int in arts.size():
		if arts[i].id == technique:
			return [&"art" if i == 0 else &"art_2", "", arts[i].name_key]
	return []


func _name_move(technique: StringName) -> void:
	shown = technique
	named.emit(technique)
	var move: Array = move_of(technique)
	var action: StringName = move[0]
	var how: String = move[1]
	var name_key: String = move[2]
	var key: String = glyphs.label(action) if glyphs != null else String(action)
	if how == "down":
		key = (glyphs.label(&"move_down") if glyphs != null else "S") + "+" + key
	_key.text = key
	_hold.visible = how == "hold"
	_hold.text = tr("PROMPT_HOLD")
	_name.text = tr(name_key)
	_panel.reset_size()


## Over his head, kept on the screen.
func _follow() -> void:
	var feet: Vector2 = hero.get_global_transform_with_canvas().origin
	var size: Vector2 = _panel.get_combined_minimum_size()
	var screen: Vector2 = get_viewport_rect().size
	var at: Vector2 = feet + Vector2(-size.x * 0.5, -HEAD - size.y)
	at.x = clampf(at.x, 4.0, screen.x - size.x - 4.0)
	at.y = clampf(at.y, 4.0, screen.y - size.y - 4.0)
	_panel.position = at.round()


func _build() -> void:
	_panel = PanelContainer.new()
	_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var plate: StyleBoxFlat = StyleBoxFlat.new()
	plate.bg_color = Color(0.05, 0.035, 0.03, 0.86)
	plate.border_color = EDGE
	plate.set_border_width_all(1)
	plate.set_corner_radius_all(2)
	plate.content_margin_left = 3.0
	plate.content_margin_right = 5.0
	plate.content_margin_top = 1.0
	plate.content_margin_bottom = 1.0
	_panel.add_theme_stylebox_override(&"panel", plate)
	add_child(_panel)
	var row: HBoxContainer = HBoxContainer.new()
	row.add_theme_constant_override(&"separation", 4)
	# The coach is placed left to right over the hero, but its words follow the language: right to left the button
	# stands to the right of the name, read first.
	row.layout_direction = Control.LAYOUT_DIRECTION_LOCALE
	row.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_panel.add_child(row)
	_hold = Label.new()
	_hold.add_theme_color_override(&"font_color", HOLD_COLOR)
	row.add_child(_hold)
	_key = key_cap()
	row.add_child(_key)
	_name = Label.new()
	_name.add_theme_font_override(&"font", KeyText.FONT)
	_name.add_theme_font_size_override(&"font_size", 12)
	_name.add_theme_color_override(&"font_color", NAME_COLOR)
	row.add_child(_name)
	_panel.visible = false


## A button's name drawn as a small key, as KeyCaps draws it: bright letters on a dark plate with a pale rim
## and a lip (a Label, so its text can follow the device in use).
static func key_cap() -> Label:
	var key: Label = Label.new()
	key.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	key.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	key.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	key.custom_minimum_size = Vector2(KeyCaps.HEIGHT - 1.0, KeyCaps.HEIGHT)
	key.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	key.add_theme_font_override(&"font", KeyCaps.FONT)
	key.add_theme_font_size_override(&"font_size", KeyCaps.FONT_SIZE)
	key.add_theme_color_override(&"font_color", KeyCaps.INK)
	key.add_theme_color_override(&"font_shadow_color", Color(0.0, 0.0, 0.0, 0.0))
	key.add_theme_stylebox_override(&"normal", KeyCaps.style("", KeyCaps.Kind.KEY))
	return key
