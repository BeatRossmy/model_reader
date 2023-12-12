class UI_Module {
    constructor (w,h,class_list,element_type) {
        this.width = w;
        this.height = h;

        this.selected = false;

        element_type = element_type || "div";

        if (element_type=="svg")
            this.html_element = document.createElementNS("http://www.w3.org/2000/svg",element_type);
        else
            this.html_element = document.createElement(element_type);

        for (let class_name of class_list) this.html_element.classList.add(class_name);

        this.html_element.style.width = this.width;
        this.html_element.style.height = this.width;

        let self = this;
        this.on_event = [];
        this.on_event ["click"] = (e) => {};
        this.on_event ["dblclick"] = (e) => {};
        this.on_event ["mousedown"] = (e) => {};
        this.on_event ["mouseup"] = (e) => {};
        for (let event_type in this.on_event) {
            this.html().addEventListener(event_type,(e) => {
                if (e.srcElement==self.html()) {
                    if (e.type=="mousedown") self.select();
                    if (e.type=="mouseup") self.unselect();
                    self.on_event[event_type](e);
                }
            });
        }
    }

    html () {
        return this.html_element;
    }

    select () {
        this.selected = true;
        this.html_element.classList.add("selected");
    }

    unselect () {
        this.selected = false;
        this.html_element.classList.remove("selected");
    }

    get_bounding_box () {
        return this.html_element.getBoundingClientRect();
    }
}

class UI_Container extends UI_Module {
    constructor () {
        super("200px","200px",["ui_container"]);
        
        this.html_element.style.backgroundColor = "red";

        this.children = [];

        //this.add_layer(new Node_Layer([{x:0.5,y:0.5}],{"addable": true}));
        //this.add_layer(new SVG_Layer());
    }

    add_layer (layer) {
        this.html_element.appendChild(layer.html());
        this.children.push(layer);
    }

    html () {
        return this.html_element;
    }
}

class Node_Module extends UI_Module {
    constructor (x,y,parent) {
        super("1.5em","1.5em",["node"]);
        this.html_element.style.position = "absolute";

        this.x = x;
        this.y = y;
        
        let self = this;
        
        this.get_relative_position = (_x,_y) => {
            let parent_box = parent.get_bounding_box();
            let r = self.get_bounding_box().width/2;
            let x = map(_x, parent_box.left+r,parent_box.left+parent_box.width-r,0,1);
            let y = map(_y,parent_box.top+r,parent_box.top+parent_box.height-r,0,1);
            let rpx = r/parent_box.width;
            let rpy = r/parent_box.height;
            return {x:x, y:y, r:r, rpx:rpx, rpy:rpy};
        };

        this.on_event ["mousedown"] = () => {
            let onmove = (e) => {self.set_position_absolut(e.pageX,e.pageY);};
            document.addEventListener("mousemove",onmove);
            document.addEventListener("mouseup",()=>{
                document.removeEventListener("mousemove",onmove);
                self.unselect();
            },{once:true});
        };
    }

    set_position (x,y,rpx,rpy) {
        rpx = rpx || 0;
        rpy = rpy || 0;

        this.x = constrain(x,0,1);
        this.y = constrain(y,0,1);

        this.html_element.style.left = (map(this.x,0,1,0,1-2*rpx)*100)+"%";
        this.html_element.style.top = (map(this.y,0,1,0,1-2*rpy)*100)+"%";
    }

    set_position_absolut = function (pageX,pageY) {
        let rel_pos = this.get_relative_position(pageX,pageY);
        this.set_position(rel_pos.x,rel_pos.y,rel_pos.rpx,rel_pos.rpy);
    };

    update_position () {
        let rel_pos = this.get_relative_position(0,0);
        this.set_position(this.x,this.y,rel_pos.rpx,rel_pos.rpy);
    }
}

