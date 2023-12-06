function map (v,a,b,c,d) {
  return (v-a)/(b-a)*(d-c)+c;
}

function constrain (value,min,max) {
  return Math.max(min,Math.min(value,max));
}

function reshape (list,width) {
  let reshaped = [];
  while(list.length) reshaped.push(list.splice(0,width));
  return reshaped;
}

function lerp (start, end, amt){
  return (1-amt)*start+amt*end;
}