class_name ManuscriptReader
extends MenuScreen
## Shows a rescued manuscript: its title and its words, on a parchment panel.

@onready var title: Label = %Title
@onready var body: Label = %Body


func read(manuscript_id: StringName) -> void:
	var key: String = "MANUSCRIPT_%s" % String(manuscript_id).to_upper()
	title.text = tr(key + "_TITLE")
	body.text = tr(key + "_TEXT")
	open()
