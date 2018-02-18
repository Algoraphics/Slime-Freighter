/* global AFRAME */


// SAVE THIS FOR CRAZY VISUALS
/*material="shader: grid-glitch; color1: #0000FF; color2: #FF0000; numrows: 400.0; speed: 1.0; 
                          usecolor1: 0.0; usecolor2: 0.0; height: 0.95; width: 0.95; colorgrid: 1.0; reverse: 1.0"*/

function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function rainbowCycle(state, color, speed) {
  var rgb = hexToRgb(color);
  var r = rgb.r;
  var g = rgb.g;
  var b = rgb.b;
  if(state == 0){
    g = g + speed;
      if(g >= 255) {
        g = 255; 
        state = 1;
      }
  }
  if(state == 1){
    r = r - speed;
    if(r <= 0) {
      r = 0; 
      state = 2;
    }
  }
  if(state == 2){
    b = b + speed;
    if(b >= 255) {
      b = 255; 
      state = 3;
    }
  }
  if(state == 3){
    g = g - speed;
    if(g <= 0) {
      g = 0; 
      state = 4;
    }
  }
  if(state == 4){
    r = r + speed;
    if(r >= 255) {
      r = 255;
      state = 5;
    }
  }
  if(state == 5){
    b = b - speed;
    if(b <= 0) {
      b = 0; 
      state = 0;
    }
  }
  return [state, rgbToHex(r, g, b)];
}

