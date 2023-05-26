import {vec2, vec3, vec4, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_matmul_many} from "./icg_math.js"

const mesh_scale = mat4.fromScaling(mat4.create(), [0.2, 0.2, 0.2]);

export class SysRenderMesh {

	constructor(regl, resources) {
		// Keep a reference to textures
		this.resources = resources
		this.init_pipeline(regl)
	}
    
	init_pipeline(regl) {
		this.pipeline = regl({
			attributes: {
				vertex_position: regl.prop('mesh.vertex_positions'),
				vertex_normal: regl.prop('mesh.vertex_normals'),
                position: regl.prop('mesh.vertex_positions'),
			},
			// Faces, as triplets of vertex indices
			elements: regl.prop('mesh.faces'),

            uniforms: {
                mat_mvp: regl.prop('mat_mvp'),
            },
	
			// Uniforms: global data available to the shader
			// uniforms: this.pipeline_uniforms(regl),	
            vert: regl.prop('mesh.vert_shader'),
            frag: regl.prop('mesh.frag_shader')
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
        for (const mesh of scene_info.meshes) {
            const mesh_scale = mesh.scale ?? 0.2;

            const scale = mat4.fromScaling(mat4.create(), vec3.fromValues(mesh_scale, mesh_scale, mesh_scale))
            const translation = mat4.fromTranslation(mat4.create(), mesh.translation)

            const xRotation = mat4.fromXRotation(mat4.create(), Math.PI / 2.)
            const zRotation = mat4.fromZRotation(mat4.create(), mesh.rotation.phi)
            const yRotation = mat4.fromYRotation(mat4.create(), mesh.rotation.theta)

            const mat_mvp = mat4.create()

            mat4_matmul_many(mat_mvp, 
                mat_projection, mat_view, 
                mesh.parent.mat_model_to_world, translation, zRotation, yRotation, xRotation, scale);

            let final_mesh = {};

            if (mesh.name) {
                final_mesh = this.resources[mesh.name];
            }
            else {
                final_mesh.vertex_normals = mesh.normals;
                final_mesh.vertex_position = mesh.vertices;
                final_mesh.faces = mesh.faces;
            }

            entries_to_draw.push({
				mesh: final_mesh,
				mat_mvp: mat_mvp,
			})
        }
        
        // Draw on the GPU
        this.pipeline(entries_to_draw)
    }
}

