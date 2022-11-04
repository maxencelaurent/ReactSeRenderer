import {Fill} from "./Fill";
import {ParameterValue} from "./Parameter";
import {Stroke} from "./Stroke";
import {Transform} from "./Symbolizer";
import {Uom, WithUom} from "./Uom";

export type WellKnownName = 'circle' | 'square' | 'triangle';

export type AnchorPosition = "CENTER" | "UPPER_LEFT" | "UPPER_RIGHT" | "LOWER_LEFT" | "LOWER_RIGHT"
  | 'LEFT' | 'RIGHT' | 'TOP' | 'BOTTOM';


export const NORTH = -Math.PI / 2;
export const SOUTH = Math.PI / 2;
export const EAST = -0;
export const WEST = Math.PI;

interface Size extends WithUom {
  type: 'Size';
  size: ParameterValue<number>;
}


interface ViewBox extends WithUom {
  type: 'ViewBox';
  width: ParameterValue<number>;
  height: ParameterValue<number>;
}


export type GraphicSize = Size | ViewBox;

export interface Halo extends WithUom {
  type: 'Halo';
  radius?: ParameterValue<number>;
  fill: Fill;
}

export interface ExternalGraphic extends WithUom {
  onlineResource: unknown;
  size: GraphicSize;
}

export interface PointTextGraphic extends WithUom {
  pointLabel: unknown;
  x: ParameterValue<number>;
  y: ParameterValue<number>;
}



export interface MarkGraphic extends WithUom {
  type: 'MarkGraphic';
  transform?: Transform;
  wellKnownName: ParameterValue<WellKnownName>
  halo?: Halo;
  fill?: Fill;
  stroke?: Stroke;
  size?: GraphicSize;
  anchorPosition?: AnchorPosition;
}

export type Graphic = MarkGraphic;