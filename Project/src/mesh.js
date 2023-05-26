import {vec2, vec3, vec4, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_matmul_many} from "./icg_math.js"

const mesh_scale = mat4.fromScaling(mat4.create(), [0.2, 0.2, 0.2]);

const MAX_PLANET_RAY_COUNT = 20;

export class SysRenderMesh {

	constructor(regl, resources) {
		// Keep a reference to textures
		this.resources = resources
		this.init_pipeline(regl)
	}
    
	init_pipeline(regl) {

        const uniforms = Object.assign({
            mat_mvp: regl.prop('mat_mvp'),
            mat_normals: regl.prop('mat_normals'),
            light_position_cam: regl.prop('light_position_cam'),
            mat_model_view: regl.prop('mat_model_view'),
        }, new Uint8Array(MAX_PLANET_RAY_COUNT).reduce((acc, val, index) => {
            acc['planet_sizes['+index+']'] = regl.prop('planet_sizes['+index+']');
            acc['planet_locations['+index+']'] = regl.prop('planet_locations['+index+']');
            return acc;
          }, {}));

		this.pipeline = regl({
			attributes: {
				normal: regl.prop('mesh.vertex_normals'),
                position: regl.prop('mesh.vertex_positions'),
			},
			// Faces, as triplets of vertex indices
			elements: regl.prop('mesh.faces'),

            uniforms,
	
			// Uniforms: global data available to the shader
			// uniforms: this.pipeline_uniforms(regl),	
            vert: regl.prop('mesh.vert_shader'),
            frag: regl.prop('mesh.frag_shader')
		})
	}

    render(frame_info, scene_info, planets_info) {
        /* 
        We will collect all objects to draw with this pipeline into an array
        and then run the pipeline on all of them.
        This way the GPU does not need to change the active shader between objects.
        */
        const entries_to_draw = []

        // Read frame info
        const { mat_projection, mat_view, light_position_cam } = frame_info

        // For each planet, construct information needed to draw it using the pipeline
        for (const mesh of scene_info.meshes) {
            const mesh_scale = (mesh.scale ?? 1) / 5.;

            const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(mesh_scale, mesh_scale, mesh_scale))
            const translation = mat4.fromTranslation(mat4.create(), mesh.translation)

            const xRotation = mat4.fromXRotation(mat4.create(), Math.PI / 2.)
            const zRotation = mat4.fromZRotation(mat4.create(), mesh.rotation.phi)
            const yRotation = mat4.fromYRotation(mat4.create(), mesh.rotation.theta)

            const mat_mvp = mat4.create()
            const mat_normals_to_view = mat3.create()
            const mat_view_model = mat4.create();

            mat4_matmul_many(mat_view_model, mat_view, 
                mesh.parent.mat_model_to_world, translation, zRotation, yRotation, xRotation, scale);

            mat4_matmul_many(mat_mvp, mat_projection, mat_view_model);

            mat3.fromMat4(mat_normals_to_view, mat4.invert(mat4.create(), mat4.transpose(mat4.create(), mat_view_model)));

            let final_mesh = {};

            if (mesh.name) {
                final_mesh = this.resources[mesh.name];
            }
            else {
                final_mesh.vertex_normals = mesh.normals;
                final_mesh.vertex_positions = mesh.vertices;
                final_mesh.faces = mesh.faces;
            }

            if (this.resources[mesh.frag] === undefined) {
                console.error("Failed to find fragment " + mesh.frag);
            }
            
            if (this.resources[mesh.vert] === undefined) {
                console.error("Failed to find fragment " + mesh.frag);
            }

            entries_to_draw.push({
				mesh: {
                    frag_shader: this.resources[mesh.frag],
                    vert_shader: this.resources[mesh.vert],
                    ...final_mesh,
                },
				mat_mvp: mat_mvp,
                mat_model_view: mat_view_model,
                mat_normals: mat_normals_to_view,
                light_position_cam,
                planet_sizes: planets_info.map(x => vec4.fromValues(x.size ?? 0., 0, 0, 0)),
                planet_locations: planets_info.map(x => x.location),
			})
        }
        
        // Draw on the GPU
        this.pipeline(entries_to_draw)
    }
}

