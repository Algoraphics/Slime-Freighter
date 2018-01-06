/* global AFRAME, THREE */

function rotato(el) {
  var rotationTmp = this.rotationTmp = this.rotationTmp || {x: 0, y: 0, z: 0};
  var rotation = el.getAttribute('rotation');
  rotationTmp.x = rotation.x;
  rotationTmp.y = rotation.y + 0.5;
  rotationTmp.z = rotation.z;
  el.setAttribute('rotation', rotationTmp);
}

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

AFRAME.registerComponent('justrotate', {
  tick: function () {
    rotato(this.el);
  }
});

// Math may seem arbitrary but there's a logic to it. Divides entity into 5 slices. 
// Basically, the goal is to keep the camera in the center slice. Ensures there are always 2/5th of the 
// total object both ahead and behind.
AFRAME.registerComponent('followcamera', {
  schema: {
    length: {default: 2},
    // Means origin point is away from camera (negative z)
    reverse: {default: false},
    delete: {default: NaN},
  },
  init: function () {
    // Use for slow delete
    this.deleting = false;
  },
  tick: function () {
    var cam = document.querySelector('#camera');
    if (!cam) { return; }
    
    var campos = cam.getAttribute('position');
    var position = this.el.getAttribute('position');
    var centerz = position.z - 3 * this.data.length / 5;
    if (this.data.reverse) {
      var centerz = position.z + 2* this.data.length / 5;
    }
    var pass = campos.z < centerz;
    //console.log("campos is " + campos.z + ", posz is " + position.z + ", centerz is " + centerz + ", reverse is " + this.data.reverse);
    if (pass) {
      position.z -= this.data.length / 5;
      this.el.setAttribute('position', position);
    }
    if (!isNaN(this.data.delete)) {
      if (campos.z < this.data.delete) {
        // Maybe factor into delete function?
        console.log(this.el.classList);
        if (this.el.classList.contains('slowdelete')) {
          // Add a more complex delete function here, probly just loop through the children and delete one per x tick
        }
        this.el.parentNode.removeChild(this.el); 
      }
    }
  }
});

var initialPos;

AFRAME.registerComponent('slide', {
  schema: {
    reset: {default: 8},
    axis: {default: 'z'},
    speed: {default: 5},
    loop: {default: true}
  },
  init: function () {
    var el = this.el;
    var position = el.getAttribute('position');
    this.initialPos = position.z;
  },
  tick: function (time, timeDelta) {
    var el = this.el;
    var data= this.data;
    var positionTmp = this.positionTmp = this.positionTmp || {x: 0, y: 0, z: 0};
    var position = el.getAttribute('position');
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
    //positionTmp.y = 30;
    positionTmp.x = position.x - xdelta;
    positionTmp.y = position.y + ydelta;
    positionTmp.z = position.z - zdelta;
    if (data.reset > 1 && positionTmp.z < this.initialPos - data.reset) {
      if (data.loop) {
        positionTmp.z = this.initialPos;
      }
      else {
        el.parentNode.removeChild(el); 
      }
    }
    el.setAttribute('position', positionTmp);
  }
});

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
//entity.setAttribute('animation__color', "property: material.color; dir: alternate; dur: 3000; easing: easeInSine; loop: true; to: rgb(0, 250, 0)");
//entity.setAttribute('animation__yoyo', "property: position; dir: alternate; dur: 1000; easing: easeInSine; loop: true; to: 0 " + i + " 0");
//entity.setAttribute('animation__scale', "property: scale; dir: alternate; dur: 200; easing: easeInSine; loop: true; to: 1.2 1 1.2");
