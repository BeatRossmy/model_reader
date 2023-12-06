class UI_Element {
  constructor (cw,ch,class_names,callback,parent_node) {
    this.container = document.createElement("div");
    for (let class_name of class_names)
      this.container.classList.add(class_name);
    /*this.width = cw || "auto";
    this.height = ch || "auto";
    if (cw) this.container.style.width = cw+"px";
    if (ch) this.container.style.height = ch+"px";*/
    this.container.style.width = cw || "auto";
    this.container.style.height = ch || "auto";
    //this.width = this.container.offsetWidth;
    //this.height = this.container.offsetHeight;
    this.callback = callback || function () {};

    if (parent_node) parent_node.appendChild(this.html());
  }
  html () {
    return this.container;
  }
  width () {
    return this.container.offsetWidth;
  }
  height () {
    return this.container.offsetHeight;
  }
  abs_x () {
    return this.container.offsetLeft;
  }
  abs_y () {
    return this.container.offsetTop;
  }
}

class MatrixCell extends UI_Element {
  constructor (x,y,s,callback) {
    super(null,null,["matrix_cell"],callback);
    this.x = x;
    this.y = y;
    this.range = 2;
    this.state = s || 0;
    
    this.container.style.gridColumn = (x+1) + "";
    this.container.style.gridRow = (y+1) + "";
    this.container.style.setProperty("--state","0%");
    
    this.container.addEventListener("mousedown", (e) => {
      this.container.classList.add("selected");
    });
    
    this.container.addEventListener("mouseleave", (e) => {
      this.container.classList.remove("selected");
    });
    
    this.container.addEventListener("mouseup", (e) => {
      if (this.container.classList.contains("selected"))
        this.set_state(this.invert(this.state),true);
      this.container.classList.remove("selected");
    });
  }
  
  highlight (h) {
    if (h) this.container.classList.add("highlighted");
    else this.container.classList.remove("highlighted");
  }
  
  invert (s) {
    return s<=(this.range-1)/2 ? (this.range-1) : 0;
  }
  
  set_state (s,activate_callback) {
    this.state = s;
    this.container.style.setProperty("--state",(this.state/(this.range-1)*100)+"%");
    if (activate_callback)
      this.callback(this.x,this.y,this.state);
  }
  
  get () {
    return this.state;
  }
}

class MatrixCtrl extends UI_Element {
  constructor (cw,ch,w,h,callback) {
    super(cw,ch,["matrix"], callback || ((x,y,z) => {console.log("matrix",x,y,z)}));
    let container = this.container;
    this.cells = [...Array(h)].map((_,y) => Array.from(Array(w), (_,x) => {
      let m = new MatrixCell(x,y,false, this.callback);
      container.appendChild(m.html());
      return m;
    }));
  }
  
  get (x,y) {
    this.cells[y][x].state;
  }
  
  get_column (x) {
    return this.cells.map(e => e[x].state);
  }
  
  get_row (y) {
    return this.cells[y].map(e => e.state);
  }
  
  set (arr) {
    for (let y in arr) {
      for (let x in arr[y]) {
        if (x<this.width && x>=0 && y<this.height && y>=0)
          this.cells[y][x].set_state(arr[y][x],false);
      }
    }
  }
  
  highlight_column (x,state) {
    this.cells.forEach((e,y) => {e[x].highlight(state)});
  }
}

class Node extends UI_Element {
  constructor (x,y,cw,ch,parent_element,callback,dynamic) {
    let classes = ["node"];
    if (dynamic) classes.push("grabbable");
    super(cw,ch,classes,callback,parent_element.html());
    this.held = false;
    this.hover = false;
    this.dynamic = (dynamic==undefined) ? false : dynamic;

    let self = this;

    this.container.addEventListener("mousedown",() => {
      self.held = true;
    });
    this.container.addEventListener("mouseup",() => {
      self.held = false;
    });
    this.container.addEventListener("mousemove",(e) => {
      if (self.held && self.dynamic) self.callback(e);
      self.hover = true;
    });
    this.container.addEventListener("mouseleave",(e) => {
      if (self.held && self.dynamic) self.callback(e);
      self.hover = false;
    });

    this.set_position(x,y);
  }

  set_position (x,y) {
    let parent = this.container.parentNode;
    let w = parent.offsetWidth;
    let h = parent.offsetHeight;
    let r = this.width()/2;
    x = constrain(x-r,0,w-2*r);
    y = constrain(y-r,0,h-2*r);
    this.container.style.left = x + "px";
    this.container.style.top = y + "px";
  }

  get_relative () {
    let x = parseInt(this.container.style.left.replace("px"));
    let y = parseInt(this.container.style.top.replace("px"));
    let d = this.width();
    let w = parent.offsetWidth;
    let h = parent.offsetHeight;
    return {
      x: map (x,0,w-d,0,1),
      y: map (y,0,h-d,0,1)
    };
  }
}

class PictSlider extends UI_Element {
  constructor (cw,ch,callback) {
    super(cw,ch,["pict_slider"],callback);
    
    this.x = 0.5;
    this.y = 0.5;
    
    this.handle_node = new Node(0.5,0.5,"1.5em","1.5em",this,null,true);

    this.nodes = [];
    
    //this.container.appendChild(this.handle_node.html());
    
    let self = this;

    let on_mouse = function (e) {
      console.log(e);
      let pos = self.position(e);
      self.handle_node.set_position(pos.x,pos.y);
      let rel = self.handle_node.get_relative();
      self.callback(rel.x,rel.y);
      self.handle_node.held = true;
    }

    this.handle_node.callback = on_mouse;
    
    this.container.addEventListener("mousedown", (e) => {
      on_mouse(e);
    },false);

    this.container.addEventListener("dblclick", (e) => {
      console.log("dbl");
      let pos = self.position(e);
      let n = new Node(pos.x,pos.y,"0.75em","0.75em",self,null,true);
      self.container.appendChild(n.html());
    },false);
    this.container.addEventListener("mouseleave", (e) => {
      self.handle_node.held = false;
    },false);
  }

  position (e) {
    let x = (e.pageX - this.abs_x());
    let y = (e.pageY - this.abs_y());
    return {x:x, y:y};
  }
  
  set (x,y) {
    this.x = constrain(x,0,1);
    this.y = constrain(y,0,1);
    this.callback(x,y);
  }

  set_node (node,page_x,page_y) {
    let r = node.width()/2;
    let x = page_x - this.container.offsetLeft - r;
    let y = page_y - this.container.offsetTop - r;
    x = constrain(x,0,this.width()-2*r);
    y = constrain(y,0,this.height()-2*r);

    let container = node.html();
    container.style.left = x+"px";
    container.style.top = y+"px";
  }
}



