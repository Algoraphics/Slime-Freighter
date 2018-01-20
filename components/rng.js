/* global AFRAME, getRandomColor */

/* RNG (Random Number Generator)
This file contains RNG components used mostly by worldbuilders.

The expected behavior of an rng component is to take in only the width and height
of the asset as a static parameter. Other variables are entered in the form of a
string of relative probabilities. The value of those variables will be chosen at
random using said probabilities, from a list of options set inside the rng component.
*/

// Global vars used by assets to time animations to music
var beat = 594.059;
var dur = beat * 4;
var animAttrs = ' dir: alternate; loop: true; ';

/*
  Main rng function.
  options come in the form [a, b, c, d]
  probstr in the form '1 2 3 0'
  This function will return a single chosen option using the specified probabilities
*/
function rng(options, probstr) {
  var choose_array = chooseArr(options, probstr);
  return choose_array[Math.floor(Math.random() * choose_array.length)];
}

/*
  Builds choose array from which rng options are chosen.
  Ex: for [a, b, c, d] and '1 2 3 0' choose_array looks like [a, b, b, c, c, c]
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
  Add listeners to an asset so it can begin movement once it hears a beat.
  Takes in "startclass" which is the class of child assets which should also be
  activated along with the parent.
*/
function addBeatListener(comp, startclass) {
  comp.el.addEventListener('beat', function (event) {
    if (!this.started) {
      this.started = true;

      // If we have the class name of children, tell them all to start
      if (startclass != '') {
        var els = this.querySelectorAll('.' + startclass);
        for (var i = 0; i < els.length; i++) {
          els[i].emit('started');
        }
      }
      this.emit('started');
    }
  })
}

// TODO: explanation, can generalize and remove the word building from a lot of these
function arcBuildings(building, buildingAttrs, angle, dist, scale, axis, depth) {
  if (depth > 1) {
    var xoffset = 0; var yoffset = -10; var zoffset = 0;
    var xangle = 0; var yangle = 0;
    //var angle = 0;
    // Calibrated for a 1x1 block
    if (axis == 'y') {
      var xoffset = 0;//0.05 * (angle / 5);
      var yoffset = 6 + (0.1 * (angle / 5));
      yangle = angle;
    }
    // Calibrated for a 1x2 block
    else if (axis == 'x') {
      var xoffset = dist - 0.1 * (angle / 5);
      var yoffset = 0;
      var zoffset = 0.25 * (angle / 5);
      xangle = angle;
    }
    
    //var animAttrs = ' dir: alternate; loop: true; easing: easeInOutExpo; dur: ' + dur;
    var mover = document.createElement('a-entity');
    mover.setAttribute('animation__move', 'property: position; from: 0 0 0; to: ' + -xoffset + ' ' + yoffset + ' ' + zoffset + ';'
                       + animAttrs + 'easing: easeInOutExpo; startEvents: started; dur: ' + dur);
    mover.setAttribute('class', 'arc');

    var nextbuilding = document.createElement('a-entity');
    nextbuilding.setAttribute('building', buildingAttrs);
    //nextbuilding.setAttribute('position', "0 0 0");
    nextbuilding.setAttribute('scale', scale + " " + scale + " " + scale);
    nextbuilding.setAttribute('animation__turn', 'property: rotation; from: 0 0 0; to: 0 ' + xangle + ' ' + yangle + ';'
                              + animAttrs + 'easing: easeInOutExpo; startEvents: started; dur: ' + dur);
    nextbuilding.setAttribute('class', 'arc');

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
    num: {default: 4},
    slide: {default: false},
    scale: {default: '1 1 1'},
    start: {default: '1 2 1'},
  },
  init: function () {
    var data = this.data;
    
    this.el.setAttribute('class', 'beatlistener' + this.data.start);
    
    var height = data.height;
    var width = data.width;
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    var scale = rng([1, 0.9, 0.8], data.scale);
    var angle = data.angle;
    if (angle < 0) {
      angle = rng([0, 5, 10, 15, 20, 25, 30, 45], '2 2 1 1 1 1 2 1');
    }
    var num = rng([3, 4, 5], '1 2 1');
    
    var building = document.createElement('a-entity');
    var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                          + "; width: " + width + "; height: " + height + "; optimize: false";
    building.setAttribute('building', buildingAttrs);
    
    
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
    arcBuildings(building, buildingAttrs, angle, dist, scale, data.axis, num);
    
    //var rotation = rng([0, 90, 180, 270], '1 1 1 1');
    building.setAttribute('rotation', '0 ' + 0 + ' 0');
    this.el.appendChild(building);
    
    addBeatListener(this, 'arc');
  },
  tick: function () {
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
    num: {default: '2 0 1'},
    start: {default: -150},
  },
  init: function () {
    var data = this.data;
    
    var height = data.height;
    var width = data.width;
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    var num = rng([2, 3, 4], data.num);
    
    this.el.setAttribute('class', 'beatlistener' + this.data.start);
    
    var moveup = 0;
    var fallout = 0;
    var fallover = 0;
    if (data.preset == 'flower') {
      moveup = 0;
      fallout = 1;
      fallover = 45;
    }
    if (data.preset == 'cross') {
      moveup = 10;
      fallout = 0;
      fallover = 90;
    }
    
    var angle = 0;
    for (var i = 0; i < num; i++) {
      var mover = document.createElement('a-entity');
      mover.setAttribute('animation__turn', 'property: rotation; from: 0 ' + angle + ' 0; to: 0 ' + angle + ' ' + fallover + ';'
                         + animAttrs + 'easing: easeInOutQuart; startEvents: started; dur: ' + dur);
      mover.setAttribute('class', "flower");
      var building = document.createElement('a-entity');
      var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                            + "; width: " + width + "; height: " + height + "; optimize: false";
      building.setAttribute('building', buildingAttrs);
      building.setAttribute('animation__move', 'property: position; from: 0 0 0; to: ' + moveup + ' ' + fallout + ' 0;'
                            + animAttrs + 'easing: easeInOutQuart; startEvents: started; dur: ' + dur);
      mover.setAttribute('class', "flower");
      mover.appendChild(building);
      this.el.appendChild(mover);
      angle += 360/num;
    }
    this.el.setAttribute('animation__turn', 'property: rotation; from: 0 0 0; to: 0 90 0; dir: alternate; loop: true' 
                         + '; easing: easeInOutSine; startEvents: started; dur: ' + (dur * 2));
    addBeatListener(this, 'flower');
  }
});

