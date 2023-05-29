precision mediump float;

// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 position;
attribute vec3 normal;
attribute float noise;
attribute vec3 center;

// Per-vertex outputs passed on to the fragment shader
varying vec3 x;
varying vec3 n;
varying vec3 v;
varying vec3 l;
varying vec3 h;
varying float height;
varying float tileCenterDistance;
varying float verticalDistance;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;
uniform mat4 mat_projection;
uniform mat3 mat_normals;
uniform vec4 light_position_cam;
uniform mat4 mat_model_view;
uniform float planet_size;
uniform bool is_moon;
uniform bool with_deformation;

uniform vec4 planet_sizes[20];
uniform vec4 planet_locations[20];

const float gravity_factor = 1.;

void main() {
    height = noise;
    verticalDistance = abs(center.z);

    tileCenterDistance = length(position * 1.001 - center);
    
    x = ((mat_model_view * vec4(position, 1.)).xyz);
    n = normalize(  mat_normals * normalize(normal));
    v = vec3(0., 0., 1.);
    l = normalize(light_position_cam - (mat_model_view * vec4(position, 1.))).xyz;
    h = normalize(l + v);

    vec3 inf = vec3(0., 0., 0.);
    
    if (with_deformation) {
        vec3 relX = (mat_model_view * vec4(0.8 * position, 1.)).xyz;

        vec3 planet_center = (mat_model_view * vec4(0., 0., 0., 1.)).xyz;
        for (int i = 0; i < 20; ++i) {
            vec3 distVec = planet_locations[i].xyz - x;
            float dist = length(distVec);
            float size_fact = planet_size / planet_sizes[i].x;
            float gravity = 0.;
            // We are at least 2x smaller than the planet.
            if (size_fact < .5 && dist < 40.) {
                gravity = planet_sizes[i].x / dist;
            }
            // We are > 2x bigger and it's close
            else if (size_fact > 2. && dist < 40.) {
                gravity = planet_sizes[i].x * dist / 2. / pow(3.5, 0.7);
            }
            else {
                gravity = planet_sizes[i].x / dist * 4.;
            }

            if (length(planet_center - planet_locations[i].xyz) > 0.1) 
                inf += gravity_factor * sqrt(gravity) * distVec / dist;
        }

        // inf = x * dot(inf, x) / length(x) / length(x);
        gl_Position = mat_projection * vec4(relX + inf, 1.);
        return;
    }
    gl_Position = mat_projection * vec4(x + inf, 1.);
}