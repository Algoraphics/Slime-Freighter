/* global AFRAME, THREE, beat, bind, Uint8Array, isMobile, checkHeadsetConnected */

var debug = false;

/*
  Animate a menu item to grow around the camera. Assumes a mini menu is used
  to explain how to interact with the menu item.
*/
function surround(el) {
  el.surround = true;
  var pos = el.pos;
  // Negate existing position to place element at camera origin
  var postr = -pos.x + ' ' + (-pos.y + 5) + ' ' + 30; // zpos is simply scaled cam distance from menu
  el.setAttribute('animation__position', 'property: position; from: 0 0 0; to: ' + postr + '; dur: 1000');
  el.setAttribute('animation__rotation', 'property: rotation; from: 0 0 0; to: 0 90 0; dur: 1000');
  el.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 8 8 8; dur: 1000'); 
  
  // Disable mouse actions, since this menu item is surrounding the cursor
  el.active = false;
  
  emitToClass(el, 'link', 'togglehide');
  
  togglemini(true);
  
  // Update info text for whichever surround bubble is selected
  var infotext = document.querySelector('#info-text');
  infotext.setAttribute('text', "value: " + this.infotext);
  
  // Streetlights need to move out of the way, interfere with surround bubbles
  document.querySelector('#streetlightsleft').setAttribute('animation__rotation', 'property: rotation; from: 0 90 0; to: -180 90 0; dur: 2000');
  document.querySelector('#streetlightsright').setAttribute('animation__rotation', 'property: rotation; from: 0 90 0; to: 180 90 0; dur: 2000');
}

// TODO Open about page
function about(el) {
  window.open("https://github.com/Explorerbot/Road","_new")
}

// Road animation selected
function start(el) {
  document.querySelector("#movingWorld").emit('start');
  // Tell all menu links to hide
  emitToClass(el, 'link', 'togglehide');
  // Display loading text
  var begin = document.querySelector('#begin');
  begin.emit('show');
  begin.setAttribute('animation__position', 'property: position; from: -0.25 -1 0; to: -0.3 0.3 0; dur: 500');
  begin.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 3 3 3; dur: 500');
  begin.children[0].active = false;
}

// Loading complete, actually begin animation
function begin(el) {
  // Hide begin button
  el.setAttribute('animation__position', 'property: position; from: 0 0 0; to: 0 0 -8; dur: 1000; easing: linear');
  el.emit('togglehide');
  // No cursor for road
  document.querySelector('#cursor').setAttribute("visible", false);
  // Tell sliding elements to stop
  emitToClass(el, 'slide', 'speed', '0');
  // Tell camera to start
  document.querySelector('#camera').emit('start');
}

// Tell all menu items that back has been pressed. The current item will handle this as necessary to get back to the menu
function back(el) {
  emitToClass(el, 'link', 'togglehide');
  emitToClass(el, 'link', 'back');
}

function toggle(el) {
  this.minimenu = !this.minimenu;
  togglemini(this.minimenu);
}

// Toggle whether the mini menu is visible
function togglemini(minimenu) {
  var backy = -10; var prevbacky = -0.7;
  var toggly = -1.25; var prevtoggly = -0.6;
  var prevz = 0.3; var z = 1.5;
  var prevrotx = -10; var rotx = -90
  
  if (minimenu) {
    backy = -0.7; prevbacky = -10;
    toggly = -0.6; var prevtoggly = -1.25;
    z = 0.3; prevz = 1.4;
    prevrotx = -90; rotx = -10;
    
    var infotext = document.querySelector('#info-text');
    infotext.setAttribute('visible', true);
  }
  // Mini menu includes button to go back to main menu
  var back = document.querySelector('#back');
  back.setAttribute('animation__position', 'property: position; from: 0 ' + prevbacky + ' 0.35; to: 0 ' + backy + ' 0.35; dur: 1000');
  // Also button to toggle the menu on and off
  var toggle = document.querySelector('#toggle');
  toggle.setAttribute('animation__position', 'property: position; from: 0 ' + prevtoggly + ' ' + prevz + '; to: 0 ' + toggly  + ' ' + z + '; dur: 1000');
  toggle.setAttribute('animation__rotation', 'property: rotation; from: ' + prevrotx + ' 0 0; to: ' + rotx + ' 0 0; dur: 1000');
  // Cursor should only be visible if mini menu is visible
  document.querySelector('#cursor').setAttribute("visible", minimenu);
}

// Sent an input message to all menu items
function emitToClass(el, name, message, details='') {
  var els = el.sceneEl.querySelectorAll('.' + name);
  for (var i = 0; i < els.length; i++) {
    els[i].emit(message, details, false);
  }
}