class Node_Layer extends UI_Module {
    constructor (nodes,props) {
        super("100%","100%",["node_layer"]);
        // PROPS
        this.addable = true;
        
        let self = this;
        this.on_event["dblclick"] = (e) => {
            if (self.addable) {
                let node = new Node_Module(0,0,self);
                self.nodes.push(node);
                self.html_element.appendChild(node.html());
                node.set_position_absolut(e.pageX,e.pageY);
            }
        };

        this.html_element.style.position = "relative";

        this.nodes = [];

        for (let node of nodes) {
            let n = new Node_Module(node.x,node.y,self);
            this.add_node(n);
        }
        
        // OVERWRITE PROPS
        if (props!=undefined && typeof props==="object") {
            for (let key in props) {
                if (this[key]!=undefined) this[key] = props[key];
            }
        } 
    }

    add_node (node) {
        this.nodes.push(node);
        this.html_element.appendChild(node.html());
        node.update_position();
    }

    html () {
        return this.html_element;
    }
}

class Point {
    constructor (x,y,id,parent,props) {
        this.x = x;
        this.y = y;
        this.id = id;
        this.html = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        this.update_html();

        this.on_move = () => {};
        this.on_dblclick = () => {};

        this.move = function (x,y,trigger_event) {
            this.x = x;
            this.y = y;
            this.update_html();
            if (trigger_event && this.draggable) {
                let box = parent.getBoundingClientRect();
                this.on_move(x/box.width,y/box.height); // <= CHANGE TO x 0-1
            }
        }

        // PROPS
        this.draggable = true;
        this.deletable = true;
        if (typeof props === "object") {
            for (const [key,value] of Object.entries(props)) {
                console.log(key,value);
                if (this[key]!=undefined) this[key] = value;
            }
        }

        // EVENTLISTENER
        let self = this;
        // MOVE
        if (this.draggable) {
            this.html.addEventListener("mousedown",()=>{
                let box = parent.getBoundingClientRect();
                let move = (e) => {
                    let x = (constrain(e.x,box.left,box.left+box.width)-box.left)/box.width;
                    let y = (constrain(e.y,box.top,box.top+box.height)-box.top)/box.height;
                    self.move(x,y,true);
                };
                document.addEventListener("mousemove",move);
                document.addEventListener("mouseup",()=>{document.removeEventListener("mousemove",move)},{once:true});
            });
            this.html.addEventListener("touchstart",()=>{
                let box = parent.getBoundingClientRect();
                let move = (e) => {
                    let touch = e.touches[0];
                    console.log(touch);
                    let x = (constrain(touch.clientX,box.left,box.left+box.width)-box.left)/box.width;
                    let y = (constrain(touch.clientY,box.top,box.top+box.height)-box.top)/box.height;
                    self.move(x,y,true);
                };
                document.addEventListener("touchmove",move);
                document.addEventListener("touchend",()=>{document.removeEventListener("touchmove",move)},{once:true});
            });
        }
        // DBLCLICK
        this.html.addEventListener("dblclick",()=>{
            if (self.deletable) self.on_dblclick(self.id);
        });

        parent.appendChild(this.html);
    }

    update_html = function () {
        this.html.setAttribute("cx",100*this.x+"%");
        this.html.setAttribute("cy",100*this.y+"%");
    }
}

class Line {
    constructor (point_a, point_b, props) {
        this.start = point_a;
        this.end = point_b;
        this.html = document.createElementNS("http://www.w3.org/2000/svg", "line");
        this.update_html();

        if (Array.isArray(props)) {
            for (let key in props)
                if (this[key]!=undefined) this[key] = props[key];
        }
    }

    update_html = function () {
        this.html.setAttribute("x1",100*this.start.x+"%");
        this.html.setAttribute("y1",100*this.start.y+"%");
        this.html.setAttribute("x2",100*this.end.x+"%");
        this.html.setAttribute("y2",100*this.end.y+"%");
    }
}

class SVG_Layer extends UI_Module {
    constructor () {
        super("100%","100%",["svg_layer"],"svg");
    }
}

class Poly_Line {
    constructor (svg) {
        this.parent = svg;
        this.points = [];
        this.lines = [];

        this.on_change = () => {};
    }

