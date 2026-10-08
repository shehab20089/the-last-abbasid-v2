class_name Hud
extends CanvasLayer
## The hero's vitals and the few words the player needs: health with the loss trailing behind it,
## stamina, remedies, manuscripts found, the objective, the prompt for what is at hand, hints and
## notices, the name of a place as the hero enters it, a boss's bar, the prompt to finish a staggered
## soldier and the black bars of a finisher. It only reads: the session binds it to the hero's signals.

const HINT_TIME: float = 7.0
const NOTICE_TIME: float = 2.6
const TRAIL_DELAY: float = 0.45
const LOCATION_TIME: float = 4.0
## How tall the black bars of a finisher grow, and how fast.
const BAR_HEIGHT: float = 26.0
const BAR_SPEED: float = 140.0

@export var remedy_full: Texture2D
@export var remedy_empty: Texture2D

var glyphs: InputGlyphs
var _trail_wait: float = 0.0
var _hint_left: float = 0.0
var _notice_left: float = 0.0
var _location_left: float = 0.0
var _hint_key: String = ""
var _prompt_target: Interactable
var _prompt_suspended: bool = false
var _finish_prompt: bool = false
var _bars_on: bool = false
var _bar_top: ColorRect
var _bar_bottom: ColorRect
## Everything read during play, gathered under one node so the bars of a finisher can fade it.
var _gameplay: Control
var _knife_icon: TextureRect
var _knife_label: Label

@onready var health_bar: TextureProgressBar = %Health
@onready var health_trail: TextureProgressBar = %HealthTrail
@onready var stamina_bar: TextureProgressBar = %Stamina
@onready var remedies: HBoxContainer = %Remedies
@onready var manuscripts_label: Label = %Manuscripts
@onready var objective_box: Control = %ObjectiveBox
@onready var objective_label: Label = %Objective
@onready var prompt_box: Control = %Prompt
@onready var prompt_label: Label = %PromptLabel
@onready var hint_box: Control = %Hint
@onready var hint_label: Label = %HintLabel
@onready var notice_label: Label = %Notice
@onready var boss_box: Control = %Boss
@onready var boss_bar: TextureProgressBar = %BossBar
@onready var boss_name: Label = %BossName
@onready var location_label: Label = %Location


func _ready() -> void:
	hint_box.modulate.a = 0.0
	notice_label.modulate.a = 0.0
	location_label.modulate.a = 0.0
	prompt_box.visible = false
	boss_box.visible = false
	objective_box.visible = false
	# Knives left, beside the pages found (shown once he has any).
	_knife_icon = TextureRect.new()
	_knife_icon.texture = load("res://assets/effects/throwing_knife.png") as Texture2D
	_knife_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_knife_icon.position = Vector2(146, 31)
	_knife_label = manuscripts_label.duplicate() as Label
	_knife_label.position = Vector2(160, 27)
	_knife_label.size = Vector2(24, 12)
	manuscripts_label.get_parent().add_child(_knife_icon)
	manuscripts_label.get_parent().add_child(_knife_label)
	set_knives(0, 0)
	_gameplay = Control.new()
	_gameplay.name = "Gameplay"
	_gameplay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_gameplay.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(_gameplay)
	move_child(_gameplay, 0)
	for child: Node in get_children():
		if child != _gameplay and child is Control:
			child.reparent(_gameplay, false)
	# The black bars a finisher draws across the screen, over everything else.
	_bar_top = ColorRect.new()
	_bar_bottom = ColorRect.new()
	for bar: ColorRect in [_bar_top, _bar_bottom]:
		bar.color = Color(0.0, 0.0, 0.0, 1.0)
		bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bar.anchor_right = 1.0
		add_child(bar)
	_bar_top.anchor_top = 0.0
	_bar_top.anchor_bottom = 0.0
	_bar_bottom.anchor_top = 1.0
	_bar_bottom.anchor_bottom = 1.0
	_set_bars(0.0)


func bind(warrior: Warrior) -> void:
	warrior.health_changed.connect(_on_health_changed)
	warrior.stamina_changed.connect(_on_stamina_changed)
	warrior.remedies_changed.connect(_on_remedies_changed)
	warrior.knives_changed.connect(set_knives)
	set_knives(warrior.knives, warrior.profile.max_knives if warrior.knows(&"knives") else 0)
	warrior.interactable_changed.connect(_on_interactable_changed)
	_on_health_changed(warrior.health, warrior.max_health)
	health_trail.value = health_bar.value
	_on_stamina_changed(warrior.stamina, warrior.profile.max_stamina)
	_on_remedies_changed(warrior.remedies, warrior.profile.max_remedies)
	if glyphs != null and not glyphs.device_changed.is_connected(_on_device_changed):
		glyphs.device_changed.connect(_on_device_changed)


