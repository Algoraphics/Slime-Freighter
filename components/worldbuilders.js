/* global AFRAME, rng, emitlinks */

/*
  Worldbuilders define a customizeable grid of random assets which follows the camera to maintain
  an illusion of movement through an environment. 
  
  Assets are customized using an input buildingfunction, which defines which assets to use, their
  individual settings, etc. These are generally rng-type assets, which independently handle random
  selection of characteristics.
*/
AFRAME.registerComponent('worldbuilder', {
  schema: {
    blockx: {default: 5}, // x dimension of block
    blockz: {default: 15}, // z dimension of block
    numblockx: {default: 1},
    numblockz: {default: 1},
    grid: {default: 5}, // distance between grid points (generally width of single building)
    gapwidth: {default: 0}, //Width of road gaps between blocks
    maxwidth: {default: 5}, // List of widths
    widthprobs: {default: '0.1 0.1 0.1 0.1 0.1'}, // Relative probabilities of the input widths
    maxheight: {default: 5},
    heightprobs: {default: '1 1 1 1 1'},
    buildingfunction: {default: "none"}, // Function to call to determine what kind of buildings get placed
    stopfollow: {default: 0}, // When the city should stop following the camera
    loadmult: {default: 1}, // Multiplier for how early we should load. 1 is earliest
    buildgrids: {default: true},
    unload: {default: -500},
    showbar: {default: 50},
  },
  init: function () {
    var data = this.data;
    this.loading = true;
    
    // Construct width and height maps
    buildGrids(this);
    
    this.x = 0;
    this.z = this.totalzmax - 1;
    
    this.xpos = 0;
    this.zpos = this.z * data.grid;
    
    this.xmax = this.totalxmax;
    this.zmax = this.totalzmax;

    var pos = this.el.getAttribute('position');
    this.centerz = (this.zpos / 2) + pos.z;
    
    // Rise buildings from ground
    if (data.buildingfunction == 'colorCity') {
      var from = "" + pos.x + " " + pos.y + " " + pos.z;
      var to = pos.x + " " + (pos.y + 750) + " " + pos.z;
      this.el.setAttribute('animation__up',"property: position; from: " + from + "; to: " + to + "; easing: easeOutCubic; dur: 20000; startEvents: beat");
    }
    // Offset to help with z-fighting
    this.offset = 0.01;
    // Allow shift for certain building types
    this.xshift = 0;
    this.zshift = 0;
    
    // Set the line at which buildings should begin to be loaded. Zpos here is the full z length of the world
    this.el.loadbar = pos.z + data.loadmult * this.zpos;
    
    this.unload = pos.z + data.unload;
    this.showbar = pos.z + this.zpos + data.showbar;
    // Debug
    this.startbar = this.loadbar;

    // Setup for follow mechanism
    this.time = 0;
    this.movedex = 0;
    this.follow = true;
    this.stopfollow = pos.z + data.stopfollow + this.zpos/2;
    
    this.el.addEventListener('start', function () {
      console.log("Adding 200 to loadbar " + this.loadbar);
      this.loadbar += 200;
    });
    
    // Useful info for planning multiple worlds in sequence
    console.log("Worldbuilder " + data.buildingfunction + " starts at " + (pos.z + this.zpos) + " and ends at " + (pos.z) + ", center is " + this.centerz +
                ". loadbar is " + this.el.loadbar + ", showbar is " + this.showbar + ", will stop following at " + (pos.z + data.stopfollow) + ", will de-load at " + this.unload);
  },
  tick: function (time, timeDelta) {
    var el = this.el;
    var data = this.data;
    var campos = document.querySelector('#camera').getAttribute('position');
    
    if (campos.z < this.unload) {
      console.log("Removing worldbuilder " + data.buildingfunction);
      el.setAttribute('visible', false);
      this.unloading = true;
      this.loading = false;
    }
    // If we should be loading, load the next element and adjust indices accordingly
    if (this.loading && campos.z < this.el.loadbar) {

      // Create the row and add it immediately. It will need to be retrieved every tick anyway so we can do slow loading
      if (this.x == 0) {
        el.appendChild(document.createElement('a-entity'));
      }

      // Call buildingfunction by input parameter
      var buildingfunction = window[data.buildingfunction];
      if (typeof buildingfunction === "function") {
        buildingfunction(this, data);
      }
      else {
        console.error("Function " + data.buildingfunction + " does not exist, and will not be used to load a worldbuilder.");
        this.loading = false;
      }

      this.x++;
      this.xpos += data.grid;

      if (this.x == this.xmax) {
        this.x = 0;
        this.xpos = this.x + this.offset;

        this.offset += 0.01;
        if (this.offset == 0.05) {
          this.offset = 0; 
        }

        this.z--;
        this.zpos -= data.grid + this.offset;
      }
      
      // Let other components know when loading is done
      if (this.z < 0) {
        console.log("Worldbuilder " + data.buildingfunction + " loading done.");
        emitlinks(this.el,'worldloaded');
        this.el.setAttribute('visible', true);
        this.loading = false;
      }
    }
    else if (this.unloading) {
      el.parentNode.removeChild(el);
    }
    // After loading, begin moving
    else {
      if (campos.z > this.stopfollow) {
        // After passing showbar, we're done with dancing city and should show colored city
        if (!this.showing && campos.z < this.showbar) {
           this.showing = true;
           this.el.emit('showtime');
        }
        //console.log("campos is " + campos.z);
        if (campos.z < this.centerz) {
        var row = el.children[this.movedex];
          var pos = row.getAttribute('position');
          // TODO: cycling, although may not be necessary with smart pre-loading. Maybe add optional feature to remove rows as we go?

          pos.z -= this.zmax * data.grid;
          // TODO: posy offset for animation needs to be custom value
          var from = "" + pos.x + " " + (pos.y - 350) + " " + pos.z;
          var to = pos.x + " " + pos.y + " " + pos.z;
          row.setAttribute('animation__move',"property: position; from: " + from + "; to: " + to + "; easing: easeInCubic; dur: 594.094;");
          //console.log("moving to position " + pos.z + ". campos is " + campos.z);
          this.movedex++;
          this.centerz -= data.grid;
          if (this.movedex == this.zmax) {
            this.movedex = 0; 
          }
        }
      }
      else if (!this.donefollow) {
        this.donefollow = true;
        // Function specific emit calls
        if (data.buildingfunction == 'movingCity') {
          this.el.sceneEl.emit('donedancing');
          //document.querySelector('#grid').setAttribute('visible', true);
        }
      }
    }
  }
});

