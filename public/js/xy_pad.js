class Marker {
  constructor (x,y,r,id,parent) {
    this.circle = document.createElement("div");
    this.circle.classList.add("marker");
    
    this.label = document.createElement("p");
    this.label.classList.add("marker_label");
    this.id = id;
    this.label.innerHTML = id==undefined ? "" : id;
    
    this.circle.appendChild(this.label);
    
    this.r = r;
    this.circle.style.setProperty("height", r*2+"px");
    this.circle.style.setProperty("width", r*2+"px");
    this.set_position(x,y);
    
    this.circle.addEventListener("mousedown", () => {
      parent.selected_marker = parent.selected_marker || this;
    });
    this.circle.addEventListener("mouseup", () => {
      if (parent.selected_marker==this) parent.selected_marker = null;
    });
    this.circle.addEventListener("mouseover", () => {
      if (parent.selected_marker==null) parent.hovered_marker = this;
    });
    this.circle.addEventListener("mouseleave", () => {
      if (parent.hovered_marker==this) parent.hovered_marker = null;
    });
  }
  
  set_position (x,y) {
    this.x = x;
    this.y = y;
    this.circle.style.setProperty("left", this.x-this.r+"px");
    this.circle.style.setProperty("top", this.y-this.r+"px");
  }
}

class XY_pad {
  constructor (w,h,callback_function) {
    this.width = w;
    this.height = h;
    this.r = 12
    
    this.markers = [];
    
    this.marker_created = function (id) {
      console.log("a new marker was created",id);
    };
    
    this.selected_marker = null;
    this.hovered_marker = null;
    
    this.pad = document.createElement("div");
    this.pad.classList.add("pad");
    this.pad.style.setProperty("width", this.width+"px");
    this.pad.style.setProperty("height", this.height+"px");
    this.pad.style.setProperty("position", "relative");
    
    this.handle = new Marker (0.5*this.width, 0.5*this.height, 12, "", this);
    this.pad.appendChild(this.handle.circle);
    
    this.callback = callback_function || function (x,y) {console.log(x,y);};
    
    this.pad.addEventListener("dblclick", (e) => {
      let pos = this.get_position(e);
      let marker = new Marker(pos.x,pos.y,7.5,this.markers.length,this);
      this.pad.appendChild(marker.circle);
      this.markers.push(marker);
      this.marker_created(this.markers.length-1);
    });
    
    this.pad.addEventListener("mousemove", (e) => {
      if (this.selected_marker) {
        let pos = this.get_position(e);
        this.selected_marker.set_position(pos.x,pos.y);
        if (this.selected_marker==this.handle) this.callback(pos.x/pad.width,pos.y/pad.height);
      }
    });
    
  }
  
  set (x,y) {
    this.handle.set_position(x,y);
    this.callback(x/this.width,y/this.height);
  }
  
  get_position (mouse_event) {
    let x = (mouse_event.clientX-this.pad.getBoundingClientRect().x);
    let y = (mouse_event.clientY-this.pad.getBoundingClientRect().y);
    let position = {
      x: Math.max(this.r,Math.min(this.width-this.r,x)),
      y: Math.max(this.r,Math.min(this.height-this.r,y))
    };
    return position;
  }
  
  get_marker (id) {
    return this.markers[id];
  }
}