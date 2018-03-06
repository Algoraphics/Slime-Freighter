/* global AFRAME */

/* 
  This file contains shaders used (or not) in this project. Most of them
  are not my work, but a couple of them very much are. I've tried to make
  the distinction clear with comment descriptions.
*/

// Basic static vertex shader
var basic = `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
// Shader for perlin noise (see https://shaderfrog.com/app/view/126)
var randomripple = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vNormal;

uniform float scale;
uniform float displacement;
uniform float timeMsec;
uniform float speed;
uniform vec3 color;
uniform float resolution;
uniform float brightness;
uniform float vertexnoise;

varying float vNoise;

//
// GLSL textureless classic 3D noise "cnoise",
// with an RSL-style periodic variant "pnoise".
// Author:  Stefan Gustavson (stefan.gustavson@liu.se)
// Version: 2011-10-11
//
// Many thanks to Ian McEwan of Ashima Arts for the
// ideas for permutation and gradient selection.
//
// Copyright (c) 2011 Stefan Gustavson. All rights reserved.
// Distributed under the MIT license. See LICENSE file.
// https://github.com/ashima/webgl-noise
//

vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

vec3 fade(vec3 t) {
    return t*t*t*(t*(t*6.0-15.0)+10.0);
}

// Classic Perlin noise
float cnoise(vec3 P) {
  vec3 Pi0 = floor(P); // Integer part for indexing
  vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P); // Fractional part for interpolation
  vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g011, g011)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

#define PI 3.141592653589793238462643383279
`

