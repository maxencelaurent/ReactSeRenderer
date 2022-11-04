import Color from "color";
import {Feature, Geometry} from "geojson";

export type ColorType = string;

const hexColor = /#[0-9a-fA-F]{6}/;

export function getColor(color: ColorType, opacity: number): string {
  if (color.match(hexColor)){
    return color + (opacity * 255).toString(16);
  }

  return Color(color).alpha(opacity).rgb().toString();

}

export type Literal = string | number | boolean;

interface ValueReference {
  type: 'ValueReference',
  property: string;
}

export type ParameterValue<T> = T | ValueReference;

function isValueReference<T>(pv: ParameterValue<T>): pv is ValueReference {
  if(pv != null && typeof pv === 'object' && "type" in pv && pv.type === 'ValueReference'){
    return true;
  }
  return false;
}

export function resolveParameter<T, G extends Geometry, P>(param: ParameterValue<T>, feature: Feature<G, P>) : T  {
  if (isValueReference(param)){
    //TODO: type checking
    return feature.properties[param.property as keyof P] as unknown as T;
  } else {
    return param;
  }
}