import {Position} from "geojson";

export function add(a: Position, b: Position) : Position {
  return  [
    a[0] + b[0],
    a[1] + b[1],
  ]
}

export function sub(a: Position, b: Position) : Position {
  return  [
    a[0] - b[0],
    a[1] - b[1],
  ]
}

export function mul(s: number, a: Position) : Position {
  return  [
    s*a[0],
    s*a[1],
  ]
}


export function distSq(a: Position, b:Position){
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  return dx*dx + dy*dy
}

export function dist(a: Position, b:Position){
  return Math.sqrt(distSq(a, b))
}
