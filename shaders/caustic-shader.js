/* global AFRAME, THREE */


// shader-grid-glitch.js

AFRAME.registerShader('caustic-shader', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    speed: {type: 'float', is: 'uniform'},
    brightness: {type: 'float', is: 'uniform'},
    res: {type: 'float', is: 'uniform'},
    
    color: {type: 'color', is: 'uniform'},
    backgroundColor: {type: 'color', is: 'uniform'},
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
#define TAU 6.28318530718
#define MAX_ITER 5

precision highp float;
precision highp int;
uniform float res;

uniform vec3 backgroundColor;
uniform vec3 color;
uniform float speed;
uniform float brightness;
uniform float timeMsec;

varying vec2 vUv;

void main() {
    float time = timeMsec / 2000.0; // Convert from A-Frame milliseconds to typical time in seconds.
    vec2 resolution = vec2(res, res);
    vec2 uv = vUv * resolution;
    
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
