class_name ResultScreen
extends MenuScreen
## The game-over and chapter-complete screens: a heading, a line, optional statistics and the
## choices that follow.

@onready var heading: Label = %Heading
@onready var line: Label = %Line
@onready var stats: Label = %Stats


func show_result(heading_key: String, line_key: String, stat_text: String = "") -> void:
	heading.text = tr(heading_key)
	line.text = tr(line_key)
	stats.text = stat_text
	stats.visible = stat_text != ""
	open()
