/* global AFRAME, getRandomColor, hexToRgb, bind */

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
  Main rng function. This thing is a workhorse for procedural generation.
  options come in the form [a, b, c, d]
  probstr in the form '1 2 3 0'
  The idea here is that it is now trivial to say "I want option A to appear
  twice as often as option B. Ex: rng([A, B],"2 1");
*/
function rng(options, probstr) {
  var choose_array = chooseArr(options, probstr);
  return pick_one(choose_array);
}

/*
  Function simply picks a value from an input array of choices.
*/
function pick_one(choose_array) {
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

// Parse probability array from string "1 2 3" -> [1, 2, 3]
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
      // Tell parent asset it should start moving
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
  });
}

// TODO long-term, these rng elements to not need to be specific to "buildings"

/*
  Helper function for rng-building-arc, recursively add buildings to a base with some arc
*/
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
                       + animAttrs + 'easing: easeInOutExpo; startEvents: started; dur: ' + (dur / 2));
    mover.setAttribute('class', 'arc');

    var nextbuilding = document.createElement('a-entity');
    nextbuilding.setAttribute('building', buildingAttrs);
    //nextbuilding.setAttribute('position', "0 0 0");
    nextbuilding.setAttribute('scale', scale + " " + scale + " " + scale);
    nextbuilding.setAttribute('animation__turn', 'property: rotation; from: 0 0 0; to: 0 ' + xangle + ' ' + yangle + ';'
                              + animAttrs + 'easing: easeInOutExpo; startEvents: started; dur: ' + (dur / 2));
    nextbuilding.setAttribute('class', 'arc');

    arcBuildings(nextbuilding, buildingAttrs, angle, dist, scale, axis, depth - 1);
    mover.appendChild(nextbuilding);
    building.appendChild(mover);
  }
}

// Configurable arc of buildings with optional scaling
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
    var num = rng([2, 3, 4], '0 3 1');
    
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

// Single building spreads out into a "flower" shape. Also supports forming a cross.
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
    start: {default: -2},
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
      moveup = 100;
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

// Building scales to the beat of an audio-visualizer.
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
                            + "; width: " + width + "; height: " + height;
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

/*
  This component allows alternating movement with pauses, a surprisingly difficult thing to do
  using aframe animations. Uses sine waves to calculate position and when to pause.
*/
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
    num: {default: 3}, // Number of elements
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

// Group of buildings which slide in and out of each other in a cool formation.
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
                          + "; width: " + width + "; height: " + height;
    
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

// Group of buildings which form together into a larger building and then grow taller.
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
    
    // Make legs, add to body
    var left = document.createElement('a-entity');
    var right = document.createElement('a-entity');
    
    left.setAttribute('position', "0 0 4.25");
    right.setAttribute('position', "0 0 -4.25");
    
    left.setAttribute('rng-robotlegs', 'windowtype: ' + window + '; color1: ' + data.color1 + '; numbeats: ' + data.numbeats
                      + '; start: ' + data.start + '; dist: ' + data.dist);
    right.setAttribute('rng-robotlegs', 'reverse: true; windowtype: ' + window + '; color1: ' + data.color1 + '; numbeats: ' + data.numbeats
                       + "; start: " + data.start + '; dist: ' + data.dist);
    
    var core = document.createElement('a-entity');
    
    core.appendChild(left);
    core.appendChild(right);
    
    // Create actual body geometry (3 adjacent buildings)
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
    windowtype: {default: '1 1 1 1 1'},
    colortype: {default: '1 0 0 0 0 0'},
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
  Generate buildings using building-shader. Uses almost all of the ridiculous number
  of features provided by the shader.
  Also supports a "grow" animation where the building grows out of a 2D plane. The
  animation can be triggered by a beat from the music manager.
