class_name WorldMarkers
extends Control
## Signs drawn over the world, where the eyes are. Over a person with something new to say, a speech sign (a
## gold one with a mark when the objective is to speak with them), and their name as the hero comes near; over
## a lamp not yet lit, its sign and the word for it; over whatever else the objective points to, its star, or,
## when it is off the screen, an arrow at the screen's edge with its name and how far it is (bright for a while
## when the objective changes, faint after); over what the hero can use now, its button and what it does; over
## a soldier open to a finisher, the heavy button. The signs of the street step back while he fights. Pure
## presentation: the session gives it the hero, the level and the objective's target.

const TALK: Texture2D = preload("res://assets/ui/marker_talk.png")
const STORY: Texture2D = preload("res://assets/ui/marker_story.png")
const LAMP: Texture2D = preload("res://assets/ui/marker_lamp.png")
const STAR: Texture2D = preload("res://assets/ui/marker_objective.png")
const ARROW: Texture2D = preload("res://assets/ui/marker_arrow.png")
const FONT: Font = preload("res://assets/fonts/abbasid_text.tres")
const FONT_SIZE: int = 12
## How near (px along the street) a person's sign shows, a lamp's, a name.
const SIGN_RANGE: float = 360.0
const LAMP_RANGE: float = 320.0
const NAME_RANGE: float = 120.0
## The arrow's distance from the screen's edge, and its height on the screen (over the street's signs, under the
## news at the top).
const EDGE: float = 5.0
const ARROW_Y: float = 176.0
## Pixels of street to a metre (the distance written by the arrow).
const PIXELS_PER_METRE: float = 32.0
## How long the arrow stays bright after the objective changes (real s), and how faint it is after.
const BRIGHT_TIME: float = 7.0
const FAINT: float = 0.5
## How high over a soldier's feet the finisher's button and an elite's bar hang.
const SOLDIER_HEAD: float = 78.0
## An elite soldier's bar, once he is struck: its width, and its colours.
const ELITE_BAR: float = 36.0
const ELITE_FILL: Color = Color(0.78, 0.16, 0.12)
const ELITE_BACK: Color = Color(0.06, 0.03, 0.03, 0.85)
const ELITE_NAME: Color = Color(0.92, 0.78, 0.6)
## The ring by his head when breath runs out: how long it shows, its colours.
const REFUSED_TIME: float = 0.9
const BREATH_COLOR: Color = Color(0.35, 0.78, 0.7)
const REFUSED_COLOR: Color = Color(1.0, 0.32, 0.25)
## The ring over a captive under the sabre.
const EXECUTION_COLOR: Color = Color(0.92, 0.22, 0.14)
const NAME_COLOR: Color = Color(1.0, 0.86, 0.52)
const PROMPT_COLOR: Color = Color(1.0, 0.95, 0.84)
const LAMP_COLOR: Color = Color(1.0, 0.76, 0.42)
const FAR_COLOR: Color = Color(0.92, 0.88, 0.8)
const SHADOW: Color = Color(0.03, 0.02, 0.02, 0.95)
const PLATE: Color = Color(0.03, 0.025, 0.03, 0.8)

var hero: Warrior
var level: Level
var glyphs: InputGlyphs
## What the interact button would use now (its prompt is drawn over it), or null.
var target: Interactable
## A soldier open to a finisher (the heavy button is drawn over him), or null.
var finisher: Combatant
## Where the objective points: a node, or else a place in the world (INF: nowhere), and its name (translated).
var objective_node: Node2D
var objective_point: Vector2 = Vector2.INF
var objective_name: String = ""
## Set by the session: a soldier near the hero is in the fight (the street's signs step back).
var fighting: bool = false
## While a menu or a conversation is open nothing is drawn.
var suspended: bool = false
var _time: float = 0.0
var _refused: float = 0.0
var _bright: float = BRIGHT_TIME
var _calm: float = 1.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	# It follows the world on the screen; a right-to-left layout must not mirror it.
	layout_direction = Control.LAYOUT_DIRECTION_LTR
	set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)


## The objective changed (or he rested): its arrow shines for a while.
func point_out() -> void:
	_bright = BRIGHT_TIME