func set_objective(key: String) -> void:
	objective_box.visible = key != ""
	objective_label.text = tr(key)


func set_knives(count: int, maximum: int) -> void:
	_knife_icon.visible = maximum > 0
	_knife_label.visible = maximum > 0
	_knife_label.text = "%d" % count


func set_manuscripts(found: int, total: int) -> void:
	manuscripts_label.text = "%d/%d" % [found, total]


func show_hint(key: String) -> void:
	_hint_key = key
	hint_label.text = glyphs.format(key) if glyphs != null else tr(key)
	_hint_left = HINT_TIME


func notice(text: String) -> void:
	notice_label.text = text
	_notice_left = NOTICE_TIME


func show_boss(display_name: String, health: float, max_health: float) -> void:
	boss_box.visible = true
	_refresh_prompt()
	boss_name.text = display_name
	boss_bar.max_value = max_health
	boss_bar.value = health


func update_boss(health: float) -> void:
	boss_bar.value = health


## Shows the name of the place the hero has entered for a few seconds.
func show_location(text: String) -> void:
	location_label.text = text
	_location_left = LOCATION_TIME


func hide_boss() -> void:
	boss_box.visible = false
	_refresh_prompt()


func set_gameplay_visible(on: bool) -> void:
	visible = on


## The prompt to finish the staggered soldier before the hero (it takes the place of any other).
func set_finish_prompt(on: bool) -> void:
	if on == _finish_prompt:
		return
	_finish_prompt = on
	_refresh_prompt()


## The black bars of a finisher, sliding in or out.
func cinematic_bars(on: bool) -> void:
	_bars_on = on


func _set_bars(height: float) -> void:
	_bar_top.offset_top = 0.0
	_bar_top.offset_bottom = height
	_bar_bottom.offset_top = -height
	_bar_bottom.offset_bottom = 0.0
	_bar_top.visible = height > 0.0
	_bar_bottom.visible = height > 0.0


## Hides the prompt while the game waits on a menu, a page or a conversation.
func suspend_prompt(on: bool) -> void:
	_prompt_suspended = on
	_refresh_prompt()


func _process(delta: float) -> void:
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	if health_trail.value > health_bar.value:
		_trail_wait -= real
		if _trail_wait <= 0.0:
			health_trail.value = maxf(health_bar.value, health_trail.value - 60.0 * real)
	else:
		health_trail.value = health_bar.value
	_hint_left -= real
	hint_box.modulate.a = clampf(minf(_hint_left, HINT_TIME - _hint_left) * 3.0, 0.0, 1.0)
	_notice_left -= real
	notice_label.modulate.a = clampf(minf(_notice_left, NOTICE_TIME - _notice_left) * 3.0, 0.0, 1.0)
	_location_left -= real
	location_label.modulate.a = clampf(minf(_location_left, LOCATION_TIME - _location_left) * 1.2, 0.0, 1.0)
	var bar: float = move_toward(_bar_top.offset_bottom, BAR_HEIGHT if _bars_on else 0.0, BAR_SPEED * real)
	if bar != _bar_top.offset_bottom:
		_set_bars(bar)
		_gameplay.modulate.a = 1.0 - bar / BAR_HEIGHT


func _on_health_changed(current: float, maximum: float) -> void:
	health_bar.max_value = maximum
	health_trail.max_value = maximum
	if current < health_bar.value:
		_trail_wait = TRAIL_DELAY
	health_bar.value = current


func _on_stamina_changed(current: float, maximum: float) -> void:
	stamina_bar.max_value = maximum
	stamina_bar.value = current


func _on_remedies_changed(count: int, maximum: int) -> void:
	for i: int in remedies.get_child_count():
		var icon: TextureRect = remedies.get_child(i) as TextureRect
		icon.visible = i < maximum
		icon.texture = remedy_full if i < count else remedy_empty


func _on_interactable_changed(target: Interactable) -> void:
	_prompt_target = target
	_refresh_prompt()


func _refresh_prompt() -> void:
	var target: Interactable = _prompt_target
	if _finish_prompt and not _prompt_suspended:
		prompt_box.visible = true
		var heavy: String = glyphs.label(&"heavy_attack") if glyphs != null else "K"
		prompt_label.text = "[%s] %s" % [heavy, tr("PROMPT_FINISH")]
		return
	# The boss's bar has the foot of the screen while he stands.
	prompt_box.visible = (not _prompt_suspended and not boss_box.visible and target != null
		and is_instance_valid(target))
	if prompt_box.visible:
		var key: String = glyphs.label(&"interact") if glyphs != null else "E"
		prompt_label.text = "[%s] %s" % [key, tr(target.prompt)]


func _on_device_changed(_gamepad: bool) -> void:
	_refresh_prompt()
	if _hint_left > 0.0 and _hint_key != "":
		hint_label.text = glyphs.format(_hint_key)
