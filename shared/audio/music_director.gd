class_name MusicDirector
extends Node
## Plays one music track and one ambience bed at a time, crossfading when either changes. Tracks
## are named in the scene; the session asks for them by name. The music gives way to the fighting by
## itself (a compressor on its bus listens to the effects) and bows out for a moment when asked (duck).

@export var tracks: Dictionary[StringName, AudioStream] = {}
@export var beds: Dictionary[StringName, AudioStream] = {}
@export var fade_time: float = 1.6

var _music: Array[AudioStreamPlayer] = []
var _ambience: Array[AudioStreamPlayer] = []
var _current_music: StringName = &""
var _current_bed: StringName = &""
var _duck: Tween


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i: int in 2:
		_music.append(_player(&"Music"))
		_ambience.append(_player(&"Ambience"))


func play_music(track: StringName) -> void:
	if track == _current_music:
		return
	_current_music = track
	var stream: AudioStream = null
	if tracks.has(track):
		stream = tracks[track]
	_crossfade(_music, stream)


func play_ambience(bed: StringName) -> void:
	if bed == _current_bed:
		return
	_current_bed = bed
	var stream: AudioStream = null
	if beds.has(bed):
		stream = beds[bed]
	_crossfade(_ambience, stream)


func stop() -> void:
	play_music(&"")
	play_ambience(&"")


## The music lowered `db` for a moment (a finisher, an Art, the Captain's roar, a death): down at once, held
## `hold` seconds, back over `fade`, in real time whatever the game's pace. A deeper duck under way is kept.
func duck(db: float, hold: float, fade: float = 1.0) -> void:
	var bus: int = AudioServer.get_bus_index(&"Music")
	if bus < 0:
		return
	var amplify: AudioEffectAmplify = null
	for i: int in AudioServer.get_bus_effect_count(bus):
		if AudioServer.get_bus_effect(bus, i) is AudioEffectAmplify:
			amplify = AudioServer.get_bus_effect(bus, i) as AudioEffectAmplify
	if amplify == null:
		return
	if _duck != null and _duck.is_running():
		_duck.kill()
	_duck = create_tween()
	_duck.set_ignore_time_scale(true)
	_duck.tween_property(amplify, "volume_db", minf(db, amplify.volume_db), 0.08)
	_duck.tween_interval(hold)
	_duck.tween_property(amplify, "volume_db", 0.0, fade)


func _player(bus: StringName) -> AudioStreamPlayer:
	var player: AudioStreamPlayer = AudioStreamPlayer.new()
	player.bus = bus
	player.volume_db = -80.0
	add_child(player)
	return player


func _crossfade(pair: Array[AudioStreamPlayer], stream: AudioStream) -> void:
	var outgoing: AudioStreamPlayer = pair[0]
	var incoming: AudioStreamPlayer = pair[1]
	pair.reverse()
	if outgoing.playing:
		var fade_out: Tween = create_tween()
		fade_out.tween_property(outgoing, "volume_db", -80.0, fade_time)
		fade_out.tween_callback(outgoing.stop)
	if stream == null:
		return
	incoming.stream = stream
	incoming.volume_db = -40.0
	incoming.play()
	var fade_in: Tween = create_tween()
	fade_in.tween_property(incoming, "volume_db", 0.0, fade_time)
