precision mediump float;
		
// varying vec2 v2f_tex_coord;

// uniform sampler2D texture_base_color;


varying vec3 x;
varying vec3 n;
varying vec3 v;
varying vec3 l;
varying vec3 h;

uniform vec4 planet_sizes[20];
uniform vec4 planet_locations[20];

uniform vec4 light_position_cam;

const float shininess = 0.2;


bool trace_ray(vec3 start, vec3 direction) 
{
    vec3 d = normalize(direction);

    float a = d.x * d.x + d.y * d.y + d.z * d.z;

    bool has_hit = false;

    for (int i = 0; i < 20; ++i) 
    {
        float size = planet_sizes[i].x;
        bool is_close = dot(x - light_position_cam.xyz, planet_locations[i].xyz - light_position_cam.xyz) > 0.;
        float r = size;
        vec3 o = start - planet_locations[i].xyz;
        float b = 2. * (o.x * d.x + o.y * d.y + o.z * d.z);
        float c = o.x * o.x + o.y * o.y + o.z * o.z - r * r;

        float delta = b * b - 4. * a * c;
        float sqrtDelta = sqrt(delta);
        float t1 = (-b + sqrtDelta) / (2. * a);
        float t2 = (-b - sqrtDelta) / (2. * a);

        has_hit = has_hit || (is_close && delta >= 0. && (t1 >= 0. || t2 >= 0.));
    }

    return has_hit;
}

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

void main()
{
    float ambient = 0.2;
    float diffuse = 0.;
    float specular = 0.;
    
    bool is_in_shadow = trace_ray(x + 1.001 * normalize(l), l);
    if (!is_in_shadow)
    {
        ambient = 0.5;
        diffuse = compute_diffuse();
        specular = compute_specular();
    }
    
    vec3 light_color = vec3(1.,1.,1.);
    vec3 material_color = vec3(0., 154.0 / 255., 24.0 / 255.);    

    vec3 ma = ambient * light_color;

    vec3 ms = light_color * (specular + diffuse);

    vec3 color = (ma + ms) * material_color;

	gl_FragColor = vec4(color, 1.);
}