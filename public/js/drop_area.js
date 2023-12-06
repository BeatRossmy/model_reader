class DropArea {
  constructor (w,h,callback) {
    this.width = w;
    this.height = h;
    this.text = "drop here ...";
    this.drop_callback = callback || function () {console.log("no callback function");};
    
    this.html = document.createElement("div");
    this.html.classList.add("droparea");
    
    this.text_field = document.createElement("p");
    this.text_field.innerHTML = this.text;
    
    this.html.appendChild(this.text_field);
    
    this.html.style.width = this.width+"px";
    this.html.style.height = this.height+"px";
    
    this.html.addEventListener('dragenter',
      function(e){ e.preventDefault(); }
    );
    this.html.addEventListener('dragover',
      function(e){ e.preventDefault(); }
    );

    this.html.addEventListener('drop', (e) => {
      e.preventDefault();
      var reader = new FileReader();
      let callback = this.drop_callback;
      reader.onloadend = function() {
        let data = JSON.parse(this.result);
        callback(data);
      };
      reader.readAsText(event.dataTransfer.files[0]);
    });
  }
}