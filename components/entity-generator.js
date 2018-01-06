/* global AFRAME */

/**
  * Entity Generator component for A-Frame.
  * Create number of entities given a mixin.
 */
AFRAME.registerComponent('entity-generator', {
   schema: {
     mixin: {default: ''},
     num: {default: 10}
   },
 
   init: function () {
     var data = this.data;
     var mixingroups = data.mixin.split(',');
     
     // Create entities with supplied mixin.
     for (var i = 0; i < data.num; i++) {
       for (var j = 0; j < mixingroups.length; j++) {   
         var entity = document.createElement('a-entity');
         entity.setAttribute('mixin', mixingroups[j]);
         this.el.appendChild(entity);
       }
     }
   }
 });

AFRAME.registerComponent('entity-generator-merger' , {
  schema: {
    mixins: {default: ''},
    num: {default: 10},
    positions: {default: ''},
    rotations: {default: ''},
    layout_type: {default: 'line'},
    layout_margin: {default: '3'},
    flip_reverse: {default: 'false'},
    flip_delay: {default: 0},
    flip_shift: {default: 0}
  },
  init: function() {
    var data = this.data;
    var mixins = data.mixins.split(',');
    var positions = data.positions.split(',');
    var rotations = data.rotations.split(',');
    
    if (mixins.length != positions.length || mixins.length != rotations.length) {
      console.error("Multiple children requires multiple positions and rotations. e.g. 'positions: 0 0 0, 1 1 1'"); 
    }
    
    // TODO: don't want to flip for all elements. just lights. Maybe use "light" in the name for the ones that will flip
    for (var i = 0; i < data.num; i++) {
      var entity = document.createElement('a-entity');
      entity.setAttribute('entity-colors', "mixin: " + mixins[i] + "; num: " + data.num + 
                          '; color_type: flip; every: 4; slower: 4; reverse: ' + data.flip_reverse + 
                          '; delay: ' + data.flip_delay + '; shift: ' + data.flip_shift);
      entity.setAttribute('position', positions[i]);
      entity.setAttribute('rotation', rotations[i]);
      entity.setAttribute('layout', "type: " + data.layout_type + "; margin: " + data.layout_margin);
      this.el.appendChild(entity);
    }
  }
});

// Layout component that will rotate objects in a circle to all face outwards.
// TODO this is kinda redundant now that the building component does it
AFRAME.registerComponent('entity-circle', {
   schema: {
     mixin: {default: ''},
     num: {default: 4},
     axis: {default: 'y'},
     angle: {default: 0} // Angle will be calculated if not supplied
   },
 
   init: function () {
     var data = this.data;
 
     // Create entities with supplied mixin.
     for (var i = 0; i < data.num; i++) {
       var angle;
       if (data.angle > 0) {
         angle = data.angle;
       }
       else {
         angle = 360/data.num;
       }
       var entity = document.createElement('a-entity');
       entity.setAttribute('mixin', data.mixin);
       
       var rotationTmp = {x: 0, y: 0, z: 0};
       if (data.axis == 'x') {
         rotationTmp.x = angle * i;
       }
       if (data.axis == 'y') {
         rotationTmp.y = angle * i;
       }
       if (data.axis == 'z') {
         rotationTmp.z = angle * i;
       }
       entity.setAttribute('rotation', rotationTmp);
       
       this.el.appendChild(entity);
     }
   }
 });

// Returns number of sides on which to put windows. Subtracts 1 or more 
// as an optimization since not all will be visible
function numSides(type) {
  var numSides;
  switch (type) {
    case 'tri': {
      numSides = 3;
      break;
    }
    case 'box': {
      numSides = 4;
      break;
    }
    case 'pent': {
      numSides = 5;
      break;
    }
    case 'hex': {
      numSides = 6;
      break;
    }
    case 'oct': {
      numSides = 8;
      break;
    }
    case 'hex': {
      numSides = 12;
      break;
    }
  }
  return numSides;
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// TODO: building shapes not working. Need to determine radius multiplier and use cylinders with radial segments for shape
AFRAME.registerComponent('building', {
  schema: {
    windowtype: {default: 'rect', oneOf: ['rect', 'circle', 'triangle', 'diamond', 'bars']},
    buildingshape: {default: 'box', oneOf: ['tri', 'box', 'pent', 'hex', 'oct', 'dodec']},
    colortype: {default: 'flip', oneOf: ['shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio']},
    width : {default: 1},
    height: {default: 1},
    angle : {default: -1},
    optimize: {default: true},
    id: {default: 0}
  },
  init: function () {
    var data = this.data;
    var windowidth = 1;
    var windowheight = 2;
    var rowmargin = 1 + windowheight;
    var columnmargin = 1 + windowidth;
    var numrows = 2 * data.height;
    var numcolumns = 2 * data.width;
    
    // Windowtype-specific settings
    if (data.windowtype == 'circle') {
      numrows = numrows * 1.5;
      rowmargin -= 1;
    }
    if (data.windowtype == 'triangle') {
      columnmargin += 0.1; 
    }
    if (data.windowtype == 'diamond') {
      columnmargin += 0.25;
    }
    if (data.windowtype == 'bars') {
      windowidth = 1.25;
      columnmargin += 0.5;
    }
    
    var windowZbuffer = 0.1;
    var buildingwidth = 5 * data.width;
    var buildingheight = 6.5 * data.height;
    
    var building = document.createElement('a-entity');
    var sides = numSides(data.buildingshape);
    
    for (var i = 0; i < sides - data.optimize; i++) {
      var windowgrid = document.createElement('a-entity');
      windowgrid.setAttribute('entity-colors', "mixin: " + data.windowtype + "; num: " + numrows * numcolumns + 
                              "; color_type: " + data.colortype + "; slower: 1; every: 2.5; fromcolor: " + getRandomColor() + "; tocolor: " + getRandomColor() + 
                              "; alternate: false; id: " + data.id + '; analyserEl: #analyser; max: 50; multiplier: 0.01;');
      windowgrid.setAttribute('layout',"type: box; columns: " + numcolumns + "; xcenter: " + windowidth +
                              "; marginRow: " + rowmargin + "; marginColumn: " + columnmargin);
      
      var angle;
      var rad;

      if (data.angle > 0) {
        angle = data.angle;
        rad = i * (2 * Math.PI) / sides
      }
      else {
        angle = 360/sides;
        rad = i * angle * 0.01745329252; // Angle to radian
      }
      
      var x = buildingwidth * Math.sin(rad) / 2;
      var z = buildingwidth * Math.cos(rad) / 2;

      windowgrid.setAttribute('rotation', "0 " + angle * i + " 0");
      windowgrid.setAttribute('position', x + " 0 " + z);
      
      this.el.appendChild(windowgrid);
    }
    
    //Prevent Z fighting
    buildingwidth -= windowZbuffer;
    
    building.setAttribute('geometry', "primitive: box; width: " + buildingwidth + "; height: " + buildingheight + "; depth: " + buildingwidth);
    building.setAttribute('material', "color: #000000");
    var buildingy = (numrows * rowmargin) / 2 - (rowmargin / 2);
    building.setAttribute('position', "0 " + buildingy + " 0");
    this.el.appendChild(building);
  }
});