/*
Build a map of all widths and heights of assets which will be placed. Goal is to avoid z-fighting intersections
where sides of assets align on the exact same x or z value. Currently, it does not do this job perfectly, but I'm
not sure how possible that is without a lot of arbitrary constants or some serious multivariable calculation
*/
function buildGrids(wb) {
  var data = wb.data;
  
  var xstart = 0;
  var xmax = data.blockx;
  var zstart = 0;
  var zmax = data.blockz;
  var xincrement = data.gapwidth + xmax;
  wb.totalxmax = xmax + xincrement * (data.numblockx - 1);
  var zincrement = data.gapwidth + zmax;
  wb.totalzmax = zmax + zincrement * (data.numblockz - 1);
  
  // If we don't need the grids, just set the max values and exit
  if (!data.buildgrids) {
    return; 
  }
  
  // Increase the size of overall grid to allow for further checking
  var widths = [];
  // Actual building heights for placing
  var heights = [];
  // Max height at each point
  var heightmap = [];
  var widthcoords = [];
  var probs = data.widthprobs.split(' ');
  for (var i = 0; i < probs.length; i++) {
    // TODO constant or input variable or something, this determines overall building probability
    probs[i] = parseFloat(probs[i]);
  }
  var heightoptions = [];
  for (var j = 0.0; j < data.maxheight; j++) {
    heightoptions.push(j);
  }
  // Start at largest size we're willing to do
  var curwidth = Math.min(data.blockx, data.blockz);

  // Loop over all squares in building grid
  for (var z = 0; z < wb.totalzmax; z++) {
    var heightrow = [];
    var heightmaprow = []
    var widthrow = [];
    var widthcoordrow = [];
    for (var x = 0; x < wb.totalxmax; x++) {
      heightrow.push(0);
      heightmaprow.push(0);
      widthrow.push(0);
      widthcoordrow.push({x: 0, z: 0});
    }
    heights.push(heightrow);
    heightmap.push(heightmaprow);
    widths.push(widthrow);
    widthcoords.push(widthcoordrow);
  }

  // Big boy loop. First checks are to run multiple times for each block
  while (zmax <= wb.totalzmax) {
    while (xmax <= wb.totalxmax) {
      // Now run once for each width size. Largest first
      while (curwidth > 0) {
        var buffer = Math.floor(curwidth / 2);
        // Loop over all squares which can legally contain a building of this size
        for (var z = zstart + buffer; z < zmax - buffer; z++) {
          for (var x = xstart + buffer; x < xmax - buffer; x++) {
            // Calculate fractional starting distance to side of asset from center point
            var dist = curwidth / 2.0;
            // Find check stored distance to nearby walls, avoid intersection
            if ((dist != widthcoords[z][x].x && dist != widthcoords[z][x].z) && (dist > widthcoords[z][x].x || dist > widthcoords[z][x].z)) {
              // Use probability of generating a building of this width
              var rand = Math.random();
              if (rand < probs[curwidth - 1]) {
                // Choose location and height for building
                widths[z][x] = curwidth;
                var height = rng(heightoptions, data.heightprobs);
                heights[z][x] = height;
                var rad = Math.floor(curwidth / 2);
                // Loop over all squares on which building will sit, with some extra buffer for so other assets know it's nearby
                for (var zi = z - curwidth + 1; zi <= z + curwidth - 1; zi++) {
                  for (var xi = x - curwidth + 1; xi <= x + curwidth - 1; xi++) {
                    // Avoid going out of bounds
                    if ((zi >= 0 && zi < zmax) && (xi >= 0 && xi < xmax)) {
                      var curdistx = dist - Math.abs(x - xi);
                      var curdistz = dist - Math.abs(z - zi);
                      //console.log("x is " + x + ", xi is " + xi + ", z is " + z + ", zi is " + zi + ", buffer is " + buffer + " for curwidth " + curwidth);
                      widthcoords[zi][xi].x = Math.max(widthcoords[zi][xi].x, curdistx);
                      widthcoords[zi][xi].z = Math.max(widthcoords[zi][xi].z, curdistz);
                    }
                    if ((zi >= z - rad && zi <= z + rad) && (xi >= x - rad && xi <= x + rad)) {
                      heightmap[zi][xi] = Math.max(heightmap[zi][xi], height * curwidth);
                    }
                  }
                }
              }
            }
          }
        }
        curwidth--;
      }
      xstart += xincrement;
      xmax += xincrement;
      curwidth = data.maxwidth;
    }
    xstart = 0;
    xmax = data.blockx;
    zstart += zincrement;
    zmax += zincrement;
  }

  wb.widths = widths;
  wb.heights = heights;

  /*console.log("widths");
  print2DArray(widths);
  console.log("heights");
  print2DArray(heights);*/
}

