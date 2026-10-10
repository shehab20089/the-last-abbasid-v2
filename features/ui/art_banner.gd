class_name ArtBanner
extends Control
## An Art's name flashed across the screen as it is spent: a band of ink with the name in gold and, above
## it, the name in Arabic, sliding in, held a moment, gone. Pure presentation, in real time (an Art slows
## the world while it shows).

const SLIDE: float = 0.12
const HOLD: float = 0.8
const FADE: float = 0.35
## Where the band sits (its middle, px from the top) and how tall it is.
const BAND_Y: float = 92.0
const BAND_HEIGHT: float = 46.0
const GOLD: Color = Color(1.0, 0.84, 0.42)
const PALE_GOLD: Color = Color(1.0, 0.92, 0.7)
const TITLE_FONT: Font = preload("res://assets/fonts/abbasid_title.tres")

var _left: float = 0.0
var _band: Control
var _words: VBoxContainer
var _strips: Array[TextureRect] = []
var _name: Label
var _arabic: Label


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	# Centred on the screen whichever way the language reads.
	layout_direction = Control.LAYOUT_DIRECTION_LTR
	_build()
	visible = false


## Flashes `display_name` (and `arabic` above it, when it says something the name does not).
func show_art(display_name: String, arabic: String) -> void:
	_name.text = display_name
	_arabic.text = arabic
	_arabic.visible = arabic != "" and arabic != display_name
	_left = SLIDE + HOLD + FADE
	visible = true
	modulate.a = 0.0
	_layout()


func _process(delta: float) -> void:
	if _left <= 0.0:
		return
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	_left -= real
	var elapsed: float = SLIDE + HOLD + FADE - _left
	var come: float = clampf(elapsed / SLIDE, 0.0, 1.0)
	modulate.a = come * clampf(_left / FADE, 0.0, 1.0)
	_band.position = Vector2(roundf(lerpf(-36.0, 0.0, come * come * (3.0 - 2.0 * come))), BAND_Y - BAND_HEIGHT * 0.5)
	if _left <= 0.0:
		visible = false


## The band across the whole screen at its height, its ink and lines as wide as the screen.
func _layout() -> void:
	var screen: Vector2 = get_viewport_rect().size
	position = Vector2.ZERO
	size = screen
	_band.size = Vector2(screen.x, BAND_HEIGHT)
	_band.position = Vector2(0.0, BAND_Y - BAND_HEIGHT * 0.5)
	for strip: TextureRect in _strips:
		strip.size = Vector2(screen.x, strip.size.y)
	# Size before place: right to left (Arabic) a control is mirrored by its size as it is placed.
	_words.size = _band.size
	_words.position = Vector2.ZERO


func _build() -> void:
	_band = Control.new()
	_band.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_band)
	# The ink: black across the middle of the screen, fading out toward its edges, a thin gold line along
	# each side of it.
	_strips = [_strip(Color(0.02, 0.015, 0.01, 0.78), 0.0, BAND_HEIGHT), _strip(Color(GOLD, 0.85), 0.0, 1.0),
		_strip(Color(GOLD, 0.85), BAND_HEIGHT - 1.0, 1.0)]
	for strip: TextureRect in _strips:
		_band.add_child(strip)
	_words = VBoxContainer.new()
	_words.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_words.alignment = BoxContainer.ALIGNMENT_CENTER
	_words.add_theme_constant_override(&"separation", 0)
	_band.add_child(_words)
	var words: VBoxContainer = _words
	_arabic = Label.new()
	_arabic.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_arabic.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_arabic.add_theme_color_override(&"font_color", PALE_GOLD)
	words.add_child(_arabic)
	_name = Label.new()
	_name.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
	_name.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_name.add_theme_font_override(&"font", TITLE_FONT)
	_name.add_theme_color_override(&"font_color", GOLD)
	_name.add_theme_color_override(&"font_shadow_color", Color(0.0, 0.0, 0.0, 0.9))
	_name.add_theme_constant_override(&"shadow_offset_x", 1)
	_name.add_theme_constant_override(&"shadow_offset_y", 1)
	words.add_child(_name)


## A strip `height` px tall at `top` across the band, `colour` in the middle and clear at both ends.
func _strip(colour: Color, top: float, height: float) -> TextureRect:
	var gradient: Gradient = Gradient.new()
	gradient.offsets = PackedFloat32Array([0.0, 0.22, 0.78, 1.0])
	gradient.colors = PackedColorArray([Color(colour, 0.0), colour, colour, Color(colour, 0.0)])
	var texture: GradientTexture2D = GradientTexture2D.new()
	texture.gradient = gradient
	texture.width = 64
	texture.height = 1
	var strip: TextureRect = TextureRect.new()
	strip.mouse_filter = Control.MOUSE_FILTER_IGNORE
	strip.texture = texture
	strip.stretch_mode = TextureRect.STRETCH_SCALE
	strip.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	strip.position = Vector2(0.0, top)
	strip.size = Vector2(640.0, height)
	return strip
