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
  el.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 7.75 7.75 7.75; dur: 1000'); 
  
  // Disable mouse actions, since this menu item is surrounding the cursor
  el.active = false;
  // Hide all other buttons
  emitToClass(el, 'link', 'togglehide');
  // Bring up the minimenu
  togglemini(true);
  
  // Update info text for whichever surround bubble is selected
  var infotext = document.querySelector('#info-text');
  infotext.setAttribute('text', "value: " + this.infotext);
  
  // Streetlights need to move out of the way, interfere with surround bubbles
  document.querySelector('#streetlightsleft').setAttribute('animation__rotation', 'property: rotation; from: 0 90 0; to: -180 90 0; dur: 1; delay: 500');
  document.querySelector('#streetlightsright').setAttribute('animation__rotation', 'property: rotation; from: 0 90 0; to: 180 90 0; dur: 1; delay: 500');
}

/* 
  Currently, simply opens a tab to github. Fuse cursor is often blocked by adblockers. TODO Need workaround for this.
*/
function about(el) {
  window.open("https://github.com/Algoraphics/Road","_new")
}

// Road animation selected, begin loading
function start(el) {
  document.querySelector("#movingWorld").emit('start');
  // Tell all menu links to hide
  //emitToClass(el, 'link', 'togglehide');
  // Display Load/Begin text
  var begin = document.querySelector('#begin');
  //begin.emit('togglehide');
  begin.setAttribute('animation__position', 'property: position; from: -0.25 -1 -0.25; to: -0.375 0.4 -0.5; dur: 500');
  begin.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 5 5 5; dur: 500');
  // Only disable this button if it's going to be showing a "loading" text
  if (!el.loaded) {
    begin.children[0].active = false;
  }
  else { // If we've already loaded, move main button into position
    var main = document.querySelector('#main');
    if (main) {
      main.setAttribute('animation__position', 'property: position; from: 0 -10 0; to: 0.025 0.1 -0.3; dur: 1000');
    }
  }
  // Hide the toggle button (it may be trying to hang out below the user)
  var toggle = document.querySelector('#toggle');
  if (toggle) {
    toggle.setAttribute('visible', false);
  }
}

// Begin button hit, actually begin animation
function begin(el) {
  document.querySelector('#swoop').play();
  // Hide begin button
  //el.setAttribute('animation__position', 'property: position; from: 0 0 -2; to: 0 0 -8; dur: 1000; easing: linear');
  el.emit('togglehide');
  // No cursor for road
  document.querySelector('#cursor').setAttribute("visible", false);
  // Tell sliding elements to stop
  emitToClass(el, 'slide', 'speed', '0');
  // Tell camera to start
  document.querySelector('#camera').emit('start');
}

// Tell all menu items that main has been pressed. The current item will handle this as necessary to get to the main menu
function main(el) {
  // Tell menu items to toggle whether they're in "hide" mode
  emitToClass(el, 'link', 'togglehide');
  // Tell menu items that main has been pressed
  emitToClass(el, 'link', 'main');
  // Make sure the toggle button is visible since the start button makes it invisible
  var toggle = document.querySelector('#toggle');
  toggle.setAttribute('visible', true);
}

// Simple function to toggle minimenu
function toggle(el) {
  this.minimenu = !this.minimenu;
  togglemini(this.minimenu);
}