*/
AFRAME.registerComponent('rng-building-shader', {
  schema: {
    axis: {default: '1 1'},
    width: {default: 1},
    height: {default: 1},
    static: {default: '1 1'},
    grows: {default: '1 1 1 1'},
    grow_slide: {default: '1 1'},
    color1: {default: ''},
    color2: {default: ''},
    usecolor: {default: '1 1'},
    colorstyle: {default: '1 1 1 1'}, // single color, two color, one color to gradient, gradient
    coloroffset: {default: 0},
    winheight: {default: '1 2 8 1'},
    winwidth: {default: '2 8 4'},
    triggerbeat: {default: -1},
    action: {default: ''},
    speed: {default: 1.0},
    timeskip: {default: 0},
    side: {default: 'single'},
  },
  init: function () {
    var data = this.data;
    
    var height = data.height;
    var width = data.width;
    // Window height and width can be specified externally or randomly chosen
    var winheight = parseFloat(data.winheight);
    if (data.winheight.split(' ').length == 4) {
      winheight = rng([0.2, 0.5, 0.65, 0.95], data.winheight);
    }
    var winwidth = parseFloat(data.winwidth);
    if (data.winwidth.split(' ').length == 3) {
      winwidth = rng([0.4, 0.5, 1.1], data.winwidth);
    }
    var buildingwidth = 5 * width;
    var buildingheight = 6.5 * height;
    var midheight = buildingheight / 2;
    
    var numrows = 2 * height;
    var numcols = 2 * width;
    var colorgrid = 0.0;
    var invertcolors = 0.0;
    
    var speed = data.speed;
    var slide = 0.0;
    var slidereverse = 0.0;
    var grow = 0.0;
    var move = rng([0.0, 1.0], data.static);
    var axis = rng([0.0, 1.0], data.axis);
    if (move) {
      var ngs = rng([0.0, 1.0], data.grow_slide);
      slidereverse = Math.floor(Math.random() * 2);
      slide = ngs;
      grow = 1 - ngs;
    }
    var growsine = 0.0;
    var growclamp = 0.0;
    var growvert = 0.0;
    // Color can be specified externally or randomly chosen
    var color1 = data.color1;
    if (data.color1 == '') {
      color1 = getRandomColor();
    }
    var color2 = data.color2
    if (data.color2 == '') {
      color2 = getRandomColor();
    }
    
    var usecolor1 = 1.0;
    var usecolor2 = 1.0;
    var colorstyle = data.colorstyle;
    if (data.colorstyle.split(' ').length == 4) {
      colorstyle = rng(['single', 'double', 'singlegrad', 'doublegrad'], data.colorstyle);
    }
    if (colorstyle == 'single') {
      color2 = color1;
    }
    else if (colorstyle == 'singlegrad') {
      usecolor1 = rng([1.0, 0.0], data.usecolor);
      usecolor2 = 1.0 - usecolor1;
      colorgrid = rng([1.0, 0.0], data.usecolor);
    }
    else if (colorstyle == 'doublegrad') {
      usecolor1 = 0.0;
      usecolor2 = 0.0;
      colorgrid = rng([1.0, 0.0], data.usecolor);
    }
    var coloroffset = data.coloroffset;
    var timeskip = data.timeskip;
    
    var building = document.createElement('a-entity');
    
    // Special case changes for physical grow animation
    if (data.action == 'grow') {
        this.el.setAttribute("visible", false);
        building.setAttribute('scale', "1 0.001 1");
        
        grow = numrows;
        growvert = 1.0;
        growclamp = 1.0;
        speed = 1.27*speed;
        numrows = 0.1;
        midheight = 0;
    }
    else if (grow) {
      colorgrid = 1.0;
      var mult = rng([1.0, 50.0, 150.0, 200.0], data.grows);
      numrows = mult * numrows;
      numcols = mult * numcols;
      if (mult > 100) {
        invertcolors += 1;
        winheight = 0.95;
        winwidth = 0.95;
      }
      else {
        grow *= 16;
      }
    }
    
    // Spaceship blocks have no top, and are centered
    if (data.action != 'spaceship') {
      // Cover top of building so we don't see windows
      var top = document.createElement('a-entity');
      top.setAttribute('geometry', "primitive: plane; width: " + buildingwidth + "; height: " + buildingwidth);
      top.setAttribute('material', "shader: flat; color: #000000");
      top.setAttribute('position', "0 " + (buildingheight + 0.02) + " 0");
      top.setAttribute('rotation', "-90 0 0");
      this.el.appendChild(top);
    }
    else {
      midheight = 0;
    }
    
    building.setAttribute('material', "side: " + data.side + "; shader: building-shader; timeskip: " + timeskip
                          + "; color1: " + color1 + "; color2: " + color2 + "; numrows: " + numrows + "; numcols: " + numcols
                          + "; grow: " + grow + "; growsine: " + growsine + "; growvert: " + growvert + "; growclamp: " + growclamp + "; growstart: " + 0.0 + "; invertcolors: " + invertcolors
                          + "; slide: " + slide + "; slidereverse: " + slidereverse + "; slideaxis: " + axis
                          + "; colorslide: " + slide + "; coloraxis: " + axis + "; colorgrid: " + colorgrid
                          + "; speed: " + speed + "; height: " + winheight + "; width: " + winwidth
                          + "; coloroffset: " + data.coloroffset + "; usecolor1: " + usecolor1 + "; usecolor2: " + usecolor2);
    building.setAttribute('geometry', "primitive: box; width: " + buildingwidth + "; height: " + buildingheight + "; depth: " + buildingwidth);
    building.setAttribute('position', "0 " + midheight + " 0");
    this.el.appendChild(building);
    
    // Vars that need to be passed to a listener
    this.el.midheight = buildingheight/2;
    this.el.width = width;
    
    if (data.triggerbeat >= 0) {
      this.el.setAttribute('class', 'beatlistener' + data.triggerbeat);
      if (data.action == 'grow') {
        this.el.addEventListener('beat', function () {
          // Animate building geometry to grow from a 2D plane at the base
          this.children[1].setAttribute("animation__grow", "property: scale; from: 1 0.001 1; to: 1 1 1; dur: " + (beat*height/data.speed) + "; easing: linear");
          this.children[1].setAttribute("animation__move", "property: position; from: 0 0 0; to: 0 " + this.midheight + " 0; dur: " + (beat*height/data.speed) + "; easing: linear");
          // Animate topper too
          this.children[0].setAttribute("animation__move", "property: position; from: 0 0.5 0; to: 0 " + (this.midheight*2 + this.width*0.02) + " 0; dur: " + (beat*height/data.speed) + "; easing: linear");
          // Move shader time back to origin to reset window animation
          var time = this.children[1].getObject3D('mesh').material.uniforms['timeMsec']['value'];
          this.children[1].getObject3D('mesh').material.uniforms['timeskip']['value'] -= -time;
          this.setAttribute("visible", true);
        });
      }
      else if (data.action == 'lights') {
        this.el.addEventListener('beat', function () {
          var time = this.children[1].getObject3D('mesh').material.uniforms['timeMsec']['value'];
          this.children[1].getObject3D('mesh').material.uniforms['timeskip']['value'] -= -time - (2.2*594.094);
          var color = this.children[1].getObject3D('mesh').material.uniforms['color2']['value'];
          var nextcolor = hexToRgb(getRandomColor());
          color.x = nextcolor.r / 255;
          color.y = nextcolor.g / 255;
          color.z = nextcolor.b / 255;
          this.children[1].getObject3D('mesh').material.uniforms['color2']['value'] = color;
        });
      }
      else if (data.action == 'portal') {
        this.el.addEventListener('beat', function () {
          if (this.activated) {
            var time = this.children[1].getObject3D('mesh').material.uniforms['timeMsec']['value'];
            this.children[1].getObject3D('mesh').material.uniforms['timeskip']['value'] -= -time;
            this.children[1].getObject3D('mesh').material.uniforms['speed']['value'] = 10.0;
          }
          else {
            this.setAttribute('class', 'beatlistener' + (data.triggerbeat + 8));
            this.setAttribute('animation__scale', "property: scale; from: 0.01 0.01 0.01; to: 1 1 1; easing: easeInOutQuart; dur: 2376.236;");
            this.activated = true;
          }
        });
      }
    }
  }
});