AFRAME.registerComponent('rng-building-dance', {
  schema: {
    // Input probabilities
    windowtype: {default: '1 0 0 0 0'},
    colortype: {default: '1 0 0 0 0 0'},
    color1: {default: ''},
    color2: {default: ''},
    width: {default: 1},
    height: {default: 1},
    start: {default: 0},
  },
  init: function () {
    var data = this.data;
    
    var height = data.height;
    var width = data.width;
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                            + "; width: " + width + "; height: " + height + "; optimize: false";
    this.el.setAttribute('building', buildingAttrs);
    // TODO: These float a little. Run a quick test to figure out why
    this.el.setAttribute('audio-react',"analyserEl: #analyser; multiplier: 0.75; build: 1; startbeat: " + data.start);
  }
});


/*
  Tick function for sine animation which allows pausing. Can either continue to move in the same direction
  or alternate back and forth, and can also jump in an arc. Takes in component used to configure settings.
*/
function sinmove(comp) {
  if (!comp.el.started) {
    return;
  }
  
  var dist = comp.data.dist;
  var curpos = {x: 0, y: 0, z: 0};
  var pi = 3.14159265358979;
  var push = dist*2;
  var offset = dist/2;
  if (comp.time > 4*beat) {
    comp.reverse = -comp.reverse;
    comp.time = 0;
    if (comp.cont) {
      comp.pos += push;
    }
  }
  for (var i = 0; i < comp.el.children.length; i++) {

    var sinval = (comp.time - beat*i/8)*(pi/(2*beat));

    if (sinval > pi/2 && sinval < 3*pi/2) {
      if (comp.cont) {
        curpos.x = comp.pos + dist*Math.sin(-sinval);
      } else {
        curpos.x = dist*Math.sin(sinval*comp.reverse);
        if (comp.diag) {
          curpos.z = curpos.x;
        }
      }
      if (comp.reverse < 0 && comp.skip) {
        curpos.y = -dist*Math.cos(sinval*comp.reverse);
      }
    }
    else {
      // Local variable avoids swapping per element
      var outpos = dist;
      if (comp.cont) {
        if ((sinval > 3*pi/2)) {
          outpos = -dist;
        }
        curpos.x = comp.pos - outpos;
      } else {
        if ((comp.reverse < 0 && sinval < 3*pi/2) || (comp.reverse > 0 && sinval > pi/2)) {
          outpos = -dist;
        }
        curpos.x = outpos;
        if (comp.diag) {
          curpos.z = curpos.x;
        }
      }
      curpos.y = 0;
    }
    // Offset so that starting point is beginning of animation
    if (!comp.center) {
      curpos.x = curpos.x + dist;
      if (comp.diag) {
        curpos.z = curpos.z + dist;
      }
    }
    comp.el.children[i].setAttribute('position', curpos);
  } 
}

