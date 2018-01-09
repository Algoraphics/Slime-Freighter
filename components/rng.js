/* global AFRAME, getRandomColor */

/* RNG (Random Number Generator)
This file contains RNG components used mostly by worldbuilders.

The expected behavior of an rng component is to take in only the width and height
of the asset as a static parameter. Other variables are entered in the form of a
string of relative probabilities. The value of those variables will be chosen at
random using said probabilities, from a list of options set inside the rng component.
*/

/*
  options come in the form [a, b, c, d]
  probstr in the form '1 2 3 0'
  This function will return a single chosen option using the specified probabilities
*/
function rng(options, probstr) {
  //console.log("TATER");
  var choose_array = chooseArr(options, probstr);
  return choose_array[Math.floor(Math.random() * choose_array.length)];
}

/*
  Builds choose array from which rng options are chosen.
  Ex: for [a, b, c, d] and '1 2 3 0' answer looks like [a, b, b, c, c, c]
*/
function chooseArr(options, probstr) {
  var probs = probArr(options, probstr);
  var choose_array = [];
  var outdex;
  for (var i = 0; i < options.length; i++) {
    outdex = probs[i];
    while (outdex > 0) {
      choose_array.push(options[i]);
      outdex--;
    }
  }
  return choose_array;
}

// Parse probability array from string
function probArr(options, probstr) {
  //console.log("Checking probs for options "  + options + " and probstr " + probstr);
  var probs = probstr.split(' ');
  if (options.length != probs.length) {
    console.error("Options array length " + options.length + " must match probabilities array length " + probs.length);
    return NaN;
  }
  return probs;
}

/*
Want rng option for trippy shaders. Options:
Disco shader with both colors random
Caustic shader with one color set
Grid shader with other color set
*/

AFRAME.registerComponent('rng-shader', {
  schema: {
    
    shader: {default: ''},
    shape: {default: '1 1 1'},
    
    speed: {default: '1 1 1'},
    brightness: {default: '1 1 1'},
    resolution: {default: '1 1 1 1'},
    fadeaway: {default: 1.0},
    uniformity: {default: 1.0},
    zoom: {default: 1.0},
    intensity: {default: 1.0},
    skip: {default: 2.0},
    
    color: {default: ''},
    bgcolor: {default: ''}, 
    
    height: {default: 1},
    width: {default: 1},
  },
  init: function () {
    var data = this.data;
    
    var speed = rng([0.5, 1.0, 2.0], data.speed);
    var brightness = rng([1.0, 2.0, 3.0], data.brightness);
    var resolution = rng([0.5, 1.0, 2.0, 3.0], data.resolution);
    // Lightspeed uses these
    var fadeaway = 0.5;
    var uniformity = 10.0;
    // Kaleidoscope (kal) uses this
    var zoom = 100.0;
    // Grid uses this for brightness level
    var intensity = 10.0;
    // Fractal uses this to skip further in time and see new patterns
    var skip = data.skip;
    
    var color = data.color;
    if (!color) {
      color = getRandomColor();
    }
    var bgcolor = data.backgroundColor;
    if (!bgcolor) {
      bgcolor = getRandomColor();
    }
    
    var shader = data.shader;
    var shape = rng(['box', 'sphere', 'cylinder'], data.shape);
    var entity = document.createElement('a-entity');
    entity.setAttribute('geometry', "primitive: " + shape + "; height: " + data.height + "; width: " + data.width 
                         + "; depth: " + data.width + "; radius: " + (data.width / 2));
    entity.setAttribute('material', "side: double; shader: " + shader + "-shader; speed: " + speed
                    + "; brightness: " + brightness + "; color: " + color + "; backgroundColor: " + bgcolor 
                    + "; resolution: " + resolution + "; fadeaway: " + fadeaway + "; uniformity: " + uniformity
                    + "; zoom: " + zoom + "; intensity: " + intensity + "; skip: " + skip);
    this.el.appendChild(entity);
  }
});

// Global vars used by assets to time animations to music
var beat = 594.059;
var dur = beat * 4;
var animAttrs = ' dir: alternate; loop: true; ';

