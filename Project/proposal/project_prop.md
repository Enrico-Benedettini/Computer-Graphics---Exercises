# Project Proposition

As proposed by group 32 consisting of:

- Anders Larsen sciper: 366794
- Charmillot Clément: 307877
- Enrico Benedettini: 367181

# Introduction

## Title: "Solar system with biomes per planet"

This project aims to create an interactive scene that will showcase the generated content. The scene will consist of a solar system with different planets featuring different terrains and biomes depending on their location in the solar system. Planets closer from the sun will have a more desert-like appearance with cacti for example and the opposite for planets far from the sun.
The solar system won't be at scale and plants will be enlarged so they can be seen from the scene. 

![](./system_distance.png)

* Distance between the planets *
  ![](./image.png)
* Rough estimate of the scale of the plants and terrain on the planet (Image credit: Reddit) *

# Goals and Deliverables

The core of the project and what is proposed as the requirement for a passing grade, is a clear showcase of the understanding of the procedural generation. Using what is learned from the course to generate different biomes in the solar system environment setup. With a focus on the techniques to generate plants and other flora on the surfaces and add more layers on top of the generation to make it more realistic, the requirement will be to highlight various different techniques to generate said biomes in a solar system environment where the user can move around and inspect the different aspects real-time. The enviroment with planets and biomes is fully rendered, with the extensions as mentioned below.

## Extensions

- Terrain generation
- Make plant switch state based on Day-Night cycle (close flowers, make other plants bend)
- Make water terrain change based on the location of orbiting moon (over-exaggerate)

# Schedule

- Week 1: Procedural solar system generation
  - Setup the coding environment (Everybody)
  - Implement a solar system-like procedural generation algorithm. (Anders)
  - Implement the mesh render of the planets as sphere of hexagons. (Clément)
  - Implement the shader for the planets. (Enrico)
  - Implement the orbit of the planets. (Anders)
  - Implement the shadows for the light emitted from the sun. (Clément)
- Week 2: Plant generation
  - Implement the procedural generation of a single plants with some variation as different types of plant. (Enrico)
  - Implement the procedural generation of plants on the planet. (Anders)
  - Implement the plant shader. (Clément)
- Week 3: Terrain generation (Hexagons for the surface of the planets to simplify the texture and allow for simpler differentiating of biomes).
  - Implement the noise function to generate terrain heightmap. (Enrico)
  - Edit the planet shader to render textures based on the heightmap and distance from the sun. (Anders)
  - Adjust the plant position to take into account the terrain. (Clément)
  - Edit the procedural algorithm that places plants on the planet to take into account the terrain type. (Enrico)
- Week 4: Make plant switch state based on Day-Night cycle
  - Implement a night version of the generation for each plant. (Anders)
  - Make plants switch to their night version when they are in the shadow of a planet. (Clément)
- Week 5: Moon influence on water + other interesting features that might arise. (Enrico)
