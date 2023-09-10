import * as React from 'react';
import { FeatureCollection } from 'geojson';
import { LayerId, MapCtx } from './MapDefinition';

export interface LayerDefinitionProps {
  layerId: LayerId;
  /** data */
  features: FeatureCollection;
  /** features CRS */
  dataCrs: string;
}

export default function LayerDefinition({ layerId, features, dataCrs }: LayerDefinitionProps) {
  const { registerLayer, deleteLayer } = React.useContext(MapCtx);

  React.useEffect(() => {
    registerLayer({
      layerId: layerId,
      features: features,
      dataCrs: dataCrs,
    });
    return () => {
      deleteLayer(layerId);
    };
  }, [features, layerId, dataCrs, registerLayer, deleteLayer]);

  return <></>;
}
