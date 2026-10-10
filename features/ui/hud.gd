class_name Hud
extends CanvasLayer
## The hero's vitals and the words the player needs, each in its own place: health with the loss trailing
## behind it, stamina, resolve and the Arts it pays for, remedies, manuscripts found and the Honour held at the
## top left; the objective, framed, at the top right with the news under it (NoticeStack); the lesson of the
## moment at the top centre (LessonCard); the moments that change what to do next across the middle
## (MomentBanner); what is said in passing low on the screen (SubtitleLine); and over the world itself the signs
## over people, lamps and the objective, the button for what is at hand and for a finisher (WorldMarkers). Also
## the name of a place as the hero enters it, a boss's bar, the black bars of a finisher, and the coach that
## names a learned move over the hero as its moment comes. Every clock here stops while the game waits on a
## menu or a conversation. It only reads: the session binds it to the hero's signals.

const TRAIL_DELAY: float = 0.45
const LOCATION_TIME: float = 4.0
## How tall the black bars of a finisher grow, and how fast.
const BAR_HEIGHT: float = 26.0
const BAR_SPEED: float = 140.0
## Where the counters sit under the bars, and how far down they move to make room for the resolve bar.
const COUNTERS_Y: float = 30.0
const RESOLVE_ROOM: float = 7.0
## The health bar's length: a pixel for each point of health past the first hundred's 104, within these bounds.
const HEALTH_BASE: float = 100.0
const HEALTH_MIN_WIDTH: float = 104.0
const HEALTH_MAX_WIDTH: float = 156.0
## Pages and Honour sit dim under the counters, and shine a while when they change.
const COLLECTION_DIM: float = 0.55
const COLLECTION_SHINE: float = 3.5
## How long the saved sign shows in the corner.
const SAVED_TIME: float = 2.0
const SAVED_SIGN: Texture2D = preload("res://assets/ui/marker_lamp.png")
const KNIFE: Texture2D = preload("res://assets/ui/icon_knife.png")
const TRAIL: Texture2D = preload("res://assets/ui/hud_health_trail.png")
## An Art's icon while its price is out of reach.
const ART_DIM: Color = Color(0.45, 0.42, 0.42, 0.8)
const THEME: Theme = preload("res://features/ui/ui_theme.tres")
## The objective's frame, its heading and words, and how long it flashes when the objective changes.
const OBJECTIVE_WIDTH: float = 236.0
const OBJECTIVE_HEADING: Color = Color(0.86, 0.68, 0.38)
const OBJECTIVE_INK: Color = Color(1.0, 0.92, 0.72)
const OBJECTIVE_FLASH: float = 2.4

@export var remedy_full: Texture2D
@export var remedy_empty: Texture2D

## The icon of an Art slot with nothing in it.
var _empty_art: Texture2D = load("res://assets/ui/art_none.png") as Texture2D

var glyphs: InputGlyphs:
	set(value):
		glyphs = value
		if lessons != null:
			lessons.glyphs = value
		if markers != null:
			markers.glyphs = value
var _trail_wait: float = 0.0
var _location_left: float = 0.0
var _prompt_target: Interactable
var _prompt_suspended: bool = false
var _finish_target: Combatant
var _bars_on: bool = false
var _bar_top: ColorRect
var _bar_bottom: ColorRect
## Everything read during play, gathered under one node so the bars of a finisher can fade it.
var _gameplay: Control
var _knife_icon: TextureRect
var _knife_label: Label
var _resolve_bar: TextureProgressBar
## The icons of the two Arts carried, and the Arts themselves.
var _art_icons: Array[TextureRect] = []
var _arts: Array[ArtDefinition] = []
## The buttons beside the counters: the remedy's, the knife's, each Art's.
var _heal_keys: HBoxContainer
var _throw_keys: HBoxContainer
var _art_keys: Array[HBoxContainer] = []
var _manuscript_icon: Control
var _health_cap: Control
var _stamina_cap: Control
## How bright pages and Honour are (shining a while after a change).
var _collection: float = 0.0
var _pages_found: int = -1
## The saved sign's time left, the boss bar's trail, whether the bars are mirrored (right to left).
var _saved_left: float = 0.0
var _saved_sign: TextureRect
var _boss_trail: TextureProgressBar
var _boss_trail_wait: float = 0.0
var _mirrored: bool = false
var _flare: float = 0.0
var _honour_icon: TextureRect
var _honour_label: Label
## The Honour count's shine as it grows.
var _shine: float = 0.0
## The breath bar's red flash (an action refused) and bright flare (breath drawn back).
var _breath_flash: float = 0.0
var _breath_flare: float = 0.0
## The objective's frame and words, and its flash as it changes.
var _objective_panel: PanelContainer
var _objective_plate: StyleBoxFlat
var objective_label: Label
var _objective_flash: float = 0.0
## Names a learned move over the hero as its moment comes (the session gives it the save and settings).
var coach: MoveCoach
## An Art's name, flashed across the screen as it is spent.
var art_name: ArtBanner
## The lessons of play, one at a time at the top centre.
var lessons: LessonCard
## News, stacked at the right under the objective.
var notices: NoticeStack
## What is said in passing, low on the screen.
var subtitles: SubtitleLine
## The moments that change what to do next, across the middle of the screen.
var moments: MomentBanner
## The signs drawn over the world.
var markers: WorldMarkers

