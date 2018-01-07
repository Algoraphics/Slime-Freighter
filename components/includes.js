/* global AFRAME, Uint8Array */

// Single audio context.
var context;

/**
 * Audio visualizer system for A-Frame. Share AnalyserNodes between components that share the
 * the `src`.
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
 * Audio visualizer component for A-Frame using AnalyserNode.
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