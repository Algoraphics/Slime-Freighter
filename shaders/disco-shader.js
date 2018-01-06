/* global AFRAME, THREE */


// shader-grid-glitch.js

AFRAME.registerShader('disco-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    speed: {type: 'float', is: 'uniform'},
    resolution: {type: 'float', is: 'uniform'},
    
    color: {type: 'color', is: 'uniform'},
    color2: {type: 'color', is: 'uniform'},
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
uniform vec3 color2;

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
    vec3 outcolor = color2 * outputColor + color * (1.0 - outputColor);
	gl_FragColor = vec4(outcolor , 1.);
}	
`
});
