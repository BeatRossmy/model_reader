class ClockListener {
  constructor (d,func) {
    this.division = d;
    this.callback = func || function (pulses) {};
  }
}

class Clock {
  constructor (bus) {
    this.bus = bus;
    this.pulses = 0;
    this.ppqn = 24;
    this.listeners = [];

    let clock = this;
    this.callback = function (event) {
      const [statusByte, data1, data2] = event.data;
      if (statusByte === 0xFB || statusByte === 0xFA)
        clock.pulses = 0;
      if (statusByte === 0xF8)
        clock.tick();
    };
    
    this.set_bus(bus);
  }

  set_bus (bus) {
    if (bus!=undefined || bus!=null) {
      if (this.bus) this.bus.removeEventListener('midimessage', this.callback);
      this.bus = bus;
      this.bus.addEventListener('midimessage', this.callback);
    }
  }
  
  tick () {
    let p = this.pulses;
    this.listeners.forEach((l) => {
      let d = l.division; 
      if (p%d==0) l.callback(Math.floor(p/d));
    });
    this.pulses++;
  }
  
  add_listener (l) {
    this.listeners.push(l);
  }
}