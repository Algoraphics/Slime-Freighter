/* global AFRAME, THREE */

// shader-grid-glitch.js

AFRAME.registerShader('grid-glitch', {
  schema: {
    timeMsec: {type: 'time', is: 'uniform'},
    numrows: {type: 'float', is: 'uniform'}, // Initial number of window rows
    speed: {type: 'float', is: 'uniform'}, // Speed of slide, colorslide, and grow
    
    height: {type: 'float', is: 'uniform'}, // Fractional height of the box
    width: {type: 'float', is: 'uniform'}, // Fractional width of the box
    
    color1: {type: 'color', is: 'uniform'},
    color2: {type: 'color', is: 'uniform'},
    usecolor1: {type: 'float', is: 'uniform'},
    usecolor2: {type: 'float', is: 'uniform'},
    colorslide: {type: 'float', is: 'uniform'}, // Whether to slide colors. Use negatives to go backwards
    coloraxis: {type: 'float', is: 'uniform'}, // 0.0 for x, 1.0 for y
    colorgrid: {type: 'float', is: 'uniform'}, // 0 to match with numrows, 1 to turn off
    coloroffset: {type: 'float', is: 'uniform'},
    invertcolors: {type: 'float', is: 'uniform'},
    
    slide: {type: 'float', is: 'uniform'}, // Number of windows to slide by. 0.0 to not slide
    slidestart: {type: 'float', is: 'uniform'}, // Start point for clamp
    slidesine: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If slide should sine.
    slideclamp: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If slide should clamp.
    slideaxis: {type: 'float', is: 'uniform'}, // 0.0 for x, 1.0 for y
    slidereverse: {type: 'float', is: 'uniform'},

    grow: {type: 'float', is: 'uniform'}, // Number of windows to grow by
    growstart: {type: 'float', is: 'uniform'}, // Start point for clamp
    growsine: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If grow should sine.
    growclamp: {type: 'float', is: 'uniform'}, // 0.0 or 1.0. If grow should clamp.
  },
  
  

  vertexShader: `
varying vec2 vUv;
uniform float timeMsec;

void main() {
  float time = timeMsec / 1000.0;
  vUv = uv;
  vec3 position2 = position;
  //position2.x *= sin(time);
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position2, 1.0 );

}
`,
  fragmentShader: `
varying vec2 vUv;
varying float factor;
uniform float timeMsec; // A-Frame time in milliseconds.
uniform float numrows;
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

float depth = gl_FragDepthEXT / gl_FragCoord.w;

float box(vec2 st, vec2 size, float smoothEdges){
    size = vec2(0.5) - size * 0.5;
    vec2 aa = vec2(smoothEdges * 0.5);
    vec2 bb = smoothstep(size, size + aa, st);
    bb *= smoothstep(size, size + aa, vec2(1.0) - st);
    return bb.x * bb.y;
}

void main() {
  float time = 3.0 * timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
  // Use sin(time), which curves between -1 and 1 over time,
  // to determine the mix of two colors:
  //    (a) Dynamic color where 'R' and 'B' channels come
  //        from a modulus of the UV coordinates.
  //    (b) Base color.
  // 
  // The color itself is a vec4 containing RGBA values 0-1.

  vec2 st = vUv;
  vec3 boxcolor1 = vec3(0.0);
  vec3 boxcolor2 = vec3(0.0); 

  float growval = step(1.0, grow) * time * speed * (1.0 - growsine) * (1.0 - growclamp);
  growval += (numrows + ((sin(time/5.0) + 1.0) / 2.0) * grow) * growsine;
  growval += (numrows + clamp(speed * time, growstart, growstart + grow)) * growclamp;
  growval += numrows;
  st *= growval;


  float slidedirection = (1.0 - slidereverse) * 1.0 + slidereverse * -1.0;
  float slideval = step(1.0, slide) * time * 0.2 * speed * (1.0 - slidesine) * (1.0 - slideclamp);
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

  float rate = slidedirection * 0.2 * speed * colorslide / numrows;
  uv2[0] += time * rate * (1.0 - coloraxis);
  uv2[1] += time * rate * coloraxis;
  uv2 *= 1.0 + ((numrows - 1.0) * colorgrid);
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
  float rainbowscillate = cos(time/2.0) * coloroffset + sin(time/2.0) * (1.0 - coloroffset);
  float oscillate = cos(time) * coloroffset + sin(time) * (1.0 - coloroffset);
  float combo = (1.0 - usecolors) * (rainbowscillate * 0.5 
                                  + israinbow * 0.7 
                                  + usecolor1 * 0.8 
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
