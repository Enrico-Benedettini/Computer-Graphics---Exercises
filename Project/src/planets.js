import { vec2, vec3, vec4, mat3, mat4 } from "../lib/gl-matrix_3.3.0/esm/index.js"
import { mat4_matmul_many } from "./icg_math.js"

import { mulberry32 } from './utils.js'

import { Hexasphere } from '../lib/hexasphere/src/hexasphere.js'

const MIN_PLANET_COUNT = 1;
const MAX_PLANET_COUNT = 20;

const vec3_tmp1 = vec3.create();
const vec3_tmp2 = vec3.create();

const compute_tri_normals = (p1, p2, p3) => {
    const normal = vec3.create();

    vec3.subtract(vec3_tmp1, p2, p1);
    vec3.subtract(vec3_tmp2, p3, p1);
    vec3.cross(normal, vec3_tmp1, vec3_tmp2)

    return normal;
}

const compute_temperature = (sunTemp, sunRad, distance) => 
    sunTemp * Math.sqrt(sunRad / distance / 2.);

function generate_sun(seed) {
    const rand = mulberry32(seed);

    return {
        name: 'sun',
        size: rand(3, 10),
        temperature: rand(10, 15) / 2,
        rotation_speed: 0,

        movement_type: 'planet',
        orbit: null,

        shader_type: 'unshaded',
        texture_name: 'sun.jpg',
    };
}

function generate_solar_system(seed, sun) {
    console.time("generate_solar_system");

    const rand = mulberry32(seed);

    noise.seed(seed);

    const planets = [];

    const planet_count = rand(MIN_PLANET_COUNT, MAX_PLANET_COUNT);

    const self_rotation_dir = rand(0, 1) ? 1 : -1;

    let planet_distance = sun.size * 1.1;

    for (let i = 0; i < planet_count; ++i) {
        const planet_size = rand(10 + i, 40 + i) / 4.;

        planet_distance += planet_size + rand(10, 20) / 10.

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
            seed: rand(),
            mat_mvp: mat4.create(),
            mat_mv: mat4.create(),
            temperature: compute_temperature(sun.temperature, sun.size, planet_distance),
        });

        planet_distance += planet_size;
    }

    console.timeEnd("generate_solar_system");

    return planets;
}

export function spawn_mesh_on_planet(planet, tileNormal) {
    const normalVector = vec3.normalize(vec3.create(), tileNormal);

    const theta = Math.acos(normalVector[2]);
    const phi = Math.atan2(normalVector[1], normalVector[0]);

    console.log(normalVector, theta, phi);
    
    planet.actors.push({
        name: 'rocksA_forest.obj',
        parent: planet,
        translation: tileNormal,
        mat_mvp: mat4.create(),
        rotation: {
            phi,
            theta,
        }
    });
}

