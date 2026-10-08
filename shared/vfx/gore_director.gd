class_name GoreDirector
extends Node2D
## The gore of a fight: the pieces a killing blow cuts from a man, thrown and tumbling; blood pumping
## from his wound as he falls; pools spreading beneath the dead; drops flung by every blow, marking
## the street where they land. Purely visual: it decides nothing and knows no gameplay types (the
## session hands it bodies, their sprites and their GoreSets). Pieces fly in this node, in front of
## the living; pools and splats lie on the ground layer the session gives it, behind them. Reduced
## gore (the setting) keeps the blood of blows and drops the rest.

const MAX_PIECES: int = 64
const MAX_MARKS: int = 140
const POOLS: Array[StringName] = [&"blood_pool_a", &"blood_pool_b", &"blood_pool_c", &"blood_pool_d"]
const GIBS: Array[StringName] = [&"gib_a", &"gib_b", &"gib_c"]
## Chunks of flesh a cut throws, and how many more a cut through the waist throws.
const GIBS_PER_CUT: int = 7
const GIBS_FOR_WAIST: int = 6
## A dark-red mist where a limb parts.
const MIST: Color = Color(0.55, 0.06, 0.05, 0.85)

## A piece struck the ground (the session gives it a sound).
signal piece_landed(at: Vector2)

## The effect frames: the gush, pools and splats.
@export var frames: SpriteFrames
## A drop of blood, for particles.
@export var drop: Texture2D

## Full gore (pieces, fountains, pools) or reduced.
var full: bool = true
var _ground: Node2D
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()


func _ready() -> void:
	_rng.seed = 1258


## Where pools and splats go: a layer of the level drawn behind the living (its props).
func set_ground_layer(layer: Node2D) -> void:
	_ground = layer


func clear() -> void:
	for child: Node in get_children():
		child.queue_free()
	_ground = null


## A man cut down: each piece the cut took is thrown from where it was on him, a gush bursts from
## the cut, and his wound pumps as he falls. `facing` is the way he faced, `direction` the way the
## blow travelled (+1 right).
## `fury` multiplies it all (the Captain's end).
func cut_down(body: Node2D, sprite: AnimatedSprite2D, gore: GoreSet, cut: StringName, facing: float, direction: float,
		fury: float = 1.0) -> void:
	if not full or gore == null:
		return
	for piece: String in gore.pieces_of(cut):
		var piece_name: StringName = StringName(piece)
		var origin: Vector2 = gore.origin(piece_name)
		var at: Vector2 = body.global_position + Vector2(origin.x * facing, origin.y)
		_throw(gore, piece_name, at, facing, direction, fury)
	var wound: Vector2 = gore.wound(sprite.animation, 0)
	if wound != Vector2.INF:
		var at: Vector2 = body.global_position + Vector2(wound.x * facing, wound.y)
		_effect(&"blood_gush", at, direction < 0.0, self)
		_effect(&"blood_gush", at + Vector2(-direction * 4.0, 6.0), direction > 0.0, self)
		_effect(&"dust", at, direction < 0.0, self, MIST)
		var count: int = roundi((GIBS_PER_CUT + (GIBS_FOR_WAIST if cut == &"waist" else 0)) * fury)
		for i: int in count:
			_gib(at, direction)
		var fountain: BloodFountain = BloodFountain.new()
		body.add_child(fountain)
		fountain.start(sprite, gore, drop, fury)


## A blade driven through a body: blood bursts from where it went in and where it came out (and,
## once it is pulled free, the wound pumps). `at` is the body's middle, `direction` the thrust's way.
func burst(body: Node2D, sprite: AnimatedSprite2D, gore: GoreSet, at: Vector2, direction: float, pump: bool) -> void:
	if not full:
		return
	_effect(&"blood_gush", at + Vector2(direction * 8.0, 0.0), direction < 0.0, self)
	_effect(&"blood_gush", at - Vector2(direction * 6.0, 0.0), direction > 0.0, self)
	_effect(&"dust", at, direction < 0.0, self, MIST)
	for i: int in 4:
		_gib(at, direction)
	if pump and gore != null:
		var fountain: BloodFountain = BloodFountain.new()
		body.add_child(fountain)
		fountain.start(sprite, gore, drop, 1.2)


## A body come to rest: blood spreads on the street beneath its wound (or its middle); a man cut
## in two lies in the widest pool.
func bleed_out(body: Node2D, sprite: AnimatedSprite2D, gore: GoreSet, facing: float, cut: StringName = &"") -> void:
	if not full or _ground == null:
		return
	var spread: Callable = func() -> void:
		if not is_instance_valid(body) or _ground == null:
			return
		var wound: Vector2 = Vector2(-6.0, 0.0)
		if gore != null:
			var last: int = sprite.sprite_frames.get_frame_count(sprite.animation) - 1
			var at: Vector2 = gore.wound(sprite.animation, last)
			if at != Vector2.INF:
				wound = at
		var pool: StringName = &"blood_pool_d" if cut == &"waist" else POOLS[_rng.randi() % POOLS.size()]
		_pool(Vector2(body.global_position.x + wound.x * facing, body.global_position.y), pool)
	sprite.animation_finished.connect(spread, CONNECT_ONE_SHOT)


