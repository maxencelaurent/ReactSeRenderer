import {Position} from "geojson";
import {NORTH} from "../model/Graphic";
import {add, dist, mul, sub} from "./helpers";
import {getLineLength} from "./line-helpers";

export interface OrientedPoint {
    point: Position;
    /**
     * Angle in radian
     */
    angle_rad: number;
}

interface SplitLineOptions {
  /**
   * strict: always respect the pattern length
   * addFinal: strict but add final point even id final pattern in incomplete
   * adjust: change the pattern length to match the line length
   */
  mode?: 'strict' | 'adjust' | 'addFinal';
  computeAngle?: boolean;
}

export function splitLine(line: Position[], pattern: number, {mode = 'adjust', computeAngle=false}: SplitLineOptions = {}) : OrientedPoint[] {
  let patternLength = pattern;
  if (mode === "adjust"){
    const lineLength = getLineLength(line);
    const nb = Math.round(lineLength / patternLength) || 1; // avoid 0 pattern
    patternLength = lineLength / nb;
  }

  let travelled = 0
  let currentPoint = line[0];
  const points: OrientedPoint[] = [{
    point: currentPoint,
    angle_rad: NORTH,
  }];
  if (computeAngle && line[1]) {
    const vector = sub(line[1], line[0])
    points[0].angle_rad = Math.atan2(vector[1], vector[0]);
  }

  let i=1;
  while (i < line.length){
    const distToEndOfSeg = dist(currentPoint, line[i]);

    if ((travelled + distToEndOfSeg > patternLength)){
      // distance reached within: extract point and restart travel
      // do not move to next point yet
      const delta = patternLength - travelled;
      const vector = sub(line[i], currentPoint)
      const point = add(currentPoint, mul(delta / distToEndOfSeg, vector));

      const newPoint = {point, angle_rad: NORTH};
      points.push(newPoint);

      if (computeAngle) {
        newPoint.angle_rad = Math.atan2(vector[1], vector[0]);
      }
      // restart pattern
      travelled = 0;
      currentPoint = point;
    } else {
      // distance not reached, move to next point
      travelled += distToEndOfSeg;
      currentPoint = line[i];
      i++;
    }
  }

  if (travelled > 0 && mode !== 'strict') {
    points.push({
      point: line[line.length - 1],
      angle_rad: 0,
    });
  }

  return points;
}