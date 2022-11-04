import {ParameterValue} from "./Parameter";
import {Symbolizer} from "./Symbolizer";

type Filter = ParameterValue<boolean>;

export interface Rule {
  type: 'Rule';
  name?: string;
  description?: string;
  fallback?: boolean;
  minScale?: number;
  maxScale?: number;
  filter?: Filter;
  symbolizers: Symbolizer[];
}


export interface Style {
  type: 'Style';
  name?: string;
  description?: string;
  rules: Rule[];
}