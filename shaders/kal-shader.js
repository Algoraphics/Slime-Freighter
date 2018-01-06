/* global AFRAME, THREE */

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
  float time = timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
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