AFRAME.registerComponent('rng-capital-ship', {
  schema: {
    startbeat: {default: 0},
    load: {default: 0},
  },
  init: function () {
    var data = this.data;
    
    // Need to hardcode a lot of shapes here. So they'll be put into a list
    // and slowly loaded later
    this.loadlist = [];
    this.loadex = 0;
    
    var guncore = document.createElement('a-entity');
    guncore.setAttribute('position', "0 0 -5");
    guncore.setAttribute('geometry', 'primitive: sphere; radius: 15; segmentsWidth: 80; segmentsHeight: 80;');
    guncore.setAttribute('material', 'side: double; shader: building-shader; grow: 200.0; height: 0.95; width: 0.95;'
                         + 'numrows: 200; numcols: 200; speed: 10; invertcolors: 1; color1: #FFFFFF; color2: #FFFF00; usecolor1: 1; usecolor2: 1');
    this.loadlist.push(guncore);
    
    var guncone = document.createElement('a-entity');
    guncone.setAttribute('rotation', "-90 0 0");
    guncone.setAttribute('geometry', 'primitive: cone; radiusBottom: 20; radiusTop:10; height: 50; openEnded: true');
    guncone.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 20; numcols: 20; color1: #FF0000; color2: #000000; usecolor1: 1; usecolor2: 1');
    this.loadlist.push(guncone);
    
    var ringmat = 'side: double; shader: building-shader; height: 0.65; width: 0.5; numrows: 6; numcols: 40; '
                  + 'speed: 0; invertcolors: 0; color1: #FF0000; color2: #000000; usecolor1: 1; usecolor2: 1';
    var animring = 'property: rotation; from: 0 0 0; to: 0 0 360; easing: linear; dur: 40000; loop: true';
    var gunring = document.createElement('a-entity');
    gunring.setAttribute('position', "0 0 25");
    gunring.setAttribute('geometry', 'primitive: torus; radius: 22; radiusTubular: 2;');
    gunring.setAttribute('material', ringmat + "; timeskip: 300");
    gunring.setAttribute('animation__rotation', animring);
    this.loadlist.push(gunring);
    
    var gunring = document.createElement('a-entity');
    gunring.setAttribute('position', "0 0 25");
    gunring.setAttribute('geometry', 'primitive: torus; radius: 30; radiusTubular: 3;');
    gunring.setAttribute('material', ringmat + "; timeskip: 600");
    gunring.setAttribute('animation__rotation', animring + "; dir: reverse");
    this.loadlist.push(gunring);
    
    var gunbarrel = document.createElement('a-entity');
    gunbarrel.setAttribute('position', "0 0 -50");
    gunbarrel.setAttribute('rotation', "-90 180 0");
    gunbarrel.setAttribute('geometry', 'primitive: cylinder; radius: 35; height: 150; openEnded: true');
    gunbarrel.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 80; numcols: 80; coloroffset: 1.0');
    this.loadlist.push(gunbarrel);
    
    var longbody = document.createElement('a-entity');
    longbody.setAttribute('position', "0 0 -250");
    longbody.setAttribute('geometry', 'primitive: box; height: 100; width: 125; depth: 300;');
    longbody.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 50; numcols: 50; colorgrid: 1; color1: #FFFF00; color2: #000000; usecolor1: 1; usecolor2: 1');
    this.loadlist.push(longbody);
    
    var leftwing = document.createElement('a-entity');
    leftwing.setAttribute('position', "-250 0 -435");
    leftwing.setAttribute('rotation', "0 0 0");
    leftwing.setAttribute('geometry', 'primitive: box; height: 150; width: 100; depth: 420;');
    leftwing.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 70; numcols: 70; color1: #000000; color2: #FFFF00; usecolor1: 1; usecolor2: 1');
    this.loadlist.push(leftwing);
    
    var rightwing = document.createElement('a-entity');
    rightwing.setAttribute('position', "250 0 -435");
    rightwing.setAttribute('rotation', "0 0 0");
    rightwing.setAttribute('geometry', 'primitive: box; height: 150; width: 100; depth: 420;');
    rightwing.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 70; numcols: 70; color1: #000000; color2: #FFFF00; usecolor1: 1; usecolor2: 1');
    this.loadlist.push(rightwing);
    
    var bigprism = document.createElement('a-entity');
    bigprism.setAttribute('position', "0 0 -355");
    bigprism.setAttribute('rotation', "90 0 0");
    bigprism.setAttribute('geometry', 'primitive: cone; radiusBottom: 250; radiusTop: 50; height: 500; segmentsRadial: 5');
    bigprism.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 160; numcols: 150; colorgrid: 1; color1: #FF00FF; color2: #FF00FF; usecolor1: 1; usecolor2: 1; coloroffset: 1');
    this.loadlist.push(bigprism);
    
    var leftangle = document.createElement('a-entity');
    leftangle.setAttribute('position', "-50 -45 -125");
    leftangle.setAttribute('rotation', "135 90 90");
    leftangle.setAttribute('geometry', 'primitive: cylinder; height: 300; radius: 20; segmentsRadial: 3;');
    leftangle.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 120; numcols: 40; colorgrid: 1');
    this.loadlist.push(leftangle);
  
    var rightangle = document.createElement('a-entity');
    rightangle.setAttribute('position', "50 -45 -125");
    rightangle.setAttribute('rotation', "45 90 90");
    rightangle.setAttribute('geometry', 'primitive: cylinder; height: 300; radius: 20; segmentsRadial: 3;');
    rightangle.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 120; numcols: 40; colorgrid: 1');
    this.loadlist.push(rightangle);
    
    var topleftangle = document.createElement('a-entity');
    topleftangle.setAttribute('position', "-50 45 -125");
    topleftangle.setAttribute('rotation', "-135 90 90");
    topleftangle.setAttribute('geometry', 'primitive: cylinder; height: 300; radius: 20; segmentsRadial: 3;');
    topleftangle.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 120; numcols: 40; colorgrid: 1');
    this.loadlist.push(topleftangle);
  
    var toprightangle = document.createElement('a-entity');
    toprightangle.setAttribute('position', "50 45 -125");
    toprightangle.setAttribute('rotation', "-45 90 90");
    toprightangle.setAttribute('geometry', 'primitive: cylinder; height: 300; radius: 20; segmentsRadial: 3;');
    toprightangle.setAttribute('material', 'side: double; shader: building-shader; height: 0.65; width: 0.5;'
                         + 'numrows: 120; numcols: 40; colorgrid: 1');
    this.loadlist.push(toprightangle);
  },
  tick: function () {
    // Simple slow load given a list of entities
    var campos = document.querySelector('#camera').getAttribute('position');
    if (campos.z < this.data.load && this.loadex < this.loadlist.length) {
      this.el.appendChild(this.loadlist[this.loadex]);
      this.loadex++;
    }
  }
});