// Buildingfunction for a colorful cityscape with shader buildings
function colorCity(builder, data) {
  
  var height = builder.heights[builder.z][builder.x];
  var width = builder.widths[builder.z][builder.x];

  builder.xshift = 0;
  builder.zshift = 0;
  // Block roads with large buildings to help with illusion
  if (builder.z % (data.blockz + data.gapwidth - 1) == 0 && (builder.x == 0 || builder.x == builder.totalxmax - 1)) {
    height = 4;
    width = 5;
    builder.xshift = 10;
  }

  if (height != 0 && width != 0) {
    //TODO: Do something with loadbar. Maybe use to incrementally make things visible?
    //builder.loadbar -= 200 / (builder.zmax * builder.xmax);

    var xcenter = (builder.xmax - data.numblockx * data.gapwidth) / 2;
    height *= width * Math.floor(1 + Math.random() * 3);

    var rngbuilding = document.createElement('a-entity');
    rngbuilding.setAttribute('rng-building-shader', "width: " + width + "; height: " + height
                               + "; color1: #FFFF00; usecolor1: 1 0; grow_slide: 1 1; static: 1 0; axis: 1 1; colorstyle: 1 4 1 0");

    // Flip buildings on right
    var yrotation = 0;
    if (builder.x >= xcenter + 5) {
      yrotation = 180;
      builder.xshift = -builder.xshift;
    }

    rngbuilding.setAttribute('position', (builder.xpos - builder.xshift) + " 0 " + (builder.zpos + builder.zshift));
    rngbuilding.setAttribute('rotation', "0 " + yrotation + " 0");
    
    // TODO: this.children gets child if you're in the component. For some reason you have to call .el to get the children once passed to a function
    var row = builder.el.children[builder.zmax - builder.z - 1];
    row.appendChild(rngbuilding);
  }
}

