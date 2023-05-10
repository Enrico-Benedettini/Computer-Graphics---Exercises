precision mediump float;

// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 position;
attribute vec3 normal;
attribute float noise;

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


void main() {
    height = noise;
    
    x = normalize((mat_model_view * vec4(position, 1.)).xyz);
    n = normalize(  mat_normals * normalize(normal));
    v = vec3(0., 0., 1.);
    l = -normalize((mat_model_view * vec4(position, 1.) - light_position_cam)).xyz;
    h = normalize(l + v);
    
	gl_Position = mat_mvp * vec4(position, 1.);
}