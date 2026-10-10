class_name KeyCaps
extends RefCounted
## Buttons drawn as the player's own: a keyboard key as a small cap (bright letters on a dark plate with a
## pale rim and a lip under it), a pad's face button as a round face in its colour, a shoulder or a trigger
## as a rounded plate, a mouse button and a stick as plates of their own. Built as Labels for layouts
## (`make`) or drawn straight onto a canvas (`draw`). InputGlyphs says which cap an action has; this only
## draws them.

enum Kind {KEY, FACE, SHOULDER, MOUSE, STICK}

const FONT: Font = preload("res://assets/fonts/abbasid_body.fnt")
const FONT_SIZE: int = 9
const INK: Color = Color(1.0, 0.95, 0.82)
const PLATE: Color = Color(0.17, 0.12, 0.08)
const RIM: Color = Color(0.93, 0.82, 0.58)
## A pad's face buttons, by their letter or shape (the Xbox colours, which most pads on a PC follow, and the
## PlayStation shapes' own).
const FACES: Dictionary[String, Color] = {
	"A": Color(0.42, 0.74, 0.33), "B": Color(0.86, 0.33, 0.28), "X": Color(0.33, 0.52, 0.9),
	"Y": Color(0.9, 0.74, 0.26), "cross": Color(0.45, 0.6, 0.95), "circle": Color(0.92, 0.36, 0.36),
	"square": Color(0.86, 0.5, 0.8), "triangle": Color(0.36, 0.82, 0.7),
}
## The PlayStation face buttons are drawn as their shapes, not written.
const SHAPES: Array[String] = ["cross", "circle", "square", "triangle"]
const HEIGHT: float = 13.0

static var _styles: Dictionary[String, StyleBoxFlat] = {}


## A cap as a Control of its own size (for a row of buttons in a layout).
static func make(text: String, kind: Kind = Kind.KEY) -> Control:
	var cap: Control = Control.new()
	cap.custom_minimum_size = Vector2(width_of(text, kind), HEIGHT)
	cap.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	cap.mouse_filter = Control.MOUSE_FILTER_IGNORE
	cap.draw.connect(func() -> void: KeyCaps.draw(cap, Vector2.ZERO, text, kind))
	return cap


## Draws a cap with its top-left at `at` on `canvas`; returns its width.
static func draw(canvas: CanvasItem, at: Vector2, text: String, kind: Kind = Kind.KEY, alpha: float = 1.0) -> float:
	var width: float = width_of(text, kind)
	var box: StyleBoxFlat = style(text, kind)
	canvas.draw_style_box(box, Rect2(at, Vector2(width, HEIGHT)))
	var ink: Color = _ink(text, kind)
	ink.a *= alpha
	if text in SHAPES:
		_draw_shape(canvas, at + Vector2(width * 0.5, HEIGHT * 0.5 - 0.5), text, ink)
		return width
	var text_width: float = FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE).x
	var baseline: float = at.y + 9.0
	canvas.draw_string(FONT, Vector2(roundf(at.x + (width - text_width) * 0.5), baseline), text,
		HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE, ink)
	return width


## A PlayStation face button's shape, about `centre`.
static func _draw_shape(canvas: CanvasItem, centre: Vector2, shape: String, ink: Color) -> void:
	var c: Vector2 = centre.round()
	match shape:
		"cross":
			canvas.draw_line(c + Vector2(-3, -3), c + Vector2(3, 3), ink, 1.0)
			canvas.draw_line(c + Vector2(3, -3), c + Vector2(-3, 3), ink, 1.0)
		"circle":
			canvas.draw_arc(c, 3.0, 0.0, TAU, 16, ink, 1.0)
		"square":
			canvas.draw_rect(Rect2(c - Vector2(3, 3), Vector2(6, 6)), ink, false, 1.0)
		"triangle":
			canvas.draw_polyline(PackedVector2Array([c + Vector2(0, -3), c + Vector2(3.5, 3), c + Vector2(-3.5, 3),
				c + Vector2(0, -3)]), ink, 1.0)


## How wide a cap for `text` is.
static func width_of(text: String, kind: Kind = Kind.KEY) -> float:
	if kind == Kind.FACE:
		return HEIGHT
	var text_width: float = FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE).x
	return maxf(HEIGHT - 1.0, roundf(text_width) + 6.0)


## The plate a cap of this kind is drawn on.
static func style(text: String, kind: Kind) -> StyleBoxFlat:
	var id: String = "%d:%s" % [kind, text if kind == Kind.FACE else ""]
	if _styles.has(id):
		return _styles[id]
	var box: StyleBoxFlat = StyleBoxFlat.new()
	box.anti_aliasing = false
	box.bg_color = PLATE
	box.border_color = RIM
	box.set_border_width_all(1)
	box.border_width_bottom = 2
	box.set_corner_radius_all(2)
	box.content_margin_left = 3.0
	box.content_margin_right = 3.0
	box.content_margin_top = 0.0
	box.content_margin_bottom = 1.0
	match kind:
		Kind.FACE:
			var face: Color = FACES.get(text, RIM)
			box.bg_color = Color(0.1, 0.08, 0.07)
			box.border_color = face
			box.set_corner_radius_all(7)
			box.border_width_bottom = 1
		Kind.SHOULDER:
			box.bg_color = Color(0.13, 0.12, 0.13)
			box.border_color = Color(0.78, 0.76, 0.74)
			box.corner_radius_top_left = 5
			box.corner_radius_top_right = 5
		Kind.MOUSE:
			box.bg_color = Color(0.13, 0.12, 0.13)
			box.border_color = Color(0.82, 0.8, 0.76)
			box.set_corner_radius_all(4)
		Kind.STICK:
			box.bg_color = Color(0.13, 0.12, 0.13)
			box.border_color = Color(0.78, 0.76, 0.74)
			box.set_corner_radius_all(7)
	_styles[id] = box
	return box


static func _ink(text: String, kind: Kind) -> Color:
	if kind == Kind.FACE:
		var face: Color = FACES.get(text, INK)
		return face.lightened(0.25)
	return INK