// Very customizeable shader for creating buildings. This one is entirely made by me (https://github.com/Algoraphics)
// with inspiration from https://thebookofshaders.com/09/.
AFRAME.registerShader('building-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    timeskip: {type: 'float', is: 'uniform'}, // Skip value for time, allows outside reset of time value
    numrows: {type: 'float', is: 'uniform'}, // Initial number of window rows
    numcols: {type: 'float', is: 'uniform'}, // Initial number of window columns
    speed: {type: 'float', is: 'uniform'}, // Speed of slide, colorslide, and grow
    
    height: {type: 'float', is: 'uniform'}, // Fractional height of the box
    width: {type: 'float', is: 'uniform'}, // Fractional width of the box
    
    color1: {type: 'color', is: 'uniform'},
    color2: {type: 'color', is: 'uniform'},
    usecolor1: {type: 'float', is: 'uniform'}, // If 0.0, blue-green gradient used instead
    usecolor2: {type: 'float', is: 'uniform'}, // If 0.0, red-yellow gradient used instead
    colorslide: {type: 'float', is: 'uniform'}, // Whether to slide colors. Use negatives to go backwards
    coloraxis: {type: 'float', is: 'uniform'}, // 0.0 for x, 1.0 for y
    colorgrid: {type: 'float', is: 'uniform'}, // 0 to match with numrows, 1 to turn off
    coloroffset: {type: 'float', is: 'uniform'}, // Offset color animation (sin or cos) so groups aren't as synchronized
    invertcolors: {type: 'float', is: 'uniform'}, // Makes window color and building color switch places
    
    slide: {type: 'float', is: 'uniform'}, // Number of windows to slide by. 0.0 to not slide
    slidestart: {type: 'float', is: 'uniform'}, // Start point for clamp
    slidesine: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If slide should sine.
    slideclamp: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If slide should clamp.
    slideaxis: {type: 'float', is: 'uniform'}, // 0.0 for x, 1.0 for y
    slidereverse: {type: 'float', is: 'uniform'},

    grow: {type: 'float', is: 'uniform'}, // Number of windows to grow by. 0.0 to not grow
    growstart: {type: 'float', is: 'uniform'}, // Start point for clamp
    growsine: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If grow should sine.
    growclamp: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If grow should clamp.
    growvert: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If grow should be vertical only
  },

  vertexShader: basic,
  fragmentShader: `
varying vec2 vUv;
varying float factor;
uniform float timeMsec; // A-Frame time in milliseconds.
uniform float timeskip;
uniform float numrows;
uniform float numcols;
uniform float speed;

uniform float height;
uniform float width;

uniform float usecolor1;
uniform float usecolor2;
uniform vec3 color1;
uniform vec3 color2;
uniform float colorslide;
uniform float coloraxis;
uniform float colorgrid;
uniform float coloroffset;
uniform float invertcolors;

uniform float slide;
uniform float slidestart;
uniform float slideclamp;
uniform float slidesine;
uniform float slideaxis;
uniform float slidereverse;

uniform float grow;
uniform float growstart;
uniform float growclamp;
uniform float growsine;
uniform float growvert;

float box(vec2 st, vec2 size, float smoothEdges){
    size = vec2(0.5) - size * 0.5;
    vec2 aa = vec2(smoothEdges * 0.5);
    vec2 bb = smoothstep(size, size + aa, st);
    bb *= smoothstep(size, size + aa, vec2(1.0) - st);
    return bb.x * bb.y;
}

void main() {
  //TODO: beat should be a parameter
  float time = (3.14159265358979 / (2.0*594.059)) * (timeMsec - timeskip); // Convert from A-Frame milliseconds to typical time in seconds.

  vec2 st = vUv;
  vec3 boxcolor1 = vec3(0.0);
  vec3 boxcolor2 = vec3(0.0); 

  float growval = step(1.0, grow) * time * speed * (1.0 - growsine) * (1.0 - growclamp);
  growval += (((sin(time/5.0) + 1.0) / 2.0) * grow) * growsine;
  growval += (clamp(speed * time, growstart, growstart + grow)) * growclamp;
  //growval += (1.0 - growvert) * 1.0;
  //st[0] *= (1.0 - growvert) * growval + growvert * numcols;
  st[0] *= numcols + growval * (1.0 - growvert);
  st[1] *= numrows + growval;


  float slidedirection = (1.0 - slidereverse) * 1.0 + slidereverse * -1.0;
  float slideval = step(1.0, slide) * time * 0.15 * speed * (1.0 - slidesine) * (1.0 - slideclamp);
  slideval += clamp(speed * time, slidestart, slidestart + slide) * slideclamp * (1.0 - slidesine);
  slideval += (slide / 2.0) * (1.0 + sin(time)) * slidesine * (1.0 - slideclamp);
  st[0] += (1.0 - slideaxis) * slideval * slidedirection;
  st[1] += slideaxis * slideval * slidedirection;

  st = fract(st);
  float b = box(st,vec2(width, height),0.001);
  float box = b * (1.0 - invertcolors) + (1.0 - b) * invertcolors;
  boxcolor1 = color1 * box * usecolor1;
  boxcolor2 = color2 * box * usecolor2; 

  vec2 uv2 = vUv;

  float rate = slidedirection * 0.15 * speed * colorslide;
  float xrate = rate / numcols;
  float yrate = rate / numrows;
  uv2[0] += time * xrate * (1.0 - coloraxis);
  uv2[1] += time * yrate * coloraxis;
  uv2[0] *= 1.0 + ((numcols + (growval * (1.0 - growvert)) - 1.0) * colorgrid);
  uv2[1] *= 1.0 + ((numrows + growval - 1.0) * colorgrid);
  uv2 = fract(uv2);
  
  float rainbow1 = 1.0 - usecolor1;
  float rainbow2 = 1.0 - usecolor2;
  vec3 merge1 = vec3(0.0, uv2 * step(1.0, box)) * rainbow1;
  vec3 merge2 = vec3(uv2 * step(1.0, box), 0.0) * rainbow2;
  merge1[0] += boxcolor1[0]; merge2[0] += boxcolor2[0];
  merge1[1] += boxcolor1[1]; merge2[1] += boxcolor2[1];
  merge1[2] += boxcolor1[2]; merge2[2] += boxcolor2[2];

  float usecolors = usecolor1 * usecolor2;
  float israinbow = rainbow1 * rainbow2;
  float rainbowscillate = cos(time) * coloroffset + sin(time) * (1.0 - coloroffset);
  float oscillate = cos(time) * coloroffset + sin(time) * (1.0 - coloroffset);
  float combo = (1.0 - usecolors) * (rainbowscillate * 0.5 
                                  + israinbow * 0.7 
                                  + usecolor1 * 1.0 
                                  + usecolor2 * 0.5)
                 + (oscillate * 0.25 + 0.55) * usecolors;

  gl_FragColor = mix(
    vec4(merge1, 1.0),
    vec4(merge2, 1.0),
    combo
  );
}
`
});

