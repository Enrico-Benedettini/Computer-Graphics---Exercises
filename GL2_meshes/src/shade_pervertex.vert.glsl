// Vertex attributes, specified in the "attributes" entry of the pipeline
attribute vec3 vertex_position;
attribute vec3 vertex_normal;

// Per-vertex outputs passed on to the fragment shader

/* #TODO GL2.3
	Pass the values needed for per-pixel
	Create a vertex-to-fragment variable.
*/
varying vec3 color;

// Global variables specified in "uniforms" entry of the pipeline
uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals_to_view;

uniform vec3 light_position; //in camera space coordinates already

uniform vec3 material_color;
uniform float material_shininess;
uniform vec3 light_color;

void main() {
	float material_ambient = 0.1;

	/** #TODO GL2.3 Gouraud lighting
	Compute the visible object color based on the Blinn-Phong formula.

	Hint: Compute the vertex position, normal and light_position in eye space.
	Hint: Write the final vertex position to gl_Position
	*/
    vec3 ma = material_color * material_ambient;
    
    vec3 x = (mat_model_view * vec4(vertex_position, 1.)).xyz;

    vec3 n = normalize(mat_normals_to_view * vertex_normal);
    vec3 v = vec3(0., 0., 1.);
    vec3 l = normalize(light_position - x);
    vec3 h = normalize(l + v);

    float diffuse = (0.);
    float specular = (0.);
    if (dot(n, l) > 0.) {
        diffuse = dot(n, l);

        if (dot(h, n) > 0.) {
            specular = pow(dot(h, n), material_shininess);
        }
    }

    color = ma + light_color * (specular + diffuse) * material_color;

	gl_Position = mat_mvp * vec4(vertex_position, 1);
}
