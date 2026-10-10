class_name CinematicShot
extends Resource
## One shot of a cinematic: a painting seen through a moving camera, with depth, life and words. Generated
## by tools/cinematics/build_cinematics.mjs from tools/cinematics/<cinematic>.mjs; read-only at runtime.
## Rects and points are in the painting's own pixels (the concept painting before it was cropped).

## The painting (cropped to `painting_rect`), its depth (red: 0 far, 1 near) and its masks (red: fire, green:
## water, blue: cloth that sways, alpha: what drifts). Null for a shot over black.
@export var painting: Texture2D
@export var depth: Texture2D
@export var masks: Texture2D
## Where the stored painting lies in the original painting.
@export var painting_rect: Rect2 = Rect2()
## The shot's palette as a colour lookup (64 levels a channel, blue in 8 x 8 tiles of 64 x 64).
@export var palette: Texture2D

## The camera: rects in painting pixels at times through the shot (0 to 1), eased between.
@export var camera_keys: Array[Rect2] = []
@export var camera_times: PackedFloat32Array = PackedFloat32Array()
## When in the shot every depth lines up as painted (0 to 1); away from it near things move more.
@export var reference: float = 0.5
@export var parallax: float = 0.5
## The grade at the start and at the end: saturation, contrast, exposure, tint red, green, blue.
@export var grade_from: PackedFloat32Array = PackedFloat32Array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0])
@export var grade_to: PackedFloat32Array = PackedFloat32Array([1.0, 1.0, 1.0, 1.0, 1.0, 1.0])

## Words: the place and date in the top bar, the lines one after another in the bottom bar, a title over the
## picture (the opening's last shot), and whether the card's heading closes the shot (the next level's name).
@export var caption: String = ""
@export var lines: PackedStringArray = PackedStringArray()
@export var title: String = ""
@export var heading: bool = false
## Seconds before the first line, after the last, and at the least.
@export var lead: float = 1.0
@export var tail: float = 1.0
@export var minimum: float = 5.0
## How it begins and ends: crossfading from the shot before, from black, to black.
@export var dissolve: float = 0.0
@export var fade_in: float = 0.0
@export var fade_out: float = 0.0

## Life: how much the fire flickers, the water ripples, the cloth sways; how far what drifts moves (painting
## pixels over the shot); smoke over an area; particles; birds.
@export var fire: float = 0.0
@export var water: float = 0.0
@export var sway: float = 0.0
@export var drift: Vector2 = Vector2.ZERO
@export var smoke: float = 0.0
@export var smoke_area: Rect2 = Rect2()
@export var embers: int = 0
@export var ash: int = 0
@export var snow: int = 0
@export var motes: int = 0
@export var birds: int = 0
## Stones striking: where each strikes, and when (0 to 1): a burst of dust and a shake.
@export var impact_points: PackedVector2Array = PackedVector2Array()
@export var impact_times: PackedFloat32Array = PackedFloat32Array()

## Sound: the ambience bed for the shot, and cues at times (0 to 1).
@export var ambience: StringName = &""
@export var cue_names: Array[StringName] = []
@export var cue_times: PackedFloat32Array = PackedFloat32Array()

## A map drawn in ink (the opening): its ink (colour and alpha) and its times (red: when each stroke appears,
## green: when the spreading ink reaches it, blue: when the road reaches it), laid over `map_rect`.
@export var map_ink: Texture2D
@export var map_times: Texture2D
@export var map_rect: Rect2 = Rect2()
## Names on the map: their keys, points (painting pixels) and when each appears (the phase, 0 as the shot
## opens and 1 + n through line n, plus how far through it).
@export var map_labels: PackedStringArray = PackedStringArray()
@export var map_points: PackedVector2Array = PackedVector2Array()
@export var map_phases: PackedFloat32Array = PackedFloat32Array()
## The line the spreading ink follows and the line the road follows (0 the first), and how far the ink has
## spread as the shot opens (1: it lies everywhere already).
@export var wash_line: int = 0
@export var route_line: int = 1
@export var ink_from: float = 0.0


## The camera's rect at `u` (0 to 1 through the shot), eased between keys.
func camera_at(u: float) -> Rect2:
	if camera_keys.is_empty():
		return painting_rect
	if camera_keys.size() == 1 or u <= camera_times[0]:
		return camera_keys[0]
	for i: int in range(1, camera_keys.size()):
		if u <= camera_times[i]:
			var span: float = maxf(0.0001, camera_times[i] - camera_times[i - 1])
			var t: float = clampf((u - camera_times[i - 1]) / span, 0.0, 1.0)
			# Eased in and out, like a camera on a dolly.
			t = t * t * (3.0 - 2.0 * t)
			var a: Rect2 = camera_keys[i - 1]
			var b: Rect2 = camera_keys[i]
			return Rect2(a.position.lerp(b.position, t), a.size.lerp(b.size, t))
	return camera_keys[camera_keys.size() - 1]


## The grade at `u`: saturation, contrast, exposure, tint.
func grade_at(u: float) -> PackedFloat32Array:
	var out: PackedFloat32Array = PackedFloat32Array()
	for i: int in 6:
		out.append(lerpf(grade_from[i], grade_to[i], u))
	return out
