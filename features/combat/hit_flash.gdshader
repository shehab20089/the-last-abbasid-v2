shader_type canvas_item;
// The fighters' look: lifted a little above the dark street so they read against the burning
// city, lit warm along the edges that face away from the viewer's light (the fires behind them),
// flashing toward bone white (or a warning colour) when struck.

uniform float flash : hint_range(0.0, 1.0) = 0.0;
uniform vec4 flash_color : source_color = vec4(1.0, 0.94, 0.84, 1.0);
// Blinks a body that cannot be hurt right now (after a hit) by dimming it.
uniform float ghost : hint_range(0.0, 1.0) = 0.0;
// How much brighter than the scene a fighter stands.
uniform float lift : hint_range(0.5, 2.0) = 1.22;
// A firelit rim along the silhouette's top and back edges.
uniform vec4 rim_color : source_color = vec4(1.0, 0.62, 0.32, 1.0);
uniform float rim_strength : hint_range(0.0, 1.0) = 0.25;

void fragment() {
	vec4 c = COLOR;
	c.rgb *= lift;
	// Edge pixels (an outline neighbour is transparent above or behind) catch the fire.
	vec2 px = TEXTURE_PIXEL_SIZE;
	float above = texture(TEXTURE, UV + vec2(0.0, -px.y)).a;
	float behind = texture(TEXTURE, UV + vec2(-px.x, 0.0)).a;
	float edge = c.a > 0.5 ? (1.0 - min(above, behind)) : 0.0;
	c.rgb = mix(c.rgb, rim_color.rgb * max(c.r, max(c.g, c.b)) * 1.8 + rim_color.rgb * 0.12, edge * rim_strength);
	// The flash never fully whitens the body, so the blow's recoil still reads through it.
	c.rgb = mix(c.rgb, flash_color.rgb, flash * 0.72);
	c.a *= 1.0 - ghost * 0.55;
	COLOR = c;
}