// Toggle whether the mini menu is visible
function togglemini(minimenu) {
  // Constants for when menu is disabled
  var mainy = -10; var prevmainy = -0.7;
  var toggly = -1.2; var prevtoggly = -0.5;
  var prevz = 0.35; var z = 1.2;
  var prevrotx = -10; var rotx = -90;
  
  // Constants for when menu is enabled
  if (minimenu) {
    mainy = -0.7; prevmainy = -10;
    toggly = -0.5; var prevtoggly = -1.2;
    z = 0.35; prevz = 1.2;
    prevrotx = -90; rotx = -10;
  }
  // Mini menu includes button to go to main menu
  var main = document.querySelector('#main');
  main.setAttribute('animation__position', 'property: position; from: 0 ' + prevmainy + ' 0.4; to: 0 ' + mainy + ' 0.4; dur: 1000; easing: easeInCirc');
  // Info text is hidden, make it visible
  var infotext = document.querySelector('#info-text');
  infotext.setAttribute('animation__visible', 'property: visible; from: ' + !minimenu + '; to: ' + minimenu + '; dur: 1; delay: 1000;');
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
    this.el.loaded = false;
    
    // Get parent entity (layout element) for actual position
    var pos = this.el.parentEl.getAttribute('position');
    this.el.pos = pos;
    
    this.minimenu = false;
    
    if (this.el.tag == 'begin') {
      start(this.el);
    }
    
    //Call action by input parameter
    var action = window[this.data.action];
    if (typeof action === "function") {
      this.el.action = action;
    }
    // Click event is used by fuse
    this.el.addEventListener('click', function () {
      if (this.active) {
        
        document.querySelector('#click').play();
        // Call action function, pass self in for access to variables
        this.action(this);
      }
    });
    // Animations for hovering over an item
    this.el.addEventListener('mouseenter', function () {
      if (this.active) {
        this.setAttribute('scale', '1.2 1.2 1.2');
        document.querySelector('#tick').play();
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
        document.querySelector('#click').play();
        //document.querySelector('#cursor').setAttribute('fuse', false);
        this.action(this);
      }
    });
    this.el.addEventListener('touchend', function () {
      document.querySelector('#click').play();
    });
    // Sent from a worldbuilder that has finished loading. Now we can allow users to begin the Road.
    this.el.addEventListener('worldloaded', function () {
      this.loaded = true;
      // Inactive item getting this message must be the begin button, which should now become active
      if (this.tag == 'begin') {
        this.active = true;
        this.setAttribute('text-geometry', "value: |Begin|; size: 0.03;");
        // Move main button into position
        var main = document.querySelector('#main');
        if (main) {
          main.setAttribute('animation__position', 'property: position; from: 0 -10 0; to: 0.025 0.1 -0.3; dur: 1000');
        }
        // Hide info text
        var infotext = document.querySelector('#info-text');
        if (infotext) {
          infotext.setAttribute('visible', false);
        }
      }
    });
    // Each time this is called, it will switch whether the button is "hidden"
    this.el.addEventListener('togglehide', function () {
      if (this.active) {
        this.setAttribute('animation__scale', 'property: scale; from: 1 1 1; to: 0.01 0.01 0.01; dur: 500');
        this.setAttribute('animation__visible', 'property: visible; from: true; to: false; delay: 1000; dur: 1');
        this.active = false;
      }
      else if (!this.surround) {
        this.setAttribute('animation__visible', 'property: visible; from: false; to: true; dur: 1');
        this.setAttribute('animation__scale', 'property: scale; from: 0.01 0.01 0.01; to: 1 1 1; dur: 1000');
        this.active = true;
      }
    });
    // Main button was hit, reset to main menu
    this.el.addEventListener('main', function () {
      // Inactive element is the one surrounding the user. These calls should only happen once, on that element.
      if (this.surround) {
        togglemini(false);
        var pos = this.pos
        var postr = -pos.x + ' ' + (-pos.y + 2) + ' ' + 30; // zpos is simply scaled cam distance from menu
        this.setAttribute('animation__position', 'property: position; from: ' + postr + '; to: 0 0 0; dur: 1000');
        this.setAttribute('animation__scale', 'property: scale; from: 7.75 7.75 7.75; to: 1 1 1; dur: 1000');
        
        document.querySelector('#streetlightsleft').setAttribute('animation__rotation', 'property: rotation; from: -180 90 0; to: 0 90 0; dur: 250');
        document.querySelector('#streetlightsright').setAttribute('animation__rotation', 'property: rotation; from: 180 90 0; to: 0 90 0; dur: 250');
        
        document.querySelector('#cursor').setAttribute("visible", true);
        
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
          els[i].emit('beat', this.beatcount, false);
        }
        // Debug log used for timing beats to song
        if (data.showbeats) {
          var campos = this.cam.getAttribute('position');
          console.log('beat' + this.beatcount + '; campos is ' + campos.z);
        }
        // Special case beat for scene (fog, etc)
        // TODO this could be an argument? Maybe a list of "scene beats"
        if (this.beatcount == 135) {
          this.el.sceneEl.emit('beat');
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
  
  Works bi-directionally but currently will only stop following or delete itself if the camera passes
  a threshold in the -z direction.
  
  Math is somewhat arbitrary but there's a logic to it. Divides entity into 5 slices. 
  Basically, the goal is to keep the camera in the center slice. Ensures there are always 2/5th of the 
  total object both ahead and behind. Does require that following object has distances between components
  in multiples of 5, or movement jumps will be obvious.
*/
AFRAME.registerComponent('followcamera', {
  schema: {
    length: {default: 2},
    stopfollow: {default: NaN}, // Location at which to stop following
    delete: {default: NaN}, // Location at which to remove the asset
  },
  init: function () {
    this.startpos = this.el.getAttribute('position');
    this.stopfollow = false;
    
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
    rise: {default: NaN},
    risemax: {default: 25},
    id: {default: ''},
  },
  init: function () {
    var el = this.el;
    
    // Use regular look controls for VR. Custom look controls don't work. Codebase is inconsistent.
    if (el.getAttribute('id') == 'camera') {
      if (checkHeadsetConnected()) {
        el.setAttribute('look-controls','');
        el.setAttribute('position', '0 0.25 52');
        if (isMobile()) {
          el.setAttribute('position', '0 1.6 50');
        }
      }
      else {
        el.setAttribute('my-look-controls', '');
        el.setAttribute('position', '0 1.6 50');
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
      this.el.setAttribute('wasd-controls', "acceleration: 1500; fly: true");
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
AFRAME.registerComponent('timedinvisible', {
  init: function () {
    var el = this.el;
    el.setAttribute('visible', true);
    el.addEventListener('beat', function (event) {
      this.setAttribute('visible', false);
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

AFRAME.registerComponent('gotospace', {
  init: function () {
    this.el.blastoff = false;
    
    this.el.addEventListener('beat', function (event) {
      this.blastoff = true;
    });
    
    this.index = 0;
  },
  tick: function () {
    if (this.el.blastoff) {
      switch(this.index) {
        case 2:
          var boxleft = document.querySelector('#boxleft');
          boxleft.parentNode.removeChild(boxleft);
          var boxright = document.querySelector('#boxright');
          boxright.parentNode.removeChild(boxright);
          break;
        case 3:
          var boxfront = document.querySelector('#boxfront');
          boxfront.parentNode.removeChild(boxfront);
          var boxback = document.querySelector('#boxback');
          boxback.parentNode.removeChild(boxback);
          break;
        case 4:
          var gridleft = document.querySelector('#gridleft');
          gridleft.parentNode.removeChild(gridleft);
          var gridright = document.querySelector('#gridright');
          gridright.parentNode.removeChild(gridright);
          break;
        case 6:
          var floor = document.querySelector('#floor');
          floor.parentNode.removeChild(floor);
          var floorleft = document.querySelector('#floorleft');
          floorleft.parentNode.removeChild(floorleft);
          var flooright = document.querySelector('#flooright');
          flooright.parentNode.removeChild(flooright);
          var road = document.querySelector('#road');
          road.parentNode.removeChild(road);
          break;
        case 8:
          var sky = document.querySelector('#sunsky');
          sky.setAttribute('visible', false);
          var starcolor = document.querySelector('#starcolor');
          starcolor.setAttribute('animation__vanish', "property: material.opacity; from: 0.4; to: 0;");
          break; 
      }
      this.index++;
      var starcolor = document.querySelector('#starcolor');
    }
  }
});

AFRAME.registerComponent('removetunnels', {
  init: function () {
    this.el.addEventListener('beat', function (event) {
      switch(event.detail) {
        case 352:
          var ring = document.querySelector('#ringportal');
          ring.parentNode.removeChild(ring);
          var building = document.querySelector('#buildingportal');
          building.parentNode.removeChild(building);
          this.setAttribute('class', 'beatlistener' + (event.detail + 30));
          console.log("Removing ring and building!");
          break;
        case 382:
          var disco = document.querySelector('#discotunnel');
          disco.parentNode.removeChild(disco);
          var electric = document.querySelector('#electrictunnel');
          electric.parentNode.removeChild(electric);
          this.setAttribute('class', 'beatlistener' + (event.detail + 2));
          console.log("Removing disco and electric!");
          break;
        case 384:
          var kal = document.querySelector('#kaltunnel');
          kal.setAttribute('animation__scale2', "property: scale; from: 1 1 1; to: 0.01 0.01 0.01;");
          kal.setAttribute('animation__visible', "property: visible; from: true; to: false; delay: 1000");
      }
    });
  },
});

/*
  Uses kevin ngo's audioanalyser component to make an entity scale, move, or light up
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
    this.firstpos = this.el.getAttribute('position').y;
    if (!this.data.build) {
      this.build = 1;
    }
    else this.build = 0.5;
    this.el.setAttribute('class', 'beatlistener' + this.data.startbeat);
    this.el.addEventListener('beat', function (event) {
      if (this.started) {
        this.ended = true
      }
      this.started = true;
      this.setAttribute('class', 'beatlistener464');
    });
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
        var sety = this.firstpos + val/2;
        this.el.setAttribute('position', {
          x: curpos.x,
          // TODO: this may not work with moving objects, will always reset y position to initial
          y: sety,
          z: curpos.z
        });
      }
    }
    else if (data.property == 'shader-color') {
      val = val / 4;
      var color = this.el.children[0].getObject3D('mesh').material.uniforms['color1']['value'];
      color.x = val*val;
      color.y = val*val;
      if (this.el.ended) {
        color.x = 1; color.y = 1;
      }
      this.el.children[0].getObject3D('mesh').material.uniforms['color1']['value'] = color;
      this.el.children[0].getObject3D('mesh').material.uniforms['color2']['value'] = color;
    }
  }
});