@onready var health_bar: TextureProgressBar = %Health
@onready var health_trail: TextureProgressBar = %HealthTrail
@onready var stamina_bar: TextureProgressBar = %Stamina
@onready var remedies: HBoxContainer = %Remedies
@onready var manuscripts_label: Label = %Manuscripts
@onready var boss_box: Control = %Boss
@onready var boss_bar: TextureProgressBar = %BossBar
@onready var boss_name: Label = %BossName
@onready var location_label: Label = %Location


func _ready() -> void:
	location_label.modulate.a = 0.0
	boss_box.visible = false
	var vitals: Control = health_bar.get_parent() as Control
	_manuscript_icon = vitals.get_node(^"ManuscriptIcon") as Control
	_health_cap = vitals.get_node(^"HealthCap") as Control
	_stamina_cap = vitals.get_node(^"StaminaCap") as Control
	# The health bars stretch as he grows (their middles repeat; their ends stay).
	for bar: TextureProgressBar in [health_bar, health_trail]:
		bar.nine_patch_stretch = true
		bar.stretch_margin_left = 2
		bar.stretch_margin_right = 2
	# Knives left, with the button that throws them (shown once he has any).
	_knife_icon = TextureRect.new()
	_knife_icon.texture = KNIFE
	_knife_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_knife_label = manuscripts_label.duplicate() as Label
	vitals.add_child(_knife_icon)
	vitals.add_child(_knife_label)
	_heal_keys = _key_holder(&"heal", vitals)
	_throw_keys = _key_holder(&"throw", vitals)
	# The Honour held, after the pages.
	_honour_icon = TextureRect.new()
	_honour_icon.texture = load("res://assets/ui/icon_honour.png") as Texture2D
	_honour_icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_honour_label = manuscripts_label.duplicate() as Label
	_honour_label.add_theme_color_override(&"font_color", Color(1.0, 0.86, 0.5))
	vitals.add_child(_honour_icon)
	vitals.add_child(_honour_label)
	_build_resolve()
	set_knives(0, 0)
	set_honour(0, false)
	# The boss's bar trails the loss as the hero's does.
	_boss_trail = TextureProgressBar.new()
	_boss_trail.texture_progress = TRAIL
	_boss_trail.nine_patch_stretch = true
	_boss_trail.stretch_margin_left = 2
	_boss_trail.stretch_margin_right = 2
	_boss_trail.mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Laid exactly where the bar is, by the same anchors and offsets, so a right-to-left layout (Arabic) mirrors
	# the two together (a position set by hand is mirrored on its own, and the trail ran off the bar's end).
	for side: Side in [SIDE_LEFT, SIDE_TOP, SIDE_RIGHT, SIDE_BOTTOM]:
		_boss_trail.set_anchor(side, boss_bar.get_anchor(side))
		_boss_trail.set_offset(side, boss_bar.get_offset(side))
	boss_box.add_child(_boss_trail)
	boss_box.move_child(_boss_trail, boss_bar.get_index())
	# The dark under the bar goes beneath the trail, so the loss shows pale through the emptied bar.
	_boss_trail.texture_under = boss_bar.texture_under
	boss_bar.texture_under = null
	# The game written to the save: a lamp turns in the corner a moment.
	_saved_sign = TextureRect.new()
	_saved_sign.texture = SAVED_SIGN
	_saved_sign.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_saved_sign.anchor_left = 1.0
	_saved_sign.anchor_right = 1.0
	_saved_sign.anchor_top = 1.0
	_saved_sign.anchor_bottom = 1.0
	_saved_sign.offset_left = -20.0
	_saved_sign.offset_top = -22.0
	_saved_sign.offset_right = -9.0
	_saved_sign.offset_bottom = -9.0
	_saved_sign.modulate.a = 0.0
	add_child(_saved_sign)
	_gameplay = Control.new()
	_gameplay.name = "Gameplay"
	_gameplay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_gameplay.set_anchors_preset(Control.PRESET_FULL_RECT)
	# Everything under it speaks in the game's own faces (the coach and the Art banner too).
	_gameplay.theme = THEME
	add_child(_gameplay)
	move_child(_gameplay, 0)
	for child: Node in get_children():
		if child != _gameplay and child is Control:
			child.reparent(_gameplay, false)
	# The signs over the world lie under everything else.
	markers = WorldMarkers.new()
	markers.name = "Markers"
	markers.glyphs = glyphs
	_gameplay.add_child(markers)
	_gameplay.move_child(markers, 0)
	_build_objective()
	notices = NoticeStack.new()
	notices.name = "Notices"
	_gameplay.add_child(notices)
	lessons = LessonCard.new()
	lessons.name = "Lessons"
	lessons.glyphs = glyphs
	_gameplay.add_child(lessons)
	subtitles = SubtitleLine.new()
	subtitles.name = "Subtitles"
	_gameplay.add_child(subtitles)
	moments = MomentBanner.new()
	moments.name = "Moments"
	_gameplay.add_child(moments)
	coach = MoveCoach.new()
	coach.name = "Coach"
	_gameplay.add_child(coach)
	art_name = ArtBanner.new()
	art_name.name = "ArtBanner"
	_gameplay.add_child(art_name)
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
	set_knives(warrior.knives, warrior.max_knives() if warrior.knows(&"knives") else 0)
	warrior.resolve_changed.connect(_on_resolve_changed)
	set_arts(warrior.carried_arts(), warrior.has_resolve())
	_on_resolve_changed(warrior.resolve, warrior.profile.max_resolve)
	warrior.interactable_changed.connect(_on_interactable_changed)
	_on_health_changed(warrior.health, warrior.max_health)
	health_trail.value = health_bar.value
	_on_stamina_changed(warrior.stamina, warrior.profile.max_stamina)
	_on_remedies_changed(warrior.remedies, warrior.profile.max_remedies)
	if glyphs != null and not glyphs.device_changed.is_connected(_on_device_changed):
		glyphs.device_changed.connect(_on_device_changed)
	coach.hero = warrior
	coach.glyphs = glyphs
	coach.shown = &""
	_refresh_keys()
	markers.hero = warrior
	markers.target = null
	markers.finisher = null
	_prompt_target = null