AFRAME.registerComponent('entity-colors', {
   schema: {
     mixin: {default: ''},
     num: {default: 10},
     reverse: {default: false}, // Generic reverse flag, used for multiple purposes
     //Set up for visualization elements
     analyserEl: {type: 'selector'},
     max: {default: 20},
     multiplier: {default: 100},
     audio_property: {default: 'off', oneOf: ['scale', 
                                              'position', 
                                              'material']},
     audio_levels: {default: false}, // Incorporate levels into audio values
     audio_buildup: {default: 0}, // Slowly build from no visualizing into normal amounts. Number is speed of build
     color_type: {default: 'off', oneOf: ['shimmer', // Alternate between fromcolor and tocolor with offset per element
                                          'rainbow', // Cycle through full rainbow with offset
                                          'rainbow_shimmer', // Alternate between two randomly chosen colors
                                          'animflip', // Alternate between two colors using animation
                                          'flip', // Flip between fromcolor and tocolor
                                          'flip_audio']}, // Same as flip but animation activates from volume passing a threshold
     speed: {default: 8},
     delay: {default: 0}, // Offset animation by some fraction of a beat
     every: {default: 1}, // Activate flip animation "every" x beats
     slower: {default: 1}, // How many beats to take to change all elements
     alternate: {default: false}, // alternate colors per object (christmas light effect)
     fromcolor: {default: "#FFFF00"},
     tocolor: {default: "#FF0000"}, 
     delaysynch: {default: 4}, // Delayed tick execution prevents time inconsistencies
     flipcycle: {default: false}, // Continuous flipping cycle
     shift: {default: 0}, // Shift starting element for flip cycle
     id: {default: 0},
     class: {default: ''}
   },
 
   init: function () {
     var el = this.el;
     var data = this.data;
     this.beat = 594.059;
     this.delaysynch = this.beat * data.delaysynch;
     this.time = -data.delay * this.beat;
     this.counter = 0; // DEBUG
     this.build = !data.audio_buildup;
     this.buildfactor = 0.00001;
     for (var i = 0; i < data.num; i++) {
       var entity = document.createElement('a-entity');
       entity.setAttribute('mixin', data.mixin);
       entity.setAttribute('class', data.class);
       entity.setAttribute('material', "color: " + data.fromcolor + "; shader: flat");
       if (data.color_type == 'rainbow') {
         var color = rgbToHex(255, 20*i % 255, 0);
         var material = {color: color};
         entity.setAttribute('material', material);
         entity.setAttribute('colorstate', 0);
       }
       // Run two-tone animation on all assets
       else if (data.color_type == 'animflip') {
         // TODO very arbitrary constant
         entity.setAttribute('class', 'beatlistener48');
         entity.setAttribute('animation', "property: material.color; from: " + data.fromcolor + "; to: " + data.tocolor + "; dir: alternate; dur: " + 2*this.beat + "; easing: easeInOutExpo; loop: true; startEvents: beat");
       }
       // Two-tone animation with offset TODO: not currently in use. Tested to work, though
       else if (data.color_type == 'shimmer') {
         entity.setAttribute('animation', "property: material.color; from: " + data.fromcolor + "; to: " + data.tocolor + "; delay: " + 2*i + "00; dir: alternate; dur: " + 2*this.beat + "; easing: easeInOutSine; loop: true; startEvents: beat");
       }
       // Same as shimmer but tones are also shifted per window
       else if (data.color_type == 'rainbow_shimmer') {
         entity.setAttribute('animation', "property: material.color; from: " + rgbToHex(15*i, 255, 0) + "; to: " + rgbToHex(255, 15*i, 0) + "; delay: " + 2*i + "00; dir: alternate; dur: 2000; easing: easeInOutSine; loop: true;");
       }
       // Save the first color of every element and flip between them
       else if (data.color_type == 'flip' || data.color_type == 'flip_audio') {
         this.firstcolor = true;
         this.flipping = false;
         this.flipdex = data.shift;
         this.flapdex = data.num - data.shift;
         this.bar = this.beat * data.every;
         this.flipbar = this.bar;
       }
       //entity.setAttribute('animation__scale', "property: scale; dir: alternate; dur: 200; easing: easeInSine; loop: true; to: 1.2 1 1.2");
       this.el.appendChild(entity);
     }
   },
   tick: function (time, timeDelta) {
     var el = this.el;
     var data = this.data;
     
     if (data.color_type == 'rainbow') {
       for (var i = 0; i < data.num; i++) {
         
         var child = el.children[i];
         var material = child.getAttribute('material');
         if (material) {
           var color = material.color;
           var state = child.getAttribute('colorstate');
           
           var ret = rainbowCycle(state, color, data.speed);
           
           var state = ret[0];
           material.color = ret[1];
           
           child.setAttribute('material', material);
           child.setAttribute('colorstate', state)
         }
       }
     }
     
     var analyserEl = data.analyserEl;
     var volume = 0;
     var levels;
     
     if (analyserEl) {
       volume = analyserEl.components.audioanalyser.volume * this.data.multiplier * 4;
       //console.log("volume is " + volume);
       
       if (data.audio_property != 'off') {
         if (data.audio_levels) {
           levels = analyserEl.components.audioanalyser.levels;
         }
         if (this.build < 1 && volume > 0) {
           this.build += this.buildfactor * data.audio_buildup;
           this.buildfactor += 0.0000001;
         }
         var children = this.el.children;
         for (var i = 0; i < children.length; i++) {
           var val = volume;
           var leval = 0;
           if (levels) {
             leval = Math.min(data.max, Math.max(levels[i] * data.multiplier, 0.05));
           }
           val *= this.build;

           var curprop = children[i].getAttribute(data.audio_property);
           if (data.audio_property == 'position') {
             val -= leval * this.build;

             // TODO: this can't be the same flag as flip directional reverse
             if (data.reverse) {
               val = -val; 
             }
             children[i].setAttribute(data.audio_property, {
               x: curprop.x,
               y: val,
               z: curprop.z
             });
           }
           else if (data.audio_property == 'scale') {
             val = (val - leval / 2) / 2;
             children[i].setAttribute(data.audio_property, {
               x: val,
               y: val,
               z: val
             });
           }
           else if (data.audio_property == 'color') {
             // TODO: Make this actually scale current color
             children[i].setAttribute(data.material, {
               color: "#00FF00"
             });
           }
         }
       }
     }

     /*
     
     */
     // TODO audioanalyser-beat? (beat detection)
     if (data.color_type == 'flip' || data.color_type == 'flip_audio') {
       
       var beat = 594.059;
       this.time += timeDelta;
       
       var startflipping = false;
       
       // Next time point at which to begin flipping
       var barcrement = beat * data.every;
       // Move the bar multiple times if we got a long tick
       var numbars = Math.ceil((this.time - this.bar) / barcrement);
       
       // Next time point at which to flip a single element
       var flipcrement = data.slower * beat / (data.num * 2) // Default runs in half a beat
       // Flip multiple times if we got a long tick
       var numflips = Math.ceil((this.time - this.flipbar) / flipcrement);
       
       if (!this.flipping) {

         var threshold = 3.5;
         // NEEDS TESTING
         //console.log("Thinking about flip with volume " + volume + " and threshold " + threshold + ", colortype is " + data.color_type);
         if (data.color_type == 'flip_audio' && volume) {
           startflipping = volume > threshold;
         }
         else if (data.color_type == 'flip') {
           // Delay tick execution until all elements are loaded
           if (time < data.delaysynch) {
             return; 
           }
           startflipping = this.time > this.bar;
         }
         else return;
       }
       
       
       
       /*if (this.counter < 100) {
         console.log("bar is " + this.bar + " and time is " + time + " my time is " + this.time + " for building " + this.data.id); 
         this.counter++;
       }*/
       if (startflipping) {
         this.flipping = true;
         // Bar moves up if we pass it. This means we're ready for the next one, even if flipping takes too long
         this.flipbar = this.bar += flipcrement * numflips;
         this.bar += barcrement * numbars;
       }
       
       if (this.flipping) {
         if (this.time > this.flipbar) {
           
           var index = this.flipdex++;
           if (data.reverse) {
             index = --this.flapdex;
           }
           //console.log("Checking flapdex as " + this.flapdex + " and index is " + index);
           
           // Flip color
           var child = el.children[index];
           var material = {color: 'none'};
           if (this.firstcolor) {
             material.color = data.fromcolor;
           }
           else {
             material.color = data.tocolor;
           }
           child.setAttribute('material', material);
           
           // Reset indices
           if (this.flipdex == data.num || this.flapdex == 0) {
             // TODO: this if catch might make alternating cooler if removed
             if (!data.alternate) {
               this.firstcolor = !this.firstcolor;
             }
             // Don't stop flipping if we're cycling
             if (!data.flipcycle) {
               this.flipping = false;
             }
             this.flipdex = 0;
             this.flapdex = this.data.num;
           }
           
           // Update bar position and movement speed
           this.flipbar += flipcrement * numflips;
           numflips = Math.ceil((this.time - this.flipbar) / flipcrement);
         }
         // Flip color every tick if alternating
         if (data.alternate) {
           this.firstcolor = !this.firstcolor;
         }
       }
     }
   }
 });

