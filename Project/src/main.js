
import { createREGL } from "../lib/regljs_2.1.0/regl.module.js"
import { vec2, vec3, vec4, mat3, mat4 } from "../lib/gl-matrix_3.3.0/esm/index.js"
import {icg_mesh_load_obj} from "./icg_mesh.js"

import { DOM_loaded_promise, load_text, load_texture, register_keyboard_action } from "./icg_web.js"
import { deg_to_rad, mat4_to_string, vec_to_string, mat4_matmul_many } from "./icg_math.js"
import { icg_mesh_make_uv_sphere } from "./icg_mesh.js"
import { SystemRenderGrid } from "./icg_grid.js"

import { create_scene_content, SysOrbitalMovement, SysRenderPlanetsUnshaded, compute_transforms } from "./planets.js"
import { SysRenderMesh } from "./mesh.js"

import {CanvasVideoRecording} from "./icg_screenshot.js"


function get_seed() {
    return new URLSearchParams(window.location.search).get('seed') ?? 120;
}


async function load_resources(regl) {
    /*
    The textures fail to load when the site is opened from local file (file://) due to "cross-origin".
    Solutions:
    * run a local webserver
        caddy file-server -browse -listen 0.0.0.0:8000
        # or
        python -m http.server 8000
        # open localhost:8000
    OR
    * run chromium with CLI flag
        "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --allow-file-access-from-files index.html
    	
    * edit config in firefox
        security.fileuri.strict_origin_policy = false
    */

    // Start downloads in parallel
    const resource_promises = {}


    const meshes_to_load = [
        "rocksA_forest.obj",
        "cactus.obj",
        "tree_desert.obj",
        "tree_forest.obj",        
        "mountain.obj",        
        "statue_obelisk.obj",   
        "statue_head.obj",   
        "statue_column.obj",
        "tent_smallOpen.obj",
        "rocket.obj",
        "rover.obj"
    ];

    for (const mesh_name of meshes_to_load) {
        resource_promises[mesh_name] = icg_mesh_load_obj(regl, `./meshes/${mesh_name}`)
    }

    const textures_to_load = [
        
    ]
    for (const tex_name of textures_to_load) {
        resource_promises[tex_name] = load_texture(regl, `./textures/${tex_name}`)
    }


    const shaders_to_load = [
        'unshaded.vert.glsl', 'unshaded.frag.glsl',
        'phong.vert.glsl', 'phong.frag.glsl',
        'earth.frag.glsl', 'sun.vert.glsl',
        'sun.frag.glsl',
        'planet.frag.glsl', 'planet.vert.glsl',
        'billboard.vert.glsl', 'billboard_sunglow.frag.glsl',
        'plant.vert.glsl', 'plant.frag.glsl',
    ]
    for (const shader_name of shaders_to_load) {
        resource_promises[shader_name] = load_text(`./src/shaders/${shader_name}`)
    }

    const resources = {}

    // Construct a unit sphere mesh
    // UV sphere https://docs.blender.org/manual/en/latest/modeling/meshes/primitives.html#uv-sphere
    // we create it in code instead of loading from a file
    resources['mesh_uvsphere'] = icg_mesh_make_uv_sphere(15)

    // Wait for all downloads to complete
    for (const [key, promise] of Object.entries(resource_promises)) {
        resources[key] = await promise
    }

    return resources
}
const z_rot = mat4.create();
const y_rot = mat4.create();
const cam_rot = mat4.create();

