Task GL1.1.1: 2D translation in shader

For this exercise it was just about adding the mouse_offset to the position inside the vector.
Changing the names called to the true variables.



Task GL1.1.2: 2D matrix transform

Multiplying with the transformation matrix to the correct side of the vector.
This exercise highlights what happens if you first multiply by rotation vs translation, as that is the only difference between the two triangles being created.



Task GL1.2.1: MVP matrix

Same solution as for the triangles.
The model to the world is constructed by using matmul_many in the correct order, with the projection and then the view.



Task GL1.2.2: View matrix

We are finding the coordinates in terms of the spherical coordinate system, with the complementary axis coordinate system.
Then we use the LookAt function with the change to the up-vector, that takes into account when the camera angle exceeds 360 degrees and still not flips.
This is done by using modulo functions towards the angles as can be seen in the code, to account for the correct orientation at all times around the objects.

Then the turntable mat is multiplied with the look_at returns.



Task GL1.2.3: Model matrix
By following the pipeline in the code, first the object's orientation around the parent planet is found and translated, then the object is translated further by the scale and its own rotation around its Z-axis. We experienced that our objects' rotations were off by the value of PI to begin with (compared to the pictures provided as the solution), which confuses us to this point, but was solved by starting them with the additional PI rotation.  '




The total work done for this exercise was divided evenly amongst the group participants:
Anders Larsen (366794): 1/3
Clement Charmillot (307877): 1/3
Enrico Benedettini (367181): 1/3

Group 32.
