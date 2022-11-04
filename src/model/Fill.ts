import {ColorType} from "./Parameter";
import {Stroke} from "./Stroke";

export interface HatchedFill {
  type: 'HatchedFill',
  stroke: Stroke;
  angle: number;
  distance: number;
  offet: number;
}

export interface SolidFill {
  type: 'SolidFill',
  color: ColorType;
  /** 0 to 1 */
  opacity?: number;
}

export const defaultSolidFill : () => SolidFill  = () => ({
    type: 'SolidFill',
    color: '#aaaaaa',
    opacity: 1,
});


export type Fill = SolidFill | HatchedFill;