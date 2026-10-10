// A painting through a moving camera, as pixel art. Each output pixel is the area average of the painting
// under it (linear light, 4 x 4 taps, as tools/asset_generation/environment/painted.mjs resamples), seen
// through a camera that moves near things more than far ones (the depth map), with the painting's fire
// breathing, its water rippling, its cloth swaying, smoke rolling over it and, for the map, ink drawn and
// spreading; then graded and mapped to the shot's own palette, so every frame is pixel art in its colours.
// All rects and offsets are in the painting's pixels. Used by features/cinematics/cinematic_player.gd.
shader_type canvas_item;
render_mode unshaded;

uniform sampler2D painting : filter_linear, repeat_disable;
// red: depth (0 far, 1 near); green: what drifts.
uniform sampler2D depth_map : filter_linear, repeat_disable;
// red: fire; green: water; blue: cloth (0 where it hangs, 1 at its free end).
uniform sampler2D masks : filter_linear, repeat_disable;
// 64 levels a channel; blue picks one of 8 x 8 tiles of 64 x 64 (red across, green down).
uniform sampler2D palette : filter_nearest, repeat_disable;
// The map: its ink, and when each pixel shows (red: a stroke, green: the spreading ink, blue: the road).
uniform sampler2D map_ink : filter_nearest, repeat_disable;
uniform sampler2D map_times : filter_nearest, repeat_disable;

uniform vec4 stored_rect = vec4(0.0, 0.0, 1.0, 1.0);
uniform vec4 camera = vec4(0.0, 0.0, 1.0, 1.0);
uniform vec4 camera_ref = vec4(0.0, 0.0, 1.0, 1.0);
uniform float parallax = 0.5;
uniform vec2 shake = vec2(0.0);
uniform vec2 out_size = vec2(640.0, 268.0);
uniform float time_s = 0.0;

uniform float saturation = 1.0;
uniform float contrast = 1.0;
uniform float exposure = 1.0;
uniform vec3 tint = vec3(1.0);
uniform float brightness = 1.0;

uniform float fire = 0.0;
uniform float water = 0.0;
uniform float sway = 0.0;
uniform vec2 drift = vec2(0.0);
uniform float smoke = 0.0;
uniform vec4 smoke_area = vec4(0.0, 0.0, 1.0, 1.0);

uniform float use_map = 0.0;
uniform vec4 map_rect = vec4(0.0, 0.0, 1.0, 1.0);
uniform float map_reveal = 0.0;
uniform float map_wash = 0.0;
uniform float map_route = 0.0;

uniform float has_painting = 1.0;

float hash(vec2 p) {
	p = fract(p * vec2(0.1031, 0.1030));
	p += dot(p, p.yx + 33.33);
	return fract((p.x + p.y) * p.x);
}

float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * noise(p);
		p = p * 2.03 + vec2(17.0, 9.0);
		a *= 0.5;
	}
	return v;
}

vec2 to_stored(vec2 p) {
	return (p - stored_rect.xy) / stored_rect.zw;
}

// One tap of the painting, with the map's ink laid over it where the map has reached.
vec3 tap(vec2 q, float ragged) {
	vec3 c = texture(painting, to_stored(q)).rgb;
	if (use_map > 0.5) {
		vec2 mp = (q - map_rect.xy) / map_rect.zw;
		if (mp.x >= 0.0 && mp.x < 1.0 && mp.y >= 0.0 && mp.y < 1.0) {
			vec3 t = texture(map_times, mp).rgb;
			// The spreading ink darkens the parchment, its edge ragged and bleeding.
			float wash = clamp((map_wash - t.g + ragged) / 0.025, 0.0, 1.0) * step(t.g, 0.99);
			c *= mix(vec3(1.0), vec3(0.36, 0.3, 0.27), wash * 0.86);
			vec4 ink = texture(map_ink, mp);
			float drawn = clamp((map_reveal - t.r) / 0.02, 0.0, 1.0) * step(t.r, 0.99);
			float road = clamp((map_route - t.b) / 0.008, 0.0, 1.0) * step(t.b, 0.99);
			c = mix(c, ink.rgb, ink.a * max(drawn, road));
		}
	}
	return c;
}

