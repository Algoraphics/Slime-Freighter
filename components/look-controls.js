/* global AFRAME, THREE */

/* 
  Custom look-controls component, based on https://github.com/aframevr/aframe/blob/master/docs/components/look-controls.md.
  Touch screen use now works with vertical movement, and mouse movement has been changed to a "locking" mechanism to make
  looking around easier.
*/

function bind (fn, ctx/* , arg1, arg2 */) {
  return (function (prependedArgs) {
    return function bound () {
      // Concat the bound function arguments with those passed to original bind
      var args = prependedArgs.concat(Array.prototype.slice.call(arguments, 0));
      return fn.apply(ctx, args);
    };
  })(Array.prototype.slice.call(arguments, 2));
};

var vrDisplay;
var polyfilledVRDisplay;
var POLYFILL_VRDISPLAY_ID = 'Cardboard VRDisplay (webvr-polyfill)';

if (navigator.getVRDisplays) {
  navigator.getVRDisplays().then(function (displays) {
    vrDisplay = displays.length && displays[0];
    polyfilledVRDisplay = vrDisplay.displayName === POLYFILL_VRDISPLAY_ID;
  });
}

function getVRDisplay () { return vrDisplay; }

/**
 * Determine if a headset is connected by checking if a vrDisplay is available.
 */
function checkHeadsetConnected () { return !!getVRDisplay(); }

/**
 * Check for positional tracking.
 */
function checkHasPositionalTracking () {
  var vrDisplay = getVRDisplay();
  if (isMobile() || isGearVR()) { return false; }
  return vrDisplay && vrDisplay.capabilities.hasPosition;
}

/**
 * Checks if browser is mobile.
 * @return {Boolean} True if mobile browser detected.
 */
var isMobile = (function () {
  var _isMobile = false;
  (function (a) {
    // eslint-disable-next-line no-useless-escape
    if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) {
      _isMobile = true;
    }
    if (isIOS() || isTablet() || isR7()) {
      _isMobile = true;
    }
  })(window.navigator.userAgent || window.navigator.vendor || window.opera);

  return function () { return _isMobile; };
})();

/**
 *  Detect tablet devices.
 *  @param {string} mockUserAgent - Allow passing a mock user agent for testing.
 */
function isTablet (mockUserAgent) {
  var userAgent = mockUserAgent || window.navigator.userAgent;
  return /ipad|Nexus (7|9)|xoom|sch-i800|playbook|tablet|kindle/i.test(userAgent);
}

function isIOS () {
  return /iPad|iPhone|iPod/.test(window.navigator.platform);
}

function isGearVR () {
  return /SamsungBrowser.+Mobile VR/i.test(window.navigator.userAgent);
}

function isR7 () {
  return /R7 Build/.test(window.navigator.userAgent);
}

/**
 * Checks mobile device orientation.
 * @return {Boolean} True if landscape orientation.
 */
function isLandscape() {
  var orientation = window.orientation;
  if (isR7()) { orientation += 90; }
  return orientation === 90 || orientation === -90;
};

/**
 * Check if device is iOS and older than version 10.
 */
function isIOSOlderThan10(userAgent) {
  return /(iphone|ipod|ipad).*os.(7|8|9)/i.test(userAgent);
};

/**
 * Update an Object3D pose if a polyfilled vrDisplay is present.
 */
function PolyfillControls (object) {
  var frameData;
  if (window.VRFrameData) { frameData = new window.VRFrameData(); }
  this.update = function () {
    var pose;
    if (!vrDisplay || !polyfilledVRDisplay) { return; }
    vrDisplay.getFrameData(frameData);
    pose = frameData.pose;
    if (pose.orientation !== null) {
      object.quaternion.fromArray(pose.orientation);
    }
    if (pose.position !== null) {
      object.position.fromArray(pose.position);
    } else {
      object.position.set(0, 0, 0);
    }
  };
};


// To avoid recalculation at every mouse movement tick
var GRABBING_CLASS = 'a-grabbing';
var PI_2 = Math.PI / 2;
var radToDeg = THREE.Math.radToDeg;

//var checkHasPositionalTracking = utils.device.checkHasPositionalTracking;

/**

 *


 * look-controls. Update entity pose, factoring mouse, touch, and WebVR API data.
 
 
 *
 
 
 */