function arcBuildings(building, buildingAttrs, angle, dist, scale, axis, depth) {
  if (depth > 1) {
    var xoffset = 0; var yoffset = -10; var zoffset = 0;
    var xangle = 0; var yangle = 0;
    //var angle = 0;
    // Calibrated for a 1x1 block
    if (axis == 'y') {
      var xoffset = 0.1 * (angle / 5);
      var yoffset = 6 + (0.1 * (angle / 5));
      yangle = angle;
    }
    // Calibrated for a 1x2 block
    else if (axis == 'x') {
      var xoffset = dist - 0.1 * (angle / 5);
      var zoffset = 0.25 * (angle / 5);
      xangle = angle;
    }
    
    //var animAttrs = ' dir: alternate; loop: true; easing: easeInOutExpo; dur: ' + dur;
    var mover = document.createElement('a-entity');
    mover.setAttribute('animation__move', 'property: position; from: 0 0 0; to: ' + -xoffset + ' ' + yoffset + ' ' + zoffset + ';'
                       + animAttrs + 'easing: easeInOutExpo; dur: ' + dur);

    var nextbuilding = document.createElement('a-entity');
    nextbuilding.setAttribute('building', buildingAttrs);
    nextbuilding.setAttribute('position', "0 0 0");
    nextbuilding.setAttribute('scale', scale + " " + scale + " " + scale);
    nextbuilding.setAttribute('animation__turn', 'property: rotation; from: 0 0 0; to: 0 ' + xangle + ' ' + yangle + ';'
                              + animAttrs + 'easing: easeInOutExpo; dur: ' + dur);

    arcBuildings(nextbuilding, buildingAttrs, angle, dist, scale, axis, depth - 1);
    
    mover.appendChild(nextbuilding);
    building.appendChild(mover);
  }
}

AFRAME.registerComponent('rng-building-arc', {
  schema: {
    // Input probabilities
    windowtype: {default: '1 0 0 0 0'},
    colortype: {default: '1 0 0 0 0 0'},
    color1: {default: ''},
    color2: {default: ''},
    width: {default: 1},
    height: {default: 1},
    angle: {default: -1}, // If not specified, will be 0 through 6
    axis: {default: 'y'},
    spread: {default: 1}, // How far apart to spread buildings. 1 is flush
    num: {default: 7},
    slide: {default: false},
    scale: {default: 1},
  },
  init: function () {
    var data = this.data;
    
    var height = data.height;
    var width = data.width;
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    var building = document.createElement('a-entity');
    var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                          + "; width: " + width + "; height: " + height + "; optimize: false";
    building.setAttribute('building', buildingAttrs);
    
    angle = data.angle;
    if (angle < 0) {
      var angle = rng([0, 5, 10, 15, 20, 25, 30, 45], '2 2 1 1 1 1 2 1');
    }
    
    if (data.axis == 'y') {
      building.setAttribute('position', "0 6 0");
      
      var bottom = document.createElement('a-entity');
      bottom.setAttribute('building', buildingAttrs);
      this.el.appendChild(bottom);
    }
    else if (data.axis == 'x') {
      angle = -angle;
    }
    
    var dist = 4.8 * data.spread;
    arcBuildings(building, buildingAttrs, angle, dist, data.scale, data.axis, data.num);
    
    var rotation = rng([0, 90, 180, 270], '1 1 1 1');
    building.setAttribute('rotation', '0 ' + rotation + ' 0');
    this.el.appendChild(building);
  }
});