AFRAME.registerComponent('rng-building-sine', {
  // TODO: can schema be a variable?
  schema: {
    // Input probabilities
    windowtype: {default: '1 0 0 0 0'},
    colortype: {default: '1 0 0 0 0 0'},
    color1: {default: ''},
    color2: {default: ''},
    width: {default: 1},
    height: {default: 2},
    num: {default: 4}, // Number of elements
    numbeats: {default: 2}, // Number of beats per movement
    reverse: {default: false},
    start: {default: -250},
    dist: {default: 12},
    cont: {default: false},
    skip: {default: false},
    diag: {default: false},
  },
  init: function () {
    var data = this.data;
    
    this.el.setAttribute('class', 'beatlistener' + data.start);
    
    this.pos = 0;
    this.cont = this.data.cont;
    this.skip = this.data.skip;
    
    //console.log("start is " + data.start);
    this.start = data.start;
    this.started = false;
    
    this.reverse = 1;
    if (data.reverse) {
      this.reverse = -1;
    }
    this.diag = this.data.diag;
    
    this.time = 0;
    
    var height = data.height;
    var width = data.width;
    var window = '';
    if (data.windowtype.split(' ').length <= 1) {
      window = data.windowtype;
    }
    else {
      window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    }
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    
    var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                    + "; width: " + width + "; height: " + height + "; optimize: false";
    
    for (var i = 0; i < data.num; i++) {
      var building = document.createElement('a-entity');
      building.setAttribute('building', buildingAttrs);
      building.setAttribute('rotation', "0 0 0");
      
      this.el.appendChild(building);
    }
    addBeatListener(this, '');
  },
  tick: function (time, timeDelta) {
    this.time += timeDelta * (4 / this.data.numbeats);
    sinmove(this);
  }
});

AFRAME.registerComponent('rng-building-pulse', {
  schema: {
    // Input probabilities
    windowtype: {default: '1 0 0 0 0'},
    colortype: {default: '1 0 0 0 0 0'},
    color1: {default: ''},
    color2: {default: ''},
    width: {default: 1},
    height: {default: 2},
    start: {default: 0},
  },
  init: function () {
    var data = this.data;
    
    this.el.setAttribute('class', 'beatlistener' + data.start);
    
    var height = data.height;
    var width = data.width;
    //TODO: mini functions for these variables? means single location for storing list of window types
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                          + "; width: " + width + "; height: " + height + "; optimize: false";
    
    var center = document.createElement('a-entity');
    center.setAttribute('building', buildingAttrs);
    this.el.appendChild(center);
    
    var front = document.createElement('a-entity');
    front.setAttribute('rng-building-sine', "windowtype: " + window + "; width: " + width + ";height: " + height
                       + "; color1: #ffff00; num:1; dist:4.5; start: " + data.start);
    front.setAttribute('rotation', "0 90 0");
    front.setAttribute('position', "0 0 5");
    this.el.appendChild(front);
    var side = document.createElement('a-entity');
    side.setAttribute('rng-building-sine', "windowtype: " + window + "; width: " + width + ";height: " + height
                      + "; color1: #ffff00; num:1; dist:4.5; start: " + (data.start + 1));
    side.setAttribute('position', "-5 0 0");
    this.el.appendChild(side);
    addBeatListener(this, '');
  }
});

