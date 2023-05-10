precision mediump float;

varying vec3 x;
varying vec3 n;
varying vec3 v;
varying vec3 l;
varying vec3 h;
varying float height;

uniform vec4 light_position_cam;

const float ambient = 0.2;
const float shininess = 0.2;

float compute_diffuse() 
{
    float dotProd = dot(n, l);
    if (dotProd > 0.)
    {
        return dot(normalize(n), normalize(l));
    }

    // float fallof = 0.2;
    // if (dotProd > -fallof) {
    //     return -dot(normalize(n), normalize(l)) * (fallof + dotProd) * 10.;
    // }

    return 0.;
}

float compute_specular()
{
    if (dot(n, l) > 0. && dot(h, n) > 0.)
    {
        return pow(dot(normalize(h), normalize(n)), shininess);
    }
    return 0.;
}

// const vec3 water = vec3(0.1, 0.3, 1.);
const vec3 water = vec3(0.004, .588, 1.);
const vec3 sand = vec3(0.76, 0.76, .2);
const vec3 grass = vec3(	.016, .776, .306);
const vec3 mountain = vec3(0.592, 0.486,  0.325);

vec3 material_for_height()
{
    if (height <= 0.)
    {
        return water;
    }

    //if (height < .08)
    //{
    //    return mix(sand, grass, (height) / 0.08);
    //}

    return mix(grass, mountain, (height) * 10.);
}

void main()
{
    float diffuse = compute_diffuse();
    float specular = compute_specular();

    vec3 light_color = vec3(1.,1.,1.);
    vec3 material_color = material_for_height();    

    vec3 ma = ambient * light_color;

    vec3 ms = light_color * (specular + diffuse);

    vec3 color = (ma + ms) * material_color;

	gl_FragColor = vec4(color, 1.);
}
