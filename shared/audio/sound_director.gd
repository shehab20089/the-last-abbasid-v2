class_name SoundDirector
extends Node
## Plays named sound cues. It carries no gameplay authority and knows no gameplay types: the
## session translates gameplay signals into cue names. A cue is heard where it happens when the caller
## says where (play_at: panned across the screen from the camera and softer further off, on a shared
## pool of positional voices), or plainly in both ears (play: the hero's own breath and heart, the
## stings, the interface). A cue starts at most once per frame, so simultaneous hits cannot stack
## into a spike. The place's acoustics (set_space) choose the room the world's sounds ring in.

const VOICES_PER_CUE: int = 3
## Positional voices shared by every cue played where it happens; the oldest gives way when all are busy.
const POSITIONAL_VOICES: int = 24
## A positional voice gives each ear half its level at the screen's centre; this makes that up, so a cue
## played where the hero stands is as loud as one played plainly.
const POSITIONAL_GAIN_DB: float = 6.0
## How far a positional sound leans to one ear at the screen's edge (with the project's 2D panning).
const PANNING: float = 1.6
## How far off (px) a sound is still heard, and how steeply it fades on the way (1: evenly).
const HEARING: float = 1400.0
const FALLOFF: float = 1.0
## The rooms the world's sounds ring in, by a level's acoustics: [room size, damping, wet, pre-delay ms,
## high-pass]: an open street between houses, narrow burnt alleys, the college's courtyards and halls,
## the stone canyon of the city wall.
const SPACES: Dictionary[StringName, Array] = {
	&"street": [0.42, 0.55, 0.1, 28.0, 0.2],
	&"alleys": [0.5, 0.5, 0.12, 22.0, 0.2],
	&"court": [0.64, 0.42, 0.14, 38.0, 0.2],
	&"walls": [0.74, 0.36, 0.16, 62.0, 0.25],
}

## Cue name to sound, authored in the scene. A cue that is an AudioStreamRandomizer plays one of
## its takes at random (never the same twice running); any other sound gets the director's pitch spread.
@export var cues: Dictionary[StringName, AudioStream] = {}
## Cues that play on the Interface bus (menus, lessons, honour), dry and in both ears; every other
## cue plays on Effects, in the place's room.
@export var interface_cues: Array[StringName] = []
@export_range(1.0, 1.5, 0.01) var random_pitch: float = 1.06

var _streams: Dictionary[StringName, AudioStream] = {}
var _players: Dictionary[StringName, AudioStreamPlayer] = {}
var _voices: Array[AudioStreamPlayer2D] = []
var _voice_started: Array[int] = []
var _started_frame: Dictionary[StringName, int] = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for cue: StringName in cues:
		var variation: AudioStreamRandomizer = cues[cue] as AudioStreamRandomizer
		if variation == null:
			variation = AudioStreamRandomizer.new()
			variation.add_stream(0, cues[cue])
			variation.random_pitch = random_pitch
		_streams[cue] = variation
		var player: AudioStreamPlayer = AudioStreamPlayer.new()
		player.name = String(cue)
		player.stream = variation
		player.max_polyphony = VOICES_PER_CUE
		player.bus = &"Interface" if cue in interface_cues else &"Effects"
		add_child(player)
		_players[cue] = player
	for i: int in POSITIONAL_VOICES:
		var voice: AudioStreamPlayer2D = AudioStreamPlayer2D.new()
		voice.name = "Voice%d" % i
		voice.bus = &"Effects"
		voice.panning_strength = PANNING
		add_child(voice)
		_voices.append(voice)
		_voice_started.append(0)


## Plays a cue in both ears.
func play(cue: StringName, volume_db: float = 0.0) -> void:
	if not _players.has(cue) or not _first_this_frame(cue):
		return
	_players[cue].volume_db = volume_db
	_players[cue].play()


## Plays a cue where it happens in the world: panned toward its side of the screen and softer the further
## off it is (`reach` px away it is gone; `falloff` 0 keeps it whole to there, for a warning, which must be heard).
func play_at(cue: StringName, at: Vector2, volume_db: float = 0.0, reach: float = HEARING,
		falloff: float = FALLOFF) -> void:
	if not _streams.has(cue) or not _first_this_frame(cue):
		return
	if cue in interface_cues:
		play(cue, volume_db)
		return
	var voice: AudioStreamPlayer2D = _free_voice()
	voice.stream = _streams[cue]
	voice.global_position = at
	voice.volume_db = volume_db + POSITIONAL_GAIN_DB
	voice.max_distance = reach
	voice.attenuation = falloff
	voice.play()


## The room the world's sounds ring in (a level's acoustics; see SPACES).
func set_space(space: StringName) -> void:
	var settings: Array = SPACES.get(space, SPACES[&"street"])
	var bus: int = AudioServer.get_bus_index(&"Effects")
	for i: int in AudioServer.get_bus_effect_count(bus):
		var reverb: AudioEffectReverb = AudioServer.get_bus_effect(bus, i) as AudioEffectReverb
		if reverb == null:
			continue
		var room: float = settings[0]
		var damping: float = settings[1]
		var wet: float = settings[2]
		var predelay: float = settings[3]
		var hipass: float = settings[4]
		reverb.room_size = room
		reverb.damping = damping
		reverb.wet = wet
		reverb.predelay_msec = predelay
		reverb.hipass = hipass


func stop_all() -> void:
	for player: AudioStreamPlayer in _players.values():
		player.stop()
	for voice: AudioStreamPlayer2D in _voices:
		voice.stop()


func has_cue(cue: StringName) -> bool:
	return _streams.has(cue)


func _first_this_frame(cue: StringName) -> bool:
	var frame: int = Engine.get_process_frames()
	if _started_frame.get(cue, -1) == frame:
		return false
	_started_frame[cue] = frame
	return true


## A positional voice to sound with: a quiet one, or else the one that has been sounding longest.
func _free_voice() -> AudioStreamPlayer2D:
	var oldest: int = 0
	for i: int in _voices.size():
		if not _voices[i].playing:
			oldest = i
			break
		if _voice_started[i] < _voice_started[oldest]:
			oldest = i
	_voice_started[oldest] = Time.get_ticks_msec()
	return _voices[oldest]
