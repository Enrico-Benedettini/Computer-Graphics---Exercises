precision mediump float;

/* #TODO GL3.2.3
	Setup the varying values needed to compue the Phong shader:
	* surface normal
	* view vector: direction to camera
*/
varying vec3 n;
varying vec3 v;

uniform samplerCube cube_env_map;

void main()
{
	/*
	/* #TODO GL3.2.3: Mirror shader
	Calculate the reflected ray direction R and use it to sample the environment map.
	Pass the resulting color as output.
	*/
    
	// gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range

    vec3 p = dot(n, v) * n;
    vec3 b = -v + p;
    vec3 refl = b + p;

    gl_FragColor = textureCube(cube_env_map, refl);
}
