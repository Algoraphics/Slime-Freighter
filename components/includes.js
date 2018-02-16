/* global AFRAME, Uint8Array, THREE*/

/* This file contains components that are mostly someone else's open source code, that I've
  decided to include for a small amount of fine-grained control. Changes *should* be listed
  as a comment at the beginning of each component.
*/

// Single audio context.
var context;

/**
 * Audio visualizer system for A-Frame. No changes. This is here in case I want to
   get creative with it in the future.
 */
AFRAME.registerSystem('audioanalyser', {
  init: function () {
    this.analysers = {};
  },

  getOrCreateAnalyser: function (data) {
    if (!context) { context = new AudioContext(); }
    var analysers = this.analysers;
    var analyser = context.createAnalyser();
    var audioEl = data.src;
    var src = audioEl.getAttribute('src');

    if (analysers[src]) { return analysers[src]; }

    var source = context.createMediaElementSource(audioEl)
    source.connect(analyser);
    analyser.connect(context.destination);
    analyser.smoothingTimeConstant = data.smoothingTimeConstant;
    analyser.fftSize = data.fftSize;

    // Store.
    analysers[src] = analyser;
    return analysers[src];
  }
});

/**
 * Audio visualizer component for A-Frame using AnalyserNode. No changes.
 */
AFRAME.registerComponent('audioanalyser', {
  schema: {
    enableBeatDetection: {default: true},
    enableLevels: {default: true},
    enableWaveform: {default: true},
    enableVolume: {default: true},
    fftSize: {default: 2048},
    smoothingTimeConstant: {default: 0.8},
    src: {type: 'selector'},
    unique: {default: false}
  },

  init: function () {
    this.analyser = null;
    this.levels = null;
    this.waveform = null;
    this.volume = 0;
  },

  update: function () {
    var data = this.data;
    var self = this;
    var system = this.system;

    if (!data.src) { return; }

    // Get or create AnalyserNode.
    if (data.unique) {
      init(system.createAnalyser(data));
    } else {
      init(system.getOrCreateAnalyser(data));
    }

    function init (analyser) {
      self.analyser = analyser;
      self.levels = new Uint8Array(self.analyser.frequencyBinCount);
      self.waveform = new Uint8Array(self.analyser.fftSize);
      self.el.emit('audioanalyser-ready', {analyser: analyser});
    }
  },

  /**
   * Update spectrum on each frame.
   */
  tick: function () {
    var data = this.data;
    if (!this.analyser) { return; }

    // Levels (frequency).
    if (data.enableLevels || data.enableVolume) {
      this.analyser.getByteFrequencyData(this.levels);
    }

    // Waveform.
    if (data.enableWaveform) {
      this.analyser.getByteTimeDomainData(this.waveform);
    }

    // Average volume.
    if (data.enableVolume || data.enableBeatDetection) {
      var sum = 0;
      for (var i = 0; i < this.levels.length; i++) {
        sum += this.levels[i];;
      }
      this.volume = sum / this.levels.length;
    }

    // Beat detection.
    if (data.enableBeatDetection) {
      var BEAT_DECAY_RATE = 0.99;
      var BEAT_HOLD = 60;
      var BEAT_MIN = 0.15;  // Volume less than this is no beat.

      var volume = this.volume;
      if (!this.beatCutOff) { this.beatCutOff = volume; }
      if (volume > this.beatCutOff && volume > BEAT_MIN) {
        console.log('[audioanalyser] Beat detected.');
        this.el.emit('audioanalyser-beat');
        this.beatCutOff = volume * 1.5;
        this.beatTime = 0;
      } else {
        if (this.beatTime <= BEAT_HOLD) {
          this.beatTime++;
        } else {
          this.beatCutOff *= BEAT_DECAY_RATE;
          this.beatCutOff = Math.max(this.beatCutOff, BEAT_MIN);
        }
      }
    }
  }
});

