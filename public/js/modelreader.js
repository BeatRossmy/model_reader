class ModelReader {
  static convert(file) {
      let model = {};
      if (file.class_name == "Functional") 
          model = new Functional(file);
      if (file.class_name == "Sequential")
          model = new Sequential(file);
      return model;
  }
}

class ActivationFunctions {
  // see: https://keras.io/api/layers/activations/    
  static activations = {
      "identity": function (x) { return x; },
      "linear": function (x) { return x; },
      "sigmoid": function (x) { return (1 / (1 + Math.exp(-x))); },
      "relu": function (x) { return Math.max(x, 0); },
      "softplus": function (x) { return Math.log(Math.exp(x) + 1); },
      "softsign": function (x) { return (x / (Math.abs(x) + 1)); },
  };
}

class Layer {
  static create = {
      "InputLayer": function (layer) {return new Input(layer);},
      "Dense": function (layer) {return new Dense(layer);},
      "Lambda": function (layer) {return new Lambda(layer);}
  }

  constructor(layer) {
      this.name = layer.config.name;
      this.type = layer.class_name;
      this.units = layer.config.units;
      this.inbound_nodes = [];
      this.outbound_nodes = [];
      for (let i in layer.inbound_nodes[0]) {
          this.inbound_nodes.push(layer.inbound_nodes[0][i][0]);
      }
      this.output = Array(this.units).fill(0);
      this.calc_ready = false;
  }

  create_connections(layer_list) {
      for (let i in this.inbound_nodes) {
          let src = this.inbound_nodes[i];
          if (layer_list[src] != null) {
              this.inbound_nodes[i] = layer_list[src];
              layer_list[src].outbound_nodes.push(this);
          }
      }
  }

  call_outbounds() {
      this.outbound_nodes.forEach((node) => {node.calc();});
  }
}

class Input extends Layer {
  constructor(layer) {
      super(layer);
      this.units = layer.config.batch_input_shape[1];
  }

  calc(data) {
      this.output = data.map((v) => v);
      this.calc_ready = true;
      this.call_outbounds();
  }
}

class Dense extends Layer {
  constructor(layer) {
      super(layer);
      this.activation = (layer.config.activation != undefined) ? 
          ActivationFunctions.activations[layer.config.activation] :
          ActivationFunctions.activations["identity"];
      this.weights = layer.weights;
      this.bias = layer.bias;
  }

  calc() {
      this.output = new Array(this.units).fill(0);
      for (let i in this.inbound_nodes) {
          let input_vector = this.inbound_nodes[i].output;
          for (let o = 0; o < this.output.length; o++) {
              for (let i = 0; i < input_vector.length; i++) {
                  this.output[o] += input_vector[i] * this.weights[i][o];
              }
              this.output[o] = this.activation(this.output[o] + this.bias[o]);
          }
      }
      this.calc_ready = true;
      this.call_outbounds();
  }
}

class Lambda extends Layer {
  static sampling = function (mean, sigma) {
      let epsilon = [Math.random() * 0.2 - 0.1, Math.random() * 0.2 - 0.1];
      return [mean[0] + Math.exp(sigma[0]) * epsilon[0], mean[1] + Math.exp(sigma[1]) * epsilon[1]];
  };

  static bypass = function (x) { return x; }

  constructor(layer, l_func) {
      super(layer);
      this.lambda_function = (l_func != null) ? l_func : sampling;
  }

  calc() {
      let args = []
      for (let i in this.inbound_nodes) {
          if (this.inbound_nodes[i].calc_ready == false) return;
          args.push(this.inbound_nodes[i].output);
      }
      this.output = this.lambda_function(...args);
      this.calc_ready = true;
      this.call_outbounds();
  }
}

class Functional {
  constructor(obj) {
      this.layers = [];
      this.input_layers = [];
      this.output_layers = [];
      this.model = null;

      // continue if "Functional"
      console.log(obj.class_name == "Functional" ? "Functional" : "no Functional model");
      if (obj.class_name != "Functional") return;
      this.model = obj;

      // create layer
      for (let layer of this.model.config.layers) {
          let type = layer.class_name;
          let layer_obj = null;
          if (type in Layer.create) layer_obj = Layer.create[type](layer);
          if (layer_obj != null) this.layers[layer_obj.name] = layer_obj;
      }
      // 
      for (let i in this.layers) {
          console.log(i);
          this.layers[i].create_connections(this.layers);
      }
      // add references to input layers
      this.model.config.input_layers.forEach((l) => {this.input_layers.push(this.layers[l[0]]);});
      // add references to output layers
      this.model.config.output_layers.forEach((l) => {this.output_layers.push(this.layers[l[0]]);});
      console.log(this)
  }

  /* vector: normalized values */
  predict(vector) {
      let range = this.model.latent_range;
      vector = vector.map((v,i) => range[i][0] + v * (range[i][1]-range[i][0]));
      if (Array.isArray(vector) && vector.length == this.input_layers[0].units) {
          this.layers.forEach((l) => {l.calc_ready = false;});
          this.input_layers[0].calc(vector);
      }
      let out = [];
      for (let i in this.output_layers)
          out.push(this.output_layers[i].output);
      return out;
  }

  get_input_units() {
      return this.input_layers[0].units;
  }
}