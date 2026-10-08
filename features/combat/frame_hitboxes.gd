@tool
class_name FrameHitboxes
extends Resource
## The sword's swept area on each frame of each animation, generated with the sprites
## (tools/asset_generation), so a hitbox matches exactly what the blade draws. Points are in body
## space facing right: x forward, y down, origin at the feet.

## Animation name to an Array of PackedVector2Array, one convex polygon per frame (empty when the
## blade sweeps nothing on that frame).
@export var sweeps: Dictionary = {}
## Animation name to an Array of PackedVector2Array [hilt, tip] per frame (empty when unarmed).
@export var blades: Dictionary = {}


## The blade's swept polygon on a frame, facing right, or an empty array.
func sweep(animation: StringName, frame: int) -> PackedVector2Array:
	if not sweeps.has(animation):
		return PackedVector2Array()
	var frames: Array = sweeps[animation]
	if frame < 0 or frame >= frames.size():
		return PackedVector2Array()
	var polygon: PackedVector2Array = frames[frame]
	return polygon


## The blade's tip on a frame, facing right; Vector2.INF when unknown.
func tip(animation: StringName, frame: int) -> Vector2:
	if not blades.has(animation):
		return Vector2.INF
	var frames: Array = blades[animation]
	if frame < 0 or frame >= frames.size():
		return Vector2.INF
	var segment: PackedVector2Array = frames[frame]
	return segment[1] if segment.size() == 2 else Vector2.INF


## The blade on a frame, facing right: [hilt, tip], or an empty array when unarmed or unknown.
func blade(animation: StringName, frame: int) -> PackedVector2Array:
	if not blades.has(animation):
		return PackedVector2Array()
	var frames: Array = blades[animation]
	if frame < 0 or frame >= frames.size():
		return PackedVector2Array()
	var segment: PackedVector2Array = frames[frame]
	return segment