## The objective's words (a translation key); `flash` when it has just changed.
func set_objective(key: String, flash: bool = false) -> void:
	_objective_panel.visible = key != ""
	objective_label.text = tr(key)
	_objective_panel.reset_size()
	if flash:
		_objective_flash = OBJECTIVE_FLASH


## A lesson (a translation key with {action} tokens): it waits its turn at the top of the screen.
func show_hint(key: String) -> void:
	lessons.push(key)


## A line of news (already translated), stacked at the right.
func notice(text: String) -> void:
	notices.notice(text)


## A line said in passing (both translated; an empty speaker is narration).
func say(speaker: String, words: String) -> void:
	subtitles.say(speaker, words)


## A moment across the middle of the screen (all translated).
func moment(heading: String, title: String, line: String = "") -> void:
	moments.show_moment(heading, title, line)


## Forgets every lesson, notice, line and moment waiting (a level left).
func clear_messages() -> void:
	lessons.clear()
	notices.clear()
	subtitles.clear()
	moments.clear()


func set_knives(count: int, maximum: int) -> void:
	var shown: bool = maximum > 0
	var changed: bool = shown != _knife_icon.visible
	_knife_icon.visible = shown
	_knife_label.visible = shown
	_throw_keys.visible = shown
	_knife_label.text = "%d" % count
	_knife_label.modulate = Color.WHITE if count > 0 else Color(0.6, 0.55, 0.5)
	if changed:
		_layout_vitals()


