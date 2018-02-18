/* global AFRAME, THREE, beat, bind, Uint8Array, isMobile */

function rotato(el, xdelta, ydelta, zdelta) {
  var rotationTmp = {x: 0, y: 0, z: 0};
  var rotation = el.getAttribute('rotation');
  rotationTmp.x = rotation.x + xdelta;
  rotationTmp.y = rotation.y + ydelta;
  rotationTmp.z = rotation.z + zdelta;
  el.setAttribute('rotation', rotationTmp);
}

/*
  Sometimes, you just want a thing to rotate
*/
AFRAME.registerComponent('justrotate', {
  tick: function () {
    rotato(this.el, 0, 0.5, 0);
  }
});

AFRAME.registerComponent('allrotate', {
  tick: function () {
    rotato(this.el, 0.5, 0.5, 0.5);
  }
});

AFRAME.registerComponent('glcube', {
  init: function () {
    //var plane = new THREE.PlaneBufferGeometry(1, 2);

    var cube2 = new THREE.CubeGeometry(1, 0.25, 0.5);
    var data = this.data;
    var material = new THREE.MeshBasicMaterial( {color: 0x0000FF, wireframe: false});
    var scene = this.el.sceneEl.object3D;

    for (var i = 0; i < 16; i++) {
      var cube = new THREE.CubeGeometry(0.5, 0.5, 0.5);
      var mesh = new THREE.Mesh(cube, material);
      var entity = document.createElement('a-entity');
      var mat = new THREE.MeshBasicMaterial( {color: 0x0000FF, wireframe: false});

      entity.setAttribute('mixin', "cubes");
      entity.setAttribute('animation__color', "property: material.color; dir: alternate; dur: 3000; easing: easeInSine; loop: true; to: rgb(0, 250, 0)");
      //entity.setAttribute('animation__yoyo', "property: position; dir: alternate; dur: 1000; easing: easeInSine; loop: true; to: 0 " + i + " 0");
      //entity.setAttribute('animation__scale', "property: scale; dir: alternate; dur: 200; easing: easeInSine; loop: true; to: 1.2 1 1.2");
      this.el.appendChild(entity);
    }
    //child.setAttribute("position", {x: 4});

  },
  tick: function () {
    rotato(this.el);
  }
});

AFRAME.registerComponent('audio-react', {
  schema: {
    analyserEl: {type: 'selector'},
    property: {default: 'scale'},
    multiplier: {default: 1}, //
    build: {default: 0}, // Slowly build to full volume (num is speed)
    stablebase: {default: true}, // Stabilize bottom of scaling asset
    startbeat: {default: 0},
  },
  init: function () {
    this.build = 0;
    var analyser = document.createElement('a-entity');
    
    this.analyserEl = analyser;
    this.firstpos = this.el.getAttribute('position');
    if (!this.data.build) {
      this.build = 1;
    }
    else this.build = 0.5;
    this.el.setAttribute('class', 'beatlistener' + this.data.startbeat);
    this.el.addEventListener('beat', function (event) {
      this.started = true;
    })
  },
  tick: function () {
    var data = this.data;
    var analyserEl = data.analyserEl;
    var volume = 0;
    var levels;
    
    var cam = document.querySelector('#camera');
    var campos = cam.getAttribute('position');
    
    if (!this.el.started) {
      return;
    }
    
    if (analyserEl) {
       //var sound = song.components.sound;
       volume = analyserEl.components.audioanalyser.volume * data.multiplier * 0.05;
    }
    else return;
    
    if (this.build < 1) {
      this.build += 0.001 * data.build;
    }
    var val = volume * this.build;
    var curprop = this.el.getAttribute(data.property);
    if (data.property == 'position') {
      if (data.reverse) {
        val = -val; 
      }
      this.el.setAttribute(data.property, {
        x: curprop.x,
        y: val,
        z: curprop.z
      });
    }
    else if (data.property == 'scale') {
      val = val / 2;
      this.el.setAttribute(data.property, {
        x: val,
        y: val,
        z: val
      });
      if (data.stablebase) {
        var curpos = this.el.getAttribute('position');
        this.el.setAttribute('position', {
          x: curpos.x,
          // TODO: this may not work with moving objects, will always reset y position to initial
          y: this.firstpos.y + val/2,
          z: curpos.z
        });
      }
    }
  }
});