void fragment() {
	if (has_painting < 0.5) {
		COLOR = vec4(0.0, 0.0, 0.0, COLOR.a);
	} else {
		vec2 s = UV;
		vec2 centre = camera.xy + camera.zw * 0.5;
		vec2 centre_ref = camera_ref.xy + camera_ref.zw * 0.5;
		float zoom = camera_ref.z / camera.z;
		// Where this pixel looks: near things (depth above a half) follow the camera's motion further.
		vec2 size = camera.zw;
		vec2 p = camera.xy + s * camera.zw;
		for (int i = 0; i < 2; i++) {
			float d = texture(depth_map, to_stored(p)).r - 0.5;
			float k = 1.0 + d * parallax;
			vec2 c = centre_ref + (centre - centre_ref) * k;
			size = camera_ref.zw / pow(zoom, k);
			p = c + (s - 0.5) * size;
		}
		p += shake;
		vec3 m = texture(masks, to_stored(p)).rgb;
		float drifting = texture(depth_map, to_stored(p)).g;
		// Water ripples sideways, cloth sways from where it hangs, what drifts is carried along.
		p.x += m.g * water * (sin(p.y * 0.9 + time_s * 2.3) * 1.2 + sin(p.y * 0.37 - time_s * 1.3) * 0.8);
		p.x += m.b * sway * sin(time_s * 1.6 + p.y * 0.035 + p.x * 0.01) * 3.0;
		p -= drifting * drift;
		// The area under the pixel, averaged in linear light.
		vec2 footprint = size / out_size;
		float ragged = (noise(p * 0.07) - 0.5) * 0.05 + (noise(p * 0.21) - 0.5) * 0.02;
		vec3 sum = vec3(0.0);
		for (int y = 0; y < 4; y++) {
			for (int x = 0; x < 4; x++) {
				vec2 q = p + ((vec2(float(x), float(y)) + 0.5) / 4.0 - 0.5) * footprint;
				sum += pow(tap(q, ragged), vec3(2.2));
			}
		}
		vec3 col = pow(sum / 16.0, vec3(1.0 / 2.2));
		// Fire breathes.
		float flicker = noise(p * vec2(0.045, 0.03) + vec2(0.0, -time_s * 1.7)) * 0.65 + noise(p * 0.11 + time_s * 3.1) * 0.35;
		col *= 1.0 + m.r * fire * (flicker - 0.45) * 2.0;
		// Smoke rolls over its area, thickest at the top.
		if (smoke > 0.0) {
			vec2 sp = (p - smoke_area.xy) / smoke_area.zw;
			float inside = step(0.0, sp.x) * step(sp.x, 1.0) * step(0.0, sp.y) * step(sp.y, 1.0);
			float thick = smoothstep(1.0, 0.35, sp.y);
			float cloud = fbm(p * 0.0045 + vec2(time_s * 0.018, -time_s * 0.03));
			col = mix(col, vec3(0.17, 0.14, 0.14), clamp((cloud - 0.38) * 1.7, 0.0, 1.0) * smoke * inside * thick);
		}
		// The grade, then the palette.
		float l = dot(col, vec3(0.3, 0.59, 0.11));
		col = mix(vec3(l), col, saturation);
		col = (col - 0.5) * contrast + 0.5;
		col = clamp(col * exposure * tint, 0.0, 1.0);
		vec3 level = floor(col * 63.0 + 0.5);
		vec2 tile = vec2(mod(level.b, 8.0), floor(level.b / 8.0));
		col = texture(palette, (tile * 64.0 + level.rg + 0.5) / 512.0).rgb;
		COLOR = vec4(col * brightness, COLOR.a);
	}
}