## He asked for what his breath could not pay for: a ring by his head, empty and red, fills as it comes back.
func breath_refused() -> void:
	_refused = REFUSED_TIME


## Whether the objective is marked now, and how: &"sign" over it on the screen, &"arrow" at the edge, or &"".
func objective_mark() -> StringName:
	var at: Vector2 = _objective_feet()
	if at == Vector2.INF or hero == null:
		return &""
	var screen: Vector2 = get_viewport_rect().size
	return &"sign" if at.x >= 0.0 and at.x <= screen.x else &"arrow"


func _process(delta: float) -> void:
	var real: float = delta / maxf(Engine.time_scale, 0.001)
	_time += real
	_bright = maxf(0.0, _bright - real)
	_refused = maxf(0.0, _refused - real)
	_calm = move_toward(_calm, 0.0 if fighting else 1.0, real * 4.0)
	queue_redraw()


func _draw() -> void:
	if suspended or get_tree().paused or hero == null or not is_instance_valid(hero) or level == null:
		return
	var bob: float = roundf(sin(_time * 3.4))
	for node: Node in level.interactables.get_children():
		var thing: Interactable = node as Interactable
		if thing == null or not thing.visible or not thing.is_inside_tree() or thing.is_queued_for_deletion():
			continue
		_draw_over(thing, bob)
	# The objective, when it is not one of the things above (a place, a soldier), or off the screen.
	var objective: Interactable = objective_node as Interactable
	var feet: Vector2 = _objective_feet()
	if feet != Vector2.INF:
		var screen: Vector2 = get_viewport_rect().size
		if feet.x < 0.0 or feet.x > screen.x:
			_draw_arrow(feet)
		elif objective == null or objective.get_parent() != level.interactables:
			var head: float = feet.y - (SOLDIER_HEAD if objective_node != null else 40.0)
			_draw_sign(STAR, Vector2(feet.x, head + bob), _calm)
	_draw_elites()
	_draw_executions()
	if _refused > 0.0:
		_draw_breath()
	if finisher != null and is_instance_valid(finisher) and not finisher.dead:
		var at: Vector2 = finisher.get_global_transform_with_canvas().origin + Vector2(0.0, -SOLDIER_HEAD)
		_draw_prompt(at, _caps(&"heavy_attack"), tr("PROMPT_FINISH"))


## A person, a lamp, a gate, a page: its prompt when it is the one at hand, its name as he comes near, its sign.
func _draw_over(thing: Interactable, bob: float) -> void:
	var feet: Vector2 = thing.get_global_transform_with_canvas().origin
	var near: float = absf(thing.global_position.x - hero.global_position.x)
	var at_hand: bool = thing == target and thing.enabled
	var y: float = feet.y - thing.marker_height()
	if at_hand:
		y = _draw_prompt(Vector2(feet.x, y), _caps(&"interact"), tr(thing.prompt)) - 1.0
	var name_key: String = thing.display_name()
	if name_key != "" and (near < NAME_RANGE or at_hand):
		y = _draw_label(Vector2(feet.x, y), tr(name_key), NAME_COLOR, 1.0) - 1.0
	if at_hand:
		return
	var npc: Npc = thing as Npc
	var lamp: Checkpoint = thing as Checkpoint
	if thing == objective_node:
		_draw_sign(STORY if npc != null else STAR, Vector2(feet.x, y + bob), maxf(_calm, 0.6))
	elif npc != null and npc.has_news() and near < SIGN_RANGE:
		_draw_sign(TALK, Vector2(feet.x, y + bob), _calm)
	elif lamp != null and not lamp.lit and near < LAMP_RANGE:
		var top: float = _draw_sign(LAMP, Vector2(feet.x, y + bob), _calm)
		_draw_label(Vector2(feet.x, top - 1.0), tr("MARKER_LAMP"), LAMP_COLOR, _calm)


## Draws a sign standing on `bottom` (its centre); returns its top.
func _draw_sign(texture: Texture2D, bottom: Vector2, alpha: float) -> float:
	if alpha <= 0.0:
		return bottom.y
	var at: Vector2 = Vector2(roundf(bottom.x - texture.get_width() * 0.5), roundf(bottom.y - texture.get_height()))
	draw_texture(texture, at, Color(1.0, 1.0, 1.0, alpha))
	return at.y