/* 
  Gpoly include component. No changes. This is here because it was
  actually the easiest installation method
*/
// see https://github.com/Utopiah/googlepoly-load-component for improvements
AFRAME.registerComponent('gpoly', {
  schema: {
    polyid: {default: '5vbJ5vildOq'},
    API_KEY: {default: ''}
  },
  init: function () {
    var id = this.data.polyid;
    var polyid = AFRAME.utils.getUrlParameter('polyid');
    if (polyid.length > 0) id = polyid;
    
    let API_KEY = this.data.API_KEY;
    let url = "https://poly.googleapis.com/v1/assets/"+id+"/?key="+API_KEY;
    let el = this.el;

    if (!API_KEY){
      console.log('Please fill in your API KEY, cf https://developers.google.com/poly/develop/web ')
      return;
    }
    
    fetch(url)
    .then(res => res.json())
    .then((out) => {
      var model = out.formats[0].root.url;
      var materials = out.formats[0].resources[0].url;
      // using ob+mtl since glTF format is not 2.0 
      el.setAttribute("obj-model", "obj", model );
      el.setAttribute("obj-model", "mtl", materials );
    })
    .catch(err => { throw err });
  }
});

/* 
  look-controls component, based on https://github.com/aframevr/aframe/blob/master/docs/components/look-controls.md.
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
    this.onKeyDown = bind(this.onKeyDown, this);
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
    this.mouseLocked = false;
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
    
    // Key events.
    window.addEventListener("keydown", this.onKeyDown, false);

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
    if (!this.mouseLocked || !this.data.enabled) { return; }

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
    // Lock mouse if unlocked and click is in lock area
    if (!this.mouseLocked) { // Needs to be able to read screen width: && event.screenX > 350 && event.screenX < 700 && event.screenY > 520 && event.screenY < 620) {
      this.mouseLocked = true;
      this.el.sceneEl.canvas.style.cursor = 'none'
      document.querySelector('#click-instruction').setAttribute('animation', "property: text.opacity; from: 1; to: 0; dur: 1000");
    }
    this.previousMouseEvent = evt;
    document.body.classList.add(GRABBING_CLASS);
  },

  /**
   * Register mouse up to detect release of mouse drag.
   */
  onMouseUp: function () {
    document.body.classList.remove(GRABBING_CLASS);
  },
  
  /**
   * Register key press to escape mouse lock
   */
  onKeyDown: function (evt) {
    if(evt.keyCode === 27) { // Escape key code
      this.mouseLocked = false;
      this.el.sceneEl.canvas.style.cursor = 'crosshair'
      document.querySelector('#click-instruction').setAttribute('animation', "property: text.opacity; from: 0; to: 1; dur: 1000");
    }
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

/*
  Layout component. Commented detachment listeners because firefox does not handle them well.
  Added building layout because, well, that's exactly what I needed for this project.
*/

AFRAME.registerComponent('layout', {
  schema: {
    angle: {type: 'number', default: false, min: 0, max: 360, if: {type: ['circle']}},
    columns: {default: 1, min: 0, if: {type: ['box']}},
    margin: {default: 1, min: 0, if: {type: ['box', 'line']}},
    marginColumn: {default: 1, min: 0, if: {type: ['box']}},
    marginRow: {default: 1, min: 0, if: {type: ['box']}},
    // Number is the width of individual elements. Will center x value to middle of group
    xcenter: {default: 0},
    clump: {default: 1},
    plane: {default: 'xy'},
    radius: {default: 1, min: 0, if: {type: ['circle', 'cube', 'dodecahedron', 'pyramid']}},
    reverse: {default: false},
    type: {default: 'line', oneOf: ['box', 'circle', 'cube', 'dodecahedron', 'line',
                                    'pyramid']},
    fill: {default: true, if: {type: ['circle']}}
  },

  /**
   * Store initial positions in case need to reset on component removal.
   */
  init: function () {
    var self = this;
    var el = this.el;

    this.children = el.getChildEntities();
    var childs = this.children.length;

    var flip = false;
    
    if (this.children.length < 5) { flip = true;}
    this.initialPositions = [];

    this.children.forEach(function getInitialPositions (childEl) {
      if (childEl.hasLoaded) { return _getPositions(); }
      childEl.addEventListener('loaded', _getPositions);
      function _getPositions () {
        var position = childEl.getAttribute('position');
        self.initialPositions.push([position.x, position.y, position.z]);
      }
    });

    /*el.addEventListener('child-attached', function (evt) {
      // Only update if direct child attached.
      console.log("child attached!");
      if (evt.detail.el.parentNode !== el) { return; }
      self.children.push(evt.detail.el);
      self.update();
    });

    el.addEventListener('child-detached', function (evt) {
      // Only update if direct child detached.
      console.log("child detached!");
      if (self.children.indexOf(evt.detail.el) === -1) { return; }
      self.children.splice(self.children.indexOf(evt.detail.el), 1);
      self.initialPositions.splice(self.children.indexOf(evt.detail.el), 1);
      self.update();
    });*/
  },

  /**
   * Update child entity positions.
   */
  update: function (oldData) {
    //console.log("update called!");
    var children = this.children;
    var data = this.data;
    var definedData;
    var el = this.el;
    var numChildren = children.length;
    var positionFn;
    var positions;
    
    // Calculate different positions based on layout shape.
    switch (data.type) {
      case 'box': {
        positionFn = getBoxPositions;
        break;
      }
      case 'circle': {
        positionFn = getCirclePositions;
        break;
      }
      case 'cube': {
        positionFn = getCubePositions;
        break;
      }
      case 'dodecahedron': {
        positionFn = getDodecahedronPositions;
        break;
      }
      case 'pyramid': {
        positionFn = getPyramidPositions;
        break;
      }
      case 'building': {
        positionFn = getBuildingPositions;
        break;
      }
      default: {
        // Line.
        positionFn = getLinePositions;
      }
    }

    definedData = el.getDOMAttribute('layout');
    positions = positionFn(
      data, numChildren,
      typeof definedData === 'string'
      ? definedData.indexOf('margin') !== -1
      : 'margin' in definedData
    );
    if (data.reverse) { positions.reverse(); }
    setPositions(children, positions);
  },

  /**
   * Reset positions.
   */
  remove: function () {
    this.el.removeEventListener('child-attached', this.childAttachedCallback);
    setPositions(this.children, this.initialPositions);
  }
});

/**
 * Get positions for `box` layout.
 */
function getBoxPositions (data, numChildren, marginDefined) {
  var marginColumn;
  var marginRow;
  var position;
  var positions = [];
  var rows = Math.ceil(numChildren / data.columns);

  marginColumn = data.marginColumn;
  marginRow = data.marginRow;
  if (marginDefined) {
    marginColumn = data.margin;
    marginRow = data.margin;
  }

  var center = 0;
  if (data.xcenter != 0) {
    var gapsize = data.marginColumn - data.xcenter;
    center = data.columns * data.marginColumn / 2 - gapsize;
  }

  for (var row = 0; row < rows; row++) {
    for (var column = 0; column < data.columns; column++) {
      position = [0, 0, 0];
      if (data.plane.indexOf('x') === 0) {
        position[0] = column * marginColumn - center;
      }
      if (data.plane.indexOf('y') === 0) {
        position[1] = column * marginColumn;
      }
      if (data.plane.indexOf('y') === 1) {
        position[1] = row * marginRow;
      }
      if (data.plane.indexOf('z') === 1) {
        position[2] = row * marginRow;
      }
      //console.log("x is " + position[0] + " and y is " + position[1]);
      for (var i = 0; i < data.clump; i++) {
        positions.push(position);
      }
    }
  }

  return positions;
}
//module.exports.getBoxPositions = getBoxPositions;

/**
 * Get positions for `circle` layout.
 */
function getCirclePositions (data, numChildren) {
  var positions = [];

  for (var i = 0; i < numChildren; i++) {
    var rad;

    if (isNaN(data.angle)) {
      rad = i * (2 * Math.PI) / numChildren;
    } else {
      rad = i * data.angle * 0.01745329252;  // Angle to radian.
    }

    //console.log("Rad is " + rad + ", angle is " + data.angle);
    var position = [];
    if (data.plane.indexOf('x') === 0) {
      position[0] = data.radius * Math.cos(rad);
    }
    if (data.plane.indexOf('y') === 0) {
      position[1] = data.radius * Math.cos(rad);
    }
    if (data.plane.indexOf('y') === 1) {
      position[1] = data.radius * Math.sin(rad);
    }
    if (data.plane.indexOf('z') === 1) {
      position[2] = data.radius * Math.sin(rad);
    }
    positions.push(position);
  }
  return positions;
}
//module.exports.getCirclePositions = getCirclePositions;

/**
 * Get positions for `line` layout.
 * TODO: 3D margins.
 */
function getLinePositions (data, numChildren) {
  data.columns = numChildren;
  return getBoxPositions(data, numChildren, true);
}
//module.exports.getLinePositions = getLinePositions;

/**
 * Get positions for `cube` layout.
 */
function getCubePositions (data, numChildren) {
  return transform([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
    [-1, 0, 0],
    [0, -1, 0],
    [0, 0, -1],
  ], data.radius / 2);
}
//module.exports.getCubePositions = getCubePositions;

/**
 * Get positions for `dodecahedron` layout.
 */
function getDodecahedronPositions (data, numChildren) {
  var PHI = (1 + Math.sqrt(5)) / 2;
  var B = 1 / PHI;
  var C = 2 - PHI;
  var NB = -1 * B;
  var NC = -1 * C;

  return transform([
    [-1, C, 0],
    [-1, NC, 0],
    [0, -1, C],
    [0, -1, NC],
    [0, 1, C],
    [0, 1, NC],
    [1, C, 0],
    [1, NC, 0],
    [B, B, B],
    [B, B, NB],
    [B, NB, B],
    [B, NB, NB],
    [C, 0, 1],
    [C, 0, -1],
    [NB, B, B],
    [NB, B, NB],
    [NB, NB, B],
    [NB, NB, NB],
    [NC, 0, 1],
    [NC, 0, -1],
  ], data.radius / 2);
}
//module.exports.getDodecahedronPositions = getDodecahedronPositions;

/**
 * Get positions for `pyramid` layout.
 */
function getPyramidPositions (data, numChildren) {
  var SQRT_3 = Math.sqrt(3);
  var NEG_SQRT_1_3 = -1 / Math.sqrt(3);
  var DBL_SQRT_2_3 = 2 * Math.sqrt(2 / 3);

  return transform([
    [0, 0, SQRT_3 + NEG_SQRT_1_3],
    [-1, 0, NEG_SQRT_1_3],
    [1, 0, NEG_SQRT_1_3],
    [0, DBL_SQRT_2_3, 0]
  ], data.radius / 2);
}
//module.exports.getPyramidPositions = getPyramidPositions;

/**
 * Multiply all coordinates by a scale factor and add translate.
 *
 * @params {array} positions - Array of coordinates in array form.
 * @returns {array} positions
 */
function transform (positions, scale) {
  return positions.map(function (position) {
    return position.map(function (point, i) {
      return point * scale;
    });
  });
};

function getBuildingPositions (data, numChildren, marginDefined) {
  var margin = 1;
  if (marginDefined) {
    margin = data.margin;
  }
  return transform([
    [-6, -10, 10],
    [10, -10, 6],
    [6, -10, -10],
    [-10, -10, -6],
    [0, -1, 0],
    [0, 0, -1],
  ], data.radius / 2);
}
/**
 * Set position on child entities.
 *
 * @param {array} els - Child entities to set.
 * @param {array} positions - Array of coordinates.
 */
function setPositions (els, positions) {
  els.forEach(function (el, i) {
    var position = positions[i];
    el.setAttribute('position', {
      x: position[0],
      y: position[1],
      z: position[2]
    });
  });
}