## The resolve bar and the Arts it pays for (shown once he has an Art).
func set_arts(arts: Array[ArtDefinition], shown: bool) -> void:
	_arts = arts
	_resolve_bar.visible = shown
	for i: int in _art_icons.size():
		var icon: TextureRect = _art_icons[i]
		icon.visible = shown
		icon.texture = arts[i].icon if i < arts.size() else _empty_art
		_art_keys[i].visible = shown and i < arts.size()
	_layout_vitals()
	_light_arts()


## The Honour held; `shine` when it has just grown.
func set_honour(amount: int, shine: bool) -> void:
	_honour_label.text = "%d" % amount
	if shine:
		_shine = 1.0
		_collection = COLLECTION_SHINE


func set_manuscripts(found: int, total: int) -> void:
	manuscripts_label.text = "%d/%d" % [found, total]
	if _pages_found >= 0 and found > _pages_found:
		_collection = COLLECTION_SHINE
	_pages_found = found


## The game was written to the save: a lamp turns in the corner a moment.
func saved() -> void:
	_saved_left = SAVED_TIME


func show_boss(display_name: String, health: float, max_health: float) -> void:
	boss_box.visible = true
	subtitles.raised = true
	boss_name.text = display_name
	boss_bar.max_value = max_health
	boss_bar.value = health
	_boss_trail.max_value = max_health
	_boss_trail.value = health


func update_boss(health: float) -> void:
	if health < boss_bar.value:
		_boss_trail_wait = TRAIL_DELAY
	boss_bar.value = health


## Shows the name of the place the hero has entered for a few seconds.
func show_location(text: String) -> void:
	location_label.text = text
	_location_left = LOCATION_TIME


func hide_boss() -> void:
	boss_box.visible = false
	subtitles.raised = false


func set_gameplay_visible(on: bool) -> void:
	visible = on


## The soldier open to a finisher before the hero (its button is drawn over him), or null.
func set_finish_target(target: Combatant) -> void:
	_finish_target = target
	markers.finisher = target if not _prompt_suspended else null


## An Art spent: its name across the screen (and in Arabic above it).
func art_banner(display_name: String, arabic: String) -> void:
	art_name.show_art(display_name, arabic)


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


## Hides what is drawn over the world while the game waits on a menu, a page or a conversation.
func suspend_prompt(on: bool) -> void:
	_prompt_suspended = on
	markers.suspended = on
	markers.finisher = _finish_target if not on else null


