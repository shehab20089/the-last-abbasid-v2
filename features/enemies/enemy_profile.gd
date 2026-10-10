@tool
class_name EnemyProfile
extends Resource
## Read-only tuning for one kind of soldier: his body, his senses, his attacks and how he fights.
## The soldier's brain reads it; mutable state belongs to the soldier and the brain.

@export var display_name: String = "Soldier"

@export_group("Body")
@export var max_health: float = 60.0
@export var max_poise: float = 24.0
@export var walk_speed: float = 46.0
@export var run_speed: float = 104.0
## Seconds a light blow stuns him.
@export var hurt_time: float = 0.3
## Seconds he reels when his poise breaks or his guard is broken.
@export var stagger_time: float = 1.0
## Seconds he reels after his blow is parried: the hero's opening for a riposte.
@export var parried_time: float = 1.35
## Seconds he lies on the street when a great blow throws him down, before he gets up.
@export var down_time: float = 1.1
## An armoured body shrugs off ordinary blows (no flinch); only broken poise, a riposte or a broken
## guard stagger him. Bosses.
@export var armoured_body: bool = false
## Light blows do not make him flinch (a mace-bearer in heavy armour); only broken poise, a riposte
## or a broken guard stagger him. Unlike a boss he can be taken unawares and finished.
@export var unflinching: bool = false
## A tall shield turns every blow from the front while he stands or walks, even the heavy cleave;
## only an overwhelming blow (the bash, a plunge) breaks it, and a blow from behind gets past it.
@export var shield_wall: bool = false
## A hardened man (a veteran, a mace-bearer, a shield-bearer): the Judgment of the Guard finishes him only
## once he is wounded to half; before that it is a great blow.
@export var elite: bool = false
## Something the hero takes from his body the first time he kills one (the engineer's naphtha: the Naft
## Flask), or nothing.
@export var drops_technique: StringName = &""
## How much of an Art's blow he braces against (a share of its damage and poise turned aside): a boss is
## not ended by a great technique.
@export_range(0.0, 1.0) var art_resistance: float = 0.0

@export_group("Senses")
## How far ahead he sees the hero.
@export var sight_range: float = 230.0
## He also notices the hero this close behind him.
@export var hearing_range: float = 70.0
## The most the hero may be above or below him to be seen.
@export var sight_height: float = 90.0
## He gives up the chase beyond this distance.
@export var lose_range: float = 420.0
## Seconds between noticing the hero and acting (his alert).
@export var alert_time: float = 0.55

@export_group("Fighting")
## Distance (between bodies) he likes to fight from.
@export var preferred_range: float = 44.0
## Closer than this he steps back.
@export var min_range: float = 24.0
@export var attacks: Array[AttackDefinition] = []
## The furthest each attack (same index) may start from.
@export var attack_ranges: PackedFloat32Array = PackedFloat32Array()
## Seconds between attacks: a random pick between x and y.
@export var attack_cooldown: Vector2 = Vector2(1.1, 1.8)
## Chance that he raises his guard when the hero swings at him.
@export_range(0.0, 1.0) var block_chance: float = 0.0
@export var block_time: float = 0.9
## A duellist: behind his raised shield he blocks this many of the hero's blows in a row and parries the
## next, throwing him open for a riposte (0: never). A blow that breaks guards, or a feint, is not parried.
@export var parries_after: int = 0
## The blow he answers a parry of his with at once (one that glints, as every opening blow must).
@export var riposte: AttackDefinition
## Chance that he steps back after one of his attacks.
@export_range(0.0, 1.0) var retreat_chance: float = 0.3
@export var retreat_time: float = 0.5
## Seconds he hesitates before reacting, so he never answers frame-perfectly.
@export var reaction_time: float = 0.22

@export_group("Patrol")
@export var patrol_distance: float = 60.0
@export var patrol_pause: float = 1.4