// See https://shaderfrog.com/app/view/329
AFRAME.registerShader('caustic-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    speed: {type: 'float', is: 'uniform'},
    brightness: {type: 'float', is: 'uniform'},
    resolution: {type: 'float', is: 'uniform'},
    
    color: {type: 'color', is: 'uniform'},
    backgroundColor: {type: 'color', is: 'uniform'},
  },

  vertexShader: basic,
  fragmentShader: `
#define TAU 6.28318530718
#define MAX_ITER 5

precision highp float;
precision highp int;
uniform float resolution;

uniform vec3 backgroundColor;
uniform vec3 color;
uniform float speed;
uniform float brightness;
uniform float timeMsec;

varying vec2 vUv;

void main() {
    float time = timeMsec / 2000.0; // Convert from A-Frame milliseconds to typical time in seconds.
    vec2 res = vec2(resolution, resolution);
    vec2 uv = vUv * res;
    
    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = vec2(p);
    
    float c = 1.0;
    float inten = 0.005;
    
    for ( int n = 0; n < MAX_ITER; n++ )  {
        float t = time * speed * (1.0 - (3.5 / float(n + 1)));
        i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
        c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
    }
    
    c /= float( MAX_ITER  );
    c = 1.17 - pow( c, brightness );
    
    vec3 rgb = vec3( pow( abs( c ), 8.0 ) );
    
    gl_FragColor = vec4( rgb * color + backgroundColor, 1.0 );
}
`
});

// see https://shaderfrog.com/app/view/269
AFRAME.registerShader('lightspeed-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    speed: {type: 'float', is: 'uniform'},
    fadeaway: {type: 'float', is: 'uniform'}, // determines how many stars are visible in distance
    resolution: {type: 'float', is: 'uniform'}, // 1.0 centers the animation,
    uniformity: {type: 'float', is: 'uniform'}, // can cause the stars to come in waves, 
    
    color: {type: 'color', is: 'uniform'},
  },

  vertexShader: `
precision highp float;
precision highp int;

varying vec2 vUv;

void main() {
    vUv = uv;

    // This sets the position of the vertex in 3d space. The correct math is
    // provided below to take into account camera and object data.
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}
`,
  fragmentShader: `
varying vec2 vUv;
uniform float timeMsec;
uniform float speed;
uniform float fadeAway;
uniform vec3 color;
uniform float resolution;
uniform float uniformity;

void main(void) {
    float time = timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
    float t = time * speed * 2.0;
    vec2 resolution = vec2(resolution, resolution);
    vec2 position = (vUv.xy - resolution.xy * .5) / resolution.x;
    float angle = atan(position.y, position.x) / (2. * 3.14159265359);
    angle -= floor(angle);
    float rad = length(position);
    float angleFract = fract(angle * 256.);
    float angleRnd = floor(angle * 256.) + 1.;
    float angleRnd1 = fract(angleRnd * fract(angleRnd * .7235) * 45.1);
    float angleRnd2 = fract(angleRnd * fract(angleRnd * .82657) * 13.724);
    float t2 = t + angleRnd1 * uniformity;
    float radDist = sqrt(angleRnd2);
    float adist = radDist / rad * .1;
    float dist = (t2 * .1 + adist);
    dist = abs(fract(dist) - fadeAway);
    
    float outputColor = (1.0 / (dist)) * cos(0.7 * sin(t)) * adist / radDist / 30.0;
    angle = fract(angle + .61);
    gl_FragColor = vec4(outputColor * color, 1.0);
}
`
});

