class_name GoreSet
extends Resource
## A soldier's gore, generated with his sprites (tools/asset_generation/build_characters.mjs): the
## pieces a killing blow can cut from him, drawn tumbling, and where each way of falling bleeds.
## Positions are in body space facing right: x forward, y down, origin at the feet.

## Each piece's tumble: an animation per piece (head, arm, leg, upper, spear), one frame per turn.
@export var pieces: SpriteFrames
## Piece name to a PackedFloat32Array: how far below the piece's centre each frame's lowest pixel
## lies (the frame rests on the ground at that height).
@export var piece_bottoms: Dictionary = {}
## Piece name to the Vector2 where it leaves the body.
@export var piece_origins: Dictionary = {}
## Cut (head, arm, leg, waist) to the PackedStringArray of pieces it throws off.
@export var cut_pieces: Dictionary = {}
## Death animation (death_head...) to a PackedVector2Array: the wound on every frame.
@export var wounds: Dictionary = {}


func pieces_of(cut: StringName) -> PackedStringArray:
	if not cut_pieces.has(cut):
		return PackedStringArray()
	var names: PackedStringArray = cut_pieces[cut]
	return names


func origin(piece: StringName) -> Vector2:
	if not piece_origins.has(piece):
		return Vector2(0, -48)
	var at: Vector2 = piece_origins[piece]
	return at


func bottoms(piece: StringName) -> PackedFloat32Array:
	if not piece_bottoms.has(piece):
		return PackedFloat32Array()
	var values: PackedFloat32Array = piece_bottoms[piece]
	return values


## The wound on a frame of a death animation, or Vector2.INF when that fall has none.
func wound(animation: StringName, frame: int) -> Vector2:
	if not wounds.has(animation):
		return Vector2.INF
	var points: PackedVector2Array = wounds[animation]
	if frame < 0 or frame >= points.size():
		return Vector2.INF
	return points[frame]