/*
  Controls music playback and emits timed beats to alert other entities about the current
  location in the song. 
  
  Entities must assign themselves the class "beatlistener" with the appropriate number beat
  they'd like to hear. The music manager will send a beat only to those subscribed entities,
  only on that one beat.
*/
AFRAME.registerComponent('music-manager', {
  schema: {
    startpos: {default: -50}, // Initial camera position to kick off song playback
    showbeats: {default: false},
  },
  init: function () {
    this.beatbar = -beat;
    this.beatcount = 0;
    this.time = 0;
    this.song = document.querySelector('#side');
    
    this.cam = document.querySelector('#camera');
    if (!this.cam) { 
      console.error("Music manager can't find the camera!");
      return; 
    }
  },
  tick: function (time, timeDelta) {
    this.time += timeDelta;
    var data = this.data;
    
    // We want to run until the tick handler is waiting for another beat
    while (this.time > this.beatbar) {
      this.beatbar += beat;
      
      if (this.started) {
        // Grab all assets who should hear this beat, and emit to them
        var els = this.el.sceneEl.querySelectorAll('.beatlistener' + this.beatcount);
        for (var i = 0; i < els.length; i++) {
          els[i].emit('beat', '', false);
        }
        // Debug log used for timing beats to song
        if (data.showbeats) {
          console.log('beat' + this.beatcount);
        }
        this.beatcount++;
      }
      else {
        var campos = this.cam.getAttribute('position');
        if (campos.z < data.startpos) {
          this.started = true;
          this.time = 0;
          this.beatbar = beat;
          
          this.song.play();
        }
      }
    }
  }
});

/*
  Will move an object regularly to keep it aligned with the camera. Designed with repeating layouts of
  objects in mind, so the camera will appear to move through the group of objects without ever reaching
  the end.
  
  Math is somewhat arbitrary but there's a logic to it. Divides entity into 5 slices. 
  Basically, the goal is to keep the camera in the center slice. Ensures there are always 2/5th of the 
  total object both ahead and behind. Does require that following object has distances between components
  in multiples of 5, or movement jumps will be obvious.
*/
AFRAME.registerComponent('followcamera', {
  schema: {
    length: {default: 2},
    reverse: {default: false}, // Means origin point is away from camera (negative z)
    stopfollow: {default: NaN}, // Location at which to stop following
    delete: {default: NaN}, // Location at which to remove the asset
  },
  init: function () {
    this.startpos = this.el.getAttribute('position');
    this.stopfollow = false;
    // Use for slow delete
    this.deleting = false;
  },
  tick: function () {
    var data = this.data;
    
    var cam = document.querySelector('#camera');
    if (!cam) { return; }
    
    var campos = cam.getAttribute('position');
    var position = this.el.getAttribute('position');
    var centerz = position.z - 3 * data.length / 5;
    if (data.reverse) {
      var centerz = position.z + 2* data.length / 5;
    }
    var pass = campos.z < centerz;
    //console.log("campos is " + campos.z + ", posz is " + position.z + ", centerz is " + centerz + ", reverse is " + this.data.reverse);
    if (pass && !this.stopfollow) {
      position.z -= data.length / 5;
      this.el.setAttribute('position', position);
    }
    if (campos.z < data.stopfollow) {
      this.stopfollow = true;
    }
    if (!isNaN(data.delete)) {
      if (campos.z < data.delete) {
        // Maybe factor into delete function?
        //console.log(this.el.classList);
        if (this.el.classList.contains('slowdelete')) {
          // Add a more complex delete function here, probly just loop through the children and delete one per x tick
        }
        this.el.parentNode.removeChild(this.el); 
      }
    }
  }
});

