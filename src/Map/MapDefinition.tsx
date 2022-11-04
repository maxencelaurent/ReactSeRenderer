import { FeatureCollection } from "geojson";
import * as React from "react";
import { getLogger } from "../logger";
import { Extent } from "../renderer/renderer";

import createRTree, { RTree } from "rtree";
import { applyToEachPoint, getConverter, getProj } from "../geom/transform";
import proj4 from "proj4";

export type LayerId = string;

const logger = getLogger("Map");

export interface ILayer {
  layerId: LayerId;
  features: FeatureCollection;
  dataCrs: string;
}

interface LayerData {
  layerId: LayerId;
  provided: ILayer;
  effective: ILayer;
  rTree: RTree;
}

export type LayerStore = Record<LayerId, LayerData>;

export type MapUnit = | "degree" | "m" |"ft" | "us-ft";

export interface MapContext {
  registerLayer: (layer: ILayer) => void;
  deleteLayer: (layerId: LayerId) => void;
  getFeatures: (layerId: LayerId, extent: Extent) => FeatureCollection;
  groundUnit: MapUnit;
}

export const MapCtx = React.createContext<MapContext>({
  registerLayer: () => {},
  deleteLayer: () => {},
  groundUnit: 'm',
  getFeatures: () => ({
    type: "FeatureCollection",
    features: [],
  }),
});

export interface MapProps {
  crs: string;
  children?: React.ReactNode;
}

const emptyLayer: FeatureCollection = {
  type: "FeatureCollection",
  features: [],
};

/**
 * Main Component
 */
export default function MapDefinition({
  crs,
  children,
}: MapProps): JSX.Element {
  const [layers, setLayers] = React.useState<LayerStore>({});
  const layersRef = React.useRef(layers);
  layersRef.current = layers;

  const [mapUnit, setMapUnit] = React.useState<MapUnit>("m");

  React.useEffect(() => {
    const proj = getProj(crs);
    if (proj){
      if (proj.units === 'm'){
        setMapUnit('m')
      } else if (proj.units === 'fr'){
        setMapUnit('ft')
      } else if (proj.units === 'us-ft'){
        setMapUnit('us-ft')
      } else {
        setMapUnit('degree')
      }
    } else {
      // well... that's embarassing...
      setMapUnit("m");
    }
  }, [crs]);

  const getFeaturesCb = React.useCallback(
    (layerId: LayerId, extent: Extent) => {
      const layer = layersRef.current[layerId];
      if (layer?.effective.features) {
        return {
          type: "FeatureCollection" as const,
          features: layer.rTree.search({
            x: extent[0],
            y: extent[1],
            w: extent[2] - extent[0],
            h: extent[3] - extent[1],
          }),
        };
      } else {
        return emptyLayer;
      }
    },
    []
  );

  const registerLayerCb = React.useCallback((layer: ILayer): LayerId => {
    const layerId = layer.layerId;

    logger.info(`Register Layer ${layerId}`);
    setLayers((layers) => {
      const effective = layer;
      if (crs && layer.dataCrs && crs != layer.dataCrs) {
        const convertor = getConverter(layer.dataCrs, crs);

        const projectedLayer: FeatureCollection = {
          type: "FeatureCollection",
          features: layer.features.features.map((feature) => {
            return {
              ...feature,
              geometry: applyToEachPoint(feature.geometry, (point) => {
                const p = convertor.forward(point);
                return p;
              }),
            };
          }),
        };
        effective.features = projectedLayer;
      }

      // register in r-tree
      const rTree = createRTree();
      rTree.geoJSON(effective.features);
      layers[layerId] = {
        effective: effective,
        provided: layer,
        layerId: layerId,
        rTree: rTree,
      };
      return layers;
    });
    return layerId;
  }, []);

  const deleteLayerCb = React.useCallback((layerId: LayerId) => {
    logger.info(`Delete Layer ${layerId}`);
    setLayers((layers) => {
      delete layers[layerId];
      return layers;
    });
  }, []);

  const [mapContext] = React.useState<MapContext>({
    registerLayer: registerLayerCb,
    deleteLayer: deleteLayerCb,
    groundUnit: mapUnit,
    getFeatures: getFeaturesCb,
  });

  return <MapCtx.Provider value={mapContext}>{children}</MapCtx.Provider>;
}
