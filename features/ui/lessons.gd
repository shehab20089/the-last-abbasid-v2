class_name Lessons
extends RefCounted
## Every lesson the game teaches, by its text's translation key: its title, the chapter of the Guide it is
## kept under, the move shown with it (a MoveDemos id, or none), and whether it stops the game when first met
## (a card in the middle of the screen) or passes as a card at the top. The Guide lists those met, by chapter.

enum Chapter {MOVING, FIGHTING, WARNINGS, BREATH, TECHNIQUES, ARTS, LAMPS, PEOPLE}

const CHAPTER_KEYS: Array[String] = ["GUIDE_MOVING", "GUIDE_FIGHTING", "GUIDE_WARNINGS", "GUIDE_BREATH",
	"GUIDE_TECHNIQUES", "GUIDE_ARTS", "GUIDE_LAMPS", "GUIDE_PEOPLE"]

## Each lesson: [title key, chapter, demo id].
const ENTRIES: Dictionary[String, Array] = {
	"HINT_MOVE": ["LESSON_MOVE", Chapter.MOVING, &""],
	"HINT_JUMP": ["LESSON_JUMP", Chapter.MOVING, &"leap"],
	"HINT_CLIMB": ["LESSON_CLIMB", Chapter.MOVING, &""],
	"HINT_ROOFTOPS": ["LESSON_CLIMB", Chapter.MOVING, &""],
	"HINT_PLUNGE": ["LESSON_DROP", Chapter.MOVING, &""],
	"HINT_ATTACK": ["LESSON_ATTACK", Chapter.FIGHTING, &"cuts"],
	"HINT_SURPRISE": ["LESSON_SURPRISE", Chapter.FIGHTING, &""],
	"HINT_EXECUTION": ["LESSON_EXECUTION", Chapter.FIGHTING, &""],
	"HINT_GUARD": ["LESSON_GUARD", Chapter.FIGHTING, &"guard"],
	"HINT_ROLL": ["LESSON_ROLL", Chapter.FIGHTING, &"roll"],
	"HINT_FINISHER": ["LESSON_FINISHER", Chapter.FIGHTING, &"finisher"],
	"HINT_GROUND_STAB": ["LESSON_GROUND_STAB", Chapter.FIGHTING, &"ground_stab"],
	"HINT_GLANCE": ["LESSON_GLANCE", Chapter.FIGHTING, &""],
	"HINT_GUARD_BREAK": ["LESSON_GUARD_BREAK", Chapter.FIGHTING, &""],
	"HINT_HEAL": ["LESSON_HEAL", Chapter.FIGHTING, &"remedy"],
	"HINT_ARCHER_COVER": ["LESSON_ARCHERS", Chapter.FIGHTING, &""],
	"HINT_ARCHERS": ["LESSON_ARCHERS", Chapter.FIGHTING, &""],
	"HINT_SHIELDBEARER": ["LESSON_SHIELDBEARER", Chapter.FIGHTING, &""],
	"HINT_ENGINEER": ["LESSON_ENGINEER", Chapter.FIGHTING, &""],
	"HINT_MACEMAN": ["LESSON_MACEMAN", Chapter.FIGHTING, &""],
	"HINT_SKIRMISHER": ["LESSON_SKIRMISHER", Chapter.FIGHTING, &""],
	"HINT_AXEMAN": ["LESSON_AXEMAN", Chapter.FIGHTING, &""],
	"HINT_WARNINGS": ["LESSON_WARNINGS", Chapter.WARNINGS, &""],
	"HINT_SWEEP_GLINT": ["LESSON_SWEEP_GLINT", Chapter.WARNINGS, &"roll"],
	"HINT_BREAK_GLINT": ["LESSON_BREAK_GLINT", Chapter.WARNINGS, &""],
	"HINT_BOSS": ["LESSON_RED_GLINT", Chapter.WARNINGS, &"roll"],
	"HINT_STEADY_BREATH": ["LESSON_BREATH", Chapter.BREATH, &"steady_breath"],
	"HINT_CLOSE_CALL": ["LESSON_CLOSE_CALL", Chapter.BREATH, &"close_call"],
	"HINT_LAMP": ["LESSON_LAMP", Chapter.LAMPS, &""],
	"HINT_LAMP_CARD": ["LESSON_LAMP_CARD", Chapter.LAMPS, &""],
	"HINT_WARN_WHITE": ["LESSON_WARN_WHITE", Chapter.WARNINGS, &"guard"],
	"HINT_WARN_AMBER": ["LESSON_WARN_AMBER", Chapter.WARNINGS, &"roll"],
	"HINT_WARN_VIOLET": ["LESSON_WARN_VIOLET", Chapter.WARNINGS, &"roll"],
	"HINT_WARN_RED": ["LESSON_WARN_RED", Chapter.WARNINGS, &"roll"],
	"HINT_LAMP_MENU": ["LESSON_HONOUR", Chapter.LAMPS, &""],
	"HINT_KEEPSAKE": ["LESSON_KEEPSAKE", Chapter.LAMPS, &""],
	"HINT_PEOPLE": ["LESSON_PEOPLE", Chapter.PEOPLE, &""],
	"HINT_ART_SLOTS": ["LESSON_ART_SLOTS", Chapter.ARTS, &""],
}


## The lesson's title key (its own text when it has none).
static func title_of(key: String) -> String:
	if ENTRIES.has(key):
		var entry: Array = ENTRIES[key]
		var title: String = entry[0]
		return title
	if key.begins_with("HINT_LEARNED_"):
		return technique_name(StringName(key.trim_prefix("HINT_LEARNED_").to_lower()))
	return ""


## A technique's name (a translation key), as the Techniques page names it.
static func technique_name(technique: StringName) -> String:
	for entry: Array in TechniquesScreen.ENTRIES:
		var id: StringName = entry[0]
		if id == technique:
			var name_key: String = entry[1]
			return name_key
	return ""


static func chapter_of(key: String) -> Chapter:
	if ENTRIES.has(key):
		var entry: Array = ENTRIES[key]
		var chapter: Chapter = entry[1]
		return chapter
	if key.begins_with("HINT_LEARNED_"):
		var technique: String = key.trim_prefix("HINT_LEARNED_").to_lower()
		for art: String in ["storm", "pierce", "naft", "second_wind", "judgment"]:
			if technique == art:
				return Chapter.ARTS
		return Chapter.TECHNIQUES
	return Chapter.FIGHTING


## The move shown with the lesson (a MoveDemos id), or none.
static func demo_of(key: String) -> StringName:
	if ENTRIES.has(key):
		var entry: Array = ENTRIES[key]
		var demo: StringName = entry[2]
		return demo
	if key.begins_with("HINT_LEARNED_"):
		var technique: StringName = StringName(key.trim_prefix("HINT_LEARNED_").to_lower())
		return technique if not MoveDemos.of(technique).is_empty() else &""
	return &""
