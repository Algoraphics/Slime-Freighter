/* global AFRAME, THREE */


// shader-grid-glitch.js

AFRAME.registerShader('lightspeed-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    speed: {type: 'float', is: 'uniform'},
    fadeaway: {type: 'float', is: 'uniform'},
    resolution: {type: 'float', is: 'uniform'},
    uniformity: {type: 'float', is: 'uniform'},
    
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
    float t = time * speed;
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
