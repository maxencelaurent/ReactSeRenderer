import { Position } from "geojson";
import { dist } from "./helpers";

export function getLineLength(coords: Position[]): number {
  let length = 0;
  for (let i = 0, j = 1; j < coords.length; i = j++) {
    length += dist(coords[i], coords[j]);
  }
  return length;
}