// see https://shaderfrog.com/app/view/10
AFRAME.registerShader('kal-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    zoom: {type: 'float', is: 'uniform'},
  },

  vertexShader: `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
  fragmentShader: `
precision highp float;
precision highp int;

varying vec2 vUv;
varying vec3 vPosition;

uniform float timeMsec;
uniform float zoom;

vec2 pattern(vec2 p) {
  float time = timeMsec / 3000.0; // Convert from A-Frame milliseconds to typical time in seconds.
	float a = atan(p.x,p.y);
	float r = 9.0 * pow(1.0/length(p), 0.4);
	float t = time + length(p) * 0.0012;
	return vec2(sin(a*3.0+cos(t*0.25)*10.0), sin(r*2.+sin(time*0.1)*10.0));
}

void main( void ) {
  
	vec2 p = (vUv.xy - 0.5) * zoom;
	vec3 col = vec3(0.0);
	
	for (int i=0; i<3; i++)
		p.xy = pattern(p);
	
	col.rg = sin(p.xy);
	col.b = max(step(abs(p.x*p.x),0.5), -1.0 / abs(p.y));
	
	col = clamp( col, vec3(0.0), vec3(1.0) );
	
	gl_FragColor = vec4( col, 1.0 );

}
`
});

// see https://shaderfrog.com/app/view/54
AFRAME.registerShader('grid-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    resolution: {type: 'float', is: 'uniform'},
    intensity: {type: 'float', is: 'uniform'}, // Initial number of window rows
    speed: {type: 'float', is: 'uniform'}, // Speed of slide, colorslide, and grow
    
    color: {type: 'color', is: 'uniform'},
    backgroundColor: {type: 'color', is: 'uniform'},
  },

  vertexShader: `
varying vec2 vUv;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,
  fragmentShader: `
precision highp float;

#define PI 3.1415926535897932384626433832795

uniform float resolution;
uniform float intensity;
uniform float speed;
uniform vec3 color;
uniform vec3 backgroundColor;

uniform float timeMsec; // A-Frame time in milliseconds.
varying vec2 vUv;
varying vec3 vPosition;

vec2 circuit(vec2 p) {
	p = fract(p);
	float r = 0.5;
	float v = 0.0, g = 1.0;
	float d;
	
	const int iter = 7;
	for(int i = 0; i < iter; i ++)
	{
		d = p.x - r;
		g += pow(clamp(1.0 - abs(d), 0.0, 1.0), 200.0);
		
		if(d > 0.0) {
			p.x = (p.x - r) / (1.8 - r);
		}
		else {
			p.x = p.x;
		}
		p = p.yx;
	}
	v /= float(iter);
	return vec2(g, v);
}

void main()
{
  
  float time = 3.0 * timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
	vec2 uv = ( vUv.xy + 0.5 ) * (resolution * 2.0 + 1.0);
	vec2 cid2 = floor(uv);
	float cid = (cid2.y + cid2.x);

	vec2 dg = circuit(uv);
	float d = dg.x;
	vec3 col1 = (1.0-vec3(max(min(d, 2.0) - 1.0, 0.0))) * backgroundColor;
	vec3 col2 = vec3(max(d - 1.0, 0.0)) * color;

	float f = max(0.4 - mod(uv.y - uv.x + (time * speed) + (dg.y * 0.2), 2.5), 0.0) * intensity;
	col2 *= f;
	
	gl_FragColor = vec4(col1 + col2, 1.0);
}
`
});

