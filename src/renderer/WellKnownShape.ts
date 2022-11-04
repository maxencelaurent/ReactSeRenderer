/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Other/TypeScriptDataObjectTemplate.ts to edit this template
 */

import ellipse from "@turf/ellipse";
import { Position } from "geojson";

/** 16 points circle of diameter 1 */
export const circle_d1 = [
  [0.5, 0],
  [0.4619397662556466, 0.19134171618253504],
  [0.3535533905932766, 0.3535533905932766],
  [0.19134171618254214, 0.4619397662556253],
  [0, 0.5],
  [-0.19134171618254214, 0.4619397662556253],
  [-0.3535533905932766, 0.3535533905932766],
  [-0.4619397662556466, 0.19134171618253504],
  [-0.5, 0],
  [-0.4619397662556466, -0.19134171618253504],
  [-0.3535533905932766, -0.3535533905932766],
  [-0.19134171618254214, -0.4619397662556253],
  [0, -0.5],
  [0.19134171618254214, -0.4619397662556253],
  [0.3535533905932766, -0.3535533905932766],
  [0.4619397662556466, -0.19134171618253504],
  [0.5, 0],
];

export function getEllipse(
  width: number,
  height: number,
  cx: number,
  cy: number
): Position[][] {
  if (width === height && width < 30) {
    return [circle_d1.map(([x, y]) => [x * width + cx, y * width + cy])];
  } else {
    // hack: turf works with wgs84, use degrees to avoid internal transformation
    return ellipse([cx, cy], width / 2, height / 2, {
      steps: 16,
      units: "degrees",
    }).geometry.coordinates;
  }
}
