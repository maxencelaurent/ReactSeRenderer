import {Fill} from "./Fill";
import {Halo} from "./Graphic";
import {ParameterValue} from "./Parameter";
import {Stroke} from "./Stroke";
import {WithUom} from "./Uom";

export type HorizontalAlignment =
  | "LEFT"
  | "CENTER"
  | "RIGHT";

export type VerticalAlignment =
  | "TOP"
  | "MIDDLE"
  | "BASELINE"
  | "BOTTOM"

export interface StyleFont extends WithUom {
  type: 'StyleFont';
  fontFamiliy: ParameterValue<string>;
  fontWeight: ParameterValue<string>;
  fontSize: ParameterValue<number>;
  fontStyle: ParameterValue<string>;
}

export type Font = StyleFont;

export interface ILabel extends WithUom {
  textLabel: ParameterValue<string>;
  font?: Font;
  fill?: Fill;
  stroke?: Stroke;
  halo?: Halo
  hAlign?: HorizontalAlignment;
  vAlign?: VerticalAlignment;
}

export interface PointLabel extends ILabel {
  rotation?: ParameterValue<number>;
  // exclusionZone: E;
}

type RelativeOrientation = "PORTRAYAL" | "NORMAL" | "NORMAL_UP" | "LINE" | "LINE_UP";

export interface LineLabel extends ILabel {
  relativeOrientation?: RelativeOrientation;
}

export type Label = LineLabel | PointLabel;