// see https://shaderfrog.com/app/view/57
AFRAME.registerShader('disco-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    speed: {type: 'float', is: 'uniform'},
    resolution: {type: 'float', is: 'uniform'},
    
    color: {type: 'color', is: 'uniform'},
    backgroundColor: {type: 'color', is: 'uniform'},
  },

  vertexShader: `
precision highp float;
precision highp int;

varying vec2 vUv;

void main() {
    vUv = uv;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,
  fragmentShader: `
// Credit http://glslsandbox.com/e#24567.0
#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;

uniform float timeMsec;
uniform float speed;
uniform float resolution;
uniform vec3 color;
uniform vec3 backgroundColor;

#define PI 3.1415926535

float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }

void main( void ) {
  float time = timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
	vec2 pos = (resolution*vUv.xy);
	pos *= 10.;
	
	vec2 interval = pos * vec2(10.0, 5.);
	if (mod(interval.y, 2.) < 1.) {
	    interval.y = -interval.y + 1.;
	}
	
	vec2 fi = floor(interval);
	if (mod(fi.x, 2.) < 1.) {
	    fi.y = -fi.y + interval.y;
	} else{
	    fi.y = fi.y - interval.y + 1.;
	}
	
	float outputColor = pow(
	    sin(mod(
	        speed*time, 2.*PI) + rand(vec2(floor(interval.x + fi.y),
	     floor(interval.y))) * 200.
	     ),
    3.);
    vec3 outcolor = backgroundColor * outputColor + color * (1.0 - outputColor);
	gl_FragColor = vec4(outcolor , 1.);
}	
`
});

var electricfrag = `
float surface3 ( vec3 coord ) {

    float frequency = 7.0;
    float n = 0.4;

    n -= 1.0    * abs( cnoise( coord * frequency ) );
    n -= 1.5    * abs( cnoise( coord * frequency * 4.0 ) );
    n -= 1.25   * abs( cnoise( coord * frequency * 4.0 ) );

    return clamp( n, -0.6, 1.0 );
}

void main( void ) {
    float time = 0.05 * timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
    vec2 uvMax = ( 2.0 * asin( sin( 2.0 * PI * vUv ) ) ) / PI;
    
    vec2 uvScale = vec2(resolution, resolution);
    float n = surface3(vec3(uvMax * uvScale * 0.2, time * speed));

    vec3 s = vec3( clamp( n, 0.0, 1.0 ) ) * color * brightness * 4.0;
    gl_FragColor = vec4( s, 1.0 );
}
`
// see https://shaderfrog.com/app/view/43
AFRAME.registerShader('electric-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    speed: {type: 'float', is: 'uniform'},
    brightness: {type: 'float', is: 'uniform'},
    resolution: {type: 'float', is: 'uniform'},
    displacement: {type: 'float', is: 'uniform'},
    scale: {type: 'float', is: 'uniform'},
    
    color: {type: 'color', is: 'uniform'},
  },

  vertexShader: randomripple + `

