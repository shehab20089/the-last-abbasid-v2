class_name SoundDirector
extends Node
## Plays named sound cues. It carries no gameplay authority and knows no gameplay types: the
## session translates gameplay signals into cue names. Each cue has one player with a few voices,
## and a cue starts at most once per frame, so simultaneous hits cannot stack into a spike.

const VOICES_PER_CUE: int = 3

## Cue name to sound, authored in the scene. A cue that is an AudioStreamRandomizer plays one of
## its takes at random; any other sound gets the director's pitch spread.
@export var cues: Dictionary[StringName, AudioStream] = {}
## Cues that play on the Interface bus (menus); every other cue plays on Effects.
@export var interface_cues: Array[StringName] = []
@export_range(1.0, 1.5, 0.01) var random_pitch: float = 1.06

var _players: Dictionary[StringName, AudioStreamPlayer] = {}
var _started_frame: Dictionary[StringName, int] = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for cue: StringName in cues:
		var variation: AudioStreamRandomizer = cues[cue] as AudioStreamRandomizer
		if variation == null:
			variation = AudioStreamRandomizer.new()
			variation.add_stream(0, cues[cue])
			variation.random_pitch = random_pitch
		var player: AudioStreamPlayer = AudioStreamPlayer.new()
		player.name = String(cue)
		player.stream = variation
		player.max_polyphony = VOICES_PER_CUE
		player.bus = &"Effects" if not cue in interface_cues else &"Master"
		add_child(player)
		_players[cue] = player


func play(cue: StringName, volume_db: float = 0.0) -> void:
	if not _players.has(cue):
		return
	var frame: int = Engine.get_process_frames()
	if _started_frame.get(cue, -1) == frame:
		return
	_started_frame[cue] = frame
	_players[cue].volume_db = volume_db
	_players[cue].play()


func stop_all() -> void:
	for player: AudioStreamPlayer in _players.values():
		player.stop()


func has_cue(cue: StringName) -> bool:
	return _players.has(cue)
