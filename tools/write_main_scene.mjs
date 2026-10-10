// Writes app/main.tscn: the session's node tree, with every generated sound wired to its cue and
// every music track and ambience bed named. Rerun after adding sounds.
// Usage: node tools/write_main_scene.mjs
import { readdirSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sfx = readdirSync(join(ROOT, "assets", "audio", "sfx")).filter((f) => f.endsWith(".wav")).map((f) => f.slice(0, -4)).sort();
const ext = [];
const id = (path) => {
  let i = ext.findIndex((e) => e.path === path);
  if (i < 0) {
    i = ext.length;
    const type = path.endsWith(".gd") ? "Script" : path.endsWith(".tscn") ? "PackedScene" : path.endsWith(".wav")
      ? "AudioStream" : path.endsWith(".tres") ? "SpriteFrames" : path.endsWith(".gdshader") ? "Shader" : "Texture2D";
    ext.push({ path, type, id: `${i + 1}_${path.split("/").pop().replace(/\W/g, "_")}` });
  }
  return `ExtResource("${ext[i].id}")`;
};
const res = (p) => `res://${p}`;

const cues = sfx.map((name) => `&"${name}": ${id(res(`assets/audio/sfx/${name}.wav`))}`).join(", ");
// Every music_<name>.wav is the track <name>; every amb_<name>.wav the ambience bed <name>.
const music = readdirSync(join(ROOT, "assets", "audio", "music")).filter((f) => f.endsWith(".wav")).sort();
const named = (prefix) => music.filter((f) => f.startsWith(prefix))
  .map((f) => `&"${f.slice(prefix.length, -4)}": ${id(res(`assets/audio/music/${f}`))}`).join(", ");
const tracks = named("music_");
const beds = named("amb_");

const nodes = `
[node name="Main" type="Node"]
script = ${id(res("app/main.gd"))}

[node name="Settings" type="Node" parent="."]
script = ${id(res("features/menu/game_settings.gd"))}

[node name="Glyphs" type="Node" parent="."]
script = ${id(res("features/ui/input_glyphs.gd"))}

[node name="World" type="Node2D" parent="."]

[node name="Gore" type="Node2D" parent="."]
z_index = 4
script = ${id(res("shared/vfx/gore_director.gd"))}
frames = ${id(res("assets/effects/effect_frames.tres"))}
drop = ${id(res("assets/effects/blood_drop.png"))}

[node name="Vfx" type="Node2D" parent="."]
z_index = 5
script = ${id(res("shared/vfx/vfx_director.gd"))}
frames = ${id(res("assets/effects/effect_frames.tres"))}

[node name="Camera" type="Camera2D" parent="."]
script = ${id(res("features/presentation/game_camera.gd"))}

[node name="Ash" type="CPUParticles2D" parent="Camera"]
position = Vector2(0, -200)
amount = 46
lifetime = 9.0
preprocess = 9.0
local_coords = false
texture = ${id(res("assets/effects/ash.png"))}
emission_shape = 3
emission_rect_extents = Vector2(380, 8)
direction = Vector2(0.25, 1)
spread = 30.0
gravity = Vector2(4, 8)
initial_velocity_min = 8.0
initial_velocity_max = 20.0
color = Color(0.82, 0.78, 0.74, 0.8)

[node name="Embers" type="CPUParticles2D" parent="Camera"]
position = Vector2(0, 200)
amount = 18
lifetime = 6.0
preprocess = 6.0
local_coords = false
texture = ${id(res("assets/effects/ember.png"))}
emission_shape = 3
emission_rect_extents = Vector2(380, 8)
direction = Vector2(0.2, -1)
spread = 25.0
gravity = Vector2(6, -8)
initial_velocity_min = 16.0
initial_velocity_max = 34.0
color = Color(1, 0.78, 0.45, 0.9)

[node name="Post" type="CanvasLayer" parent="."]
layer = 5

[node name="Grade" type="ColorRect" parent="Post"]
material = SubResource("ShaderMaterial_post")
offset_right = 640.0
offset_bottom = 360.0
mouse_filter = 2

[node name="Sounds" type="Node" parent="."]
script = ${id(res("shared/audio/sound_director.gd"))}
cues = Dictionary[StringName, AudioStream]({${cues}})
interface_cues = Array[StringName]([&"ui_move", &"ui_select", &"ui_back"])

[node name="Music" type="Node" parent="."]
script = ${id(res("shared/audio/music_director.gd"))}
tracks = Dictionary[StringName, AudioStream]({${tracks}})
beds = Dictionary[StringName, AudioStream]({${beds}})

[node name="HitStop" type="Node" parent="."]
script = ${id(res("features/presentation/hit_stop.gd"))}

[node name="Hud" parent="." instance=${id(res("features/ui/hud.tscn"))}]

[node name="Dialogue" parent="." instance=${id(res("features/ui/dialogue_box.tscn"))}]

[node name="Menus" type="CanvasLayer" parent="."]
layer = 20

[node name="Title" parent="Menus" instance=${id(res("features/menu/title_screen.tscn"))}]

[node name="Pause" parent="Menus" instance=${id(res("features/menu/pause_menu.tscn"))}]

[node name="Settings" parent="Menus" instance=${id(res("features/menu/settings_screen.tscn"))}]

[node name="GameOver" parent="Menus" instance=${id(res("features/menu/game_over.tscn"))}]

[node name="Complete" parent="Menus" instance=${id(res("features/menu/chapter_complete.tscn"))}]

[node name="Reader" parent="Menus" instance=${id(res("features/menu/manuscript_reader.tscn"))}]

[node name="Card" parent="Menus" instance=${id(res("features/menu/story_card.tscn"))}]

[node name="Lamp" parent="Menus" instance=${id(res("features/menu/lamp_menu.tscn"))}]

[node name="Techniques" parent="Menus" instance=${id(res("features/menu/techniques_screen.tscn"))}]

[node name="Guide" parent="Menus" instance=${id(res("features/menu/guide_screen.tscn"))}]

[node name="Journal" parent="Menus" instance=${id(res("features/menu/journal_screen.tscn"))}]

[node name="Codex" parent="Menus" instance=${id(res("features/menu/codex_screen.tscn"))}]

[node name="Lesson" parent="Menus" instance=${id(res("features/menu/lesson_screen.tscn"))}]

[node name="Fade" type="CanvasLayer" parent="."]
layer = 30

[node name="Black" type="ColorRect" parent="Fade"]
offset_right = 640.0
offset_bottom = 360.0
mouse_filter = 2
color = Color(0, 0, 0, 0)
`;

const postShader = id(res("features/presentation/post_process.gdshader"));
const subs = `
[sub_resource type="ShaderMaterial" id="ShaderMaterial_post"]
shader = ${postShader}
`;
const text = ["[gd_scene format=3]", "", ...ext.map((e) => `[ext_resource type="${e.type}" path="${e.path}" id="${e.id}"]`), subs, nodes].join("\n");
writeFileSync(join(ROOT, "app", "main.tscn"), text);
console.log(`main.tscn: ${sfx.length} cues`);