/*
* State management for a menu item. 
    Provides animations for mouse hover and click
    Allows an input function pointer so that each menu item can perform a specific action
    Supports a toggling "mini menu" for information on each sub-menu.
    
    Each item manages its own state, but this state management in combination with message
    passing results in a functional "main menu" where items can behave independently
    if necessary.
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
    });
    this.el.addEventListener('touchend', function () {
      // Special touchscreen only function
    });
    this.el.addEventListener('worldloaded', function () {
      // Inactive item getting this message must be the begin button, which should now become active
      if (this.tag == 'begin') {
        this.active = true;
        this.setAttribute('text-geometry', "value: |Begin|; size: 0.04;");
        // Move main button into position
        var back = document.querySelector('#back');
        back.setAttribute('animation__position', 'property: position; from: 0 -10 0; to: 0.025 0.1 0; dur: 1000');
        // Hide info text
        var infotext = document.querySelector('#info-text');
        infotext.setAttribute('visible', false);
      }
      if (this.tag == 'main') {
        this.emit('show');
      }
    });
    this.el.addEventListener('togglehide', function () {
      if (this.active) {
        this.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 0.01 0.01 0.01; dur: 1000');
        this.setAttribute('animation__visible', 'property: visible; from: true; to: false; delay: 1000; dur: 1');
        this.active = false;
      }
      else if (!this.surround) {
        this.setAttribute('animation__visible', 'property: visible; from: false; to: true; dur: 1');
        this.setAttribute('animation__scale', 'property: scale; from: 0.01 0.01 0.01; to: 1 1 1; dur: 1000');
        this.active = true;
      }
    });
    // Back button was hit, reset to main menu
    this.el.addEventListener('back', function () {
      // Inactive element is the one surrounding the user. These calls should only happen once, on that element.
      if (this.surround) {
        togglemini(false);
        var pos = this.pos
        var postr = -pos.x + ' ' + (-pos.y + 2) + ' ' + 30; // zpos is simply scaled cam distance from menu
        this.setAttribute('animation__position', 'property: position; from: ' + postr + '; to: 0 0 0; dur: 1000');
        this.setAttribute('animation__scale', 'property: scale; from: 5 5 5; to: 1 1 1; dur: 1000');
        
        document.querySelector('#streetlightsleft').setAttribute('animation__rotation', 'property: rotation; from: -180 90 0; to: 0 90 0; dur: 500');
        document.querySelector('#streetlightsright').setAttribute('animation__rotation', 'property: rotation; from: 180 90 0; to: 0 90 0; dur: 500');
        document.querySelector('#cursor').setAttribute("visible", true);
        
        var toggle = document.querySelector('#toggle');
        toggle.setAttribute('animation__position', 'property: position; from: 0 0.2 2; to: 0 -10 2; dur: 1000');
        this.active = true;
        this.surround = false;
      }
    });
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
    
    var position = this.el.getAttribute('position');
    var centerfront = position.z - 3 * this.data.length / 5;
    var centerback = position.z - 2 * this.data.length / 5;
  },
  tick: function () {
    var data = this.data;
    
    var cam = document.querySelector('#camera');
    if (!cam) { return; }
    
    var campos = cam.getAttribute('position');
    var position = this.el.getAttribute('position');
    var centerlow = position.z - 3 * data.length / 5;
    var centerhigh = position.z - 2 * data.length / 5;
    //console.log("campos is " + campos.z + ", posz is " + position.z + ", centerz is " + centerz + ", reverse is " + this.data.reverse);
    if (!this.stopfollow) {
      if (campos.z < centerlow) {
        position.z -= data.length / 5;
      }
      else if (campos.z > centerhigh) {
        position.z += data.length / 5;
      }
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

/*
  Component to move an entity in a given direction at a given speed.
  Accepts emitter events which can update the movement speed.
*/
AFRAME.registerComponent('slide', {
  schema: {
    axis: {default: 'z'},
    speed: {default: -12},
  },
  init: function () {
    this.el.axis = this.data.axis;
    this.el.speed = this.data.speed;
    this.el.setAttribute('class', 'slide');
    this.el.addEventListener('speed', function (event) {
      this.speed = event.detail;
    });
  },
  tick: function (time, timeDelta) {
    var el = this.el;
    var data = this.data;
    var xdelta = 0; var ydelta = 0; var zdelta = 0;
    switch (this.el.axis) {
      case 'x': {
        xdelta = this.el.speed * (timeDelta / 1000);
      }
      case 'y': {
        ydelta = this.el.speed * (timeDelta / 1000);
      }
      case 'z': {
        zdelta = this.el.speed * (timeDelta / 1000);
      }
    }

    var positionTmp = this.positionTmp = this.positionTmp || {x: 0, y: 0, z: 0};
    var position = el.getAttribute('position');

    //positionTmp.y = 30;
    positionTmp.x = position.x - xdelta;
    positionTmp.y = position.y + ydelta;
    positionTmp.z = position.z - zdelta;
    
    el.setAttribute('position', positionTmp);
  }
});

/*
  Manage camera state. Accept input signals from menu to determine whether camera should really move.
  Configurable start, stop, and location at which it will slowly rise up.
*/
AFRAME.registerComponent('camera-manager', {
  schema: {
    axis: {default: 'z'},
    speed: {default: 5},
    stop: {default: -100},
    rise: {default: -100},
    risemax: {default: 25},
    id: {default: ''},
  },
  init: function () {
    var el = this.el;
    
    // Use regular look controls for VR. Custom look controls don't work
    if (el.getAttribute('id') == 'camera') {
      if (checkHeadsetConnected()) {
        el.setAttribute('look-controls','');
        el.setAttribute('position', '0 0.01 30');
        document.querySelector('#click-instruction').setAttribute('visible', 'false');
      }
      else {
        el.setAttribute('my-look-controls', '');
      }
    }
    
    var position = el.getAttribute('position');
    this.el.state = "menu";
    this.initialPos = position.z;
    
    this.el.addEventListener('start', function () {
      this.state = "start";
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
    else if (el.state == "start") {
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
      
      if (position.z < data.stop) {
        this.el.state = "done";
      }
      
      el.setAttribute('position', positionTmp);
    }
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
  Removes itself when a certain beat is hit
*/
AFRAME.registerComponent('timedisabler', {
  init: function () {
    this.el.addEventListener('beat', function (event) {
      this.parentNode.removeChild(this);
    });
  }
});

/*
  Uses kevin ngo's audioanalyser component to make an entity scale or move
  to the beat of a song
*/
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