/* 
  Create a group of rng snakes. The snakes are actually carefully positioned and sized so they
  will not intersect with each other directly. This requires that exactly 8 snakes are used.
*/
AFRAME.registerComponent('rng-building-snakes', {
  schema: {
    load: {default: 550},
    unload: {default: -800},
    start: {default: 35}, // Starting beat to be passed to each snake
  },
  init: function () {
    var data = this.data;
    
    var x = 3;
    var z = 3;
    var yoffset = 40;
    var offset = -30;
    var grid = 10;
    
    var pos = this.el.object3D.position;
    var load = pos.z + data.load;
    var unload = pos.z + data.unload;
    
    console.log("Snake cluster is at " + pos.z + " with loadbar around " + load + " and unload starting at " + unload);
    
    for (var i = 0; i < x; i++) {
      for (var j = 0; j < z; j++) {
        // Don't place center snake (we can only have 8 and the middle looked nicest when missing)
        if (!(i == 1 && j == 1)) {
          var building = document.createElement('a-entity');
          building.setAttribute('position', (grid*i + offset) + " " + -yoffset + " " + (grid*j + offset));
          
          var postr = pos.x + " " + pos.y + " " + pos.z;
          building.setAttribute('rng-building-snake', 'triggerstart: ' + data.start + '; loadslow: ' + 10 + '; load: ' + load + '; unload: ' + unload + '; boundmax: 75');
          
          this.el.appendChild(building);
        }
        // Offsets put the buildings on separate paths from each other, preventing collisions
        yoffset += 10;
        if (yoffset > 70) {
          yoffset = 0;
        }
        offset += 10;
      }
    }
  }
});

