import { FeatureCollection } from 'geojson';
import React, {
  JSX,
  ReactNode,
  createContext,
  useCallback,
  useRef,
  useState,
  useEffect,
} from 'react';
import { getLogger } from '../logger';
import { Extent } from '../renderer/renderer';

import createRTree, { RTree } from 'rtree';
import { applyToEachPoint, getConverter, getProj } from '../geom/transform';
import WMTSCapabilities from 'ol/format/WMTSCapabilities';
import { GetCapabilities, TileMatrixSet } from './WmtsUtils';

export type LayerId = string;

const logger = getLogger('Map');

export interface ILayer {
  layerId: LayerId;
  features: FeatureCollection;
  dataCrs: string;
}

export interface IWMTSLayer {
  layerId: LayerId;
  /** get capabilities url */
  getCapabilitiesUrl: string;
  /** WMTS layer identifier */
  wmtsLayerId: string;
  timeMatrixSet?: string;
}

export interface VectorLayerData {
  type: 'VectorLayer';
  layerId: LayerId;
  provided: ILayer;
  effective: ILayer;
  rTree: RTree;
}

export interface WMTSLayerData {
  type: 'WMTSLayer';
  layerId: LayerId;
  getTileUrl: (tileMatrixId: string, TileCol: number, TileRow: number) => string;
  tileMatrixSet: TileMatrixSet;
}

type LayerData = VectorLayerData | WMTSLayerData;

export type LayerStore = Record<LayerId, LayerData>;

export type MapUnit = 'degree' | 'm' | 'ft' | 'us-ft';

export interface MapContext {
  registerLayer: (layer: ILayer) => void;
  registerWMTSLayer: (layer: IWMTSLayer) => void;
  deleteLayer: (layerId: LayerId) => void;
  getFeatures: (layerId: LayerId, extent: Extent) => FeatureCollection;
  getWMTSLayer: (layerId: LayerId) => WMTSLayerData | undefined;
  groundUnit: MapUnit;
}

export const MapCtx = createContext<MapContext>({
  registerWMTSLayer: () => {},
  registerLayer: () => {},
  deleteLayer: () => {},
  groundUnit: 'm',
  getFeatures: () => ({
    type: 'FeatureCollection',
    features: [],
  }),
  getWMTSLayer: () => undefined,
});

export interface MapProps {
  crs: string;
  children?: ReactNode;
}

const emptyLayer: FeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

/**
 * Main Component
 */