// buildingfunction for a city with moving/dancing rng-building elements
// Currently uses some arbitrary timing for cool effects with walking robots, etc.
function movingCity(builder, data) {
  var row = builder.el.children[builder.zmax - builder.z - 1];
  
  var start = 48;
  
  var width = 1;
  var height = 2;
  
  var xoffset = 0;
  var zoffset = 0;
  var gridset = data.grid / 3;
  var fullrange = Math.random() * 2 * gridset - gridset;
  
  var yrotation = 0;
  
  var xcenter = (builder.xmax - data.numblockx * data.gapwidth) / 2;
  var rngbuilding = document.createElement('a-entity');
  var typestr = "; windowtype: 1 0 0 0 0; colortype: 1 0 0 0 0 0";
  var type;
  var robostart;
  var jumpstart;
  if (builder.x == 0 && builder.z == 4) {
    robostart = 82;
    jumpstart = 62;
    type = 'robot';//rng([type, 'robot'], '0 1');
  }
  else if (builder.x == 0 && builder.z == 7) {
    robostart = 66;
    jumpstart = 48;
    type = 'robot';//rng([type, 'robot'], '0 1');
  }
  // Some number of spaces will not have buildings, but robots are an exception
  else if (rng([true, false], '3 5')) {
    return;    
  }
  else {
    var type = rng(['arcy', 'arcx', 'flower', 'sine', 'pulse', 'split', 'dance'], '2 1 1 2 2 1 3');// 4');
  }
  if (type == 'arcy') {
    yrotation = rng([90, 180, 270], '1 6 1');
    xoffset = fullrange;
    zoffset = fullrange;
    rngbuilding.setAttribute('rng-building-arc', "color1: #ffff00; width: 1; height: 1"
                             + typestr + "; start: " + start);
  }
  else if (type == 'arcx') {
    height = rng([1,2,3],'1 1 3');
    rngbuilding.setAttribute('rng-building-arc', "color1: #ffff00; axis: x; width: 1; height: "
                             + height + typestr + "; start: " + start);
    yrotation = rng([90, 180, 270], '1 4 1');
    if (yrotation == 180) {
      xoffset -= gridset - 5;
      if (builder.x >= xcenter) {
        xoffset = -xoffset;
      }
      zoffset = fullrange;
    }
    else {
      zoffset = fullrange / 4;
    }
  }
  else if (type == 'dance') {
    height = rng([1,2,3],'1 1 4');
    width = rng([1,2], '1 1');
    xoffset = fullrange / 2;
    zoffset = fullrange / 2;
    rngbuilding.setAttribute('rng-building-dance', "color1: #ffff00; width: " + width + "; height: " + height + typestr + "; start: " + (start + 12));
  }
  else if (type == 'flower') {
    height = rng([1,2],'1 1');
    xoffset = fullrange;
    zoffset = fullrange;
    rngbuilding.setAttribute('rng-building-flower', "color1: #ffff00; width: 1; height: " + height + typestr + "; start: " + start);
  }
  else if (type == 'pulse') {
    height = rng([1,2,3],'1 1 2');
    xoffset = fullrange - 3;
    if (builder.x >= xcenter) {
      xoffset = -xoffset;
    }
    zoffset = fullrange;
    rngbuilding.setAttribute('rng-building-pulse', "color1: #ffff00; width: 1; height: " + height + typestr + "; start: " + (start + 6));
  }
  else if (type == 'split') {
    rngbuilding.setAttribute('rng-building-split', "color1: #ffff00" + typestr + "; start: " + (start + 24));
    xoffset = -10;
    if (builder.x >= xcenter) {
        xoffset = -xoffset;
    }
  }
  else if (type == 'sine') {
    height = rng([1,2,3],'3 2 1');
    var skip = rng([true, false], '1 1');
    rngbuilding.setAttribute('rng-building-sine', "color1: #ffff00; width: 1; dist: 10; skip: " + skip
                             + "; height: " + height + typestr + "; start: " + (start + 12));
    yrotation = rng([0, 90, 270], '1 1 1');
    if (yrotation == 0) {
      xoffset -= gridset;
      if (builder.x >= xcenter) {
        xoffset = -xoffset;
      }
    }
    else {
      xoffset = fullrange;
      zoffset = fullrange; 
    }
  }
  else if (type == 'robot') {
    builder.x = builder.xmax - 1;
    var reverse = rng([true, false], '1 1');
    rngbuilding.setAttribute('rng-building-robot', "color1: #ffff00; reverse: " + reverse + typestr + "; start: " + robostart);
    xoffset = 187;
    yrotation = 180;
    if (reverse) {
      xoffset = -101.5;
      yrotation = 0;
    }
    
    var jumper = document.createElement('a-entity');
    jumper.setAttribute('rng-building-sine', "color1: #ffff00; width: 2; dist: 20; skip: true; cont: true; num: 3" +
                             + "; height: 2" + typestr + "; start: " + jumpstart);
    jumper.setAttribute('position', (builder.xpos + xoffset) + " 0 " + (builder.zpos + zoffset));
    jumper.setAttribute('rotation', "0 " + yrotation + " 0");
    row.appendChild(jumper);
  }

  // Flip buildings on right
  if (builder.x >= xcenter) {
    yrotation -= 180;
    xoffset += 5;
  }

  rngbuilding.setAttribute('position', (builder.xpos + xoffset) + " 0 " + (builder.zpos + zoffset));
  rngbuilding.setAttribute('rotation', "0 " + yrotation + " 0");

  row.appendChild(rngbuilding);
}

// Used for printing placement grids while debugging
function print2DArray(array) {
  console.log("SPACE");
  for (var i = 0; i < array.length; i++) {
    var outrow = "[ ";
    for (var j = 0; j < array[i].length; j++) {
      outrow += array[i][j] + " "
    }
    outrow += "]";
    console.log(outrow);
  }
}