## Blood flung by a blow at `at`, travelling `direction`: drops that fall and mark the street.
func spatter(at: Vector2, direction: float, ground_y: float, drops: int = 3) -> void:
	if _ground == null:
		return
	var count: int = drops * 2 if full else 1
	for i: int in count:
		var reach: float = _rng.randf_range(6.0, 58.0)
		var mark: Vector2 = Vector2(at.x + direction * reach, ground_y)
		get_tree().create_timer(0.12 + reach / 160.0).timeout.connect(_splat.bind(mark))


func _throw(gore: GoreSet, piece: StringName, at: Vector2, facing: float, direction: float, fury: float = 1.0) -> void:
	_trim(self, MAX_PIECES)
	var thrown: GorePiece = GorePiece.new()
	add_child(thrown)
	thrown.global_position = at
	thrown.setup(gore.pieces, piece, gore.bottoms(piece), facing < 0.0, drop if piece != &"spear" else null)
	var heavy: bool = piece == &"upper"
	var up: float = (_rng.randf_range(150.0, 230.0) if piece == &"head" else _rng.randf_range(90.0, 170.0)) * (1.0 + (fury - 1.0) * 0.18)
	thrown.velocity = Vector2(direction * _rng.randf_range(60.0, 150.0) * (0.6 if heavy else 1.0), -up * (0.7 if heavy else 1.0))
	thrown.spin = direction * _rng.randf_range(1.4, 2.6) * (0.5 if heavy else 1.0)
	thrown.landed.connect(_on_piece_landed.bind(piece != &"spear"))


## A chunk of flesh thrown from a cut: it flies, turning, and leaves a mark where it lands.
func _gib(at: Vector2, direction: float) -> void:
	_trim(self, MAX_PIECES)
	var gib: GorePiece = GorePiece.new()
	add_child(gib)
	gib.global_position = at + Vector2(_rng.randf_range(-3.0, 3.0), _rng.randf_range(-3.0, 3.0))
	var bottoms: PackedFloat32Array = PackedFloat32Array([2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5, 2.5])
	gib.setup(frames, GIBS[_rng.randi() % GIBS.size()], bottoms, _rng.randf() < 0.5, null)
	gib.velocity = Vector2(direction * _rng.randf_range(20.0, 210.0) + _rng.randf_range(-40.0, 40.0),
		-_rng.randf_range(90.0, 290.0))
	gib.spin = _rng.randf_range(-4.0, 4.0)
	gib.landed.connect(_on_gib_landed)


func _on_gib_landed(at: Vector2, _resting: bool) -> void:
	_splat(at)


func _on_piece_landed(at: Vector2, resting: bool, bleeds: bool) -> void:
	if not resting:
		piece_landed.emit(at)
	if not bleeds:
		return
	if resting:
		_pool(at, &"blood_pool_c")
	else:
		_splat(at)


func _pool(at: Vector2, pool: StringName) -> void:
	if _ground == null:
		return
	var sprite: AnimatedSprite2D = _effect_on(_ground, pool, at, _rng.randf() < 0.5)
	if sprite != null:
		sprite.offset = Vector2(0, -frames.get_frame_texture(pool, 0).get_height() / 2.0 + 1.0)


func _splat(at: Vector2) -> void:
	if _ground == null:
		return
	_trim(_ground, MAX_MARKS, &"gore_mark")
	var sprite: Sprite2D = Sprite2D.new()
	var texture: Texture2D = frames.get_frame_texture(&"blood_splat", _rng.randi() % frames.get_frame_count(&"blood_splat"))
	sprite.texture = texture
	sprite.offset = Vector2(0, -texture.get_height() / 2.0 + 1.0)
	sprite.add_to_group(&"gore_mark")
	_ground.add_child(sprite)
	sprite.global_position = at.round()


## A one-shot effect at a point (tinted, for a mist of blood); marks on the ground stay on their last frame.
func _effect(effect: StringName, at: Vector2, flip: bool, parent: Node, tint: Color = Color.WHITE) -> void:
	var sprite: AnimatedSprite2D = AnimatedSprite2D.new()
	sprite.sprite_frames = frames
	sprite.flip_h = flip
	sprite.modulate = tint
	parent.add_child(sprite)
	sprite.global_position = at.round()
	sprite.play(effect)
	sprite.animation_finished.connect(sprite.queue_free)


func _effect_on(parent: Node2D, effect: StringName, at: Vector2, flip: bool) -> AnimatedSprite2D:
	if frames == null or not frames.has_animation(effect):
		return null
	_trim(parent, MAX_MARKS, &"gore_mark")
	var sprite: AnimatedSprite2D = AnimatedSprite2D.new()
	sprite.sprite_frames = frames
	sprite.flip_h = flip
	sprite.add_to_group(&"gore_mark")
	parent.add_child(sprite)
	sprite.global_position = at.round()
	sprite.play(effect)
	return sprite


## Keeps at most `limit` of a parent's children (of a group, when given): the oldest go first.
func _trim(parent: Node, limit: int, group: StringName = &"") -> void:
	var kept: Array[Node] = []
	for child: Node in parent.get_children():
		if group == &"" or child.is_in_group(group):
			kept.append(child)
	while kept.size() >= limit:
		var oldest: Node = kept.pop_front()
		oldest.queue_free()
