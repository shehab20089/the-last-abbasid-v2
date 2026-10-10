shader_type canvas_item;
// The camera's final look, over the world and under the HUD: firelight blooms, shadows sink toward
// violet while lights warm toward amber, contrast deepens a little and the frame darkens toward its
// corners. Runs at the game's own resolution, so it never softens a pixel's edge, only adds light.

uniform sampler2D screen_texture : hint_screen_texture, repeat_disable, filter_nearest;
uniform float bloom_threshold : hint_range(0.0, 1.0) = 0.5;
uniform float bloom_strength : hint_range(0.0, 3.0) = 0.9;
uniform float bloom_radius : hint_range(1.0, 16.0) = 7.0;
uniform vec3 shadow_tint : source_color = vec3(0.42, 0.36, 0.62);
uniform vec3 light_tint : source_color = vec3(1.0, 0.88, 0.72);
uniform float grade : hint_range(0.0, 1.0) = 0.55;
uniform float contrast : hint_range(0.5, 1.5) = 1.12;
uniform float vignette : hint_range(0.0, 1.0) = 0.42;
// An Art's moment: beyond a ring about the hero (focus_center, in screen UV) the world drains to dim ash.
uniform float focus : hint_range(0.0, 1.0) = 0.0;
uniform vec2 focus_center = vec2(0.5, 0.5);
uniform float focus_radius = 0.16;
// Wounded near to death: the screen's edges darken to blood in time with his heartbeat (the session drives it).
uniform float danger : hint_range(0.0, 1.0) = 0.0;
// The player's brightness setting: the whole picture raised or lowered.
uniform float brightness : hint_range(0.5, 1.5) = 1.0;

vec3 glow_at(vec2 uv) {
	vec3 c = texture(screen_texture, uv).rgb;
	float bright = max(c.r, max(c.g, c.b));
	// Warm light blooms more than cold light: fires and lamps, not the moonlit stone.
	float warmth = clamp((c.r - c.b) * 1.6 + 0.35, 0.0, 1.0);
	return c * smoothstep(bloom_threshold, bloom_threshold + 0.3, bright) * warmth;
}

void fragment() {
	vec2 uv = SCREEN_UV;
	vec2 px = SCREEN_PIXEL_SIZE;
	vec3 base = texture(screen_texture, uv).rgb;
	vec3 glow = glow_at(uv) * 0.6;
	float weight = 0.6;
	for (int i = 0; i < 12; i++) {
		float a = float(i) * 0.5235988 + 0.26;
		vec2 d = vec2(cos(a), sin(a));
		glow += glow_at(uv + d * px * bloom_radius * 0.45) * 0.8;
		glow += glow_at(uv + d * px * bloom_radius) * 0.5;
		glow += glow_at(uv + d * px * bloom_radius * 1.9) * 0.25;
		weight += 1.55;
	}
	glow /= weight;
	vec3 c = base + glow * bloom_strength;
	// Split toning: violet in the shadows, amber in the lights.
	float lum = dot(c, vec3(0.3, 0.55, 0.15));
	vec3 toned = c * mix(shadow_tint * 1.6, light_tint * 1.08, smoothstep(0.02, 0.6, lum));
	c = mix(c, toned, grade);
	c = (c - 0.5) * contrast + 0.5;
	// An Art's moment: colour only about him.
	if (focus > 0.0) {
		vec2 d = (uv - focus_center) * vec2(px.y / px.x, 1.0);
		float outside = smoothstep(focus_radius, focus_radius + 0.14, length(d)) * focus;
		float grey = dot(c, vec3(0.3, 0.55, 0.15));
		c = mix(c, vec3(grey) * vec3(0.9, 0.88, 0.98) * 0.5, outside);
	}
	// Vignette.
	vec2 q = uv - 0.5;
	float v = 1.0 - dot(q * vec2(1.0, 1.25), q * vec2(1.0, 1.25)) * vignette * 2.2;
	// Near to death: blood at the edges.
	if (danger > 0.0) {
		float edge = smoothstep(0.24, 0.72, length(q * vec2(1.0, 1.25)));
		c = mix(c, vec3(0.46, 0.03, 0.02) + c * 0.2, edge * danger);
	}
	COLOR = vec4(clamp(c * v * brightness, 0.0, 1.0), 1.0);
}
