Task GL2.1.1: Compute triangle normals and opening angles

To compute the triangle normals we first take the normals of each side and evaluate the weight by computing each of the angles of the triangle and pushed those values in the indicated arrays.


Task GL2.1.2: Compute vertex normals

There, we start by accessing the current weights (at index i_face) and simply scale the normal vector by the weight storing the value in the vertex normals.


Task GL2.2.1: Pass normals to fragment shader

We set up the model view project by setting up the model view matrix by multiplying the view and actor model to world and then multiplying all the matrixes together into the model view projected. Then we simply set the normal to the vertex normal, and we normalize the color to the given value.

Task GL2.2.2: Transforming the normals

There we evaluate the three matrices as mentioned above and then evaluate the inverse of the transpose converting it to a mat3 matrix from the original model view matrix and putting it in the normals to view matrix. 


Task GL2.3: Gouraud lighting

We computed the normal and positions according to camera coordinates and then used the same process as for the lighting assignment.

Task GL2.4: Phong lighting

Here again, we simply applied the Phong lighting but per pixel.


The total work done for this exercise was divided evenly amongst the group participants:
Anders Larsen (366794): 1/3
Clement Charmillot (307877): 1/3
Enrico Benedettini (367181): 1/3

Group 32.
