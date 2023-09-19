import * as React from 'react';
import { LayerId, MapCtx } from './MapDefinition';

export interface WMTSLayerDefinitionProps {
  /** unique layer ID within the map */
  layerId: LayerId;
  /** get capabilities url */
  getCapabilitiesUrl: string;
  /** WMTS layer identifier */
  wmtsLayerId: string;
  tileMatrixSet?: string;
}

export default function WMTSLayerDefinition({
  layerId,
  getCapabilitiesUrl,
  wmtsLayerId,
  tileMatrixSet,
}: WMTSLayerDefinitionProps) {
  const { registerWMTSLayer, deleteLayer } = React.useContext(MapCtx);

  React.useEffect(() => {
    registerWMTSLayer({
      layerId: layerId,
      getCapabilitiesUrl: getCapabilitiesUrl,
      wmtsLayerId: wmtsLayerId,
      timeMatrixSet: tileMatrixSet,
    });
    return () => {
      deleteLayer(layerId);
    };
  }, [deleteLayer, getCapabilitiesUrl, layerId, registerWMTSLayer, tileMatrixSet, wmtsLayerId]);

  return <></>;
}
