Task GL3.1.1: Sampling a texture

For this esercise, we simply set the output to return the sample at the UV coordinates.


Task GL3.1.2: UV coordinates and wrapping modes
Setting the correct wrapping to 'repeat' and extending the coordinates to [0,4].


Task GL3.2.1: Projection matrix for a cube camera
Using the projection function with the correct fovy of Pi/2 as per the environment.



Task GL3.2.2: Up vectors for cube camera
Simply setting the cube face directory as the coordinates in figure 1.
The cube face up vectors are constructed in a manner that reflects the direction of the coordinates if you look at it from either of the planes x, y or z.



Task GL3.2.3: Reflection shader
Projecting the view onto the normal.
Then negating the view it to showcase the opposite direction, which is the direction of the reflection.
Then adding back projection to bring the reflection into its correct orientation.



Task GL3.3.2 Blend Options
We had some issues that will be described here together with the solutions we came across:
  - in unshaded.frag.glsl we needed to multiply the texture color with the color factor gl_FragColor = texture2D(tex_color, v2f_uv)*color_factor;
  - We needed to remove the ambient light calculation from the phong model used in GL2.

The final blending parameters were as such:
		blend: {
				enable: true,
                func: {
                    src: 'one',
                    dst: 'one',
                },
			},
By using 'one' in src and dst means that you then just add up all the passes.




The total work done for this exercise was divided evenly amongst the group participants:
Anders Larsen (366794): 1/3
Clement Charmillot (307877): 1/3
Enrico Benedettini (367181): 1/3

Group 32.