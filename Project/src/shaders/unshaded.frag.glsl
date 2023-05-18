precision mediump float;
		
// varying vec2 v2f_tex_coord;

// uniform sampler2D texture_base_color;

void main()
{
	// vec3 color_from_texture = texture2D(texture_blase_color, v2f_tex_coord).rgb;
	gl_FragColor = vec4(1., 0., 0., 1.); // output: RGBA in 0..1 range
}