/*
  Randomly generate a "snake" of buildings, which can move in all 6 coordinate directions and
  takes advantage of the "grow" animation from rng-building-shader.
  
  Allows both random and user-defined paths. Random paths can be limited in range by "bounds."
  Since these are complex entities with many parts, they manage loading and unloading directly
  instead of the worldbuilder that placed them.
*/
AFRAME.registerComponent('rng-building-snake', {
  schema: {
    height: {default: 15},
    width: {default: 2},
    depth: {default: 30}, // Number of buildings in this snake
    path: {default: []}, // User defined path to follow (random if empty)
    speed: {default: 1}, // Growth speed per building
    boundmax: {default: 0}, // Value to be used to calculate "bounds"
    loadslow: {default: 20}, // Factor by which loading will slow down
    load: {default: 500}, // Distance from entity at which we should begin loading
    unload: {default: -10000}, // Distance from entity at which we should unload
    triggerspeed: {default: 2}, // Number of beats between each building growth
    triggerstart: {default: 2}, // Beat at which to start growing
  },
  init: function () {
    var data = this.data;
    
    this.height = data.height;
    this.width = data.width;
    
    this.winheight = 0.65;
    this.winwidth = 0.5;
    
    this.pos = {x: 0, y: 0, z: 0};
    this.rotate = {x: 0, y: 0, z: 0};
    
    this.scale = 1;
    this.depth = data.path.length + 1;
    if (this.depth == 1) {
      this.depth = data.depth;
    }
    
    this.pathdex = 0;
    
    this.triggerbeat = data.triggerstart;
    
    this.color1 = getRandomColor();
    this.color2 = getRandomColor();
    
    this.colorstyle = rng(['single', 'double', 'singlegrad', 'doublegrad'], "0 5 1 1");
    
    this.speed = 0.5 * this.height * data.speed;
    
    this.direction = '+y';
    
    // Set bounds from max input
    var max = data.boundmax;
    this.bounds = {highx: max, lowx: -max, highy: (max*4), lowy: (max*2), highz: max, lowz: -max};
    
    // Load bar considers original position, a random offset, and an input multiplier for user control
    this.loadbar = data.load + Math.floor(Math.random() * 20);
    
    // Unload considers input location, with a randomized offset so the whole group doesn't vanish at once
    this.unloadbar = data.unload - Math.floor(Math.random() * 200);
  },
  tick: function () {
    var data = this.data;
    
    var campos = document.querySelector('#camera').getAttribute('position');
    if (this.depth > 0 && campos.z < this.loadbar) {
      this.loadbar -= data.loadslow;
      
      var building = document.createElement('a-entity');
      var postr = this.pos.x + " " + this.pos.y + " " + this.pos.z;
      var rostr = this.rotate.x + " " + this.rotate.y + " " + this.rotate.z;
      // Do not scale in the y direction so buildings still connect
      var scalestr = this.scale + " " + 1 + " " + this.scale;
      
      building.setAttribute('position', postr);
      building.setAttribute('rotation', rostr);
      building.setAttribute('scale', scalestr);
      building.setAttribute('rng-building-shader', "; width: " + this.width + "; height: " + this.height + "; color1: " + this.color1 + "; color2: " + this.color2
                            + "; static: 1 0; grow_slide: 1 0; speed: " + this.speed + "; colorstyle: " + this.colorstyle
                            + "; winheight: " + this.winheight + "; winwidth: " + this.winwidth
                            + "; action: grow; triggerbeat: " + this.triggerbeat);
      this.el.appendChild(building);
      
      var mult = 6;
      // Move placing position and rotate building according to chosen direction
      switch (this.direction) {
        case '+x': this.pos.x += this.height*mult; break;
        case '-x': this.pos.x -= this.height*mult; break;
        case '+y': this.pos.y += this.height*mult; break;
        case '-y': this.pos.y -= this.height*mult; break;
        case '+z': this.pos.z += this.height*mult; break;
        case '-z': this.pos.z -= this.height*mult; break;
      }
    
      // Reset rotation to be chosen by 'direction'
      this.rotate = {x: 0, y: 0, z: 0};
      // Delay beat trigger so the snake grows continuously
      this.triggerbeat += data.triggerspeed;
      
      // Check for preset path. Otherwise, rng within bounds
      if (data.path.length === 0) {
        
        // Get reverse of previous direction (to disallow doubling back)
        var flipdirection = this.direction[1];
        if (this.direction[0] === '-') {
          flipdirection = '+' + flipdirection;
        }
        else if (this.direction[0] === '+') {
          flipdirection = '-' + flipdirection;
        }
        
        var options = []
        // Add in directions which will not go out of bounds, and will not double back
        if (this.pos.x < this.bounds.highx && flipdirection !== '+x') {
          options.push('+x');
        }
        if (this.pos.x > this.bounds.lowx && flipdirection !== '-x') {
          options.push('-x');
        }
        if (this.pos.y < this.bounds.highy && flipdirection !== '+y') {
          options.push('+y');
        }
        if (this.pos.y > this.bounds.lowy && flipdirection !== '-y') {
          options.push('-y');
        }
        if (this.pos.z < this.bounds.highz && flipdirection !== '+z') {
          options.push('+z');
        }
        if (this.pos.z > this.bounds.lowz && flipdirection !== '-z') {
          options.push('-z'), options.push('-z');
        }
        
        // Randomly choose a direction from the available options
        this.direction = pick_one(options);
      }
      
      // Follow path list for next direction (user specified has no restrictions)
      else {
        this.direction = data.path[this.pathdex];
        this.pathdex++;
        if (this.pathdex >= data.path.length) {
          this.pathdex = 0;
        }
      }
      
      // Adjust position and rotate building according to chosen direction
      switch (this.direction) {
        case '+x': this.rotate.z = -90; break;
        case '-x': this.rotate.z = 90; break;
        case '+y': break;
        case '-y': this.rotate.x = 180; break;
        case '+z': this.rotate.x = 90; break;
        case '-z': this.rotate.x = -90; break;
      }
      
      // Reduce scale to avoid z-fighting
      this.scale -= 0.01;
      this.depth--;
    }
    // Unload after threshold
    if (campos.z < this.unloadbar) {
      this.el.parentNode.removeChild(this.el);
    }
  }
});