## Draws a line of text standing on `bottom` (its centre), shadowed; returns its top.
func _draw_label(bottom: Vector2, text: String, color: Color, alpha: float) -> float:
	if alpha <= 0.0 or text == "":
		return bottom.y
	var width: float = FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE).x
	var baseline: Vector2 = Vector2(roundf(bottom.x - width * 0.5), roundf(bottom.y - 3.0))
	var shade: Color = SHADOW
	shade.a *= alpha
	var ink: Color = color
	ink.a *= alpha
	draw_string(FONT, baseline + Vector2(1.0, 1.0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE, shade)
	draw_string(FONT, baseline, text, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE, ink)
	return bottom.y - 12.0


## Draws the buttons and what they do on a dark plate standing on `bottom` (its centre); returns its top.
func _draw_prompt(bottom: Vector2, caps: Array[Array], verb: String) -> float:
	var widths: float = 0.0
	for cap: Array in caps:
		var text: String = cap[0]
		var kind: KeyCaps.Kind = cap[1]
		widths += KeyCaps.width_of(text, kind) + 1.0
	var verb_width: float = FONT.get_string_size(verb, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE).x
	var width: float = widths + 3.0 + verb_width
	var height: float = KeyCaps.HEIGHT + 4.0
	var left: float = roundf(bottom.x - width * 0.5)
	var top: float = roundf(bottom.y - height)
	draw_rect(Rect2(left - 3.0, top, width + 6.0, height), PLATE)
	# Right to left (Arabic) the button stands to the right of the words, read first, as it is in English on the left.
	var rtl: bool = TextServerManager.get_primary_interface().is_locale_right_to_left(TranslationServer.get_locale())
	var x: float = left + (verb_width + 3.0 if rtl else 0.0)
	for cap: Array in caps:
		var text: String = cap[0]
		var kind: KeyCaps.Kind = cap[1]
		x += KeyCaps.draw(self, Vector2(x, top + 2.0), text, kind) + 1.0
	var words: float = left if rtl else x + 3.0
	draw_string(FONT, Vector2(words + 1.0, top + 13.0), verb, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE, SHADOW)
	draw_string(FONT, Vector2(words, top + 12.0), verb, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE, PROMPT_COLOR)
	return top


## The arrow at the screen's edge toward an objective off the screen, with its name and distance.
func _draw_arrow(feet: Vector2) -> void:
	var alpha: float = clampf(maxf(FAINT, minf(1.0, _bright)), 0.0, 1.0) * _calm
	if alpha <= 0.0:
		return
	var screen: Vector2 = get_viewport_rect().size
	var right: bool = feet.x > screen.x
	var y: float = ARROW_Y
	var size: Vector2 = ARROW.get_size()
	var x: float = screen.x - EDGE - size.x if right else EDGE
	var nudge: float = roundf(sin(_time * 5.0) * 1.0) if _bright > 0.0 else 0.0
	x += nudge if right else -nudge
	var tint: Color = Color(1.0, 1.0, 1.0, alpha)
	if right:
		draw_texture(ARROW, Vector2(x, roundf(y - size.y * 0.5)), tint)
	else:
		draw_texture_rect(ARROW, Rect2(x + size.x, roundf(y - size.y * 0.5), -size.x, size.y), false, tint)
	var metres: int = ceili(absf(_objective_world().x - hero.global_position.x) / PIXELS_PER_METRE)
	var distance: String = tr("MARKER_DISTANCE") % metres
	var lines: Array[String] = [objective_name, distance]
	var colors: Array[Color] = [NAME_COLOR, FAR_COLOR]
	for i: int in lines.size():
		var text: String = lines[i]
		var width: float = FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE).x
		var tx: float = x - 3.0 - width if right else x + size.x + 3.0
		var baseline: Vector2 = Vector2(roundf(tx), roundf(y - 3.0 + i * 12.0))
		var shade: Color = SHADOW
		shade.a *= alpha
		var ink: Color = colors[i]
		ink.a *= alpha
		draw_string(FONT, baseline + Vector2(1.0, 1.0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE, shade)
		draw_string(FONT, baseline, text, HORIZONTAL_ALIGNMENT_LEFT, -1, FONT_SIZE, ink)


## Over a captive under a headsman's sabre, once the headsman's count has begun: a ring that empties as it runs
## (it beats faster at the last), so the execution reads as a hurry.
func _draw_executions() -> void:
	if level.people == null:
		return
	for soldier: MongolSoldier in level.soldiers():
		var victim: StringName = soldier.get_meta(&"victim", &"")
		if victim == &"" or soldier.dead:
			continue
		var brain: EnemyBrain = soldier.get_node_or_null(^"Brain") as EnemyBrain
		var captive: Node2D = level.people.get_node_or_null(NodePath(String(victim))) as Node2D
		if brain == null or captive == null:
			continue
		var left: float = brain.execution_left()
		if left < 0.0:
			continue
		var at: Vector2 = captive.get_global_transform_with_canvas().origin + Vector2(0.0, -62.0)
		var beat: float = 0.5 + 0.5 * sin(_time * lerpf(18.0, 6.0, left))
		draw_arc(at, 7.0, 0.0, TAU, 24, Color(0.04, 0.02, 0.02, 0.85), 4.0)
		draw_arc(at, 7.0, -PI * 0.5, -PI * 0.5 + TAU * left, 24, EXECUTION_COLOR.lerp(Color(1.0, 0.9, 0.7), beat * 0.35), 2.0)


## Over each elite soldier once he is struck: his name and how much of him is left.
func _draw_elites() -> void:
	var screen: Vector2 = get_viewport_rect().size
	for soldier: MongolSoldier in level.soldiers():
		if soldier.dead or not soldier.visible or not soldier.profile.elite or soldier.health >= soldier.max_health:
			continue
		var feet: Vector2 = soldier.get_global_transform_with_canvas().origin
		if feet.x < -ELITE_BAR or feet.x > screen.x + ELITE_BAR:
			continue
		var left: float = roundf(feet.x - ELITE_BAR * 0.5)
		var top: float = roundf(feet.y - SOLDIER_HEAD - 2.0)
		draw_rect(Rect2(left - 1.0, top - 1.0, ELITE_BAR + 2.0, 5.0), ELITE_BACK)
		draw_rect(Rect2(left, top, roundf(ELITE_BAR * clampf(soldier.health / soldier.max_health, 0.0, 1.0)), 3.0), ELITE_FILL)
		_draw_label(Vector2(feet.x, top - 2.0), tr(soldier.profile.display_name), ELITE_NAME, 0.9)


## The ring by his head: his breath, empty and red when it ran out, filling as it comes back.
func _draw_breath() -> void:
	var at: Vector2 = hero.get_global_transform_with_canvas().origin + Vector2(-hero.facing * 16.0, -78.0)
	var fade: float = minf(1.0, _refused * 3.0)
	var left: float = clampf(hero.stamina / maxf(hero.profile.max_stamina, 1.0), 0.0, 1.0)
	var pulse: float = 0.5 + 0.5 * sin(_time * 22.0)
	draw_arc(at, 6.0, 0.0, TAU, 20, Color(0.04, 0.03, 0.03, 0.8 * fade), 3.0)
	if left > 0.0:
		draw_arc(at, 6.0, -PI * 0.5, -PI * 0.5 + TAU * left, 20, Color(BREATH_COLOR, fade), 2.0)
	draw_arc(at, 8.0, 0.0, TAU, 24, Color(REFUSED_COLOR, fade * (0.4 + 0.6 * pulse)), 1.0)


## The caps of an action's button on the device in use.
func _caps(action: StringName) -> Array[Array]:
	if glyphs == null:
		var none: Array[Array] = []
		return none
	return glyphs.caps(action)


## Where the objective stands in the world (its feet), or INF.
func _objective_world() -> Vector2:
	if objective_node != null and is_instance_valid(objective_node) and objective_node.is_inside_tree():
		return objective_node.global_position
	return objective_point


## Where the objective stands on the screen (its feet), or INF.
func _objective_feet() -> Vector2:
	var world: Vector2 = _objective_world()
	if world == Vector2.INF or not is_inside_tree():
		return Vector2.INF
	return get_viewport().get_canvas_transform() * world
