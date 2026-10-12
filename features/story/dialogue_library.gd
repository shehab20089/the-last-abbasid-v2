class_name DialogueLibrary
extends RefCounted
## Every conversation of the chapter as [speaker key, line key] pairs; the words themselves live in
## assets/localization/strings.csv so each can be translated. An empty speaker is narration.

const SPEAKERS: Dictionary[StringName, String] = {
	&"yusuf": "SPEAKER_YUSUF",
	&"guard": "SPEAKER_GUARD",
	&"mother": "SPEAKER_MOTHER",
	&"umm_ali": "SPEAKER_UMM_ALI",
	&"ibrahim": "SPEAKER_IBRAHIM",
	&"refugee": "SPEAKER_REFUGEE",
	&"salim": "SPEAKER_SALIM",
	&"copyist": "SPEAKER_COPYIST",
	&"librarian": "SPEAKER_LIBRARIAN",
	&"toqto": "SPEAKER_TOQTO",
}

const DIALOGUES: Dictionary[StringName, Array] = {
	&"waiting": [
		["yusuf", "WAITING_1"],
	],
	&"intro": [
		["", "INTRO_1"], ["", "INTRO_2"], ["", "INTRO_3"], ["", "INTRO_4"],
	],
	&"guard": [
		["guard", "GUARD_1"], ["yusuf", "GUARD_2"], ["guard", "GUARD_3"], ["yusuf", "GUARD_4"],
		["guard", "GUARD_5"], ["yusuf", "GUARD_6"], ["guard", "GUARD_7"],
	],
	&"guard_after": [
		["guard", "GUARD_AFTER_1"],
	],
	&"refugees": [
		["refugee", "REFUGEE_1"],
	],
	&"mother": [
		["mother", "MOTHER_1"], ["yusuf", "MOTHER_2"], ["mother", "MOTHER_3"],
	],
	&"mother_waiting": [
		["mother", "MOTHER_WAITING_1"],
	],
	&"mother_after": [
		["mother", "MOTHER_AFTER_1"],
	],
	&"ambush": [
		["", "AMBUSH_1"],
	],
	&"ibrahim": [
		["ibrahim", "IBRAHIM_1"], ["yusuf", "IBRAHIM_2"], ["ibrahim", "IBRAHIM_3"], ["ibrahim", "IBRAHIM_4"],
		["yusuf", "IBRAHIM_5"], ["ibrahim", "IBRAHIM_6"], ["yusuf", "IBRAHIM_7"], ["ibrahim", "IBRAHIM_8"],
	],
	&"ibrahim_waiting": [
		["ibrahim", "IBRAHIM_WAITING_1"],
	],
	&"ibrahim_after": [
		["ibrahim", "IBRAHIM_AFTER_1"],
	],
	&"gate_locked": [
		["yusuf", "GATE_LOCKED_1"],
	],
	&"market_end": [
		["", "MARKET_END_1"], ["", "MARKET_END_2"], ["", "MARKET_END_3"],
	],
	&"salim": [
		["salim", "SALIM_1"], ["yusuf", "SALIM_2"], ["salim", "SALIM_3"], ["yusuf", "SALIM_4"],
		["salim", "SALIM_5"], ["salim", "SALIM_6"], ["yusuf", "SALIM_7"], ["salim", "SALIM_8"],
	],
	&"salim_waiting": [
		["salim", "SALIM_WAITING_1"],
	],
	&"salim_after": [
		["salim", "SALIM_AFTER_1"],
	],
	&"streets_end": [
		["", "STREETS_END_1"], ["", "STREETS_END_2"],
	],
	&"copyist": [
		["copyist", "COPYIST_1"], ["yusuf", "COPYIST_2"], ["copyist", "COPYIST_3"], ["copyist", "COPYIST_4"],
	],
	&"copyist_after": [
		["copyist", "COPYIST_AFTER_1"],
	],
	&"librarian": [
		["librarian", "LIBRARIAN_1"], ["yusuf", "LIBRARIAN_2"], ["librarian", "LIBRARIAN_3"],
		["librarian", "LIBRARIAN_4"], ["librarian", "LIBRARIAN_5"], ["yusuf", "LIBRARIAN_6"], ["librarian", "LIBRARIAN_7"],
	],
	&"librarian_waiting": [
		["librarian", "LIBRARIAN_WAITING_1"],
	],
	&"librarian_after": [
		["librarian", "LIBRARIAN_AFTER_1"],
	],
	&"scholars_end": [
		["", "SCHOLARS_END_1"], ["", "SCHOLARS_END_2"],
	],
	# The Last Gate: Salim and his family together again among the people on the wall road, with Hamid's last words.
	&"salim_gate": [
		["salim", "SALIM_GATE_1"], ["umm_ali", "SALIM_GATE_2"], ["yusuf", "SALIM_GATE_3"], ["salim", "SALIM_GATE_4"],
		["yusuf", "SALIM_GATE_5"], ["yusuf", "SALIM_GATE_6"], ["salim", "SALIM_GATE_7"],
	],
	&"salim_gate_after": [
		["salim", "SALIM_GATE_AFTER_1"],
	],
	&"umm_ali": [
		["umm_ali", "UMM_ALI_1"],
	],
	&"ending": [
		["", "ENDING_1"], ["", "ENDING_CALIPH"], ["", "ENDING_2"], ["", "ENDING_3"], ["", "ENDING_4"],
	],
}


static func has(id: StringName) -> bool:
	return DIALOGUES.has(id)


## The conversation's lines as [speaker translation key, line translation key].
static func lines(id: StringName) -> Array[PackedStringArray]:
	var out: Array[PackedStringArray] = []
	if not DIALOGUES.has(id):
		return out
	var entries: Array = DIALOGUES[id]
	for entry: Array in entries:
		var speaker: String = entry[0]
		var line: String = entry[1]
		var speaker_key: String = ""
		if speaker != "" and SPEAKERS.has(StringName(speaker)):
			speaker_key = SPEAKERS[StringName(speaker)]
		out.append(PackedStringArray([speaker_key, line]))
	return out


## Who speaks a conversation besides Yusuf (the speaker's translation key), or empty: the name shown over them.
static func speaker_of(id: StringName) -> String:
	for line: PackedStringArray in lines(id):
		if line[0] != "" and line[0] != SPEAKERS[&"yusuf"]:
			return line[0]
	return ""
