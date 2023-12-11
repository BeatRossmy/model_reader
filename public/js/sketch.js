let grid;
let autoencoder = null;
var synth = new Synth(compressor);

let midi_inputs = [];
let midi_outputs = [];

let drum_map = [36,38,42,46,41,43,45,49];
let note_map = [64,67,71,74,76,79,83,86,88,91,95,98,100,103,107,110,112];

let bus_in = null;
let bus_out = null;

function custom_setup() {
  gui = document.createElement("div");
  gui.classList.add("gui");
  document.body.appendChild(gui);
  
  drop = new DropArea(100,200,function (d) {
    autoencoder = ModelReader.convert(d);
    console.log(autoencoder);
  });
  
  seq = new Step_Sequencer(400,200, function (e) {
    let marker = pad.get_marker(e.y);
    if (marker) {
      pad.set(marker.x,marker.y);
    }
  });
  
  pad = new XY_pad(200,200,predict);
  pad.marker_created = function (id) {seq.add_row();};
  
  matrix = new MatrixCtrl("400px","200px",16,8);
  //xy_pad = new PictSlider("200px","200px",() => {});
  
  // TOP
  midi_div = document.createElement("div");
  midi_div.classList.add("midi_div");
  top_container = document.createElement("div");
  top_container.classList.add("top");
  gui.appendChild(top_container);
  
  top_container.appendChild(midi_div);
  top_container.appendChild(drop.html);

  // MID
  mid_container = document.createElement("div");
  mid_container.classList.add("middle");
  gui.appendChild(mid_container);

  mid_container.appendChild(pad.pad);
  mid_container.appendChild(seq.container);
  //mid_container.appendChild(xy_pad.html());
  mid_container.appendChild(matrix.html());

  mod_ui = new Line_Module();

  mid_container.appendChild(mod_ui.html());
  
  // BOTTOM
  controls = document.createElement("div");
  controls.classList.add("bottom");
  gui.appendChild(controls);
  
  sound = new ToggleButton("synth","drums");
  controls.appendChild(sound.container);
  
  threshold = new VSlider("threshold",0.4);
  controls.appendChild(threshold.container);
  
  mute = new ToggleButton("mute","unmute");
  controls.appendChild(mute.container);
  
  clear = new Button("clear",function () {
    console.log("clear");
    //grid.reset();
  });
  controls.appendChild(clear.container);
  
  // CONNECT TO MIDI
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
      .then(function(midiAccess) {
        listInputsAndOutputs(midiAccess);
        bus_in = midiAccess.inputs.get(midi_inputs[0].id);
        bus_out = midiAccess.outputs.get(midi_outputs[0].id);
        console.log("connection established:",bus_in,bus_out);
      
        clock = new Clock(bus_in);
        clock.add_listener(new ClockListener(24, (t) => {
          t = t%mod_ui.size();
          mod_ui.highlight(t);
          let pos = mod_ui.get(t);
          predict(pos.x,pos.y);
        }));
        clock.add_listener(new ClockListener(6, (t) => {
          matrix.highlight_column((t+15)%16,false);
          matrix.highlight_column(t%16,true);
        }));
        clock.add_listener(new ClockListener(6,soundLoop));
        clock.add_listener(new ClockListener(1, (t) => {seq.set_playback(t);}));
        clock.add_listener(new ClockListener(24, (t) => {seq.read(t);}));
        

        add_midi_selector();
      })
      .catch(function(err) {
        console.error('MIDI access denied or error:', err);
      });
  }
  
  window.addEventListener("dragover",function(e){
    e.preventDefault();
  },false);
  window.addEventListener("drop",function(e){
    e.preventDefault();
  },false);
}

function add_midi_selector () {
  let midi_in_selector = document.createElement("select");
  midi_in_selector.classList.add("midi_selector");
  midi_in_selector.addEventListener("change",(e) => {
    let bus_name = midi_in_selector.value;
    navigator.requestMIDIAccess()
      .then(function(midiAccess) {
        let input = midi_inputs.filter((m) => m.name==bus_name);
        if (input.length>0) {
          bus_in = midiAccess.inputs.get(input[0].id);
          clock.set_bus(bus_in);
        }
      });
  });
  
  for (let input of midi_inputs) {
    let option = document.createElement("option");
    option.innerHTML = input.name;
    midi_in_selector.appendChild(option);
  }

  let midi_out_selector = document.createElement("select");
  midi_out_selector.classList.add("midi_selector");
  midi_out_selector.addEventListener("change",(e) => {
    let bus_name = midi_out_selector.value;
    navigator.requestMIDIAccess()
      .then(function(midiAccess) {
        let output = midi_outputs.filter((m) => m.name==bus_name);
        if (output.length>0) {
          bus_out = midiAccess.outputs.get(output[0].id);
        }
      });
  });
  
  for (let output of midi_outputs) {
    let option = document.createElement("option");
    option.innerHTML = output.name;
    midi_out_selector.appendChild(option);
  }

  let in_text = document.createElement("p");
  in_text.innerHTML = "input:";
  let out_text = document.createElement("p");
  out_text.innerHTML = "output:";

  midi_div.appendChild(in_text);
  midi_div.appendChild(midi_in_selector);
  midi_div.appendChild(out_text);
  midi_div.appendChild(midi_out_selector);
}

function listInputsAndOutputs(midiAccess) {
  for (const entry of midiAccess.inputs)
    midi_inputs.push(entry[1]);
  for (const entry of midiAccess.outputs)
    midi_outputs.push(entry[1]);
}

function sendMidi(bus,note,velocity,channel,length) {
  if (bus==null || bus==undefined) return;
  bus.send([0x90|(channel || 0), note, (velocity || 100)]);
  bus.send([0x80|(channel || 0), note, 0], window.performance.now() + (length || 100));
}

function predict (x,y) {
  if (autoencoder==null) return;
  let beat = autoencoder.predict([x,y])[0];
  beat = reshape(beat,autoencoder.model.width);
  //let thr = threshold.get();
  matrix.set(beat.reverse());
}

function soundLoop (st) {
  let thr = threshold.get();
  
  let y = st%matrix.cells[0].length;
  let states = matrix.get_column(y);
  let mapping = (sound.state==0) ? drum_map : note_map;
  states.reverse();
  if (mute.state==0) {
    for (let row in states) {
      let vel = states[row];
      if (vel>=thr)
        sendMidi(bus_out,mapping[row],Math.floor(map(vel,0,1,0,127)),0,100);
    }
  }
}

custom_setup();