AFRAME.registerComponent('rng-building-split', {
  // TODO: can schema be a variable?
  schema: {
    // Input probabilities
    windowtype: {default: '1 0 0 0 0'},
    colortype: {default: '1 0 0 0 0 0'},
    color1: {default: ''},
    color2: {default: ''},
    numbeats: {default: 4}, // Number of beats per movement
    start: {default: 0},
    dist: {default: 6},
  },
  init: function () {
    var data = this.data;
    
    this.pos = 0;
    
    this.el.setAttribute('class', 'beatlistener' + data.start);
    this.reverse = false;
    
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    this.firstpos = this.el.getAttribute('position');
    
    var pos = this.el.getAttribute('position');
    
    var angle = 0;
    for (var z = 0; z < 2; z++) {
      for (var x = 0; x < 2; x++) {
        var piece = document.createElement('a-entity');
        var dist = 3.75;
        var reverse = false;
        if (x == 1 && z == 1) {
          //reverse = false;
          angle = 180;
        }
        piece.setAttribute('position', (x*20) + " -24.5 " + (z*20));
        piece.setAttribute('rng-building-sine', "num: 1; numbeats: 4; height: 6; color1: #ffff00; diag: true"
                           + "; dist: " + dist + "; reverse: " + reverse + "; start: " + data.start);
        piece.setAttribute('rotation', "0 " + angle + " 0");
        //piece.setAttribute('scale', "1.05 1.05 1.05");
        this.el.appendChild(piece);
        angle -= 90;
      }
      angle = 90;
    }
    var from = "" + pos.x + " " + pos.y + " " + pos.z;
    var to = pos.x + " " + (pos.y + 25) + " " + pos.z;
    this.el.setAttribute('animation__up', 'property: position; from: ' + from + '; to: ' + to + '; dir: alternate; loop: true' 
                         + '; easing: easeInOutQuint; startEvents: started; delay: 1000; dur: ' + dur);
    addBeatListener(this, '');
  },
});


