import { vec2, vec3, vec4, mat3, mat4 } from "../lib/gl-matrix_3.3.0/esm/index.js"
import { mat4_matmul_many } from "./icg_math.js"

import { mulberry32 } from './utils.js'

import { Hexasphere } from '../lib/hexasphere/src/hexasphere.js'

const MIN_PLANET_COUNT = 4;
const MAX_PLANET_COUNT = 15;



function generate_solar_system(seed) {
    const rand = mulberry32(seed);

    const planets = [];

    const planet_count = rand(MIN_PLANET_COUNT, MAX_PLANET_COUNT);

    const self_rotation_dir = rand(0, 1) ? 1 : -1;

    let planet_distance = 2.5;

    for (let i = 0; i < planet_count; ++i) {
        const planet_size = rand(2, 20) / 4.;

        planet_distance += planet_size * 3 + rand(10, 20) / 15.;

        planets.push({
            name: 'planet' + i,
            size: planet_size,
            rotation_speed: rand(1, 100) / 500 / Math.sqrt(planet_size) *
                Math.sqrt(planet_distance) * self_rotation_dir,

            movement_type: 'planet',
            orbit: 'sun',
            orbit_radius: planet_distance,
            orbit_speed: rand(20, 100) / 100. / Math.sqrt(planet_distance),
            orbit_phase: rand(1, 20) / 10,
            orbital_inclination: (rand(0, 14) - 7) / 180. * Math.PI,

            shader_type: 'unshaded',
            texture_name: 'earth_day.jpg',

        });
    }

    console.log("planet_count: ", planet_count);
    console.log("Planets: ", planets);

    return planets;
}



export function generate_planet_mesh(planet) {
    if (typeof planet !== 'object' || planet.length != undefined) {
        return;
    }

    let vertices = [];
    let faces = [];

    const sphere = new Hexasphere(planet.size / 2, 10, 0.9);

    for (const tile of sphere.tiles) {

        for (const face of tile.faces) {
            const vertIdx = vertices.length;

            vertices.push([
                Number(face.points[0].x),
                Number(face.points[0].y),
                Number(face.points[0].z)
            ]);

            vertices.push([
                Number(face.points[1].x),
                Number(face.points[1].y),
                Number(face.points[1].z)
            ]);

            vertices.push([
                Number(face.points[2].x),
                Number(face.points[2].y),
                Number(face.points[2].z)
            ]);

            faces.push([vertIdx, vertIdx + 1, vertIdx + 2])
        }
    }

    planet.mesh = { vertices, faces };
}

/*
    Construct the scene!
*/
export function create_scene_content() {
    const planets = generate_solar_system(12);

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
        if (!actor) { console.log(actor) }
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
        this.resources = resources

        const mesh_uvsphere = this.resources.mesh_uvsphere

        this.pipeline = regl({
            attributes: {
                position: regl.prop('mesh.vertices'),
                // position: mesh_uvsphere.vertex_positions,
                tex_coord: mesh_uvsphere.vertex_tex_coords,
            },
            // Faces, as triplets of vertex indices
            elements: regl.prop('mesh.faces'),

            // Uniforms: global data available to the shader
            uniforms: {
                mat_mvp: regl.prop('mat_mvp'),
                texture_base_color: regl.prop('tex_base_color'),
            },

            vert: resources['unshaded.vert.glsl'],
            frag: resources['unshaded.frag.glsl'],
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
        const { mat_projection, mat_view } = frame_info

        // For each planet, construct information needed to draw it using the pipeline
        for (const actor of scene_info.actors) {

            // Choose only planet using this shader
            if (actor.shader_type === 'unshaded') {

                const mat_mvp = mat4.create()

                // #TODO GL1.2.1.2
                // Calculate mat_mvp: model-view-projection matrix	
                mat4_matmul_many(mat_mvp, mat_projection, mat_view, actor.mat_model_to_world);

                entries_to_draw.push({
                    mesh: actor.mesh,
                    mat_mvp: mat_mvp,
                    tex_base_color: this.resources[actor.texture_name],
                })
            }
        }

        // Draw on the GPU
        this.pipeline(entries_to_draw)
    }
}

