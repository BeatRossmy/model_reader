//const audioContext = new AudioContext();
// use audioCtx from drums.js

function midiToF (note) {
  let hz = (440 / 32) * Math.pow(2, ((note - 9) / 12));
  return hz;
}

class Voice {
  constructor (destination,n,a,r) {
    this.destination = destination;
    
    this.note = (n==undefined)?64:n;
    this.attack = (a==undefined)?0.001:a;
    this.release = (r==undefined)?0.2:r;
    
    this.vca = audioCtx.createGain();
    this.vca.connect(destination);
    this.vca.gain.value = 0;
    
    this.osc = audioCtx.createOscillator();
    this.osc.connect(this.vca);
    
    this.osc.start();
  }
  
  trigger (note) {
    note = (note==undefined)?this.note:note;
    let freq = midiToF(note);
    this.osc.frequency.value = freq;
    this.vca.gain.cancelScheduledValues(audioCtx.currentTime);
    this.vca.gain.setValueAtTime(0, audioCtx.currentTime);
    this.vca.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + this.attack);
    this.vca.gain.linearRampToValueAtTime(0, audioCtx.currentTime + this.attack + this.release);
    this.osc.stop(audioCtx.currentTime + this.attack + this.release);
  }
}

class Synth {
  constructor (destination) {
    this.destination = destination;
    
    this.voices = new Map();
  }
  
  trigger (note) {
    this.voices.set(note,new Voice(this.destination,note));
    this.voices.get(note).trigger();
  }
}