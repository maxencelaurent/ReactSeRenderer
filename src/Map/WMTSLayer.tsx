import * as React from 'react';
import { MapViewCtx } from './MapView';

export interface WMTSLayerProps {
  visible?: boolean;
  layerId: string;
  index: number;
}

export default function WMTSLayer({ layerId, index, visible = true }: WMTSLayerProps) {
  const { registerWMTSLayer, deleteLayer } = React.useContext(MapViewCtx);

  React.useEffect(() => {
    registerWMTSLayer(layerId, index, visible);
  }, [layerId, index, visible, registerWMTSLayer]);

  React.useEffect(() => {
    return () => {
      deleteLayer(layerId);
    };
  }, [layerId, deleteLayer]);

  return <div>Style {layerId}</div>;
}
