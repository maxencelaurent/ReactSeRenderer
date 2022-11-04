import {Fill} from "./Fill";
import {Graphic} from "./Graphic";
import {ParameterValue} from "./Parameter";
import {Uom, WithUom} from "./Uom";

export type LineCap = 'butt' | 'round' | 'square';

export type LineJoin = "miter" | "round" | "bevel";

export const DEFAULT_WIDTH_PX = 1.0;;
export const DEFAULT_WIDTH = 0.25;

export const DEFAULT_CAP: LineCap = "butt";
export const DEFAULT_JOIN: LineJoin = 'miter';

export type RelativeOrientation = "PORTRAYAL" | "NORMAL" | "NORMAL_UP" | "LINE" | "LINE_UP";

export interface GraphicStroke extends WithUom {
  type: 'GraphicStroke',
  graphics: Graphic[];
  distance?: ParameterValue<number>;
  orientation?: RelativeOrientation;
  overlapMark?: ParameterValue<boolean>;
}

export interface PenStroke extends WithUom {
  type: 'PenStroke';
  fill: Fill;
  width: ParameterValue<number>;
  lineJoin?: LineJoin;
  lineCap?: LineCap;
  dashArray?: ParameterValue<string>;
  dashOffset?: ParameterValue<number>;
}

export const defaultPenStroke: () => PenStroke = () => ({
  type: 'PenStroke',
  fill: {
    type: 'SolidFill',
    color: 'black',
    opacity: 1,
  },
  width: 1,
});

export type Stroke = PenStroke | GraphicStroke;