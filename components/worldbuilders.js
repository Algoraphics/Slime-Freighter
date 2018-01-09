/* global AFRAME, rng */

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

/*
Builds a customizeable grid of assets. Must be passed a function which defines the details
of what assets will be used, how they will be customized themselves, etc.
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
    widthprobs: {default: '0.2 0.2 0.2 0.2 0.2'}, // Relative probabilities of the input widths
    maxheight: {default: 5},
    heightprobs: {default: '1 1 1 1 1'},
    buildingfunction: {default: "none"}, // Function to call to determine what kind of buildings get placed
    stopfollow: {default: 0}, // When the city should stop following the camera
  },
  init: function () {
    var data = this.data;
    this.loading = true;
    
    var xstart = 0;
    var xmax = data.blockx;
    var zstart = 0;
    var zmax = data.blockz;
    var xincrement = data.gapwidth + xmax;
    this.totalxmax = xmax + xincrement * data.numblockx;
    var zincrement = data.gapwidth + zmax;
    this.totalzmax = zmax + zincrement * data.numblockz;
    
    // Increase the size of overall grid to allow for further checking
    var widths = [];
    // Actual building heights for placing
    var heights = [];
    // Max height at each point
    var heightmap = [];
    var widthcoords = [];
    var probs = data.widthprobs.split(' ');
    for (var i = 0; i < probs.length; i++) {
      probs[i] = parseFloat(probs[i]);
    }
    var heightoptions = [];
    for (var j = 0.0; j < data.maxheight; j++) {
      heightoptions.push(j);
    }
    // Start at largest size we're willing to do
    var curwidth = Math.min(data.blockx, data.blockz);
    
    // Loop over all squares in building grid
    for (var z = 0; z < this.totalzmax; z++) {
      var heightrow = [];
      var heightmaprow = []
      var widthrow = [];
      var widthcoordrow = [];
      for (var x = 0; x < this.totalxmax; x++) {
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
    
    /*
    Build a map of all widths and heights of assets which will be placed. Goal is to avoid z-fighting intersections
    where sides of assets align on the exact same x or z value. Currently, it does not do this job perfectly, but I'm
    not sure how possible that is.
    */
    while (zmax <= this.totalzmax) {
      while (xmax <= this.totalxmax) {
        while (curwidth > 0) {
          var buffer = Math.floor(curwidth / 2);
          for (var z = zstart + buffer; z < zmax - buffer; z++) {
            for (var x = xstart + buffer; x < xmax - buffer; x++) {
              // Calculate fractional starting distance to side from center point
              var dist = curwidth / 2.0;
              // Find distance to nearby walls, avoid intersection
              if ((dist != widthcoords[z][x].x && dist != widthcoords[z][x].z) && (dist > widthcoords[z][x].x || dist > widthcoords[z][x].z)) {
                // Use probability of generating a building of this width
                var rand = Math.random();
                if (rand < probs[curwidth - 1]) {
                  // Place building
                  widths[z][x] = curwidth;
                  var height = rng(heightoptions, data.heightprobs);
                  heights[z][x] = height;
                  var rad = Math.floor(curwidth / 2);
                  // Loop over all squares on which building will sit
                  for (var zi = z - curwidth + 1; zi <= z + curwidth - 1; zi++) {
                    for (var xi = x - curwidth + 1; xi <= x + curwidth - 1; xi++) {
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
    
    this.widths = widths;
    this.heights = heights;
    
    /*console.log("widths");
    print2DArray(widths);
    console.log("heights");
    print2DArray(heights);*/
    
    this.x = 0;
    this.z = this.totalzmax - 1;
    
    this.xpos = 0;
    this.zpos = this.z * data.grid;
    
    this.xmax = this.totalxmax;
    this.zmax = this.totalzmax;

    var pos = this.el.getAttribute('position');
    this.centerz = (this.zpos / 2) + pos.z;
    // Rise buildings from ground
    var from = "" + pos.x + " " + pos.y + " " + pos.z;
    var to = pos.x + " " + (pos.y + 351.5) + " " + pos.z;
    this.el.setAttribute('animation__up',"property: position; from: " + from + "; to: " + to + "; easing: easeOutCubic; dur: 30000; startEvents: doneloading");
    
    // Offset to help with z-fighting
    this.offset = 0.01;
    // Allow shift for certain building types
    this.xshift = 0;
    this.zshift = 0;
    
    // Set the line at which buildings should begin to be loaded
    this.loadbar = 1000000;//pos.z + 2 * this.zpos;

    // Setup for follow mechanism
    this.time = 0;
    this.movedex = 0;
    this.follow = true;
    
    // Useful info for planning multiple worlds in sequence
    console.log("Worldbuilder " + data.buildingfunction + " starts at " + (pos.z + this.zpos) + " and ends at " + (pos.z) + ", center is " + this.centerz +
                ". loadbar is " + this.loadbar + ", will stop following at " + data.stopfollow + ", will de-load at " + data.unload);
  },
  tick: function (time, timeDelta) {
    var el = this.el;
    var data = this.data;
    var campos = document.querySelector('#camera').getAttribute('position');
    
    //console.log("campos is " + campos.z);
    if (this.loading) {
      if (campos.z < this.loadbar) {
        //console.log("loading building at x: " + this.x + ", z: " + this.z);
        
        // Create the row and add it immediately. It will need to be retrieved every tick anyway so we can do slow loading
        if (this.x == 0) {
          el.appendChild(document.createElement('a-entity'));
          
        }
        
        var buildingfunction = window[data.buildingfunction];
        if (typeof buildingfunction === "function") {
          buildingfunction(this, data);
        }
        else {
          console.error("Function " + data.buildingfunction + " does not exist, and will not be used to load a worldbuilder.");
          this.loading = false;
        }
        //data.buildingfunction[0](this, data);
        
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
        if (this.z < 0) {
          console.log("Worldbuilder " + data.buildingfunction + " loading done.");
          this.el.emit('doneloading');
          this.el.setAttribute('visible', true);
          this.loading = false;
        }
      }
    }
    else if (this.unloading) {
      
    }
    // After loading, begin moving
    else {
       if (campos.z < this.centerz && campos.z > data.stopfollow) {
         var row = el.children[this.movedex];
         var pos = row.getAttribute('position');

         pos.z -= this.zmax * data.grid;
         pos.y -= 350;
         el.children[this.movedex].setAttribute('position', pos);
         var from = "" + pos.x + " " + pos.y + " " + pos.z;
         var to = pos.x + " " + (pos.y + 350) + " " + pos.z;
         el.children[this.movedex].setAttribute('animation__move',"property: position; from: " + from + "; to: " + to + "; easing: easeOutCubic; dur: 10000;");

         this.movedex++;
         this.centerz -= data.grid
         if (this.movedex == this.zmax) {
           this.movedex = 0; 
         }
       }
    }
  }
});

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

    var rngbuilding = document.createElement('a-entity');
    // TODO: either allow non-shaders in front row or make sure fog is still around when entering city
    if ((width < 3 && height < 4) && (builder.x < xcenter + 5 && builder.x > xcenter - 5)) {
      rngbuilding.setAttribute('rng-building', "width: " + width + "; height: " + (height + 2) + "; windowtype: 1 0 1 1 1; colortype: 0 0 0 0 1 0");
      // Shift non-shaders so they're always in front. Looks better
      builder.xshift = 0.5;
      builder.zshift = 0.5;
    }
    else {  
      rngbuilding.setAttribute('rng-building-shader', "width: " + width + "; height: " + height
                               + "; grow_slide: 0 1; static: 1 2; axis: 1 1"
                               + "; usecolor1: 1 1; usecolor2: 1 1; colorstyle: 1 4 4 1");
    }

    // Flip buildings on right
    var yrotation = 0;
    if (builder.x >= xcenter) {
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