/*AFRAME.registerComponent('menu-item', {
  init: function () {
    var width = 1;
    var height = 1;
    //var rngbuilding = document.createElement('a-entity');
    this.el.setAttribute('position', '0 0 -4');
    this.el.setAttribute('scale', '0.1 0.1 0.1');
    this.el.setAttribute('rng-building-shader', "width: " + width + "; height: " + height
                                 + "; grow_slide: 1 1; static: 1 2; axis: 1 1"
                                 + "; usecolor1: 1 1; usecolor2: 1 1; colorstyle: 1 4 4 1");
    //this.el.appendChild(rngbuilding);
    
    this.onMouseEnter = bind(this.onMouseEnter, this);
    
    this.el.addEventListener('mouseenter', this.onMouseEnter, false);
  },
  onMouseEnter: function (event) {
    this.el.children[0].setAttribute('scale', '2 2 2');
  }
});

AFRAME.registerComponent('menu-manager', {
  init: function () {
    var menuItem = document.createElement('a-entity');
    menuItem.setAttribute('menu-item', '');
    this.el.appendChild(menuItem);
  }
});

AFRAME.registerComponent('surround-camera', {
  schema: {
    on: {type: 'string'},
    target: {type: 'selector'},
  },
  init: function () {
    this.el.addEventListener(this.data.on, function () {
      var pos = this.getAttribute('position');
      var postr = pos.x + ' ' + pos.y + ' ' + pos.z
      this.setAttribute('animation__position', 'property: position; from: ' + postr + '; to: -15 2 30; dur: 1000');
      this.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 4 4 4; dur: 1000'); 
      this.setAttribute('class', 'globe');
    });
  }
});*/

function surround(el) {
  var pos = el.pos;
  // Negate existing position to place element at camera origin
  var postr = -pos.x + ' ' + (-pos.y + 2) + ' ' + 30; // zpos is simply scaled cam distance from menu
  el.setAttribute('animation__position', 'property: position; from: 0 0 0; to: ' + postr + '; dur: 1000');
  el.setAttribute('animation__rotation', 'property: rotation; from: 0 0 0; to: 0 90 0; dur: 1000');
  el.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 5 5 5; dur: 1000'); 
  
  // Disable mouse actions, since this menu item is surrounding the cursor
  el.active = false;
  
  togglemini(true);
  
  // Update info text for whichever surround bubble is selected
  var infotext = document.querySelector('#info-text');
  infotext.setAttribute('text', "value: " + this.infotext);
  
  // Streetlights need to move out of the way, interfere with surround bubbles
  document.querySelector('#streetlightsleft').setAttribute('animation__rotation', 'property: rotation; from: 0 -90 0; to: 180 -90 0; dur: 2000');
  document.querySelector('#streetlightsright').setAttribute('animation__rotation', 'property: rotation; from: 0 90 0; to: 180 90 0; dur: 2000');
}

// TODO Open about page
function about(el) {
  console.log("Exbot is a pretty cool dude.");
}

// Road animation selected
function start(el) {
  document.querySelector("#movingWorld").emit('start');
  // Tell all menu links to hide
  emitlinks(el, 'hide');
  // Display loading text
  var begin = document.querySelector('#begin');
  begin.setAttribute('animation__position', 'property: position; from: 0 -1 0; to: 0 0 0; dur: 500');
  begin.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 3 3 3; dur: 500');
  // No cursor while showing loading
  document.querySelector('#cursor').setAttribute("visible", false);
}

// Loading complete, actually begin animation
function begin(el) {
  // No cursor for road
  document.querySelector('#cursor').setAttribute("visible", false);
  document.querySelector('#camera').emit('start');
  el.emit('hide');
}

// Tell all menu items that back has been pressed. The current item will handle this as necessary to get back to the menu
function back(el) {
  emitlinks(el, 'back');
}

