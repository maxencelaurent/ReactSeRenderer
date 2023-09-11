import * as React from 'react';
import { MapViewCtx } from './MapView';

export interface WMTSLayerProps {
  visible?: boolean;
  layerId: string;
  index: number;
  opacity: number;
}

export default function WMTSLayer({ layerId, index, visible = true, opacity = 1 }: WMTSLayerProps) {
  const { registerWMTSLayer, deleteLayer } = React.useContext(MapViewCtx);

  React.useEffect(() => {
    registerWMTSLayer(layerId, index, visible, opacity);
  }, [layerId, index, visible, opacity, registerWMTSLayer]);

  React.useEffect(() => {
    return () => {
      deleteLayer(layerId);
    };
  }, [layerId, deleteLayer]);

  return <div>Style {layerId}</div>;
}
