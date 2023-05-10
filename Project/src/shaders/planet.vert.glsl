precision mediump float;

// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 position;
attribute vec3 normal;

// Per-vertex outputs passed on to the fragment shader
varying vec3 x;
varying vec3 n;
varying vec3 v;
varying vec3 l;
varying vec3 h;
varying float height;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;
uniform mat3 mat_normals;
uniform vec4 light_position_cam;
uniform mat4 mat_model_view;
uniform float planet_size;

#define NUM_GRADIENTS 12

// -- Gradient table --
vec2 gradients(int i) {
	if (i ==  0) return vec2( 1,  1);
	if (i ==  1) return vec2(-1,  1);
	if (i ==  2) return vec2( 1, -1);
	if (i ==  3) return vec2(-1, -1);
	if (i ==  4) return vec2( 1,  0);
	if (i ==  5) return vec2(-1,  0);
	if (i ==  6) return vec2( 1,  0);
	if (i ==  7) return vec2(-1,  0);
	if (i ==  8) return vec2( 0,  1);
	if (i ==  9) return vec2( 0, -1);
	if (i == 10) return vec2( 0,  1);
	if (i == 11) return vec2( 0, -1);
	return vec2(0, 0);
}

float hash_poly(float x) {
	return mod(((x*34.0)+1.0)*x, 289.0);
}

// -- Hash function --
// Map a gridpoint to 0..(NUM_GRADIENTS - 1)
int hash_func(vec2 grid_point) {
	return int(mod(hash_poly(hash_poly(grid_point.x) + grid_point.y), float(NUM_GRADIENTS)));
}

// -- Smooth interpolation polynomial --
// Use mix(a, b, blending_weight_poly(t))
float blending_weight_poly(float t) {
	return t*t*t*(t*(t*6.0 - 15.0)+10.0);
}


// Constants for FBM
const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;
const int num_octaves = 4;

// ==============================================================
// 1D Perlin noise evaluation and plotting

float perlin_noise_1d(float x) {
	/*
	Note Gradients gradients(i) from in the table are 2d, so in the 1D case we use grad.x
	*/

	/* #TODO PG1.2.1
	Evaluate the 1D Perlin noise function at "x" as described in the handout. 
	You will determine the two grid points surrounding x, 
	look up their gradients, 
	evaluate the the linear functions these gradients describe, 
	and interpolate these values 
	using the smooth interolation polygnomial blending_weight_poly.
	*/

    float c0 = floor(x);
    float c1 = c0 + 1.;

    float h0 = mod(hash_poly(c0), float(NUM_GRADIENTS));
    float h1 = mod(hash_poly(c1), float(NUM_GRADIENTS));

    float g0 = gradients(int(h0)).x;
    float g1 = gradients(int(h1)).x;

    float phi0 = g0 * (x - c0);
    float phi1 = g1 * (x - c1);

    float t = x - c0;

    float a = blending_weight_poly(t);

	return mix(phi0, phi1, a);
}

float perlin_fbm_1d(float x) {
	/* #TODO PG1.3.1
	Implement 1D fractional Brownian motion (fBm) as described in the handout.
	You should add together num_octaves octaves of Perlin noise, starting at octave 0. 
	You also should use the frequency and amplitude multipliers:
	freq_multiplier and ampl_multiplier defined above to rescale each successive octave.
	
	Note: the GLSL `for` loop may be useful.
	*/

    float fbm = 0.;

    for (int i = 0; i < num_octaves; ++i) {
        fbm += pow(ampl_multiplier, float(i)) * perlin_noise_1d(x * pow(freq_multiplier, float(i)));
    }

	return fbm;
}

// ----- plotting -----

const vec3 plot_foreground = vec3(0.5, 0.8, 0.5);
const vec3 plot_background = vec3(0.2, 0.2, 0.2);

vec3 plot_value(float func_value, float coord_within_plot) {
	return (func_value < ((coord_within_plot - 0.5)*2.0)) ? plot_foreground : plot_background;
}

vec3 plots(vec2 point) {
	// Press D (or right arrow) to scroll

	// fit into -1...1
	point += vec2(1., 1.);
	point *= 0.5;

	if(point.y < 0. || point.y > 1.) {
		return vec3(255, 0, 0);
	}

	float y_inv = 1. - point.y;
	float y_rel = y_inv / 0.2;
	int which_plot = int(floor(y_rel));
	float coord_within_plot = fract(y_rel);

	vec3 result;
	if(which_plot < 4) {
		result = plot_value(
 			perlin_noise_1d(point.x * pow(freq_multiplier, float(which_plot))),
			coord_within_plot
		);
	} else {
		result = plot_value(
			perlin_fbm_1d(point.x) * 1.5,
			coord_within_plot
		);
	}

	return result;
}

// ==============================================================
// 2D Perlin noise evaluation


float perlin_noise(vec2 point) {
	/* #TODO PG1.4.1
	Implement 2D perlin noise as described in the handout.
	You may find a glsl `for` loop useful here, but it's not necessary.
	*/

    vec2 c00 = floor(point);
    vec2 c01 = c00 + vec2(0., 1.);
    vec2 c10 = c00 + vec2(1., 0.);
    vec2 c11 = c00 + vec2(1., 1.);

    int h00 = int(hash_func(c00));
    int h01 = int(hash_func(c01));
    int h10 = int(hash_func(c10));
    int h11 = int(hash_func(c11));

    vec2 g00 = gradients(h00);
    vec2 g01 = gradients(h01);
    vec2 g10 = gradients(h10);
    vec2 g11 = gradients(h11);

    vec2 a = point - c00;
    vec2 c = point - c01;
    vec2 b = point - c10;
    vec2 d = point - c11;

    float s = dot(g00, a);
    float t = dot(g10, b);
    float u = dot(g01, c);
    float v = dot(g11, d);

    float st = mix(s, t, blending_weight_poly(a.x));
    float uv = mix(u, v, blending_weight_poly(a.x));

	return mix(st, uv, a.y);
}

vec3 tex_perlin(vec2 point) {
	// Visualize noise as a vec3 color
	float freq = 23.15;
 	float noise_val = perlin_noise(point * freq) + 0.5;
	return vec3(noise_val);
}

void main() {
    const float noise_speed = 0.7;
    float noise = (perlin_noise(position.xy * noise_speed) + 
            perlin_noise(position.yz * noise_speed) + 
            perlin_noise(position.xz * noise_speed)) / 3.;

    height = noise + 1.;

    float final_height = max((log(0.8 * (noise + 1.)) * 3.) + 1., 1.) * planet_size / 10.;

    x = normalize((mat_model_view * vec4(position * final_height, 1.)).xyz);
    n = normalize(  mat_normals * normalize(normal));
    v = vec3(0., 0., 1.);
    l = -normalize((mat_model_view * vec4(position, 1.) - light_position_cam)).xyz;
    h = normalize(l + v);
    
	gl_Position = mat_mvp * vec4(position, 1.);
}