// Toggle whether the mini menu is visible
function togglemini(minimenu) {
  var frompos = -10;
  var topos = 0;
  if (!minimenu) {
    frompos = 0;
    topos = -10;
  }
  // Mini menu includes button to go back to main menu
  var back = document.querySelector('#back');
  back.setAttribute('animation__position', 'property: position; from: 0 ' + frompos + ' 2; to: 0 ' + topos + ' 2; dur: 1000');
  // Cursor should only be visible if mini menu is visible
  document.querySelector('#cursor').setAttribute("visible", minimenu);
}

function emitlinks(el, message) {
  var els = el.sceneEl.querySelectorAll('.link');
  for (var i = 0; i < els.length; i++) {
    els[i].emit(message, '', false);
  }
}

/*
* State management for a menu item. Provides animations for mouse hover and click, and allows an input function pointer
  so that each menu item can perform a specific action. Supports a toggling "mini menu" for information on each sub-menu.
*/
AFRAME.registerComponent('menu-item', {
  schema: {
    action: {type: 'string'},
    active: {default: true},
    infotext: {default: ''},
    tag: {default: ''},
  },
  init: function () {
    this.el.active = this.data.active;
    this.el.infotext = this.data.infotext;
    this.el.tag = this.data.tag;
    this.el.mobile = isMobile();
    
    // Get parent entity (layout element) for actual position
    var pos = this.el.parentEl.getAttribute('position');
    this.el.pos = pos;
    
    this.minimenu = false;
    
    //Call action by input parameter
    var action = window[this.data.action];
    if (typeof action === "function") {
      this.el.action = action;
    }
    // Click event is used by fuse
    this.el.addEventListener('click', function () {
      if (this.active) {
        // Call action function, pass self in for access to variables
        this.action(this);
      }
    });
    // Animations for hovering over an item
    this.el.addEventListener('mouseenter', function () {
      if (this.active) {
        this.setAttribute('scale', '1.2 1.2 1.2');
      }
    });
    this.el.addEventListener('mouseleave', function () {
      if (this.active) {
        this.setAttribute('scale', '1 1 1');
      }
    });
    // Animations for actually clicking with the mouse
    this.el.addEventListener('mousedown', function () {
      if (this.active) {
        this.setAttribute('scale', '1.1 1.1 1.1');
      }
    });
    this.el.addEventListener('mouseup', function () {
      if (this.active) {
        this.setAttribute('scale', '1.2 1.2 1.2');
        // Same as click action above
        this.action(this);
      }
      else if (!this.mobile) {
        // Toggle mini menu
        this.minimenu = !this.minimenu;
        togglemini(this.minimenu);
      }
    });
    this.el.addEventListener('touchend', function () {
      if (!this.active && this.mobile) {
        console.log("toggling mini from touch!");
        // Toggle mini menu
        this.minimenu = !this.minimenu;
        togglemini(this.minimenu);
      }
    });
    this.el.addEventListener('worldloaded', function () {
      // Inactive item getting this message must be the begin button, which should now become active
      if (!this.active) {
        this.active = true;
        this.setAttribute('text', "value: Begin; width: 2; color: yellow; align: center");
        // Show cursor so user can select "begin"
        document.querySelector('#cursor').setAttribute("visible", true);
      }
    });
    this.el.addEventListener('hide', function () {
      if (this.active) {
        this.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 0.01 0.01 0.01; dur: 1000');
        this.setAttribute('animation__visible', 'property: visible; from: true; to: false; delay: 1000; dur: 1');
      }
    });
    // Back button was hit, reset to main menu
    this.el.addEventListener('back', function () {
      // Inactive element is the one surrounding the user. These calls should only happen once, on that element.
      if (!this.active && this.tag != 'begin') {
        togglemini(false);
        var pos = this.pos
        var postr = -pos.x + ' ' + (-pos.y + 2) + ' ' + 30; // zpos is simply scaled cam distance from menu
        this.setAttribute('animation__position', 'property: position; from: ' + postr + '; to: 0 0 0; dur: 1000');
        this.setAttribute('animation__scale', 'property: scale; from: 5 5 5; to: 1 1 1; dur: 1000');
        
        document.querySelector('#streetlightsleft').setAttribute('animation__rotation', 'property: rotation; from: 180 -90 0; to: 0 -90 0; dur: 500');
        document.querySelector('#streetlightsright').setAttribute('animation__rotation', 'property: rotation; from: 180 90 0; to: 0 90 0; dur: 500');
        document.querySelector('#cursor').setAttribute("visible", true);
        this.active = true;
      }
    });
  }
});

