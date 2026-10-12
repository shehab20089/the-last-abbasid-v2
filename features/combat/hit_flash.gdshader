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

// How a fighter takes a light (a fire, a lamp, burning naphtha): by the stuff it falls on, so a crowd beside a fire
// keeps its iron dark, its cloth its dye and its bronze its glint, instead of all going one orange. (Godot's own
// light, which this replaces, is COLOR * LIGHT_COLOR * LIGHT_ENERGY: every colour pushed toward the light's.)
void light() {
	vec3 albedo = COLOR.rgb;
	vec3 light_rgb = LIGHT_COLOR.rgb * LIGHT_ENERGY;
	float light_lum = dot(light_rgb, vec3(0.3, 0.55, 0.15));
	float hi = max(albedo.r, max(albedo.g, albedo.b));
	float lo = min(albedo.r, min(albedo.g, albedo.b));
	float sat = hi > 0.001 ? (hi - lo) / hi : 0.0;
	float lum = dot(albedo, vec3(0.3, 0.55, 0.15));
	// Dyed cloth is brightened in its own colour; iron, which has none, takes the light's warmth.
	vec3 lit = mix(albedo * light_rgb, albedo * light_lum, 0.25 + sat * 0.65);
	// The darkest masses take little (iron and deep shade stay dark), and what is already bright takes less than it
	// would (no blown orange mass): the light falls mostly on the planes between.
	lit *= smoothstep(0.06, 0.40, lum) * mix(1.0, 0.4, smoothstep(0.4, 0.85, hi)) * 0.8;
	// A glint only on the brightest, least dyed pixels: polished iron, the edge of bronze.
	lit += light_rgb * smoothstep(0.55, 0.80, hi) * (1.0 - sat * 0.7) * 0.12;
	// A warning's flush and a blow's flash take the light in their own colour, not the fire's: by a fire an amber
	// warning stays amber and a red one red (both would turn the same orange), and a struck body flashes white.
	lit = mix(lit, flash_color.rgb * light_lum * 0.9, clamp(flash * 1.6, 0.0, 1.0));
	LIGHT = vec4(lit, LIGHT_COLOR.a);
}