func _process(delta: float) -> void:
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	if health_trail.value > health_bar.value:
		_trail_wait -= real
		if _trail_wait <= 0.0:
			health_trail.value = maxf(health_bar.value, health_trail.value - 60.0 * real)
	else:
		health_trail.value = health_bar.value
	var waiting: bool = get_tree().paused
	# A place's name waits out a menu or a conversation; the banner waits on it.
	if not waiting:
		_location_left -= real
	location_label.modulate.a = clampf(minf(_location_left, LOCATION_TIME - _location_left) * 1.2, 0.0, 1.0)
	location_label.visible = not waiting
	moments.held = _location_left > 0.0
	lessons.held = _location_left > 0.0
	# The news stacks under the hero's panel (lower when the resolve bar shows).
	notices.top = 8.0 + COUNTERS_Y + (RESOLVE_ROOM if _resolve_bar.visible else 0.0) + 34.0
	if _shine > 0.0:
		_shine = maxf(0.0, _shine - real * 1.6)
		var glow: Color = Color(1, 1, 1).lerp(Color(1.9, 1.6, 0.9), _shine)
		_honour_icon.modulate = glow
		_honour_label.modulate = glow
	if _flare > 0.0:
		_flare = maxf(0.0, _flare - real * 2.5)
		_resolve_bar.modulate = Color(1, 1, 1).lerp(Color(1.8, 1.5, 1.0), _flare)
	# Pages and Honour: dim, bright a while after they change.
	if not waiting:
		_collection = maxf(0.0, _collection - real)
	var bright: float = clampf(_collection, COLLECTION_DIM, 1.0) if _collection > 0.0 else COLLECTION_DIM
	for item: Control in [_manuscript_icon, manuscripts_label]:
		item.modulate.a = bright
	if _shine <= 0.0:
		_honour_icon.modulate.a = bright
		_honour_label.modulate.a = bright
	# The saved sign: it breathes in the corner, then goes.
	_saved_left = maxf(0.0, _saved_left - real)
	_saved_sign.modulate.a = clampf(minf(_saved_left * 2.0, SAVED_TIME - _saved_left) * 3.0, 0.0, 1.0) \
		* (0.75 + 0.25 * sin(Time.get_ticks_msec() * 0.012))
	# The boss's loss trails behind his bar.
	if _boss_trail.value > boss_bar.value:
		_boss_trail_wait -= real
		if _boss_trail_wait <= 0.0:
			_boss_trail.value = maxf(boss_bar.value, _boss_trail.value - boss_bar.max_value * 0.4 * real)
	else:
		_boss_trail.value = boss_bar.value
	# Right to left (Arabic) the bars fill from the right and their ends point the other way.
	var rtl: bool = health_bar.is_layout_rtl()
	if rtl != _mirrored:
		_mirrored = rtl
		_mirror_bars()
	# The objective flashes as it changes.
	if _objective_flash > 0.0 and not waiting:
		_objective_flash = maxf(0.0, _objective_flash - real)
	var pulse: float = (0.5 + 0.5 * sin(_objective_flash * 9.0)) * minf(1.0, _objective_flash)
	_objective_plate.border_color = Color(0.62, 0.46, 0.24, 0.9).lerp(Color(1.0, 0.9, 0.6, 1.0), pulse)
	_objective_panel.modulate = Color(1, 1, 1).lerp(Color(1.35, 1.25, 1.05), pulse * 0.6)
	# The breath bar: red when refused, pulsing red while he is winded, bright when breath comes back.
	_breath_flash = maxf(0.0, _breath_flash - real * 2.8)
	_breath_flare = maxf(0.0, _breath_flare - real * 2.6)
	var winded: float = 0.0
	if stamina_bar.value <= 0.5:
		winded = 0.45 + 0.35 * sin(Time.get_ticks_msec() * 0.016)
	var red: float = maxf(_breath_flash, winded)
	stamina_bar.modulate = (Color(1, 1, 1).lerp(Color(1.9, 0.45, 0.35), red)).lerp(Color(1.7, 1.6, 1.25), _breath_flare)
	var bar: float = move_toward(_bar_top.offset_bottom, BAR_HEIGHT if _bars_on else 0.0, BAR_SPEED * real)
	if bar != _bar_top.offset_bottom:
		_set_bars(bar)
		_gameplay.modulate.a = 1.0 - bar / BAR_HEIGHT


func _on_health_changed(current: float, maximum: float) -> void:
	var grown: bool = maximum != health_bar.max_value
	health_bar.max_value = maximum
	health_trail.max_value = maximum
	if grown:
		_layout_vitals()
	if current < health_bar.value:
		_trail_wait = TRAIL_DELAY
	health_bar.value = current


func _on_stamina_changed(current: float, maximum: float) -> void:
	stamina_bar.max_value = maximum
	stamina_bar.value = current


## An action asked for with no breath: the bar flashes red.
func breath_refused() -> void:
	_breath_flash = 1.0


## Breath drawn back (a steady breath, a parry, a close call): the bar flares.
func breath_drawn() -> void:
	_breath_flare = 1.0


func _on_resolve_changed(current: float, maximum: float) -> void:
	var before: float = _resolve_bar.value
	_resolve_bar.max_value = maximum
	_resolve_bar.value = current
	# A segment filled (an Art's worth): the bar flares once.
	var half: float = maximum * 0.5
	if (before < half and current >= half) or (before < maximum and current >= maximum):
		_flare = 1.0
	_light_arts()


## Each carried Art's icon lights when there is the resolve to pay for it.
func _light_arts() -> void:
	for i: int in _art_icons.size():
		var affordable: bool = i < _arts.size() and _resolve_bar.value >= _arts[i].cost
		_art_icons[i].modulate = Color.WHITE if affordable else ART_DIM