async function main() {
    /* const in JS means the variable will not be bound to a new value, but the value can be modified (if its an object or array)
        https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const
    */

    // We are using the REGL library to work with webGL
    // http://regl.party/api
    // https://github.com/regl-project/regl/blob/master/API.md
    const regl = createREGL({
        profile: true, // if we want to measure the size of buffers/textures in memory
    })
    // The <canvas> (HTML element for drawing graphics) was created by REGL, lets take a handle to it.
    const canvas_elem = document.getElementsByTagName('canvas')[0]

    canvas_elem.width = 1920;
    canvas_elem.height = 1080;


    /*---------------------------------------------------------------
        Scene and systems
    ---------------------------------------------------------------*/
    const resources = await load_resources(regl)

    const seed = new URLSearchParams(window.location.search).get('seed') * 1 ?? 120;;

    // document.getElementById('seed').innerHTML = `Seed: ${seed}`
    const scene_info = create_scene_content(seed)

    const sys_orbital_movement = new SysOrbitalMovement()

    const sys_render_unshaded = new SysRenderPlanetsUnshaded(regl, resources)

    // const sys_render_grid = new SystemRenderGrid(regl, resources)

    const sys_render_mesh = new SysRenderMesh(regl, resources)


    /*---------------------------------------------------------------
        Frame info
    ---------------------------------------------------------------*/

    const frame_info = {
        sim_time: 0.,

        cam_angle_z: Math.PI * 0.2, // in radians!
        cam_angle_y: -Math.PI / 6, // in radians!
        cam_distance_factor: 1.,
        camera_position: [0, 0, 0],
        mat_turntable: mat4.create(),

        mat_view: mat4.create(),
        mat_projection: mat4.create(),

        // Consider the sun, which locates at [0, 0, 0], as the only light source
        light_position_world: [0, 0, 0, 1],
        light_position_cam: [0, 0, 0, 1],
        light_color: [1.0, 0.941, 0.898],
    }

    /*---------------------------------------------------------------
        Camera
    ---------------------------------------------------------------*/
    const cam_distance_base = 15.

    const r = vec3.create();

    function update_cam_transform(frame_info) {
        const { cam_angle_z, cam_angle_y, cam_distance_factor } = frame_info

        /* TODO GL1.2.2
        Calculate the world-to-camera transformation matrix for turntable camera.
        The camera orbits the scene 
        * cam_distance_base * cam_distance_factor = distance of the camera from the (0, 0, 0) point
        * cam_angle_z - camera ray's angle around the Z axis
        * cam_angle_y - camera ray's angle around the Y axis
        */

        const r = [
            Math.cos(cam_angle_y) * Math.cos(cam_angle_z) * cam_distance_factor * cam_distance_base,
            -Math.cos(cam_angle_y) * Math.sin(cam_angle_z) * cam_distance_factor * cam_distance_base,
            -Math.sin(cam_angle_y) * cam_distance_factor * cam_distance_base];

        // Example camera matrix, looking along forward-X, edit this
        const look_at = mat4.lookAt(mat4.create(),
            r, // camera position in world coord
            [0, 0, 0], // view target point
            [0, 0, Math.abs(cam_angle_y) % (Math.PI * 2) % (Math.PI * 3 / 2) > Math.PI / 2 ? -1 : 1], // up vector
        )


        // Store the combined transform in mat_turntable
        // frame_info.mat_turntable = A * B * ...
        mat4_matmul_many(frame_info.mat_turntable, look_at) // edit this
    }

    update_cam_transform(frame_info)

    // Rotate camera position by dragging with the mouse
    canvas_elem.addEventListener('mousemove', (event) => {
        // if left or middle button is pressed
        if (event.buttons & 1 || event.buttons & 4) {
            frame_info.cam_angle_z += event.movementX * 0.005
            frame_info.cam_angle_y += -event.movementY * 0.005

            update_cam_transform(frame_info)
        }
    })

    let lastTouch = null;
    canvas_elem.addEventListener('touchstart', (event) => {
        lastTouch = event.touches[0]
    });
    canvas_elem.addEventListener('touchmove', (event) => {
        // if left or middle button is pressed
        frame_info.cam_angle_z += (event.touches[0].clientX - lastTouch.clientX) * 0.005
        frame_info.cam_angle_y += -(event.touches[0].clientY - lastTouch.clientY) * 0.005

        update_cam_transform(frame_info)

        lastTouch = event.touches[0];
    })

    const max_zoom_out = 30;

    canvas_elem.addEventListener('wheel', (event) => {
        // scroll wheel to zoom in or out
        const factor_mul_base = 1.08
        const factor_mul = (event.deltaY > 0) ? factor_mul_base : 1. / factor_mul_base
        frame_info.cam_distance_factor *= factor_mul
        frame_info.cam_distance_factor = Math.max(0.02, Math.min(frame_info.cam_distance_factor, max_zoom_out))
        // console.log('wheel', event.deltaY, event.deltaMode);
        update_cam_transform(frame_info)
    })

    /*---------------------------------------------------------------
        UI
    ---------------------------------------------------------------*/

    let time_multiplication = 1.;

    // Debug overlay
    const debug_overlay = document.getElementById('debug-overlay')
    const debug_text = document.getElementById('debug-text')
    register_keyboard_action('h', () => debug_overlay.classList.toggle('hidden'))

    // Pause
    let is_paused = false;
    register_keyboard_action('p', () => is_paused = !is_paused);

    // Grid, to demonstrate keyboard shortcuts
    let grid_on = true;
    register_keyboard_action('g', () => grid_on = !grid_on);

    // Focusing on selected planet
    let selected_planet_name = 'earth';
    const elem_view_select = document.getElementById('view-select')

    function set_selected_planet(name) {
        console.log('Selecting', name);
        selected_planet_name = name;
        frame_info.cam_distance_factor = 3 * scene_info.actors_by_name[name].size / cam_distance_base;
        update_cam_transform(frame_info)
    }

    set_selected_planet('sun');

    for (const name in scene_info.actors_by_name) {
        if (scene_info.actors_by_name.hasOwnProperty(name)) {
            const entry = document.createElement('li');
            entry.textContent = name;
            entry.addEventListener('click', (event) => set_selected_planet(name));
            elem_view_select.appendChild(entry);
        }
    }

    function targetPlanet(name, params) {
        const { simTime = 0, cam_angle_z = 1.2 * 180 / Math.PI, cam_angle_y = -0.8 * 180 / Math.PI, zoom = 6} = {...params};
        set_selected_planet(name)
        scene_info.sim_time = simTime
        frame_info.cam_angle_z = cam_angle_z / 180 * Math.PI
        frame_info.cam_angle_y = cam_angle_y / 180 * Math.PI
        frame_info.cam_distance_factor = zoom

        update_cam_transform(frame_info)
    }

    const bind_key_to_planet = (key, planet, zoom = 8.2) => {
        register_keyboard_action(key, () => {
            set_selected_planet(planet)
            scene_info.sim_time = 0.0
            frame_info.cam_angle_z = 1.2
            frame_info.cam_angle_y = -0.8
            frame_info.cam_distance_factor = zoom

            update_cam_transform(frame_info)
        })
    }

    bind_key_to_planet('s', 'sun');

    // Predefined views
    for (let i = 0; i < 10; ++i) {
        bind_key_to_planet(i + '','planet' + i, 4)
    }


    register_keyboard_action('f', () => {
        const speed = 3.;
        if (time_multiplication == speed) {
            time_multiplication = 1.;
        }
        else {
            time_multiplication = speed;
        }
    })
    register_keyboard_action('n', () => {
        time_multiplication = 1.;
    })
    register_keyboard_action('b', () => {
        time_multiplication *= -1.;
    })
    register_keyboard_action('l', () => {
        const speed = 0.2;
        if (time_multiplication == speed) {
            time_multiplication = 1.;
        }
        else {
            time_multiplication = speed;
        }
    })

    let with_deformation = false;
    {
        const deformation = document.getElementById('def_state');

        const toggleDeformation = () => {
            with_deformation = !with_deformation;
        
            const color = with_deformation ? '#22ff44' : 'red';
            deformation.style.borderColor = color;
            deformation.style.color = color;
            deformation.innerText = with_deformation ? "ON" : "OFF";
        };

        deformation.addEventListener('click', toggleDeformation);
        register_keyboard_action('d', toggleDeformation)
    }

    let with_props = false;
    {    
        const showProps = document.getElementById('props_state');

        const toggleShowProps = () => {
            with_props = !with_props;
        
            const color = with_props ? '#22ff44' : 'red';
            showProps.style.borderColor = color;
            showProps.style.color = color;
            showProps.innerText = with_props ? "SHOWN" : "HIDDEN";
        };

        showProps.addEventListener('click', toggleShowProps);
        register_keyboard_action('q', toggleShowProps)
        toggleShowProps();
    }

    
    const video = new CanvasVideoRecording({
        canvas: canvas_elem,
        videoBitsPerSecond: 1024 * 1024 * 1024 * 1024, // tweak that if the quality is bad 
        // https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder
    });

    
    /*---------------------------------------------------------------
        VIDEO RECORDING
    ---------------------------------------------------------------*/
    let recording_steps = undefined;
    function setSimSpeed(newSpeed) {
        if (video.is_recording()) {
            time_multiplication = newSpeed / 60;
        }
        else {
            time_multiplication = newSpeed / 4;
        }
    }
    
	function video_start_stop() {
		if(video.is_recording()) {
			video.stop();
		} else {
			video.start();
            setSimSpeed(1);
            recording_steps();
		}
	};

	register_keyboard_action('r', video_start_stop);

    register_keyboard_action('t', () => recording_steps());

    const wait = async time => await new Promise(r => setTimeout(r, time));
    
    /*---------------------------------------------------------------
        VIDEO STEPS
    ---------------------------------------------------------------*/
    recording_steps = async function recording_steps() {
        // Title
        setSimSpeed(3);
        targetPlanet('sun');
        await wait(11000);
        
        // Generated planets
        setSimSpeed(3);
        targetPlanet('planet4', { zoom: 2.5 });
        await wait(8000);

        setSimSpeed(4);
        targetPlanet('planet3', { zoom: 2.5, cam_angle_z: 1.5, cam_angle_y: -23.2, simTime: 56.54 });
        await wait(6000);

        setSimSpeed(-3);
        targetPlanet('planet2', { zoom: 1., cam_angle_z: 136.6, cam_angle_y: 10.6, simTime: 62.04 });
        await wait(6000);
        
        setSimSpeed(4);
        targetPlanet('planet1', { zoom: 1., cam_angle_z: 125., cam_angle_y: -22.0, simTime: 57.35 });
        await wait(8000);

        // Raytracing
        setSimSpeed(-0.8);
        targetPlanet('planet4_moon0', { zoom: .5, cam_angle_y: 16.0, cam_angle_z: 35, simTime: 59 });
        await wait(11000);
        
        setSimSpeed(-2.);
        targetPlanet('planet1', { zoom: 1.5, cam_angle_y: -17.1, cam_angle_z: -56.4, simTime: 25.59 });
        await wait(11000);
      
        // Plant generation
        setSimSpeed(0.5);
        targetPlanet('planet4', { zoom: 1., cam_angle_y: 7, cam_angle_z: 121.2, simTime: 52.39 });
        await wait(11000);

        // Global illumination
        setSimSpeed(0.4);
        targetPlanet('planet4', { zoom: 1., cam_angle_y: -19.6, cam_angle_z: 122.2, simTime: 55.2 });
        await wait(11000);
        
        // Planet deformation
        setSimSpeed(3);
        with_deformation = true;
        targetPlanet('planet4', { zoom: 2.5, cam_angle_y: -29, cam_angle_z: -4.8, simTime: 69.04 });
        await wait(9000);
        with_deformation = false;

    };

    setSimSpeed(2.);
    targetPlanet('planet1', { zoom: 1.5, cam_angle_y: -17.1, cam_angle_z: -56.4, simTime: 25.59 });
    

    /*---------------------------------------------------------------
        Render loop
    ---------------------------------------------------------------*/

    let prev_regl_time = 0

    regl.frame((frame) => {

        const { mat_view, mat_projection, mat_turntable, light_position_cam, light_position_world, camera_position } = frame_info

        const frame_time = video.is_recording() ? frame.tick : frame.time;

        if (!is_paused) {
            const dt = frame_time - prev_regl_time;
            scene_info.sim_time += dt * time_multiplication;
        }
        frame_info.sim_time = scene_info.sim_time
        prev_regl_time = frame_time;



        // Update planet transforms
        sys_orbital_movement.simulate(scene_info)

        // Calculate view matrix, view centered on chosen planet
        {
            mat4.perspective(mat_projection,
                deg_to_rad * 60, // fov y
                frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
                0.01, // near
                1000, // far
            )

            const selected_planet_model_mat = scene_info.actors_by_name[selected_planet_name].mat_model_to_world
            const selected_planet_position = mat4.getTranslation([0, 0, 0], selected_planet_model_mat)
            vec3.scale(selected_planet_position, selected_planet_position, -1);
            const selected_planet_translation_mat = mat4.fromTranslation(mat4.create(), selected_planet_position)
            mat4_matmul_many(mat_view, mat_turntable, selected_planet_translation_mat)
        }

        // Calculate light position in camera frame
        vec4.transformMat4(light_position_cam, light_position_world, mat_view);

        // Calculate camera position and store it in `camera_position`, it will be needed for the billboard
        {
            /*
            Camera is at [0, 0, 0] in camera coordinates.
            mat_view is a transformation from world to camera coordinates.
            The inverse of mat_view is a transformation from camera to world coordinates.
            Transforming [0, 0, 0] from camera to world we obtain the world position of the camera.
                cam_pos = mat_view^-1 * [0, 0, 0]^T
            */
            const mat_camera_to_world = mat4.invert(mat4.create(), mat_view)

            // Transform [0, 0, 0] from camera to world:
            //const camera_position = vec3.transformMat4([0, 0, 0], [0, 0, 0], mat_view_invert);
            // But the rotation and scale parts of the matrix do no affect [0, 0, 0] so, we can just get the translation, its cheaper:
            mat4.getTranslation(camera_position, mat_camera_to_world)
        }

        // Set the whole image to black
        regl.clear({ color: [0.05, 0.05, 0.1, 1] });
        
        const planets_info = compute_transforms(frame_info, scene_info)
        planets_info.with_deformation = with_deformation;

        sys_render_unshaded.render(frame_info, scene_info, planets_info);

        if (!with_deformation && with_props) {
            sys_render_mesh.render(frame_info, scene_info, planets_info);
        }

        if (grid_on) {
            // sys_render_grid.render(frame_info, scene_info)
        }


        debug_text.textContent = `
Hello! Sim time is ${scene_info.sim_time.toFixed(2)} s
Camera: angle_z ${(frame_info.cam_angle_z / deg_to_rad).toFixed(1)}, angle_y ${(frame_info.cam_angle_y / deg_to_rad).toFixed(1)}, distance ${(frame_info.cam_distance_factor * cam_distance_base).toFixed(1)}
cam pos ${vec_to_string(camera_position)}
`;
        if (video.is_recording()) {
            video.push_frame();
        }
    })
}

DOM_loaded_promise.then(main);