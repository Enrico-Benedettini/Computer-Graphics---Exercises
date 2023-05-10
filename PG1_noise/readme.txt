Task PG1.2.1: 1D noise

We compute the formula with the provided values
We had to modularize the hash to get one of the twelve gradients because the values given by the hash_poly function gave value in 0..288 

Task PG1.3.1: FBM 1D

We simply implement the sum that is described in the given formula.

Task PG1.4.1: 

We simply repeat what we aleady for the 1D noise but with 2d vectors and we follow the steps provided in the images.

Task PG1.4.2: 

We repeat what we did in 1.3.1 but renaiming one variable.

Task PG1.4.3: 

We did the same as for 1.4.2 but we now evaluate the absolute value of the octaves.

Task PG1.5.1: 

We translate the provided formulas for Wood, Map and Marble to code

Task PG1.6.1: 

There, we first generate the terrain by computing the vertices normalizing the gx and gy based on the grid width and height, and reducing them by 0.5 to fit in the [-0.5,0.5] square. As suggested, we check that if the heigth is less than the Water Level, we set the normals to [0,0,1].
Finally we push the faces [va,vb,vc] and [vb,vd,vc].
Then, we copy paste for the camera and blinn-phong model and we set the shininess and material color based on the heigth:
 - if below the level of water, we set shininess to 30. and material color to water
 - otherwise, we set shininess to 2. and material color to be interpolated between the grass and the mountain

Each of us contributed equally to the completion of this exercise, with the following contribution from each of us:
Enrico Benedettini: 0.33
Anders Rolighed Larsen: 0.33
Clèment Chamillot: 0.33