export default function MapDefinition({ crs, children }: MapProps): JSX.Element {
  const [layers, setLayers] = useState<LayerStore>({});
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const [mapUnit, setMapUnit] = useState<MapUnit>('m');

  useEffect(() => {
    const proj = getProj(crs);
    if (proj) {
      if (proj.units === 'm') {
        setMapUnit('m');
      } else if (proj.units === 'fr') {
        setMapUnit('ft');
      } else if (proj.units === 'us-ft') {
        setMapUnit('us-ft');
      } else {
        setMapUnit('degree');
      }
    } else {
      // well... that's embarassing...
      setMapUnit('m');
    }
  }, [crs]);

  const getFeaturesCb = useCallback((layerId: LayerId, extent: Extent) => {
    const layer = layersRef.current[layerId];
    if (layer.type === 'VectorLayer') {
      if (layer?.effective.features) {
        return {
          type: 'FeatureCollection' as const,
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
    } else {
      // TODO WMS GetFeatureInfo
      return emptyLayer;
    }
  }, []);

  const registerLayerCb = useCallback(
    (layer: ILayer): LayerId => {
      const layerId = layer.layerId;

      logger.info(`Register Layer ${layerId}`);
      setLayers((layers) => {
        const effective = layer;
        if (crs && layer.dataCrs && crs != layer.dataCrs) {
          const convertor = getConverter(layer.dataCrs, crs);

          const projectedLayer: FeatureCollection = {
            type: 'FeatureCollection',
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
          type: 'VectorLayer',
          effective: effective,
          provided: layer,
          layerId: layerId,
          rTree: rTree,
        };
        return layers;
      });
      return layerId;
    },
    [crs]
  );

  const registerWMTSLayerCb = useCallback(
    async (layerDef: IWMTSLayer): Promise<LayerId> => {
      const layerId = layerDef.layerId;

      const parser = new WMTSCapabilities();

      const response = await fetch(layerDef.getCapabilitiesUrl);
      const text = await response.text();
      const getCap = parser.read(text) as GetCapabilities;

      // auto select a layer which match the selected tile matrix set
      const layer = getCap.Contents?.Layer.find((l) => {
        return l.Identifier === layerDef.wmtsLayerId;
      });

      if (!layer) {
        throw new Error(`Unable to find a layer with Identifier ${layerDef.layerId}`);
      }
      const mapCrs: string[] = [];
      const OGC_CRS_URN = 'urn:ogc:def:crs:';

      if (crs.startsWith(OGC_CRS_URN)) {
        mapCrs.push(crs);
        mapCrs.push(crs.replace(OGC_CRS_URN, ''));
      } else {
        mapCrs.push(crs);
        mapCrs.push(OGC_CRS_URN + crs);
      }

      const tileMatrixSets = layer.TileMatrixSetLink.flatMap((link) => {
        const tms = getCap.Contents?.TileMatrixSet.find(
          (tms) => tms.Identifier === link.TileMatrixSet
        );
        return tms ? [tms] : [];
      }).filter((tms) => mapCrs.includes(tms.SupportedCRS));

      const tileMatrixSet = tileMatrixSets.filter(
        (tms) => !layerDef.timeMatrixSet || tms.Identifier === layerDef.timeMatrixSet
      )[0];

      if (!tileMatrixSet) {
        console.log('MatrixSets', getCap.Contents?.TileMatrixSet);
        throw new Error('WMTS Service do not provide tile for the given CRS');
      }

      const style = layer.Style.find((style) => style.isDefault) || layer.Style[0];

      if (!style) {
        throw new Error('There is no style');
      }

      const resourceUrl = layer.ResourceURL?.find((r) => r.resourceType === 'tile');

      let getTile: (tileMatrixId: string, TileCol: number, TileRow: number) => string = () => '';

      if (resourceUrl) {
        let url = resourceUrl.template;
        layer.Dimension?.forEach((dim) => {
          url = url.replace(`{${dim.Identifier}}`, dim.Default);
        });
        getTile = (tileMatrixId: string, col: number, row: number) => {
          let getTileUrl = url;
          getTileUrl = getTileUrl.replace('{TileMatrix}', `${tileMatrixId}`);
          getTileUrl = getTileUrl.replace('{TileCol}', `${col}`);
          getTileUrl = getTileUrl.replace('{TileRow}', `${row}`);
          console.log('GetTile From Template', getTileUrl);
          return getTileUrl;
        };
      } else {
        const getTileMeta = getCap.OperationsMetadata?.GetTile;
        const href = getTileMeta?.DCP.HTTP.Get[0].href;

        getTile = (tileMatrixId: string, col: number, row: number) => {
          const kvp = {
            Service: 'WMTS',
            Request: 'GetTile',
            Version: '1.0.0',
            Format: layer.Format[0],
            Layer: layer.Identifier,
            Style: style.Identifier,
            TileMatrixSet: tileMatrixSet.Identifier,
            TIleMatrix: tileMatrixId,
            TileCol: col,
            TileRow: row,
          };

          return (
            href +
            (href?.endsWith('?') ? '' : '?') +
            Object.entries(kvp)
              .map(([key, value]) => `${key}=${value}`)
              .join('&')
          );
        };
      }

      logger.info(`Register WMTS Layer ${layerId}`);

      setLayers((layers) => {
        const newLayers = { ...layers };
        newLayers[layerId] = {
          type: 'WMTSLayer',
          layerId: layerId,
          tileMatrixSet,
          getTileUrl: getTile,
        };
        return newLayers;
      });
      return layerId;
    },
    [crs]
  );

  const deleteLayerCb = useCallback((layerId: LayerId) => {
    logger.info(`Delete Layer ${layerId}`);
    setLayers((layers) => {
      delete layers[layerId];
      return layers;
    });
  }, []);

  const getWMTSLayerCb = useCallback((layerId: LayerId) => {
    const layer = layersRef.current[layerId];
    if (layer?.type === 'WMTSLayer') {
      return layer;
    }
    console.warn('Layer not found', layerId);
    return undefined;
  }, []);

  const [mapContext] = useState<MapContext>({
    registerLayer: registerLayerCb,
    registerWMTSLayer: registerWMTSLayerCb,
    deleteLayer: deleteLayerCb,
    groundUnit: mapUnit,
    getFeatures: getFeaturesCb,
    getWMTSLayer: getWMTSLayerCb,
  });

  return <MapCtx.Provider value={mapContext}>{children}</MapCtx.Provider>;
}