void main() {
  float time = timeMsec / 2000.0;
  vUv = uv;
  vPosition = position;
  vNoise = cnoise(normalize(position) * scale + time * speed * 0.25);
  vec3 pos = position + normal * vNoise * vec3(displacement);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`,
  fragmentShader: randomripple + electricfrag
});

var fractalvert = randomripple + `
void main() {
    float time = timeMsec / 2000.0;
    vUv = uv;
    //vMouse = mouse;
    vPosition = position;
    float sinemult = (sin(time*0.1) + 1.0) * 0.5; // 0 to 1, currently replace by keyboard controls (ripmult)
    float ripmult = vertexnoise;
    vNoise = cnoise(normalize(position) * scale + time * speed * 0.25) * vertexnoise;
    vec3 pos = position + normal * vNoise * vec3(displacement);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos,1.0);
}
`
/*
  Built from http://glslsandbox.com/e#44551.1, which was originally inspired by
  http://www.fractalforums.com/new-theories-and-research/very-simple-formula-for-fractal-patterns/
  Changes include:
    - Updated harmonic function for more consistently interesting patterning
    - Added uniforms and keyboard controls for user control
    - Integration with Perlin noise ripples for some involvement of 3D for VR
*/
AFRAME.registerShader('fractal-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    resolution: {type: 'float', is: 'uniform'},
    skip: {type: 'float', is: 'uniform'},
    displacement: {type: 'float', is: 'uniform'},
    shatter: {type: 'float', is: 'uniform'},
    twist: {type: 'float', is: 'uniform'},
    scale: {type: 'float', is: 'uniform'},
    vertexnoise: {type: 'float', is: 'uniform'},
    speed: {type: 'float', is: 'uniform'},
  },

  vertexShader: fractalvert,
  fragmentShader: `
precision highp float;

varying vec2 vUv;

uniform float timeMsec;
uniform float resolution;
uniform float skip;
uniform float shatter;
uniform float twist;

varying float vNoise;

//#define timeMsec (timeMsec + 100.0 * 2000.0)

void main(void){
  //float time = (timeMsec + 50.0 * val * 2000.0) / 2000.0; // Convert from A-Frame milliseconds to typical time in seconds.
  // 200 for ripples
  float time = (3.14159265358979 / (4.0*594.059)) * (timeMsec + skip * 100.0 * 2000.0); 
  vec2 resolution = vec2(resolution, resolution);
	vec2 v = (vUv - 0.5) * resolution;
	vec2 vv = v; vec2 vvv = v;
	float tm = time*0.01*1.0;

  float shiftsine = sin(tm) * 0.4 + 0.75;
	vec2 shift = vec2(0, shiftsine); // Shift to set overall fractal
  float mshift = shiftsine/2.0 + 0.2; // Shift for noise-dependent patterns

	vec2 mspt = (vec2(
			sin(tm)+cos(tm*0.5)+sin(tm*-0.5)+cos(tm*0.1)+sin(tm*0.2) + (vNoise / (20.0*mshift)),
			cos(tm)+sin(tm*0.1)+cos(tm*0.8)+sin(tm*-1.1)+cos(tm*1.5) + (vNoise / (50.0*mshift))
			)+4.4)*0.06;
	float R = 0.0;
	float RR = 0.0;
	float RRR = 0.0;
  // TODO make this not 10 unless mouse is working
	float a = (.6-mspt.x)*6.2;
	float C = cos(a);
	float S = sin(a);
	vec2 xa=vec2(C, -S);
	vec2 ya=vec2(S, C) * twist;
	float Z = 1.0 + mspt.y;//*6.0;
	float ZZ = 1.0 + mspt.y;//*6.2;
	float ZZZ = 1.0 + (mspt.y);//*6.9;
	
	for ( int i = 0; i < 40; i++ ){
    // dot product leaves square of magnitude of v
		float r = dot(v,v);
		if ( r > 1.0 )
		{
			r = (1.0)/r ;
			v.x = v.x * r * shatter;
			v.y = v.y * r;
		}
		R *= .99;
		R += r;
		if(i < 39){
			RR *= .99;
			RR += r;
			if(i < 38){
				RRR *= .99;
				RRR += r;
			}
		}
		
		v = vec2( dot(v, xa), dot(v, ya)) * Z * ZZ + shift;
	}
	float c = ((mod(R,2.0)>1.0)?1.0-fract(R):fract(R));
	float cc = ((mod(RR,2.0)>1.0)?1.0-fract(RR):fract(RR));
	float ccc = ((mod(RRR,2.0)>1.0)?1.0-fract(RRR):fract(RRR));
  
	gl_FragColor = vec4(ccc, cc, c, 1.0); 
}
`
});