## The resolve bar under the stamina, the two Arts' icons beside it, and the rows below made ready to
## move down when it shows.
func _build_resolve() -> void:
	var vitals: Control = stamina_bar.get_parent() as Control
	_resolve_bar = TextureProgressBar.new()
	_resolve_bar.texture_under = load("res://assets/ui/hud_resolve_under.png") as Texture2D
	_resolve_bar.texture_progress = load("res://assets/ui/hud_resolve_fill.png") as Texture2D
	_resolve_bar.texture_over = load("res://assets/ui/hud_resolve_frame.png") as Texture2D
	_resolve_bar.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_place(_resolve_bar, Rect2(Vector2(24, 25), _resolve_bar.texture_under.get_size()))
	_resolve_bar.max_value = 100.0
	vitals.add_child(_resolve_bar)
	for i: int in 2:
		var icon: TextureRect = TextureRect.new()
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		icon.texture = _empty_art
		vitals.add_child(icon)
		_art_icons.append(icon)
		_art_keys.append(_key_holder(&"art" if i == 0 else &"art_2", vitals))
	set_arts([], false)


## The hero's panel: the bars (health as long as he is strong), then under them the counters with their
## buttons (remedies, knives, the Arts), then pages and Honour. Placed by anchors and offsets (`_place`), so
## right to left it mirrors whole.
func _layout_vitals() -> void:
	if _resolve_bar == null or _heal_keys == null:
		return
	var width: float = clampf(HEALTH_MIN_WIDTH + (health_bar.max_value - HEALTH_BASE), HEALTH_MIN_WIDTH, HEALTH_MAX_WIDTH)
	for bar: Control in [health_bar, health_trail]:
		_place(bar, Rect2(24, 6, width, 9))
	_place(_health_cap, Rect2(23 + width, 5, 11, 11))
	var y: float = COUNTERS_Y + (RESOLVE_ROOM if _resolve_bar.visible else 0.0)
	var phials: int = 0
	for child: Node in remedies.get_children():
		if (child as Control).visible:
			phials += 1
	var x: float = 6.0
	_place(remedies, Rect2(x, y, phials * 12.0, 14))
	x += phials * 12.0 + 1.0
	x = _place_keys(_heal_keys, x, y) + 7.0
	if _knife_icon.visible:
		_place(_knife_icon, Rect2(x, y + 1, 12, 12))
		x += 13.0
		var count: float = maxf(6.0, _knife_label.get_minimum_size().x)
		_place(_knife_label, Rect2(x, y + 1, count, 12))
		x += count + 1.0
		x = _place_keys(_throw_keys, x, y) + 7.0
	for i: int in _art_icons.size():
		if not _art_icons[i].visible:
			continue
		_place(_art_icons[i], Rect2(x, y, 14, 14))
		x += 15.0
		if _art_keys[i].visible:
			x = _place_keys(_art_keys[i], x, y)
		x += 5.0
	var row: float = y + 16.0
	_place(_manuscript_icon, Rect2(6, row + 2, 14, 10))
	_place(manuscripts_label, Rect2(22, row, 40, 12))
	_place(_honour_icon, Rect2(64, row + 1, 10, 10))
	_place(_honour_label, Rect2(76, row, 40, 12))


## Places a row of button caps at (x, y); returns where it ends.
func _place_keys(holder: HBoxContainer, x: float, y: float) -> float:
	if not holder.visible:
		return x
	var size: Vector2 = holder.get_combined_minimum_size()
	_place(holder, Rect2(x, y + 1, size.x, KeyCaps.HEIGHT))
	return x + size.x


## A row of caps for an action's button, kept for the device in use.
func _key_holder(action: StringName, parent: Control) -> HBoxContainer:
	var holder: HBoxContainer = HBoxContainer.new()
	holder.mouse_filter = Control.MOUSE_FILTER_IGNORE
	holder.add_theme_constant_override(&"separation", 1)
	holder.set_meta(&"action", action)
	parent.add_child(holder)
	_fill_keys(holder)
	return holder


func _fill_keys(holder: HBoxContainer) -> void:
	for child: Node in holder.get_children():
		holder.remove_child(child)
		child.queue_free()
	var action: StringName = holder.get_meta(&"action")
	if glyphs == null:
		return
	for cap: Array in glyphs.caps(action):
		var text: String = cap[0]
		var kind: KeyCaps.Kind = cap[1]
		var key: Control = KeyCaps.make(text, kind)
		key.modulate = Color(1, 1, 1, 0.85)
		holder.add_child(key)


## Every cap beside the counters, for the device now in use.
func _refresh_keys() -> void:
	for holder: HBoxContainer in [_heal_keys, _throw_keys, _art_keys[0], _art_keys[1]]:
		_fill_keys(holder)
	_layout_vitals()