export function generate_planet_mesh(planet) {
    if (typeof planet !== 'object' || planet.length != undefined) {
        return;
    }

    const vertices = [];
    const faces = [];
    const normals = [];
    const noises = [];
    const centers = [];

    planet.actors = [];

    const sphere = new Hexasphere(planet.size, Math.ceil(planet.size * 1.2), 1.);

    const noise_speed = 1.4 / planet.size;

    const noise_offset = planet.seed % 255;

    const nullVector = [0, 0, 0];

    for (const tile of sphere.tiles) {

        let tileNoise = Math.max(0, noise.perlin3(
            tile.centerPoint.x * noise_speed + noise_offset,
            tile.centerPoint.y * noise_speed,
            tile.centerPoint.z * noise_speed
        )) * 0.15;

        if (tileNoise > 0) {
            tileNoise += 0.0015 * planet.size;
        }

        const additionalHeight = planet.name === 'sun' ? nullVector : [
            tile.centerPoint.x * tileNoise,
            tile.centerPoint.y * tileNoise,
            tile.centerPoint.z * tileNoise
        ];

        const vertIdx = vertices.length;

        const faceCount = tile.boundary.length;

        const centerPoint = [
            Number(tile.centerPoint.x) + additionalHeight[0],
            Number(tile.centerPoint.y) + additionalHeight[1],
            Number(tile.centerPoint.z) + additionalHeight[2],
        ];

        const perp_normal = [
            Number(tile.centerPoint.x) + additionalHeight[0],
            Number(tile.centerPoint.y) + additionalHeight[1],
            Number(tile.centerPoint.z) + additionalHeight[2],
        ];

        // Top tiles
        for (const boundary of tile.boundary) {
            const vert = [
                Number(boundary.x) + additionalHeight[0],
                Number(boundary.y) + additionalHeight[1],
                Number(boundary.z) + additionalHeight[2],
            ];
            vertices.push(vert)
            normals.push(tileNoise > 0. ? perp_normal : vert);
            noises.push(tileNoise);
            centers.push(centerPoint)
        }

        // Top tiles
        faces.push([vertIdx, vertIdx + 1, vertIdx + 2])
        faces.push([vertIdx, vertIdx + 2, vertIdx + 3])
        faces.push([vertIdx, vertIdx + 3, vertIdx + 4])
        if (faceCount > 5) {
            faces.push([vertIdx, vertIdx + 4, vertIdx + 5]);
        }

        if (tileNoise <= 0. || planet.name === 'sun') {
            continue;
        }

        // spawn_mesh_on_planet(planet, perp_normal);

        const border_normal = [
            Number(tile.centerPoint.x),
            Number(tile.centerPoint.y),
            Number(tile.centerPoint.z),
        ];

        // Borders
        for (const boundary of tile.boundary) {
            normals.push(border_normal);
            vertices.push([
                Number(boundary.x),
                Number(boundary.y),
                Number(boundary.z),
            ])
            noises.push(tileNoise);
            centers.push(centerPoint)
        }

        // borders
        faces.push([vertIdx, vertIdx + 1, vertIdx + faceCount]);
        faces.push([vertIdx + 1, vertIdx + faceCount, vertIdx + faceCount + 1]);

        faces.push([vertIdx + 1, vertIdx + 2, vertIdx + faceCount + 1]);
        faces.push([vertIdx + 2, vertIdx + faceCount + 1, vertIdx + faceCount + 2]);

        faces.push([vertIdx + 2, vertIdx + 3, vertIdx + faceCount + 2]);
        faces.push([vertIdx + 3, vertIdx + faceCount + 2, vertIdx + faceCount + 3]);

        faces.push([vertIdx + 3, vertIdx + 4, vertIdx + faceCount + 3]);
        faces.push([vertIdx + 4, vertIdx + faceCount + 3, vertIdx + faceCount + 4]);

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

    planet.mesh = { 
        vertices, 
        faces, 
        normals, 
        noise: noises, 
        centers, 
        distance_from_sun: planet.orbit_radius,
        temperature: planet.temperature,
    };
}

/*
    Construct the scene!
*/
export function create_scene_content(seed) {
    console.time("create_scene_content");

    const sun = generate_sun(seed);
    const planets = generate_solar_system(seed, sun);

    const actors = [sun].concat(planets)

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

    console.timeEnd("create_scene_content");

    // Construct scene info
    return {
        sim_time: 0.,
        actors: actors,
        actors_by_name: actors_by_name,
        meshes: actors.flatMap(a => a.actors).filter(x => x != null),
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
        mat4.identity(M_scale);

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
                noise: regl.prop('mesh.noise'),
                center: regl.prop('mesh.centers'),
                // position: mesh_uvsphere.vertex_positions,
                // tex_coord: mesh_uvsphere.vertex_tex_coords,
            },

            // Faces, as triplets of vertex indices
            elements: regl.prop('mesh.faces'),

            // Uniforms: global data available to the shader
            uniforms: {
                temperature: regl.prop('mesh.temperature'),
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

        const mat_model_view = mat4.create()
        const tmp = mat3.create();

        // For each planet, construct information needed to draw it using the pipeline
        for (const actor of scene_info.actors) {

            // Choose only planet using this shader
            if (actor.shader_type === 'unshaded') { 
                const mat_model_view = mat4.create()
                const mat_mvp = mat4.create()
                const mat_normals_to_view = mat3.create()

                mat3.identity(mat_normals_to_view)

                mat4_matmul_many(mat_model_view, mat_view, actor.mat_model_to_world)
                mat4_matmul_many(mat_mvp, mat_projection, mat_model_view);

                mat3.fromMat4(mat_normals_to_view, mat4.invert(mat4.create(), mat4.transpose(mat4.create(), mat_model_view)));

                actor.mvp = mat_mvp;
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
                    planet_size: actor.size,
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

