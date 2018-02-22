/* global AFRAME, THREE, beat, bind, Uint8Array, isMobile */

/*
  This is a file for little component orphans that haven't found a home yet.
*/

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

/*
  Proof of concept for direct manipulation of THREE.js parameters
*/
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
      this.el.appendChild(entity);
    }
    //child.setAttribute("position", {x: 4});

  },
  tick: function () {
    rotato(this.el);
  }
});