## Right to left: each bar drawn mirrored in its place (filling from the right, its end turned), the caps flipped;
## the boss's bar fills from the right too and its arrowhead ends still point outward.
func _mirror_bars() -> void:
	for bar: Control in [health_bar, health_trail, stamina_bar, _resolve_bar]:
		bar.pivot_offset = bar.size * 0.5
		bar.scale = Vector2(-1.0 if _mirrored else 1.0, 1.0)
	for cap: Control in [_health_cap, _stamina_cap]:
		var flip: TextureRect = cap as TextureRect
		if flip != null:
			flip.flip_h = _mirrored
	var fill: TextureProgressBar.FillMode = (TextureProgressBar.FILL_RIGHT_TO_LEFT if _mirrored
		else TextureProgressBar.FILL_LEFT_TO_RIGHT)
	boss_bar.fill_mode = fill
	_boss_trail.fill_mode = fill
	# The left cap is drawn flipped to point left; mirrored, it stands at the right and must point right.
	var left_cap: TextureRect = boss_box.get_node_or_null(^"BossCapLeft") as TextureRect
	var right_cap: TextureRect = boss_box.get_node_or_null(^"BossCapRight") as TextureRect
	if left_cap != null and right_cap != null:
		left_cap.flip_h = not _mirrored
		right_cap.flip_h = _mirrored


## The objective at the top right: a dark frame with a gold rim, its heading over its words.
func _build_objective() -> void:
	_objective_panel = PanelContainer.new()
	_objective_panel.name = "Objective"
	_objective_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_objective_plate = StyleBoxFlat.new()
	_objective_plate.anti_aliasing = false
	_objective_plate.bg_color = Color(0.03, 0.025, 0.03, 0.78)
	_objective_plate.set_border_width_all(1)
	_objective_plate.border_color = Color(0.62, 0.46, 0.24, 0.9)
	_objective_plate.content_margin_left = 6.0
	_objective_plate.content_margin_right = 6.0
	_objective_plate.content_margin_top = 2.0
	_objective_plate.content_margin_bottom = 3.0
	_objective_panel.add_theme_stylebox_override(&"panel", _objective_plate)
	_objective_panel.anchor_left = 1.0
	_objective_panel.anchor_right = 1.0
	_objective_panel.offset_left = -OBJECTIVE_WIDTH - 8.0
	_objective_panel.offset_right = -8.0
	_objective_panel.offset_top = 8.0
	_objective_panel.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	_gameplay.add_child(_objective_panel)
	var list: VBoxContainer = VBoxContainer.new()
	list.add_theme_constant_override(&"separation", 0)
	_objective_panel.add_child(list)
	var heading: Label = Label.new()
	heading.text = "HUD_OBJECTIVE"
	heading.add_theme_color_override(&"font_color", OBJECTIVE_HEADING)
	list.add_child(heading)
	objective_label = Label.new()
	objective_label.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	objective_label.custom_minimum_size = Vector2(OBJECTIVE_WIDTH - 12.0, 0.0)
	objective_label.add_theme_font_override(&"font", KeyText.FONT)
	objective_label.add_theme_font_size_override(&"font_size", 12)
	objective_label.add_theme_color_override(&"font_color", OBJECTIVE_INK)
	list.add_child(objective_label)
	_objective_panel.visible = false


func _on_remedies_changed(count: int, maximum: int) -> void:
	var before: int = 0
	for i: int in remedies.get_child_count():
		var icon: TextureRect = remedies.get_child(i) as TextureRect
		if icon.visible:
			before += 1
		icon.visible = i < maximum
		icon.texture = remedy_full if i < count else remedy_empty
	if before != mini(maximum, remedies.get_child_count()):
		_layout_vitals()


func _on_interactable_changed(target: Interactable) -> void:
	_prompt_target = target
	markers.target = target


func _on_device_changed(_gamepad: bool) -> void:
	lessons.refresh_keys()
	_refresh_keys()

## Puts a control at `rect` in its parent's space by its anchors and offsets, so a right-to-left layout
## (Arabic) mirrors it whole instead of losing it off the edge.
static func _place(control: Control, rect: Rect2) -> void:
	control.set_anchors_preset(Control.PRESET_TOP_LEFT)
	control.offset_left = rect.position.x
	control.offset_top = rect.position.y
	control.offset_right = rect.end.x
	control.offset_bottom = rect.end.y