AFRAME.registerComponent('my-look-controls', {
  dependencies: ['position', 'rotation'],

  schema: {
    enabled: {default: true},
    touchEnabled: {default: true},
    hmdEnabled: {default: true},
    reverseMouseDrag: {default: false},
    userHeight: {default: 1.6}
  },

  init: function () {
    this.previousHMDPosition = new THREE.Vector3();
    this.hmdQuaternion = new THREE.Quaternion();
    this.hmdEuler = new THREE.Euler();
    this.position = new THREE.Vector3();
    // To save / restore camera pose
    this.savedRotation = new THREE.Vector3();
    this.savedPosition = new THREE.Vector3();
    this.polyfillObject = new THREE.Object3D();
    this.polyfillControls = new PolyfillControls(this.polyfillObject);
    this.rotation = {};
    this.deltaRotation = {};
    this.savedPose = null;
    this.setupMouseControls();
    this.bindMethods();

    // Call enter VR handler if the scene has entered VR before the event listeners attached.
    if (this.el.sceneEl.is('vr-mode')) { this.onEnterVR(); }
  },

  update: function (oldData) {
    var data = this.data;

    // Update height offset.
    this.addHeightOffset(oldData.userHeight);

    // Disable grab cursor classes if no longer enabled.
    if (data.enabled !== oldData.enabled) {
      this.updateGrabCursor(data.enabled);
    }

    // Reset pitch and yaw if disabling HMD.
    if (oldData && !data.hmdEnabled && !oldData.hmdEnabled) {
      this.pitchObject.rotation.set(0, 0, 0);
      this.yawObject.rotation.set(0, 0, 0);
    }
  },

  tick: function (t) {
    var data = this.data;
    if (!data.enabled) { return; }
    this.updatePosition();
    this.updateOrientation();
  },

  play: function () {
    this.addEventListeners();
  },

  pause: function () {
    this.removeEventListeners();
  },

  remove: function () {
    this.removeEventListeners();
  },

  bindMethods: function () {
    this.onMouseDown = bind(this.onMouseDown, this);
    this.onMouseMove = bind(this.onMouseMove, this);
    this.onMouseUp = bind(this.onMouseUp, this);
    this.onTouchStart = bind(this.onTouchStart, this);
    this.onTouchMove = bind(this.onTouchMove, this);
    this.onTouchEnd = bind(this.onTouchEnd, this);
    this.onEnterVR = bind(this.onEnterVR, this);
    this.onExitVR = bind(this.onExitVR, this);
  },

 /**
  * Set up states and Object3Ds needed to store rotation data.
  */
  setupMouseControls: function () {
    this.mouseDown = false;
    this.pitchObject = new THREE.Object3D();
    this.yawObject = new THREE.Object3D();
    this.yawObject.position.y = 10;
    this.yawObject.add(this.pitchObject);
  },

  /**
   * Add mouse and touch event listeners to canvas.
   */
  addEventListeners: function () {
    var sceneEl = this.el.sceneEl;
    var canvasEl = sceneEl.canvas;

    // Wait for canvas to load.
    if (!canvasEl) {
      sceneEl.addEventListener('render-target-loaded', bind(this.addEventListeners, this));
      return;
    }

    // Mouse events.
    canvasEl.addEventListener('mousedown', this.onMouseDown, false);
    window.addEventListener('mousemove', this.onMouseMove, false);
    window.addEventListener('mouseup', this.onMouseUp, false);

    // Touch events.
    canvasEl.addEventListener('touchstart', this.onTouchStart);
    window.addEventListener('touchmove', this.onTouchMove);
    window.addEventListener('touchend', this.onTouchEnd);

    // sceneEl events.
    sceneEl.addEventListener('enter-vr', this.onEnterVR);
    sceneEl.addEventListener('exit-vr', this.onExitVR);
  },

  /**
   * Remove mouse and touch event listeners from canvas.
   */
  removeEventListeners: function () {
    var sceneEl = this.el.sceneEl;
    var canvasEl = sceneEl && sceneEl.canvas;

    if (!canvasEl) { return; }

    // Mouse events.
    canvasEl.removeEventListener('mousedown', this.onMouseDown);
    canvasEl.removeEventListener('mousemove', this.onMouseMove);
    canvasEl.removeEventListener('mouseup', this.onMouseUp);
    canvasEl.removeEventListener('mouseout', this.onMouseUp);

    // Touch events.
    canvasEl.removeEventListener('touchstart', this.onTouchStart);
    canvasEl.removeEventListener('touchmove', this.onTouchMove);
    canvasEl.removeEventListener('touchend', this.onTouchEnd);

    // sceneEl events.
    sceneEl.removeEventListener('enter-vr', this.onEnterVR);
    sceneEl.removeEventListener('exit-vr', this.onExitVR);
  },

  /**
   * Update orientation for mobile, mouse drag, and headset.
   * Mouse-drag only enabled if HMD is not active.
   */
  updateOrientation: function () {
    var hmdEuler = this.hmdEuler;
    var pitchObject = this.pitchObject;
    var yawObject = this.yawObject;
    var sceneEl = this.el.sceneEl;
    var rotation = this.rotation;

    // In VR mode, THREE is in charge of updating the camera rotation.
    if (sceneEl.is('vr-mode') && sceneEl.checkHeadsetConnected()) { return; }

    // Calculate polyfilled HMD quaternion.
    this.polyfillControls.update();
    hmdEuler.setFromQuaternion(this.polyfillObject.quaternion, 'YXZ');
    // On mobile, do camera rotation with touch events and sensors.
    rotation.x = radToDeg(hmdEuler.x) + radToDeg(pitchObject.rotation.x);
    rotation.y = radToDeg(hmdEuler.y) + radToDeg(yawObject.rotation.y);
    rotation.z = 0;

    this.el.setAttribute('rotation', rotation);
  },

  /**
   * Handle positional tracking.
   */
  updatePosition: function () {
    var el = this.el;
    var currentHMDPosition;
    var currentPosition;
    var position = this.position;
    var previousHMDPosition = this.previousHMDPosition;
    var sceneEl = this.el.sceneEl;

    if (!sceneEl.is('vr-mode') || !sceneEl.checkHeadsetConnected()) { return; }

    // Calculate change in position.
    currentHMDPosition = this.calculateHMDPosition();
    currentPosition = el.getAttribute('position');

    position.copy(currentPosition).sub(previousHMDPosition).add(currentHMDPosition);
    el.setAttribute('position', position);
    previousHMDPosition.copy(currentHMDPosition);
  },

  calculateHMDPosition: (function () {
    var position = new THREE.Vector3();
    return function () {
      var object3D = this.el.object3D;
      object3D.updateMatrix();
      position.setFromMatrixPosition(object3D.matrix);
      return position;
    };
  })(),

  /**
   * Calculate delta rotation for mouse-drag and touch-drag.
   */
  calculateDeltaRotation: function () {
    var currentRotationX = radToDeg(this.pitchObject.rotation.x);
    var currentRotationY = radToDeg(this.yawObject.rotation.y);
    this.deltaRotation.x = currentRotationX - (this.previousRotationX || 0);
    this.deltaRotation.y = currentRotationY - (this.previousRotationY || 0);
    // Store current rotation for next tick.
    this.previousRotationX = currentRotationX;
    this.previousRotationY = currentRotationY;
    return this.deltaRotation;
  },

  /**
   * Translate mouse drag into rotation.
   *
   * Dragging up and down rotates the camera around the X-axis (yaw).
   * Dragging left and right rotates the camera around the Y-axis (pitch).
   */
  onMouseMove: function (event) {
    var pitchObject = this.pitchObject;
    var yawObject = this.yawObject;
    var previousMouseEvent = this.previousMouseEvent;
    var movementX;
    var movementY;

    // Not dragging or not enabled.
    if (!this.mouseDown || !this.data.enabled) { return; }

     // Calculate delta.
    movementX = event.movementX || event.mozMovementX;
    movementY = event.movementY || event.mozMovementY;
    if (movementX === undefined || movementY === undefined) {
      movementX = event.screenX - previousMouseEvent.screenX;
      movementY = event.screenY - previousMouseEvent.screenY;
    }
    this.previousMouseEvent = event;

    // Calculate rotation.
    yawObject.rotation.y -= movementX * 0.005;
    pitchObject.rotation.x -= movementY * 0.005;
    pitchObject.rotation.x = Math.max(-PI_2, Math.min(PI_2, pitchObject.rotation.x));
  },

  /**
   * Register mouse down to detect mouse drag.
   */
  onMouseDown: function (evt) {
    if (!this.data.enabled) { return; }
    // Handle only primary button.
    if (evt.button !== 0) { return; }
    this.mouseDown = !this.mouseDown;
    if (this.mouseDown) {
      this.el.sceneEl.canvas.style.cursor = 'none'
    }
    else {
      this.el.sceneEl.canvas.style.cursor = 'crosshair'
    }
    this.previousMouseEvent = evt;
    document.body.classList.add(GRABBING_CLASS);
  },

  /**
   * Register mouse up to detect release of mouse drag.
   */
  onMouseUp: function () {
    //this.mouseDown = false;
    document.body.classList.remove(GRABBING_CLASS);
  },

  /**
   * Register touch down to detect touch drag.
   */
  onTouchStart: function (evt) {
    if (evt.touches.length !== 1 || !this.data.touchEnabled) { return; }
    this.touchStart = {
      x: evt.touches[0].pageX,
      y: evt.touches[0].pageY
    };
    this.touchStarted = true;
  },

  /**
   * Translate touch move to Y-axis rotation.
   */
  onTouchMove: function (evt) {
    var canvas = this.el.sceneEl.canvas;
    var deltaX;
    var deltaY;
    var yawObject = this.yawObject;
    var pitchObject = this.pitchObject;

    if (!this.touchStarted || !this.data.touchEnabled) { return; }

    deltaX = 2 * Math.PI * (evt.touches[0].pageY - this.touchStart.y) / canvas.clientHeight;
    deltaY = 2 * Math.PI * (evt.touches[0].pageX - this.touchStart.x) / canvas.clientWidth;

    // Limit touch orientaion to to yaw (y axis).
    pitchObject.rotation.x -= deltaX * 0.5;
    yawObject.rotation.y -= deltaY * 2.0;
    this.touchStart = {
      x: evt.touches[0].pageX,
      y: evt.touches[0].pageY
    };
  },

  /**
   * Register touch end to detect release of touch drag.
   */
  onTouchEnd: function () {
    this.touchStarted = false;
  },

  /**
   * Save pose.
   */
  onEnterVR: function () {
    this.saveCameraPose();
    this.removeHeightOffset();
  },

  /**
   * Restore the pose.
   */
  onExitVR: function () {
    this.restoreCameraPose();
    this.previousHMDPosition.set(0, 0, 0);
  },

  /**
   * Toggle the feature of showing/hiding the grab cursor.
   */
  updateGrabCursor: function (enabled) {
    var sceneEl = this.el.sceneEl;

    function enableGrabCursor () { sceneEl.canvas.style.cursor = 'crosshair' }
    function disableGrabCursor () { sceneEl.canvas.style.cursor = 'crosshair' }

    if (!sceneEl.canvas) {
      if (enabled) {
        sceneEl.addEventListener('render-target-loaded', enableGrabCursor);
      } else {
        sceneEl.addEventListener('render-target-loaded', disableGrabCursor);
      }
      return;
    }

    if (enabled) {
      enableGrabCursor();
      return;
    }
    disableGrabCursor();
  },

  /**
   * Offsets the position of the camera to set a human scale perspective
   * This offset is not necessary when using a headset because the SDK
   * will return the real user's head height and position.
   */
  addHeightOffset: function (oldOffset) {
    var el = this.el;
    var currentPosition;
    var userHeightOffset = this.data.userHeight;

    oldOffset = oldOffset || 0;
    currentPosition = el.getAttribute('position') || {x: 0, y: 0, z: 0};
    el.setAttribute('position', {
      x: currentPosition.x,
      y: currentPosition.y - oldOffset + userHeightOffset,
      z: currentPosition.z
    });
  },

  /**
   * Remove the height offset (called when entering VR) since WebVR API gives absolute
   * position.
   */
  removeHeightOffset: function () {
    var currentPosition;
    var el = this.el;
    var hasPositionalTracking;
    var userHeightOffset = this.data.userHeight;

    // Remove the offset if there is positional tracking when entering VR.
    // Necessary for fullscreen mode with no headset.
    // Checking this.hasPositionalTracking to make the value injectable for unit tests.
    hasPositionalTracking = this.hasPositionalTracking !== undefined
      ? this.hasPositionalTracking
      : checkHasPositionalTracking();

    if (!userHeightOffset || !hasPositionalTracking) { return; }

    currentPosition = el.getAttribute('position') || {x: 0, y: 0, z: 0};
    el.setAttribute('position', {
      x: currentPosition.x,
      y: currentPosition.y - userHeightOffset,
      z: currentPosition.z
    });
  },

  /**
   * Save camera pose before entering VR to restore later if exiting.
   */
  saveCameraPose: function () {
    var el = this.el;
    var position = el.getAttribute('position');
    var rotation = el.getAttribute('rotation');
    var hasPositionalTracking = this.hasPositionalTracking !== undefined ? this.hasPositionalTracking : checkHasPositionalTracking();

    if (this.savedPose || !hasPositionalTracking) { return; }
    this.savedPose = {
      position: this.savedPosition.copy(position),
      rotation: this.savedRotation.copy(rotation)
    };
  },

  /**
   * Reset camera pose to before entering VR.
   */
  restoreCameraPose: function () {
    var el = this.el;
    var savedPose = this.savedPose;
    var hasPositionalTracking = this.hasPositionalTracking !== undefined ? this.hasPositionalTracking : checkHasPositionalTracking();

    if (!savedPose || !hasPositionalTracking) { return; }

    // Reset camera orientation.
    el.setAttribute('position', savedPose.position);
    el.setAttribute('rotation', savedPose.rotation);
    this.savedPose = null;
  }
});