import * as React from "react";
import {MapViewCtx} from "./MapView";
import {Style} from "../model/rule";

export interface StyledLayerProps {
  visible?: boolean;
  layerId: string;
  style: Style;
  index: number;
}

export default function StyledLayer({layerId, style, index, visible=true}: StyledLayerProps) {
  const {registerLayer, deleteLayer} = React.useContext(MapViewCtx);

  React.useEffect(() => {
    registerLayer(layerId, style, index, visible);
  }, [layerId, style, index]);

  React.useEffect(() => {
    return () => {
      deleteLayer(layerId);
    }
  }, [layerId]);

  return (<div>
    Style {layerId}
  </div>);
}