/* 
  Walking building. Not particularly configurable, doesn't need to be.
*/
AFRAME.registerComponent('rng-building-robot', {
  schema: {
    // Input probabilities
    windowtype: {default: '1 0 0 0 0'},
    colortype: {default: '1 0 0 0 0 0'},
    color1: {default: ''},
    color2: {default: ''},
    numbeats: {default: 4}, // Number of beats per movement
    start: {default: -200}, // Delay walking
    dist: {default: 8},
    reverse: {default: false},
  },
  init: function () {
    var data = this.data;
    
    this.el.setAttribute('class', 'beatlistener' + data.start);
    
    this.pos = 0;
    this.cont = true;
    
    this.reverse = 1;
    this.time = 0;
    
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['static', 'shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    this.firstpos = this.el.getAttribute('position');
    
    var buildingAttrs = "windowtype: " + window + "; colortype: " + colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                          + "; width: 1; height: 3; optimize: false";
    
    var left = document.createElement('a-entity');
    var right = document.createElement('a-entity');
    
    left.setAttribute('position', "0 0 4.25");
    right.setAttribute('position', "0 0 -4.25");
    
    left.setAttribute('rng-robotlegs', 'windowtype: ' + window + '; color1: ' + data.color1 + '; numbeats: ' + data.numbeats
                      + '; start: ' + data.start + '; dist: ' + data.dist);
    right.setAttribute('rng-robotlegs', 'reverse: true; windowtype: ' + window + '; color1: ' + data.color1 + '; numbeats: ' + data.numbeats
                       + "; start: " + data.start + '; dist: ' + data.dist);
    
    var core = document.createElement('a-entity');
    //core.setAttribute('position', corepos);
    core.appendChild(left);
    core.appendChild(right);
    
    for (var i = 0; i < 3; i++) {
      var center = document.createElement('a-entity');
      center.setAttribute('position', (2.5 + 4.5*i) + " 10 0");
      
      var cpos = center.getAttribute('position');
      center.setAttribute('rotation', "0 0 0");
      center.setAttribute('building', buildingAttrs);
      core.appendChild(center);
    }
    
    this.el.appendChild(core);
    if (data.reverse) {
      this.el.setAttribute('rotation', "0 0 0");
    }
    else this.el.setAttribute('rotation', "0 180 0");
    
    addBeatListener(this, '');
  },
  tick: function (time, timeDelta) {
    this.time += timeDelta * (4 / this.data.numbeats);
    sinmove(this);
  }
});

/*
  Legs for walking building. Needed to be a separate component so it could have its own layout and movement mechanics
*/
AFRAME.registerComponent('rng-robotlegs', {
  // TODO: can schema be a variable?
  schema: {
    // Input probabilities
    windowtype: {default: 'rect'},
    colortype: {default: 'static'},
    color1: {default: ''},
    color2: {default: ''},
    numbeats: {default: 8}, // Number of beats per movement
    reverse: {default: false},
    start: {default: 0},
    dist: {default: 8},
    cont: {default: false},
  },
  init: function () {
    var data = this.data;
    
    this.el.setAttribute('class', 'beatlistener' + data.start);
    
    this.pos = 0;
    this.cont = this.data.cont;
    this.skip = true;
    
    this.start = data.start;
    this.started = false;
    this.reverse = 1;
    if (data.reverse) {
      this.reverse = -1;
    }
    this.time = 0;
    
    this.firstpos = this.el.getAttribute('position');
    
    var buildingAttrs = "windowtype: " + data.windowtype + "; colortype: " + data.colortype + "; color1: " + data.color1 + "; color2: " + data.color2
                          + "; width: " + 1 + "; height: " + 2 + "; optimize: false";

    var core = document.createElement('a-entity');
    
    var bar = document.createElement('a-entity');
    bar.setAttribute('position', "6 10.3 0");
    bar.setAttribute('rotation', "0 0 90");
    bar.setAttribute('building', buildingAttrs);
    core.appendChild(bar);
    
    var front = document.createElement('a-entity');
    front.setAttribute('position', "8 0 0");
    front.setAttribute('building', buildingAttrs);
    core.appendChild(front);
    
    var back = document.createElement('a-entity');
    back.setAttribute('position', "-8 0 0");
    back.setAttribute('building', buildingAttrs);
    core.appendChild(back);

    this.el.appendChild(core);
    
    addBeatListener(this, '');
  },
  tick: function (time, timeDelta) {
    this.time += timeDelta * (4 / this.data.numbeats);
    sinmove(this);
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
    building.setAttribute('building', "windowtype: " + window + "; colortype: " + colortype + "; color1: "
                          + data.color1 + "; color2: " + data.color2 + "; width: " + width + "; height: " + height);
    this.el.appendChild(building);
    this.id++;
  }
});

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
    var setheight = (buildingheight - buildingheight / 2);
    
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
                            + "; coloroffset: " + 0 + "; usecolor1: " + usecolor1 + "; usecolor2: " + usecolor2);
      building.setAttribute('geometry', "primitive: box; width: " + buildingwidth + "; height: " + buildingheight + "; depth: " + buildingwidth);
      building.setAttribute('position', "0 " + setheight + " 0");
      setheight += buildingheight;
      this.el.appendChild(building);
    }
  }
});

/*
Rng component for customizeable objects with complex shaders.
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
                         + "; depth: " + data.width + "; radius: " + (data.width / 2) + "segmentsWidth: 80; segmentsHeight: 80;");
    entity.setAttribute('material', "side: double; shader: " + shader + "-shader; speed: " + speed
                    + "; brightness: " + brightness + "; color: " + color + "; backgroundColor: " + bgcolor 
                    + "; resolution: " + resolution + "; fadeaway: " + fadeaway + "; uniformity: " + uniformity
                    + "; zoom: " + zoom + "; intensity: " + intensity + "; skip: " + skip
                    + "; frequency: " + 15 + "; amplitude: " + 0.2 + "; displacement: " + 0.5 + "; scale: " + 4.0);
    this.el.appendChild(entity);
  }
});