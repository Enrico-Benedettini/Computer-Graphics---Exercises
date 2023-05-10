import { vec2, vec3, vec4, mat3, mat4 } from "../lib/gl-matrix_3.3.0/esm/index.js"
import { mat4_matmul_many } from "./icg_math.js"

import { mulberry32 } from './utils.js'

import { Hexasphere } from '../lib/hexasphere/src/hexasphere.js'

const MIN_PLANET_COUNT = 1;
const MAX_PLANET_COUNT = 20;

function generate_solar_system(seed) {
    const rand = mulberry32(seed);

    noise.seed(seed);

    const planets = [];

    const planet_count = rand(MIN_PLANET_COUNT, MAX_PLANET_COUNT);

    const self_rotation_dir = rand(0, 1) ? 1 : -1;

    let planet_distance = 2.5;

    for (let i = 0; i < planet_count; ++i) {
        const planet_size = rand(5, 40) / 4.;

        planet_distance += planet_size * 4.5 + rand(10, 20) / 15.;

        planets.push({
            name: 'planet' + i,
            size: planet_size,
            rotation_speed: rand(1, 100) / 20500 / Math.sqrt(planet_size) * Math.sqrt(planet_distance) * self_rotation_dir,

            movement_type: 'planet',
            orbit: 'sun',
            orbit_radius: planet_distance,
            orbit_speed: rand(20, 100) / 100. / Math.sqrt(planet_distance),
            orbit_phase: rand(0, 360) / 180. * Math.PI,
            orbital_inclination: (rand(0, 14) - 7) / 180. * Math.PI,

            shader_type: 'unshaded',
            texture_name: 'earth_day.jpg',

        });
    }

    console.log("planet_count: ", planet_count);
    console.log("Planets: ", planets);

    return planets;
}


function are_faces_equal(face1, face2) {
    let matchCount = 0;
    for (const p1 of face1.points) {
        for (const p2 of face2.points) {
            if (p1.x === p2.x && p1.y === p2.y && p1.z === p2.z) {
                matchCount++;
                if (matchCount >= 3) {
                    return true;
                }
            }
        }
    }
    return false;
}


export function generate_planet_mesh(planet) {
    if (typeof planet !== 'object' || planet.length != undefined) {
        return;
    }

    let vertices = [];
    let faces = [];
    let normals = [];

    const sphere = new Hexasphere(planet.size / 3., 10, 1.);

    const noise_speed = 1.1;

    for (const tile of sphere.tiles) {

        const tileNoise = Math.max(0, noise.perlin3(
            tile.centerPoint.x * noise_speed, 
            tile.centerPoint.y * noise_speed, 
            tile.centerPoint.z * noise_speed
        ) * 0.15);

        const additionalHeight = planet.name === 'sun' ? [
            0,0,0
        ] : [
            tile.centerPoint.x * tileNoise,
            tile.centerPoint.y * tileNoise,
            tile.centerPoint.z * tileNoise
        ];

        const vertIdx = vertices.length;

        const faceCount = tile.boundary.length;

        // Top tiles
        for (const boundary of tile.boundary) {
            normals.push([tile.centerPoint.x, tile.centerPoint.y, tile.centerPoint.z]);
            vertices.push([
                Number(boundary.x) + additionalHeight[0], 
                Number(boundary.y) + additionalHeight[1], 
                Number(boundary.z) + additionalHeight[2],
            ])
        }

        // Borders
        for (const boundary of tile.boundary) {
            normals.push([tile.centerPoint.x, tile.centerPoint.y, tile.centerPoint.z]);
            vertices.push([
                Number(boundary.x), 
                Number(boundary.y), 
                Number(boundary.z),
            ])
        }

        // Top tiles
        faces.push([0,1,2].map(x => x + vertIdx))
        faces.push([0,2,3].map(x => x + vertIdx))
        faces.push([0,3,4].map(x => x + vertIdx))
        if (faceCount > 5) {
            faces.push([0,4,5].map(x => x + vertIdx))
        }

        // borders
        faces.push([0, 1, faceCount].map(x => x + vertIdx));
        faces.push([1, faceCount, faceCount + 1].map(x => x + vertIdx));

        faces.push([1, 2, faceCount + 1].map(x => x + vertIdx));
        faces.push([2, faceCount + 1, faceCount + 2].map(x => x + vertIdx));

        faces.push([2, 3, faceCount + 2].map(x => x + vertIdx));
        faces.push([3, faceCount + 2, faceCount + 3].map(x => x + vertIdx));
        
        faces.push([3, 4, faceCount + 3].map(x => x + vertIdx));
        faces.push([4, faceCount + 3, faceCount + 4].map(x => x + vertIdx));
        
        if (faceCount > 5) {
            faces.push([4, 5, faceCount + 4].map(x => x + vertIdx));
            faces.push([5, faceCount + 4, faceCount + 5].map(x => x + vertIdx));
            
            faces.push([5, 0, faceCount].map(x => x + vertIdx));
            faces.push([5, faceCount + 5, faceCount].map(x => x + vertIdx));
        }
        else {
            faces.push([4, 0, faceCount].map(x => x + vertIdx));
            faces.push([4, faceCount + 4, faceCount].map(x => x + vertIdx));
        }
    }

    planet.mesh = { vertices, faces, normals };
}