AFRAME.registerComponent('rng-building-flower', {
  schema: {
    // Input probabilities
    windowtype: {default: '1 0 0 0 0'},
    colortype: {default: '1 0 0 0 0 0'},
    color1: {default: ''},
    color2: {default: ''},
    width: {default: 1},
    height: {default: 1},
    preset: {default: 'flower'},
  },
  init: function () {
    var data = this.data;
    
    var height = data.height;
    var width = data.width;
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    var moveup = 0;
    var fallout = 0;
    var fallover = 0;
    if (data.preset == 'flower') {
      moveup = 0;
      fallout = 3;
      fallover = 45;
    }
    if (data.preset == 'cross') {
      moveup = 10;
      fallout = 0;
      fallover = 90;
    }
    
    var angle = 0;
    for (var i = 0; i < 4; i++) {
      var mover = document.createElement('a-entity');
      mover.setAttribute('animation__turn', 'property: rotation; from: 0 ' + angle + ' 0; to: 0 ' + angle + ' ' + fallover + ';'
                         + animAttrs + 'easing: easeInOutQuart; dur: ' + dur);
      var building = document.createElement('a-entity');
      var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                            + "; width: " + width + "; height: " + height + "; optimize: false";
      building.setAttribute('building', buildingAttrs);
      building.setAttribute('animation__move', 'property: position; from: 0 2 0; to: ' + moveup + ' ' + fallout + ' 0;'
                            + animAttrs + 'easing: easeInOutQuart; dur: ' + dur);
      mover.appendChild(building);
      this.el.appendChild(mover);
      angle += 90;
    }
    this.el.setAttribute('animation__turn', 'property: rotation; from: 0 0 0; to: 0 90 0; dir: alternate; loop: true; easing: easeInOutSine; dur: ' + (dur * 2));
  }
});

AFRAME.registerComponent('rng-building-slider', {
  schema: {
    // Input probabilities
    windowtype: {default: '1 0 0 0 0'},
    colortype: {default: '1 0 0 0 0 0'},
    color1: {default: ''},
    color2: {default: ''},
    width: {default: 1},
    height: {default: 1},
  },
  init: function () {

    var data = this.data;
    
    this.reverse = 1;
    this.flip = 1;
    this.time = 0;
    
    var height = data.height;
    var width = data.width;
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    this.firstpos = this.el.getAttribute('position');
    
    var delay = 0;
    for (var i = 0; i < 4; i++) {
      var building = document.createElement('a-entity');
      var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                            + "; width: " + width + "; height: " + height + "; optimize: false";
      building.setAttribute('building', buildingAttrs);
      building.setAttribute('rotation', "0 0 0");
      this.el.appendChild(building);
    }
  },
  tick: function (time, timeDelta) {
    this.time += timeDelta;
    var curpos = this.firstpos;
    var pi = 3.14159265358979;
    if (this.time > 4*beat) {
      this.reverse = -this.reverse;
      this.time = 0;
    }
    for (var i = 0; i < this.el.children.length; i++) {
      
      var sinval = (this.time - beat*i/8)*(pi/(2*beat));
      
      var dist = 12;
      //curpos.x = dist*Math.sin(sinval*this.reverse);
      if (sinval > pi/2 && sinval < 3*pi/2) {
        curpos.x = dist*Math.sin(sinval*this.reverse);
        curpos.y = -dist*Math.cos(sinval*this.reverse);
      }
      else {
        //console.log("sinval is " + sinval + " and reverse is " + this.reverse);
        if ((this.reverse < 0 && sinval < 3*pi/2) || (this.reverse > 0 && sinval > pi/2)) {
          dist = -dist;
        }
        curpos.x = dist;
        curpos.y = 0;
      }
      this.el.children[i].setAttribute('position', curpos);
    }
  }
});

AFRAME.registerComponent('beat-emitter', {
  schema: {
    target: {default: ''}, 
  },
  init: function () {
    this.beatbar = beat;
    this.target = document.querySelector(this.data.target);
  },
  tick: function (time, timeDelta) {
    while (time > this.beatbar) {
      this.beatbar += beat * 2;
      if (time > 2000) {
        //console.log("beat emit!");
        this.target.emit('beat', 'deets', true);
      }
    }
  }
});

