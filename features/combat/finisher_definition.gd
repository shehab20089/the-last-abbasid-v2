class_name FinisherDefinition
extends Resource
## A scripted kill on a staggered soldier: the hero's animation and the soldier's, played
## frame-locked with the soldier `distance` px before the hero, and what each frame does to him.
## Generated with the sprites from tools/asset_generation/characters/finisher_timing.mjs.

@export var display_name: String = "Finisher"
@export var hero_animation: StringName = &""
@export var victim_animation: StringName = &""
@export var distance: float = 34.0
## Frames of the hero's animation on which a cut falls, and what each cuts off (parallel arrays).
@export var cut_frames: PackedInt32Array = PackedInt32Array()
@export var cuts: Array[StringName] = []
## Frames on which the blade bursts blood out of him without cutting anything off (a thrust).
@export var burst_frames: PackedInt32Array = PackedInt32Array()
## Frames over which time runs slow.
@export var slow_from: int = -1
@export var slow_to: int = -1
## The frame on which he dies (the rest is his body coming to rest).
@export var death_frame: int = 0


## What a frame cuts off, or nothing.
func cut_on(frame: int) -> StringName:
	var i: int = cut_frames.find(frame)
	return cuts[i] if i >= 0 and i < cuts.size() else &""