AFRAME.registerComponent('rng-building-asteroid', {
  schema: {
    start: {default: 0},
  },
  init: function () {
    var rotations = ["0 0 0", "45 0 0", "0 0 45"];
    var scale = 1;
    var height = rng([1, 2], '4 1');
    for (var i = 0; i < 3; i++) {
      var building = document.createElement('a-entity');
      building.setAttribute('rng-building-shader', "height: " + height + "; static: 1 0; colorstyle: 1 0 0 0; winheight: 0 0 1 0; winwidth: 0 1 0; color1: black; action: spaceship");
      building.setAttribute('audio-react',"property: shader-color; analyserEl: #analyser; multiplier: 0.75; build: 1; startbeat: " + this.data.start);
      building.setAttribute('rotation', rotations[i]);
      building.setAttribute('scale', scale + " " + scale + " " + scale);
      this.el.appendChild(building);
      scale -= 0.1;
    }
  },
  tick: function () {
    
  }
});

AFRAME.registerComponent('rng-asteroids', {
  schema: {
    start: {default: 0},
  },
  init: function () {
    this.loadex = 0;
    this.load = this.el.object3D.position.z + 200;
    this.loaded = false;
  },
  tick: function () {
    var pos = this.el.object3D.position;
    var campos = document.querySelector('#camera').getAttribute('position');
    while (campos.z < this.load && this.loadex < 200) {
      this.load -= 1;
      
      var building = document.createElement('a-entity');
      var inner = 25;
      var outer = 200;
      var x = (Math.random() * 4000) - 2000;
      var y = (Math.random() * 4000) - 2000;
      var z = (Math.random() * 4000) - 2000;
      var scale = 0;
      
      var checkx = Math.abs(x); var checky = Math.abs(y); var checkz = Math.abs(z);
      // Special case put an asteroid right below camera
      if (this.loadex == 0) {x = -3; y = -4; z = -6; scale = 1}
      // For the rest, make sure they aren't on a collision course with cam or nearby ships
      else {
        // Don't place an asteroid if it would collide with a ship
        if (checkx > inner && checkx < outer) { continue;}
        if (checky > inner && checky < outer) { continue;}
        if (checkz < 5) { continue;}
        // Decrease scale for far away asteroids (illusion of greater distance)
        if (checkx > outer || checky > outer) {
          var scale = Math.random() * 10;
          outer *= 4;
          if (checkx > outer || checky > outer) { scale -= 1; }
          outer *= 2;
          if (checkx > outer || checky > outer) { scale -= 1; }
        }
      }
      var postr = x + " " + y + " " + z;
      var scalestr = scale + " " + scale + " " + scale;
      
      building.setAttribute('rng-building-asteroid', 'start: ' + this.data.start);
      building.setAttribute('position', postr);
      building.setAttribute('rotation', postr);
      building.setAttribute('allrotate', '');
      building.setAttribute('scale', scalestr);
      this.el.appendChild(building);
      this.loadex++;
    }
  }
});

AFRAME.registerComponent('rng-building-spacefleet', {
  schema: {
    startbeat: {default: 0},
  },
  init: function () {
    var data = this.data;
    var pos = this.el.object3D.position;
    
    var x = -800;
    var delay = 0;
    var startbeat = data.startbeat
    
    for (var i = 0; i < 6; i++) {
      var building = document.createElement('a-entity');
      
      var y = -300;
      // Raise middle ships
      if (i == 1 || i == 4) {
        var y = -50; 
      }
      var z = 400 + Math.random() * 200;
      var start = x + " " + -20000 + " " + z;
      var incoming = "0 0 " + (z - 10000);
      var postr = x + " " + y + " " + z;
      building.setAttribute('position', start);
      building.setAttribute('class', 'beatlistener' + startbeat);
      building.setAttribute('rng-building-spaceship', 'load: ' + (pos.z + 250));
      building.setAttribute('animation__position', "property: position; from: " + incoming + "; to: " + postr
                            + "; dur: 2376.236; delay: " + delay + "; easing: easeInExpo; startEvents: beat");
      this.el.appendChild(building);
      // Divide into two sections, by timing and position
      if (i == 2) {
        x += 800;
        delay = 0;
        startbeat += 1;
      }
      else { 
        x += 200;
        delay += 100;
      }
    }
    
    var delay = 0;
    startbeat += 1;
    
    for (var i = 0; i < 4; i++) {
      var building = document.createElement('a-entity');
      var y = 0;
      var x = 0;
      var offset = 150;
      
      if (i == 0) { y = offset; }
      if (i == 1) { x = -offset }
      if (i == 2) { x = offset }
      if (i == 3) { y = -offset; }
      
      var z = Math.random() * 200;
      var start = x + " " + -20000 + " " + z;
      var incoming = "0 0 " + (z - 10000);
      var postr = x + " " + y + " " + z;
      building.setAttribute('position', start);
      building.setAttribute('class', 'beatlistener' + startbeat);
      building.setAttribute('rng-building-spaceship', 'load: ' + (pos.z + 200));
      building.setAttribute('animation__position', "property: position; from: " + incoming + "; to: " + postr
                            + "; dur: 2376.236; delay: " + delay + "; easing: easeInExpo; startEvents: beat;");
      this.el.appendChild(building);
      // Divide into two sections, by timing and position
      delay += 100;
    }
    
    startbeat += 30;
    var capital = document.createElement('a-entity');
    capital.setAttribute('rng-capital-ship', 'load: ' + (pos.z + 150));
    capital.setAttribute('position', "0 -15000 0");
    capital.setAttribute('scale', "3 3 3");
    var incoming = "0 0 -20000";
    var postr = "0 100 -950";
    capital.setAttribute('class', 'beatlistener' + startbeat);
    capital.setAttribute('animation__position', "property: position; from: " + incoming + "; to: " + postr
                            + "; dur: 2376.236; easing: easeInExpo; startEvents: beat;");
    this.el.appendChild(capital);
  }
});

