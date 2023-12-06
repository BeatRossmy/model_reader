function createClassElement (type,class_name,inner) {
  let el = document.createElement(type);
  el.classList.add(class_name);
  if (inner!=undefined) el.innerHTML = inner;
  return el;
}

class MouseObserver {
  constructor (ondown,onup,onmove) {
    this.container = document.createElement("div");
    this.container.classList.add("mouse_observer");
    
    this.ondown = ondown || function(){};
    this.onup = onup || function(){};
    this.onmove = onmove || function(){};
    
    this.container.addEventListener("mousedown",(e) => {
      let coo = this.local_coordinates(e);
      this.ondown(coo[0],coo[1]);
    });
    this.container.addEventListener("mouseup",(e) => {
      let coo = this.local_coordinates(e);
      this.onup(coo[0],coo[1]);
    });
    this.container.addEventListener("mousemove",(e) => {
      let coo = this.local_coordinates(e);
      this.onmove(coo[0],coo[1]);
    });
  }
  
  local_coordinates (e) {
    return [e.offsetX,e.offsetY];
  }
}

class Seq_Event {
  constructor (x,y,l,p) {
    this.x = x;
    this.y = y;
    this.length = l;
    this.parent = p;
    this.html = createClassElement("div","seq_event");
    this.handle = createClassElement("div","seq_event_handle");
    this.html.appendChild(this.handle);
    
    this.handle.addEventListener("mousedown",()=>{
      this.parent.selected_handle = this;
      console.log("handle",this);
    });
    this.handle.addEventListener("mouseup",()=>{
      this.parent.unselect();
    });
    
    this.update_html();
  }
  
  overlapping (n) {
    return (n!=this) && (n.y==this.y) && ((n.x>=this.x && n.x<this.x+this.length) || (this.x>=n.x && this.x<n.x+n.length));
  }
  
  is_within (x,y) {
    return x>=this.x && x<this.x+this.length && y==this.y;
  }
  
  set_length (l) {
    this.length = l;
    this.update_html();
  }
  
  update_html () {
    this.html.style.setProperty("grid-column",(this.x+1) + " / span "+this.length);
    this.html.style.setProperty("grid-row",""+(this.y+1));
  }
  
  remove_html () {
    //this.html.removeEventListener("mousedown",this.select);
    //this.html.removeEventListener("mouseup",this.remove);
    this.parent.event_grid.removeChild(this.html);
  }
}



class Step_Sequencer {
  constructor (w,h,callback) {
    this.width = w;
    this.height = h;
    
    this.rows = 0;
    this.columns = 16;
    
    this.label_list = [];
    
    this.events = [];
    this.event_callback = callback || function () {};
    
    this.playback_position = 0;
    
    this.selected_event = null;
    this.selected_handle = null;
    this.edited = false;
    
    this.container = createClassElement("div","seq_container");
    
    this.grid_layer = createClassElement("div","seq_grid_raster");
    
    this.labels = createClassElement("div","seq_labels");
    
    this.grid_container = createClassElement("div","seq_grid_container");
    
    this.event_grid = createClassElement("div","seq_grid_raster");
    
    this.cursor = createClassElement("div","seq_cursor");
    
    this.observer = new MouseObserver(
      // MOUSE DOWN
      (x,y) => {
        if (this.rows==0) return;
        let coo = this.seq_coordinates(x,y);
        x = coo[0];
        y = coo[1];
        
        let target = new Seq_Event(x,y,1,this); 
        
        this.selected_event = this.events.find((e) => e.overlapping(target));
        this.select_event(this.selected_event);
      },
      // MOUSE UP
      (x,y) => {
        if (this.rows==0) return;
        let coo = this.seq_coordinates(x,y);
        x = coo[0];
        y = coo[1];
        
        let new_event = null;
        let target = new Seq_Event(x,y,1,this);
        let blocking_event = this.events.find((e) => e.overlapping(target));
        
        if (blocking_event==undefined && !this.edited) {
          new_event = target;
          this.events.push(new_event);
          this.event_grid.appendChild(new_event.html);
        }
        
        if (this.selected_event && !this.edited) {
          let index = this.events.indexOf(this.selected_event);
          this.events.splice(index,1);
          this.selected_event.remove_html();
        }
        
        this.unselect();
        this.clear_overlapping_events(new_event);
      },
      // DRAG
      (x,y) => {
        if (this.rows==0) return;
        let coo = this.seq_coordinates(x,y);
        x = coo[0];
        y = coo[1];
        
        if (this.selected_handle!=null) {
          let delta = Math.max(1,x-this.selected_handle.x+1);
          this.selected_handle.set_length(delta);
          this.edited = true;
          this.clear_overlapping_events(this.selected_handle);
        }
        if (this.selected_event!=null) {
          let delta = Math.max(1,x-this.selected_event.x+1);
          this.edited = true;
          this.clear_overlapping_events(this.selected_event);
        }
      }
    );
    
    this.grid_container.style.setProperty("width",w+"px");
    this.grid_container.style.setProperty("height",h+"px");
    
    this.grid_container.appendChild(this.grid_layer);
    this.grid_container.appendChild(this.event_grid);
    this.grid_container.appendChild(this.cursor);
    this.grid_container.appendChild(this.observer.container);
    
    this.container.appendChild(this.labels);
    this.container.appendChild(this.grid_container);
    
    this.update_grid();
  }
  
