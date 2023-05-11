import {vec2, vec3, vec4, mat3, mat4} from "../lib/gl-matrix_3.3.0/esm/index.js"
import {mat4_matmul_many} from "./icg_math.js"

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
            vert: this.resources['unshaded.vert.glsl'],
            frag: this.resources['unshaded.frag.glsl'],
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
            entries_to_draw.push({
				mesh: this.resources[mesh.name],
				mat_mvp: parent.mvp,
			})
        }
        
        // Draw on the GPU
        this.pipeline(entries_to_draw)
    }
}

