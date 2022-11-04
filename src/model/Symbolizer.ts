import {Fill} from "./Fill";
import {Graphic} from "./Graphic";
import {Label} from "./Label";
import {ParameterValue} from "./Parameter";
import {Stroke} from "./Stroke";
import {Uom, WithUom} from "./Uom";


interface Scale {
  type: "Scale"
  x?: number;
  y?: number;
}

interface Rotate {
  type: "Rotate"
  x?: number;
  y?: number;
  angle?: number;
}

interface Translate {
  type: "Translate",
  x?: number;
  y?: number;
}

export type Transformation = Scale | Translate | Rotate;

export interface Transform extends WithUom {
  transformations: Transformation[];
}

interface AbstractSymbolizer extends WithUom {
  name?: string;
  description?: string;
  level?: number;
}

export interface AreaSymbolizer extends AbstractSymbolizer {
  type: 'AreaSymbolizer';
  perpendicularOffset?: ParameterValue<number>;
  fill?: Fill;
  stroke?: Stroke;
  transform?: Transform;
}


export interface LineSymbolizer extends AbstractSymbolizer {
  type: 'LineSymbolizer';
  perpendicularOffset?: ParameterValue<number>;
  stroke?: Stroke;
  transform?: Transform;
}

export interface PointSymbolizer extends AbstractSymbolizer {
  type: 'PointSymbolizer';
  onVertex?: boolean;
  graphics: Graphic[];
}

export interface TextSymbolizer extends AbstractSymbolizer {
  type: 'TextSymbolizer';
  perpendicularOffset?: ParameterValue<number>;
  label: Label;
}

// export interface TextSymbolizer extends AbstractSymbolizer {
// }

export type Symbolizer = AreaSymbolizer | LineSymbolizer | PointSymbolizer | TextSymbolizer;