  update_grid () {
    /*this.event_grid.style.setProperty("grid-template-rows","repeat("+this.rows+",1fr)");
    this.event_grid.style.setProperty("grid-template-columns","repeat("+this.columns+",1fr)");
    
    this.grid_layer.style.setProperty("grid-template-rows","repeat("+this.rows+",1fr)");
    this.grid_layer.style.setProperty("grid-template-columns","repeat("+this.columns+",1fr)");*/
    
    this.container.style.setProperty("--columns",this.columns);
    this.container.style.setProperty("--rows",this.rows);
    
    let a = this.columns*this.rows;
    while (this.grid_layer.children.length>a) {
      this.grid_layer.removeChild(this.grid_layer.lastChild);
    }
    while (this.grid_layer.children.length<a) {
      this.grid_layer.appendChild(document.createElement("div"));
    }
  }
  
  select_event (n) {
    if (n==null || n==undefined) return;
    if (this.selected_event!=null) this.selected_event.html.classList.remove("selected");
    this.selected_event = n;
    this.selected_event.html.classList.add("selected");
    this.edited = false;
  }
  
  unselect () {
    if (this.selected_event!=null) this.selected_event.html.classList.remove("selected");
    this.selected_event = null;
    this.edited = false;
    this.selected_handle = null;
  }
  
  clear_overlapping_events (n) {
    if (n==null || n==undefined) return;
    
    let overlaps = this.events.filter((e) => n.overlapping(e));
    for (let o of overlaps) this.remove_event(o);
  }
  
  remove_event (n) {
    let i = this.events.indexOf(n);
    this.events[i].remove_html();
    this.events.splice(i,1);
  }
  
  seq_coordinates (x,y) {
    x = Math.floor(x/(this.width/this.columns));
    y = Math.floor(y/(this.height/this.rows));
    return [x,y];
  }
  
  add_row () {
    this.rows = this.rows+1;
    this.update_grid();
    
    this.label_list.push("...");
    let label = createClassElement("p","seq_label",""+this.label_list.length-1);
    
    this.labels.appendChild(label);
  }
  
  remove_row (id) {
    id = id || (this.rows-1);
    let to_be_removed = this.events.filter((e) => e.y==id);
    for (let n of to_be_removed) this.remove_event(n);
    this.events.forEach((e) => {
      e.y = (e.y<id)? e.y : (e.y-1);
      e.update_html();
    });
    this.rows = this.rows-1;
    this.update_grid();
  }
  
  set_playback (t) {
    this.cursor.style.left = ((t/(24*4*4)%1.0)*100)+"%";
  }
  
  read (t) {
    t = t%this.columns;
    let current_events = this.events.filter((e) => e.x==t);
    for (let e of current_events) this.event_callback(e);
  }
}