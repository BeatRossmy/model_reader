// TODO: implement missing activation functions
// see: https://keras.io/api/layers/activations/    
activations = [];
activations["identity"] = function (x) {return x;};
activations["linear"] = function (x) {return x;};
activations["sigmoid"] = function (x) {return (1/(1+Math.exp(-x)));};
activations["relu"] = function (x) {return Math.max(x,0);};
activations["softplus"] = function (x) {return Math.log(Math.exp(x) + 1);};
activations["softsign"] = function (x) {return (x / (Math.abs(x) + 1));};

class ModelReader {
  convert (file) {
    let model = {};
    if (file.class_name=="Functional") {
      console.log("functional");
      model = new Functional(file);
    }
    if (file.class_name=="Sequential")
      model = new Sequential(file);
    return model;
  }
}

class Layer {
  constructor (layer) {
    this.name = layer.config.name;
    this.type = layer.class_name;
    this.units = layer.config.units;
    this.inbound_nodes = [];
    this.outbound_nodes = [];
    for (let i in layer.inbound_nodes[0]) {
      this.inbound_nodes.push(layer.inbound_nodes[0][i][0]);
    }
    this.output = [];
    for (let i=0; i<this.units; i++) this.output[i] = 0;
    
    this.calc_ready = false;
  }
  
  create_connections (layer_list) {
    for (let i in this.inbound_nodes) {
      let src = this.inbound_nodes[i];
      if (layer_list[src]!=null) {
        this.inbound_nodes[i] = layer_list[src];
        layer_list[src].outbound_nodes.push(this);
      }
    }
  }
  
  call_outbounds () {
    for (let i in this.outbound_nodes) {
      this.outbound_nodes[i].calc();
    }
  }
}

class Input extends Layer {
  constructor (layer) {
    super(layer);
    this.units = layer.config.batch_input_shape[1];
  }
  
  calc (data) {
    for (let i in data) {
      this.output[i] = data[i];
    }
    this.calc_ready = true;
    this.call_outbounds();
  }
}

class Dense extends Layer {
  constructor (layer) {
    super(layer);
    this.activation = (layer.config.activation!=undefined)? activations[layer.config.activation] : activations["identity"];
    this.weights = layer.weights;
    this.bias = layer.bias;
  }
  
  calc () {
    this.output = new Array(this.units).fill(0);
    for (let i in this.inbound_nodes) {
      let input_vector = this.inbound_nodes[i].output;
      //console.log(input_vector,this.output);
      for (let o=0; o<this.output.length; o++) {
        for (let i=0; i<input_vector.length; i++) {
          this.output[o] += input_vector[i]*this.weights[i][o];
        }
        this.output[o] = this.activation(this.output[o]+this.bias[o]);  
      }
    }
    this.calc_ready = true;
    this.call_outbounds();
  }
}

class Lambda extends Layer {
  constructor (layer, l_func) {
    super(layer);
    this.lambda_function = (l_func==null)? (function (x) {return x;}) : l_func;
  }
  
  calc () {
    console.log("lambda");
    let args = []
    for (let i in this.inbound_nodes) {
      if (this.inbound_nodes[i].calc_ready==false) return;
      args.push(this.inbound_nodes[i].output);
    }
    this.output = this.lambda_function(...args);
    this.calc_ready = true;
    this.call_outbounds();
  }
}

class Functional {
  constructor (obj) {
    
    // sampling function for VAE
    this.sampling = function (mean,sigma) {
      let epsilon = [Math.random()*0.2-0.1,Math.random()*0.2-0.1];
      return [mean[0]+Math.exp(sigma[0])*epsilon[0],mean[1]+Math.exp(sigma[1])*epsilon[1]];
    };
    
    this.layers = [];
    this.input_layers = [];
    this.output_layers = [];
    
    this.model = null;
    if (obj.class_name=="Functional") {
      this.model = obj;
      console.log(obj.class_name);
    }
    else {
      console.log("no Functional model");
      return;
    }
    
    for (let l in this.model.config.layers) {
      let layer = this.model.config.layers[l];
      let type = layer.class_name;
      let layer_obj = null;
      
      if (type=="InputLayer")
        layer_obj = new Input(layer);
      else if (type=="Dense")
        layer_obj = new Dense(layer);
      else if (type=="Lambda")
        layer_obj = new Lambda(layer,this.sampling);
      else
        console.log(type);
      
      if (layer_obj!=null) this.layers[layer_obj.name] = layer_obj;
    }
    
    for (let i in this.layers) {
      console.log(i);
      this.layers[i].create_connections(this.layers);
    }
    
    for (let i in this.model.config.input_layers) {
      let name = this.model.config.input_layers[i][0];
      this.input_layers.push(this.layers[name]);
    }
    for (let i in this.model.config.output_layers) {
      let name = this.model.config.output_layers[i][0];
      this.output_layers.push(this.layers[name]);
    }
    console.log(this)
  }
  
  predict (data) {
    if (Array.isArray(data) && data.length==this.input_layers[0].units) {
      for (let i in this.layers) this.layers[i].calc_ready = false;
      this.input_layers[0].calc(data)
    }
    let out = [];
    for (let i in this.output_layers)
      out.push(this.output_layers[i].output);
    
    return out;
  }
  
  get_input_units () {
    return this.input_layers[0].units;
  }
}