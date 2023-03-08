Task RT1.1: Implement Ray-Plane intersections

For this exercise, the solution was based on the slides where the explicit ray equation is inserted into the implicit equation for the plane. 
From there one can solve for the t.

The normal that is returned needs also be checked if it should be negative or positive which is determined from sign of the t value.



Task RT1.2.1: Derive the expression for a Ray-Cylinder intersection

Starting by looking at the derivation of the Ray-Sphere intersection as walked through in the slides.
From here the implicit equation of the sphere needed to be replaced by the one for the cylinder.
Substituting into this equation and setting it up as a quadratic equation made it possible to find the value of t. 
More in depth explanation of the derivation and some problems we encountered can be read from the pdf file corresponding to this exercise.



Task RT1.2.2: Implement Ray-Cylinder intersections

This exercise was solved by implementing the expression that was derived from the previous exercise.
During the implementation there was also a lot of comparisons to make to the implementation for the ray-sphere intersection.
However we still struggled a lot to implement the correct orientation for the cylinders.




Each of us contributed equally to the completion of this exercise, with the following contribution from each of us:
Enrico Benedettini: 0.33
Anders Rolighed Larsen: 0.33
Clèment Chamillot: 0.33