    add_point (x,y) {
        let self = this;
        let point = null;

        if (typeof x === "object") {
            console.log("is object",x);
            point = x;
        }
        else if (typeof x === "number" && typeof y === "number") {
            point = new Point(x,y,this.points.length,this.parent,{draggable: true, deletable: true});
        }
        else {
            return;
        }

        // ADD POINT
        point.on_move = (x,y) => {
            self.lines.forEach((l) => {
                if (l.start==point || l.end==point) l.update_html();
            });
            self.on_change();
        };
        point.on_dblclick = (id) => {self.remove_point(id);};
        this.points.push(point);
        this.parent.appendChild(point.html);

        // ADD LINE
        if (this.points.length>1) {
            let point_start = this.points[this.points.length-2];
            let point_end = this.points[this.points.length-1];
            
            let line = new Line(point_start, point_end);
            this.lines.push(line);
            this.parent.appendChild(line.html);
        }
    }

    remove_point (id) {
        let point = this.points[id];

        // REMOVE CONNECTED LINES
        let connected_lines = this.lines.filter((l) => (l.start==point || l.end==point));
        for (let line of connected_lines) this.parent.removeChild(line.html);
        this.lines = this.lines.filter((l) => !(l.start==point || l.end==point));

        // REMOVE POINT
        this.parent.removeChild(point.html);
        this.points.splice(id,1);
        this.points.forEach((point,index) => {point.id = index;});

        // NEW LINE
        let point_new_start = this.points[id-1];
        let point_new_end = this.points[id];
        if (point_new_start!=undefined && point_new_end!=undefined) {
            let line = new Line(point_new_start,point_new_end)
            this.lines.push(line);
            this.parent.appendChild(line.html);
        }
    }
}

class Line_Module extends UI_Container {
    constructor () {
        super();
        //this.add_layer(new SVG_Layer());

        this.layer = new SVG_Layer();
        let svg = this.layer.html();
        this.html_element.appendChild(svg);

        this.line = new Poly_Line(svg);

        this.layer.on_event["dblclick"] = (e) => {
            let box = this.html_element.getBoundingClientRect()
            let x = e.offsetX/box.width;
            let y = e.offsetY/box.height;
            //this.line.add_point(e.offsetX,e.offsetY);
            console.log(x,y);
            this.line.add_point(x,y);
        };
    }

    size () {
        return this.line.points.length;
    }

    highlight (id) {
        this.line.points.forEach((p) => {
            p.html.classList.remove("highlighted");
            if (p.id == id) p.html.classList.add("highlighted");
        });
    }

    get (id) {
        let box = this.get_bounding_box();
        let point = this.line.points[id%this.size()];
        if (point!=undefined) return {
            x: point.x/box.width,
            y: point.y/box.height
        };
        else return {
            x: 0.5,
            y: 0.5
        }
    }
}

class Crossfade_Module extends UI_Container {
    constructor () {
        super();

        this.html_element.addEventListener("touchstart", (e) => {console.log(e);});

        this.layer = new SVG_Layer();
        let svg = this.layer.html();
        this.html_element.appendChild(svg);

        this.x_fade = 0.5;

        this.line = new Poly_Line(svg);
        let point_A = new Point(0.1,0.1,0,svg,{draggable: true, deletable: false});
        let point_B = new Point(0.7,0.4,1,svg,{draggable: true, deletable: false});
        this.line.add_point(point_A);
        this.line.add_point(point_B);

        this.point_X = new Point(lerp(point_A.x,point_B.x,this.x_fade),lerp(point_A.y,point_B.y,this.x_fade),"x_fade",svg,{draggable: false, deletable: false});

        this.point_X.on_move = (x,y) => {
            console.log("X",x,y);
        };

        this.line.on_change = () => {
            this.point_X.move(lerp(point_A.x,point_B.x,this.x_fade),lerp(point_A.y,point_B.y,this.x_fade),true);
        };
    }

    get () {
        return {
            x: this.point_X.x,
            y: this.point_X.y
        }
    }
}


// div px/px
// svg 100%/100%