AFRAME.registerComponent('ganzfeld', {
  schema: {
    radius: {default: 5},
    color: {default: "#00F900"},
  },
  init: function () {
    var el = this.el;
    var data = this.data;
    
    var sphere = document.createElement('a-entity');
    sphere.setAttribute('geometry', "primitive: sphere; radius: " + data.radius);
    sphere.setAttribute('material', "shader: flat; side: double; color: " + data.color);
    sphere.setAttribute('state', 0);
    this.el.appendChild(sphere);
    
    /*var info = document.createElement('a-entity');
    info.setAttribute('geometry', "primitive: plane;");
    info.setAttribute('material', "shader: flat; opacity: 0.5");
    var infoText = "Ganzfeld info here";
    info.setAttribute('text', "align: center; value: " + infoText);*/
    
    window.addEventListener("keydown", function(e){
      if(e.keyCode === 71) { // g key to cycle colors
        var color = document.querySelector('#ganzfeld').children[0].getObject3D('mesh').material.color;
        var state = parseInt(document.querySelector('#ganzfeld').children[0].getAttribute('state'));
        // Gets a little silly with the math here. Pulling directly from the object3D required a couple conversions
        var hexcolor = rgbToHex(color.r * 255, color.g * 255, color.b * 255);
        
        var res = rainbowCycle(state, hexcolor, 10);
        
        var nextcolor = hexToRgb(res[1]);
        nextcolor.r /= 255; nextcolor.g /= 255; nextcolor.b /= 255;
        document.querySelector('#ganzfeld').children[0].getObject3D('mesh').material.color = nextcolor;
        document.querySelector('#ganzfeld').children[0].setAttribute('state', res[0]);
      }
      if(e.keyCode === 72) { // h key to pause music
        var noise = document.querySelector("#noise");
        if (noise.paused) {
          noise.play();
        }
        else {
          noise.pause();
        }
      }
    });
  }
});

// Cycle through a rainbow for a single simple entity
AFRAME.registerComponent('rainbowcycle', {
  schema: {
    offset: {default: 0},
    speed: {default: 5}
  },
  init: function () {
    var el = this.el;
    var material = el.getAttribute('material');
    material.color = rgbToHex(255, this.data.offset % 255, 0);
    el.setAttribute('material', material);
    this.state = 0;
  },
  tick: function () {
    var el = this.el;
    var material = el.getAttribute('material');
    var color = material.color;
    var speed = this.data.speed;
    var ret = rainbowCycle(this.state, color, speed);
    this.state = ret[0];
    material.color = ret[1];
    el.setAttribute('material', material);
  }
});