AFRAME.registerComponent('rng-building-spaceship', {
  schema: {
    length: {default: 10}, // Ship length
    speed: {default: 1}, // Flight speed
    load: {default: 0}, // Distance from entity at which we should begin loading
  },
  init: function () {
    var data = this.data;
    
    this.winheight = 0.65;
    this.winwidth = 0.5;
    
    this.pos = {x: 0, y: 0, z: 0};
    this.rotate = {x: 0, y: 0, z: 0};
    this.scale = 1;
    
    this.partdex = 0;
    this.partmax = data.length;
    this.z = 0;
    
    // Pick specifically complimentary colors
    var colorlist = ["#FF0000", "#FF7700", "#FFFF00", "#77FF00", "#00FF00", "#00FF77", "#00FFFF", "#0077FF", "#0000FF", "#7700FF", "#FF00FF", "#FF0077"];
    var index1 = Math.floor(Math.random() * 11);
    var index2 = index1 + pick_one([3,4,5,6]);
    if (index2 > 11) {
      index2 = index2 - 11;
    }
    this.color1 = colorlist[index1];
    this.color2 = colorlist[index2];
    
    this.colorstyle = rng(['single', 'double', 'singlegrad', 'doublegrad'], "0 1 0 0");
    
    this.speed = data.speed;
    
    // Load bar considers original position, a random offset, and an input multiplier for user control
    this.loadbar = data.load;
  },
  tick: function () {
    var data = this.data;
    
    var campos = document.querySelector('#camera').getAttribute('position');
    if (this.partdex < this.partmax && campos.z < this.loadbar) {
      var height = rng([3, 5, 7], "1 1 1");
      var width = rng([5, 6, 7], "1 1 1");
      var zbuffer = -50;
      
      var building = document.createElement('a-entity');
      var posy = 0;
      var offsety = 10;
      if (this.partdex > data.length / 3) {
        width += 2;
        height += 10;
        if (this.shiftz) {
          zbuffer -= 5;
        }
        offsety += 20;
        this.shiftz = true;
      }
      if (this.partdex % 2 == 0) {
        posy = pick_one([-offsety, offsety]);
        height += 1;
      }
      this.scale -= 0.01;
      var postr = "0 " + posy + " " + this.partdex * zbuffer;
      var rostr = pick_one(["0 0 0", "90 0 0", "0 0 90"]);
      var scalestr = this.scale + " " + this.scale + " " + this.scale;
      
      building.setAttribute('position', postr);
      building.setAttribute('rotation', rostr);
      building.setAttribute('scale', scalestr);
      building.setAttribute('rng-building-shader', "; width: " + (width * 2) + "; height: " + (height * 2) + "; color1: " + this.color1 + "; color2: " + this.color2
                            + "; static: 1 0; colorstyle: " + this.colorstyle + "; winheight: " + this.winheight + "; winwidth: " + this.winwidth
                            + "; action: spaceship; timeskip: " + this.partdex*-250);
      this.el.appendChild(building);
      this.partdex++;
    }
  },
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
    
    this.mouse = 0;
    this.shift = 0.0;
    
    this.speed = rng([0.5, 1.0, 2.0], data.speed);
    this.brightness = rng([1.0, 2.0, 3.0], data.brightness);
    this.resolution = rng([0.5, 1.0, 2.0, 3.0], data.resolution);
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
    entity.setAttribute('material', "side: double; shader: " + shader + "-shader; speed: " + this.speed
                    + "; brightness: " + this.brightness + "; color: " + color + "; backgroundColor: " + bgcolor 
                    + "; resolution: " + this.resolution + "; fadeaway: " + fadeaway + "; uniformity: " + uniformity
                    + "; zoom: " + zoom + "; intensity: " + intensity + "; skip: " + skip
                    + "; frequency: " + 15 + "; amplitude: " + 0.2 + "; displacement: " + 0.5 + "; scale: " + 4.0);
    this.el.appendChild(entity);
  },
});