/* 
  Generate buildings which do not use shaders. These are made using
  individual plane geometries for windows. They use more GPU resources,
  but they are affected by environment fog and allow for a different set
  of animations than buildings made with custom shaders.
*/
AFRAME.registerComponent('rng-building', {
  schema: {
    // Input probabilities
    windowtype: {default: ''},
    colortype: {default: ''},
    color1: {default: ''},
    color2: {default: ''},
    width: {default: 1},
    height: {default: 1},
  },
  init: function () {
    var data = this.data;
    
    var height = data.height;
    var width = data.width;
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    //console.log("width is " + width + ", height is " + height + ", windowtype is " + window);
    
    var building = document.createElement('a-entity');
    building.setAttribute('building', "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                          + "; width: " + width + "; height: " + height);
    this.el.appendChild(building);
    this.id++;
  }
});

/*function getRandomColor2() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}*/

/*
  Generate city buildings using building-shader. Takes advantage of a large
  number of customizeable options in the shader, but not all.
*/
AFRAME.registerComponent('rng-building-shader', {
  schema: {
    axis: {default: '1 1'},
    width: {default: 1},
    height: {default: 1},
    static: {default: '1 1'},
    grows: {default: '1 1 1 1'},
    grow_slide: {default: '1 1'},
    usecolor1: {default: '1 1'},
    usecolor2: {default: '1 1'},
    colorstyle: {default: '1 1 1 1'}, // single color, two color, one color to gradient, gradient
  },
  init: function () {
    var data = this.data;
    
    //var width = rng([1.0, 2.0], data.width);
    //var height = rng([1.0, 2.0, 3.0, 4.0, 5.0], data.height);
    var height = data.height;
    var width = data.width;
    var winheight = 0.5;
    var winwidth = 0.5;
    var slidereverse = 0.0;
    var numrows = 2 * width;
    var colorgrid = 1.0;
    var invertcolors = 0.0;
    
    var slide = 0.0;
    var grow = 0.0;
    var move = rng([0.0, 1.0], data.static);
    var axis = rng([0.0, 1.0], data.axis);
    if (move) {
      var ngs = rng([0.0, 1.0], data.grow_slide);
      slidereverse = Math.floor(Math.random() * 2);
      slide = ngs;
      grow = 1 - ngs;
    }
    var growsine = grow;
    if (grow) {
      numrows = rng([numrows, 50.0, 150.0, 200.0], data.grows);
      if (numrows > 100) {
        invertcolors += 1;
        winheight = 0.95;
        winwidth = 0.95;
      }
      else {
        grow *= 16;
      }
      colorgrid = 0.0;
    }

    var buildingwidth = 5 * width;
    var buildingheight = 2 * buildingwidth;
    var setheight = (buildingheight - buildingheight / 2 - 1.5);
    
    var color1 = getRandomColor();
    var color2 = getRandomColor();
    var usecolor1 = 1.0;
    var usecolor2 = 1.0;
    var colorstyle = rng(['single', 'double', 'singlegrad', 'doublegrad'], data.colorstyle);
    if (colorstyle == 'single') {
      color2 = color1;
    }
    else if (colorstyle == 'singlegrad') {
      usecolor1 = rng([0.0, 1.0], data.usecolor1);
      usecolor2 = 1.0 - usecolor1;
    }
    else if (colorstyle == 'doublegrad') {
      usecolor1 = 0.0;
      usecolor2 = 0.0;
    }
    var offset = Math.floor(Math.random() * 2);
    //console.log("usecolor1 is " + usecolor1 + " and usecolor2 is " + usecolor2);
    
    for (var i = 0; i < height; i++) {
      var building = document.createElement('a-entity');
      building.setAttribute('material', "shader: building-shader;"
                            + "; color1: " + color1 + "; color2: " + color2 + "; numrows: " + numrows 
                            + "; grow: " + grow + "; growsine: " + growsine + "; invertcolors: " + invertcolors
                            + "; slide: " + slide + "; slidereverse: " + slidereverse + "; slideaxis: " + axis 
                            + "; colorslide: " + slide + "; coloraxis: " + axis + "; colorgrid: " + colorgrid
                            + "; speed: 1.0; height: " + winheight + "; width: " + winwidth
                            + "; coloroffset: " + offset + "; usecolor1: " + usecolor1 + "; usecolor2: " + usecolor2);
      building.setAttribute('geometry', "primitive: box; width: " + buildingwidth + "; height: " + buildingheight + "; depth: " + buildingwidth);
      building.setAttribute('position', "0 " + setheight + " 0");
      setheight += buildingheight;
      this.el.appendChild(building);
    }
  }
});