var debug = false;

/*
  Manage camera state. TBD
*/
AFRAME.registerComponent('camera-manager', {
  schema: {
    axis: {default: 'z'},
    speed: {default: 5},
    loop: {default: true},
    stop: {default: -100},
    rise: {default: -100},
    risemax: {default: 25},
    id: {default: ''},
  },
  init: function () {
    var el = this.el;
    var position = el.getAttribute('position');
    this.el.state = "menu"; // Other state options: shouldStart, active
    this.initialPos = position.z;
    
    this.el.addEventListener('start', function () {
      this.state = "shouldStart";
    });
    
    // Only the main camera manager should have freedom of movement in debug mode
    if (debug && this.data.id == 'main') {
      this.el.setAttribute('wasd-controls', "acceleration: 500; fly: true");
    }
  },
  tick: function (time, timeDelta) {
    var el = this.el;
    var data = this.data;
    
    // TODO set this.pause = true from emitted event
    
    if (this.el.state == "done") {
      return; 
    }
    
    var xdelta = 0; var ydelta = 0; var zdelta = 0;
    switch (data.axis) {
      case 'x': {
        xdelta = data.speed * (timeDelta / 1000);
      }
      case 'y': {
        ydelta = data.speed * (timeDelta / 1000);
      }
      case 'z': {
        zdelta = data.speed * (timeDelta / 1000);
      }
    }

    var positionTmp = this.positionTmp = this.positionTmp || {x: 0, y: 0, z: 0};
    var position = el.getAttribute('position');

    // Raise camera slowly after passing rise threshold
    if (position.z < data.rise && position.y < data.risemax) {
      ydelta += 0.5 * (timeDelta / 1000);
    }

    //positionTmp.y = 30;
    positionTmp.x = position.x - xdelta;
    positionTmp.y = position.y + ydelta;
    positionTmp.z = position.z - zdelta;
    
    //var menuItems = this.el.sceneEl.querySelectorAll('.menu');
    
    if (this.el.state == "menu" || this.el.state == "shouldStart") {
      if (positionTmp.z < this.initialPos - 50) {
          positionTmp.z = this.initialPos;
          if (this.el.state == "shouldStart") {
            this.el.state = "start";
          }
      }
    }
    else if (this.el.state == "start") {
      if (position.z < data.stop) {
        this.el.state = "done";
      }
    }
    el.setAttribute('position', positionTmp);
  }
});

/*
  Simply listens for a beat and makes itself visible at that beat.
*/
AFRAME.registerComponent('timedvisible', {
  init: function () {
    var el = this.el;
    el.setAttribute('visible', false);
    el.addEventListener('beat', function (event) {
      this.setAttribute('visible', true);
    })
  }
});

/*
  Removes itself after a certain amount of time has passed
*/
// TODO should be updated to listen for beats if it's going to be used
AFRAME.registerComponent('timedisabler', {
  init: function () {
    this.time = 0;
    //console.log("test!");
  },
  tick: function () {
    this.time++;
    //console.log("time is " + this.time);
    if (this.time > 200) {
      var el = this.el;
      //el.parentNode.removeChild(el); 
      el.setAttribute('active', false);
    }
  }
});