AFRAME.registerComponent('rng-disco-tunnel', {
  schema: {
    radius: {default: 10},
    length: {default: 87},
    floaters: {default: true},
  },
  init: function () {
    var data = this.data;
    
    var numFloaters = 0;
    if (data.floaters) {
      numFloaters = Math.floor(Math.random() * 4) + 5;
    }
    
    for (var i = 0; i < numFloaters + 1; i++) {
      var radius = data.radius*2;
      var postr = "0 0 0";
      var rotation = "";
      var resolution = 2.0;
      var speed = 1.0;
      var shape = 'cylinder';
      // Floaters have different values
      if (i > 1) {
        shape = 'sphere';
        radius = (data.radius / 20) * ((Math.random() * 2) + 2);
        var posx = ((Math.random() * (data.radius - 1)) + 1) * pick_one([-1, 1])
        var posy = ((Math.random() * (data.radius - 1)) + 1) * pick_one([-1, 1])
        var posz = Math.random() * data.length * 0.4 * pick_one([-1, 1])
        postr = posx + " " + posy + " " + posz;
        rotation = "property: rotation; from: 0 0 0; to: 0 360 0; loop: true; easing: linear; dur: 20000";
        resolution = rng([0.25, 0.5, 1.0], "2 2 2");
        speed = pick_one([1.0, 2.0]);
      }
      var color = pick_one(['red','orange', 'yellow', 'pink', 'cyan']);
      var bgcolor = pick_one(['green','blue', 'purple', 'black']);
      
      
      var ball = document.createElement('a-entity');
      ball.setAttribute('geometry', "primitive: " + shape + "; radius: " + radius + "; height: " + data.length);
      ball.setAttribute('material', "side: double; shader: disco-shader; speed: " + speed + "; resolution: " + resolution
                       + "; color: " + color + "; backgroundColor: " + bgcolor);
      ball.setAttribute('position', postr);
      ball.setAttribute('animation__rotate', rotation);
      ball.setAttribute('rotation', "90 0 0");
      this.el.appendChild(ball);
    }
  },
});

/*
  Fractal specific shader component with keyboard control support.
  
  This is not a generic component. Mostly because the keyboard controls need a direct path
  to the object3D, which is non-trivial to make generic.
*/
AFRAME.registerComponent('rng-fractal-shader', {
  schema: {
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
    
    this.mouse = 0;
    this.shift = 0.0;
    
    this.speed = rng([0.5, 1.0, 2.0], data.speed);
    this.resolution = rng([0.5, 1.0, 2.0, 3.0], data.resolution);
    
    // Skip further in time and see new patterns
    var skip = data.skip;
    
    var entity = document.createElement('a-entity');
    entity.setAttribute('geometry', "primitive: sphere; radius: " + (data.width / 2) + "segmentsWidth: 80; segmentsHeight: 80;");
    entity.setAttribute('material', "side: double; shader: fractal-shader; speed: " + this.speed
                    + "; resolution: " + this.resolution + "; skip: " + skip + "; amplitude: " + 0.2
                    + "; displacement: " + 0.5 + "; scale: " + 4.0 + "; vertexnoise: " + 0.1
                    + "; shatter: " + 1.0 + "; twist: " + 1.0 + "; speed: " + 1.0);
    this.el.appendChild(entity);
    
    this.el.sceneEl.canvas.addEventListener('mousedown', this.onMouseDown, false);
    window.addEventListener('mousemove', this.onMouseMove, false);
    window.addEventListener("keydown", function(e){
      if(e.keyCode === 81) { // q key to shift back
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['skip']['value'] -= 0.005;
      }
      if(e.keyCode === 69) { // e key to shift forward
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['skip']['value'] += 0.005;
      }
      if(e.keyCode === 90) { // z key to zoom in
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['resolution']['value'] -= 0.1;
      }
      if(e.keyCode === 88) { // x key to zoom out
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['resolution']['value'] += 0.1;
      }
      if(e.keyCode === 67) { // c key to shatter
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['shatter']['value'] -= 0.005;
      }
      if(e.keyCode === 86) { // v key to reverse shatter
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['shatter']['value'] += 0.005;
      }
      if(e.keyCode === 66) { // b key to reset shatter and twist
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['shatter']['value'] = 1.0;
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['twist']['value'] = 1.0;
      }
      if(e.keyCode === 78) { // n key to twist
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['twist']['value'] += 0.01;
      }
      if(e.keyCode === 77) { // m key to untwist
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['twist']['value'] -= 0.01;
      }
      if(e.keyCode === 82) { // r key to ripple
        var ripple = document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['vertexnoise']['value'];
        if (ripple < 2) { // Ripple can literally eat the menu if left unchecked
          document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['vertexnoise']['value'] += 0.1;
        }
      }
      if(e.keyCode === 84) { // t key to reset ripple
        document.querySelector('#fractal').children[1].getObject3D('mesh').material.uniforms['vertexnoise']['value'] = 0.0;
      }
    })
  },
  tick: function (event) {
    if (this.shift != 0) {
      //console.log("shifting by " + this.shift);
      this.el.children[0].getObject3D('mesh').material.uniforms['val']['value'] += this.shift;
    }
  },
});