/*
    Construct the scene!
*/
export function create_scene_content(seed) {
    const planets = generate_solar_system(seed);

    const actors = [
        {
            name: 'sun',
            size: 2.5,
            rotation_speed: 0.1,

            movement_type: 'planet',
            orbit: null,

            shader_type: 'unshaded',
            texture_name: 'sun.jpg',
        }
    ].concat(planets)

    for (const planet of actors) {
        generate_planet_mesh(planet);
    }

    // In each planet, allocate its transformation matrix
    for (const actor of actors) {
        actor.mat_model_to_world = mat4.create()
    }

    // Lookup of actors by name
    const actors_by_name = {}
    for (const actor of actors) {
        actors_by_name[actor.name] = actor
    }

    // Construct scene info
    return {
        sim_time: 0.,
        actors: actors,
        actors_by_name: actors_by_name,
    }
}


const M_orbit = mat4.create();
const M_translation = mat4.create();
const M_selfRotation = mat4.create();
const M_scale = mat4.create();
const M_inclination = mat4.create();

export class SysOrbitalMovement {

    constructor() {
    }

    calculate_model_matrix(actor, sim_time, actors_by_name) {
        mat4.identity(M_orbit);
        mat4.identity(M_translation);

        if (actor.orbit !== null) {
            // Parent's translation
            const parent = actors_by_name[actor.orbit]
            const parent_translation_v = mat4.getTranslation([0, 0, 0], parent.mat_model_to_world)

            // Orbit around the parent
            mat4.fromTranslation(M_translation, [-actor.orbit_radius, 0, 0]);
            mat4.fromZRotation(M_orbit, sim_time * actor.orbit_speed + actor.orbit_phase);
            mat4.fromYRotation(M_inclination, actor.orbital_inclination);
            mat4.multiply(M_orbit, M_orbit, M_translation);
            mat4.fromTranslation(M_translation, parent_translation_v);
            mat4.multiply(M_translation, M_translation, M_inclination)
        }

        mat4.fromZRotation(M_selfRotation, sim_time * actor.rotation_speed + Math.PI);
        mat4.fromScaling(M_scale, [actor.size, actor.size, actor.size]);

        // Store the combined transform in actor.mat_model_to_world
        mat4_matmul_many(actor.mat_model_to_world, M_translation, M_orbit, M_selfRotation, M_scale);
    }

    simulate(scene_info) {

        const { sim_time, actors, actors_by_name } = scene_info

        // Iterate over actors which have planet movement type
        for (const actor of actors) {
            if (actor.movement_type === 'planet') {
                this.calculate_model_matrix(actor, sim_time, actors_by_name)
            }
        }
    }

}

/*
    Draw the actors with 'unshaded' shader_type
*/
export class SysRenderPlanetsUnshaded {

    constructor(regl, resources) {
        // Keep a reference to textures
        this.resources = resources;

        this.pipeline = regl({
            attributes: {
                normal: regl.prop('mesh.normals'),
                position: regl.prop('mesh.vertices'),
                // position: mesh_uvsphere.vertex_positions,
                // tex_coord: mesh_uvsphere.vertex_tex_coords,
            },

            // Faces, as triplets of vertex indices
            elements: regl.prop('mesh.faces'),

            // Uniforms: global data available to the shader
            uniforms: {
                planet_size: regl.prop('planet_size'),
                light_position_cam: regl.prop('light_position_cam'),
                mat_mvp: regl.prop('mat_mvp'),
                mat_normals: regl.prop('mat_normals'),
                planet_center: regl.prop('planet_center'),
                mat_model_view: regl.prop('mat_model_view'),
            },

            vert: regl.prop('vert'),
            frag: regl.prop('frag'),
        })
    }

    render(frame_info, scene_info) {
        /* 
        We will collect all objects to draw with this pipeline into an array
        and then run the pipeline on all of them.
        This way the GPU does not need to change the active shader between objects.
        */
        const entries_to_draw = []

        // Read frame info
        const { mat_projection, mat_view, light_position_cam } = frame_info

        // For each planet, construct information needed to draw it using the pipeline
        for (const actor of scene_info.actors) {

            // Choose only planet using this shader
            if (actor.shader_type === 'unshaded') {
                
                const mat_model_view = mat4.create()
                const mat_mvp = mat4.create()
                const mat_normals_to_view = mat3.create()

                const tmp = mat3.create();

                mat3.identity(mat_normals_to_view)
                
                mat4_matmul_many(mat_model_view, mat_view, actor.mat_model_to_world)
                mat4_matmul_many(mat_mvp, mat_projection, mat_model_view);
                
                mat3.fromMat4(mat_normals_to_view, mat4.invert(mat4.create(), mat4.transpose(mat4.create(), mat_model_view)));

                
                mat4_matmul_many(tmp, mat_projection, mat_view)
		        // Calculate light position in camera frame
		        //vec3.transformMat4(light_position_cam, [0,0,0], tmp)

                const shaders = actor.name === 'sun' ? { 
                    vert: this.resources['sun.vert.glsl'],
                    frag: this.resources['sun.frag.glsl'],
                } : {
                    vert: this.resources['planet.vert.glsl'],
                    frag: this.resources['planet.frag.glsl'],
                }

                entries_to_draw.push({
                    mesh: actor.mesh,
                    planet_size: actor.size ?? 0,
                    light_position_cam,
                    mat_model_view,
                    mat_mvp: mat_mvp,
                    mat_normals: mat_normals_to_view,
                    ...shaders
                });
            }
        }

        // Draw on the GPU
        this.pipeline(entries_to_draw)
    }
}

