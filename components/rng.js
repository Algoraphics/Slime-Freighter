/* global AFRAME */

// Takes list of options and input string of probabilities for those options
// Will randomly choose an option, favoring some over others based on probs
function rng(options, probstr) {
  console.log("TATER");
  var choose_array = rngArr(options, probstr);
  return choose_array[Math.floor(Math.random() * choose_array.length)];
}

function rngArr(options, probstr) {
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

function probArr(options, probstr) {
  //console.log("Checking probs for options "  + options + " and probstr " + probstr);
  var probs = probstr.split(' ');
  if (options.length != probs.length) {
    console.error("Options array length " + options.length + " must match probabilities array length " + probs.length);
    return NaN;
  }
  return probs;
}

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
    buildingfunction: {default: "none"},
    stopfollow: {default: 0},
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
    
    // Offset to help with z-fighting
    this.offset = 0.01;
    // Allow shift for certain building types
    this.xshift = 0;
    this.zshift = 0;
    
    // Set the line at which buildings should begin to be loaded
    this.loadbar = pos.z + 2 * this.zpos;

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
      if (campos.z < 1000000) { //this.loadbar) {
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
          this.el.setAttribute('visible', true);
          this.loading = false;
        }
      }
    }
    else if (this.unloading) {
      
    }
    // After loading, begin moving
    else {
       this.time += timeDelta;
       if (campos.z < this.centerz && campos.z > data.stopfollow) {
         //console.log("moving! campos is " + campos.z);
         this.time = 0;
         var row = el.children[this.movedex];
         var pos = row.getAttribute('position');

         pos.z -= this.zmax * data.grid;
         el.children[this.movedex].setAttribute('position', pos);

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
    builder.loadbar -= 200 / (builder.zmax * builder.xmax);

    var xcenter = (builder.xmax - data.numblockx * data.gapwidth) / 2;

    var rngbuilding = document.createElement('a-entity');
    // TODO: either allow non-shaders in front row or make sure fog is still around when entering city
    if ((width < 3 && height < 4) && (builder.x < xcenter + 5 && builder.x > xcenter - 5)) {
      rngbuilding.setAttribute('rng-building', "width: " + width + "; height: " + (height + 2) + "; windowtype: 1 0 1 1 1; colortype: 0 0 0 1 0");
      // Shift non-shaders so they're always in front. Looks better
      builder.xshift = 0.5;
      builder.zshift = 0.5;
    }
    else {  
      rngbuilding.setAttribute('rng-shader', "width: " + width + "; height: " + height
                               + "; grow_slide: 0 1; static: 1 1; axis: 1 1"
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

// For regular city
AFRAME.registerComponent('rng-building', {
  schema: {
    // Input probabilities
    windowtype: {default: ''},
    colortype: {default: ''},
    width: {default: 1},
    height: {default: 1},
  },
  init: function () {
    var data = this.data;
    
    var height = data.height;
    var width = data.width;
    var window = rng(['rect', 'circle', 'triangle', 'diamond', 'bars'], data.windowtype);
    var colortype = rng(['shimmer', 'rainbow', 'rainbow_shimmer', 'flip', 'flip_audio'], data.colortype);
    
    //console.log("width is " + width + ", height is " + height + ", windowtype is " + window);
    
    var building = document.createElement('a-entity');
    building.setAttribute('building', "windowtype: " + window + "; colortype: " + colortype 
                          + "; width: " + width + "; height: " + height);
    this.el.appendChild(building);
    this.id++;
  }
});

function getRandomColor2() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

AFRAME.registerComponent('rng-shader', {
  schema: {
    // Input probabilities
    axis: {default: '1 1'},
    width: {default: 1},
    height: {default: 1},
    static: {default: '1 1'},
    grows: {default: '1 1 1 1'},
    grow_slide: {default: ''},
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
    
    var color1 = getRandomColor2();
    var color2 = getRandomColor2();
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
      building.setAttribute('material', "shader: grid-glitch;"
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