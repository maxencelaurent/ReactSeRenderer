import { Feature, Geometry, Position } from 'geojson';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  MouseEvent,
  WheelEvent,
} from 'react';
import { add, mul, sub } from '../geom/helpers';
import { getLogger } from '../logger';
import { Style } from '../model/rule';
import { getGroundToPixelFactor, getPixelToGroundFactor, toPixel } from '../model/Uom';
import { Extent, render, renderTiles, SeRenderingContext } from '../renderer/renderer';
import { LayerId, MapCtx } from './MapDefinition';
import { Label } from '../model/Label';
import createRTree, { Rectangle } from 'rtree';
import { getAllPoints } from '../renderer/graphicRenderer';
import { resolveParameter } from '../model/Parameter';
import { setStrokeStyke } from '../renderer/strokeRenderer';

const logger = getLogger('MapView');
logger.setLevel(3);

interface IdlePanState {
  type: 'idle';
}

interface LivePanState {
  type: 'pan';
  /** media coordinate */
  startPosition: Position;
  initialExtent: Extent;
}

type PanState = IdlePanState | LivePanState;

function getMediaPosition(container: HTMLDivElement, e: MouseEvent): Position {
  const { left, top } = container.getBoundingClientRect();
  return [e.clientX - left, e.clientY - top];
}

export interface MapViewContext {
  registerLayer: (layerId: LayerId, style: Style, index: number, visible: boolean) => void;
  registerWMTSLayer: (layerId: LayerId, index: number, visible: boolean) => void;
  deleteLayer: (layerId: LayerId) => void;
}

export const MapViewCtx = createContext<MapViewContext>({
  registerLayer: () => '',
  registerWMTSLayer: () => '',
  deleteLayer: () => {},
});

interface VectorStyledLayerInternal {
  type: 'VectorStyledLayer';
  layerId: LayerId;
  style: Style;
  index: number;
  visible: boolean;
}

interface WMTSLayerInternal {
  type: 'WMTSLayerInternal';
  layerId: LayerId;
  index: number;
  visible: boolean;
}

type StyledLayerInternal = VectorStyledLayerInternal | WMTSLayerInternal;

export interface MapViewProps {
  center?: Position;
  scaleDenom?: number;
  className: string;
  children: ReactNode;
  noPan?: boolean;
  noZoom?: boolean;
}

function computeExtent(center: Position, context: SeRenderingContext): Extent {
  const factor = context.pixelToGroundFactor;
  const halfGndSize: Position = mul(factor * 0.5, [context.width, context.height]);
  const newExtent: Extent = [
    center[0] - halfGndSize[0],
    center[1] - halfGndSize[1],
    center[0] + halfGndSize[0],
    center[1] + halfGndSize[1],
  ];
  logger.info('ComputeExtent: ', { center, halfGndSize, newExtent });
  return newExtent;
}

interface FeatureToLabel {
  [layerId: string]: [
    {
      label: Label;
      geometry: Geometry;
      feature: Feature;
      renderingContext: SeRenderingContext;
    },
  ];
}

/**
 * MapView
 */
export default function MapView({
  className,
  center: initialCenter,
  scaleDenom: initialScaleDenom = 25000,
  children,
  noPan = false,
  noZoom = false,
}: MapViewProps): JSX.Element {
  const [layers, setLayers] = useState<StyledLayerInternal[]>([]);

  const { getFeatures, getWMTSLayer, groundUnit } = useContext(MapCtx);

  const [groundMousePos, setGroundMousePos] = useState<Position>([0, 0]);
  //const [center, setCenter] = useState<Position>([0, 0]);

  const labelsRef = useRef<FeatureToLabel>({});

  const registerLabelCb = useCallback(
    (context: SeRenderingContext, geometry: Geometry, feature: Feature, label: Label) => {
      //logger.info('Register LAbel');
      const layerFeatures = (labelsRef.current['all'] = labelsRef.current['all'] || []);
      layerFeatures.push({
        feature,
        geometry,
        label,
        renderingContext: context,
      });
    },
    []
  );

  const clearLabelsCb = useCallback(() => {
    labelsRef.current = {};
    logger.info('Clear Label Candidates');
  }, []);

  const drawLabelsCb = useCallback(() => {
    const ctx = contextRef.current.canvas;
    logger.info('Draw Labels');
    if (!ctx) {
      return;
    }
    const rTree = createRTree();
    Object.entries(labelsRef.current).forEach(([, features]) => {
      features.forEach(({ geometry, feature, label, renderingContext }) => {
        const points = getAllPoints(geometry, false);

        const fontSize =
          toPixel(resolveParameter(label.font?.fontSize || 12, feature), renderingContext) || 1;
        ctx.font = `${fontSize}px`;

        ctx.fillStyle = 'black';
        if (label.halo) {
          ctx.shadowBlur =
            toPixel(resolveParameter(label.halo.radius || 0, feature), renderingContext) || 1;
          ctx.shadowColor = 'hotpink';
        }

        const text = resolveParameter(label.textLabel, feature);
        //const metrics = ctx.measureText(text);
        // Stupid implementation: TODO do it
        // base on metrics, create an canvas. and create full-space shape
        // fill the shape and create pattern
        // use the patter to fillText

        points.forEach((point) => {
          //if (roboto) {
          //roboto.draw(ctx, text, point[0], point[1] + 40, fontSize,  {});
          //ctx.fillText(text, point[0], point[1]);
          //}
          const bbox = ctx.measureText(text);
          const padding = 2;

          const w = bbox.width + 2 * padding;
          const h = bbox.actualBoundingBoxAscent + bbox.actualBoundingBoxDescent + 2 * padding;
          const cx = point[0] - padding;
          const cy = point[1] + bbox.actualBoundingBoxDescent - padding;
          const candidates: Rectangle[] = [
            // top right
            { x: cx, y: cy, w, h },
            // top middle
            { x: cx - w / 2, y: cy, w, h },
            // right center
            { x: cx, y: cy + h / 2, w, h },
            // top left
            { x: cx - w, y: cy, w, h },
            // right bottom
            { x: cx, y: cy + h, w, h },
            // left center
            { x: cx - w, y: cy + h / 2, w, h },
            // bottom middle
            { x: cx - w / 2, y: cy + h, w, h },
            // bottom left
            { x: cx - w, y: cy + h, w, h },
          ];

          const rect = candidates.find((candidate) => {
            return rTree.search(candidate).length === 0;
          });

          if (rect) {
            rTree.insert(rect, true);

            if (label.stroke) {
              if (label.stroke.type === 'PenStroke') {
                setStrokeStyke(renderingContext, label.stroke, feature);
              }
              ctx.strokeText(text, rect.x + padding, rect.y + padding);
            }

            if (label.fill) {
              ctx.fillText(text, rect.x + padding, rect.y + padding);
            }

            /*
            ctx.strokeStyle = 'hotpink';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(rect.x, rect.y);
            ctx.lineTo(rect.x, rect.y - h);
            ctx.lineTo(rect.x + rect.w, rect.y - h);
            ctx.lineTo(rect.x + rect.w, rect.y);
            ctx.closePath();
            ctx.stroke();
            */
          }
        });
        ctx.shadowBlur = 0;
        ctx.shadowColor = '';
      });
    });
    logger.info('Labels Drawn');
  }, []);

  const [renderingContext, setRenderingContext] = useState<SeRenderingContext>({
    canvas: undefined,
    dpi: 96,
    groundExtent: [0, 0, 0, 0],
    height: 0,
    width: 0,
    groundUnit: 'm',
    scaleDenom: initialScaleDenom,
    uom: 'PX',
    groundToPixelFactor: 1, // TODO
    pixelToGroundFactor: 1, // TODO
    registerLabel: registerLabelCb,
    clearLabels: clearLabelsCb,
    drawLabels: drawLabelsCb,
  });

  useEffect(() => {
    setRenderingContext((ctx) => {
      const newContext: SeRenderingContext = {
        ...ctx,
        groundUnit: groundUnit,
      };
      newContext.groundToPixelFactor = getGroundToPixelFactor(newContext);
      newContext.pixelToGroundFactor = getPixelToGroundFactor(newContext);
      return newContext;
    });
  }, [groundUnit]);

  const contextRef = useRef(renderingContext);
  contextRef.current = renderingContext;

  const initCanvasCb = useCallback((ref: HTMLCanvasElement | null) => {
    setRenderingContext((c) => ({
      ...c,
      canvas: ref?.getContext('2d') || undefined,
    }));
  }, []);

  const registerLayerCb = useCallback(
    (layerId: LayerId, style: Style, index: number, visible: boolean) => {
      logger.info(`Register StyledLayer ${layerId}`);
      setLayers((layers) => {
        const newLayers = [...layers];
        const index = newLayers.findIndex((l) => l.layerId === layerId);

        if (index < 0) {
          newLayers.push({
            type: 'VectorStyledLayer',
            index,
            layerId,
            style,
            visible,
          });
        } else {
          newLayers[index] = {
            type: 'VectorStyledLayer',
            index,
            layerId,
            style,
            visible,
          };
        }
        newLayers.sort((a, b) => {
          return a.index - b.index;
        });

        return newLayers;
      });
      return layerId;
    },
    []
  );

  const registerWMTSLayerCb = useCallback((layerId: LayerId, index: number, visible: boolean) => {
    logger.info(`Register StyledLayer ${layerId}`);
    setLayers((layers) => {
      const newLayers = [...layers];
      const index = newLayers.findIndex((l) => l.layerId === layerId);

      if (index < 0) {
        newLayers.push({
          type: 'WMTSLayerInternal',
          index,
          layerId,
          visible,
        });
      } else {
        newLayers[index] = {
          type: 'WMTSLayerInternal',
          index,
          layerId,
          visible,
        };
      }
      newLayers.sort((a, b) => {
        return a.index - b.index;
      });

      return newLayers;
    });
    return layerId;
  }, []);

  const deleteLayerCb = useCallback((layerId: LayerId) => {
    logger.info(`Delete StyledLayer ${layerId}`);
    setLayers((layers) => {
      const index = layers.findIndex((l) => l.layerId === layerId);
      if (index >= 0) {
        const newLayers = [...layers];
        newLayers.splice(index, 1);
        return newLayers;
      } else {
        return layers;
      }
    });
  }, []);

  const [mapViewContext] = useState<MapViewContext>({
    registerLayer: registerLayerCb,
    registerWMTSLayer: registerWMTSLayerCb,
    deleteLayer: deleteLayerCb,
  });

  const containerRef = useRef<HTMLDivElement>();
  const roRef = useRef<ResizeObserver>();

  const updateExtent = useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const { width, height } = container.getBoundingClientRect();
      setRenderingContext((c) => {
        const extent = computeExtent(initialCenter!, c);
        return {
          ...c,
          groundExtent: extent,
          width: width,
          height: height,
        };
      });
    }
  }, [initialCenter]);

  /* Make sure to adapt canvas size ot the container size */
  const initContainerRef = useCallback(
    (container: HTMLDivElement | null) => {
      containerRef.current = container || undefined;

      if (roRef.current) {
        roRef.current.disconnect();
      }
      updateExtent();

      if (container) {
        const ro = new ResizeObserver(() => {
          updateExtent();
        });
        ro.observe(container);
      }
    },
    [updateExtent]
  );

  // MapView Render Effect
  useEffect(() => {
    const ctx = renderingContext.canvas;
    if (ctx) {
      ctx.clearRect(0, 0, renderingContext.width, renderingContext.height);
      logger.info('Do Render The Map');
      renderingContext.clearLabels();
      layers
        .filter((layer) => layer.visible)
        .sort((a, b) => a.index - b.index)
        .forEach((layer) => {
          if (layer.type === 'VectorStyledLayer') {
            const data = getFeatures(layer.layerId, renderingContext.groundExtent);
            //          const data = layersData[layer.layerId];
            if (data) {
              render(data, layer.style, renderingContext);
            } else {
              logger.warn(`Render Layer ${layer.layerId}: No Data`);
            }
          } else {
            // WMTS Layer
            const wmtsLayer = getWMTSLayer(layer.layerId);
            if (wmtsLayer) {
              renderTiles(wmtsLayer, renderingContext);
            }
          }
        });
      renderingContext.drawLabels();
    }
  }, [layers, renderingContext, groundUnit, getFeatures, getWMTSLayer]);

  const onClickCb = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      const { left, top } = containerRef.current.getBoundingClientRect();
      logger.info('Click at media coord ', e.clientX - left, e.clientY - top);
    }
  }, []);

  const panRef = useRef<PanState>({
    type: 'idle',
  });

  const onStartPanCb = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      const position = getMediaPosition(containerRef.current, e);
      logger.info('Start Pan at ', position);
      panRef.current = {
        type: 'pan',
        startPosition: position,
        initialExtent: [...contextRef.current.groundExtent],
      };
    }
  }, []);
  const onPanCb = useCallback((e: MouseEvent) => {
    if (containerRef.current) {
      if (panRef.current.type === 'pan' && e.buttons === 1) {
        //if (e.buttons === 1) {
        const position = getMediaPosition(containerRef.current, e);
        //throttle !
        logger.debug('Move Pan at ', position, e.buttons);
        const groundDelta = mul(
          contextRef.current.pixelToGroundFactor,
          sub(panRef.current.startPosition, position)
        );
        groundDelta[1] = -groundDelta[1];
        const extent = panRef.current.initialExtent;
        const size: Position = [extent[2] - extent[0], extent[3] - extent[1]];
        const topLeft: Position = [extent[0], extent[1]];
        const newTopLeft = add(topLeft, groundDelta);
        const newBottomRight = add(newTopLeft, size);
        const newExtent: Extent = [
          newTopLeft[0],
          newTopLeft[1],
          newBottomRight[0],
          newBottomRight[1],
        ];
        logger.info('new ', { topLeft, groundDelta, newTopLeft, size, newExtent });
        setRenderingContext((current) => ({
          ...current,
          groundExtent: newExtent,
        }));
      } else {
        logger.info('Cancel Move');
        panRef.current = {
          type: 'idle',
        };
        const mousePosition = getMediaPosition(containerRef.current, e);
        mousePosition[1] = contextRef.current.height - mousePosition[1];

        const delta = mul(contextRef.current.pixelToGroundFactor, mousePosition);

        const gndMousePosition = add(
          [contextRef.current.groundExtent[0], contextRef.current.groundExtent[1]],
          delta
        );
        setGroundMousePos(gndMousePosition);

        //}
      }
    }
  }, []);

  const onStopPanCb = useCallback((e: MouseEvent) => {
    logger.debug('Move Stop', e.buttons);
    if (containerRef.current && panRef.current.type === 'pan') {
      // const position = getMediaPosition(containerRef.current, e);
      // logger.info("Stop Pan at ", position);
      panRef.current = {
        type: 'idle',
      };
      //e.stopPropagation();
    }
  }, []);

  const onWheelCb = useCallback((e: WheelEvent) => {
    if (containerRef.current) {
      const context = contextRef.current;

      const mousePosition = getMediaPosition(containerRef.current, e);
      mousePosition[1] = context.height - mousePosition[1];

      const gndMousePositionDelta = mul(context.pixelToGroundFactor, mousePosition);

      logger.info('Media mousePosition ', mousePosition);
      logger.info('GndMousePositionDelta  ', gndMousePositionDelta);

      const gndMousePosition = add(
        [context.groundExtent[0], context.groundExtent[1]],
        gndMousePositionDelta
      );
      logger.info('GndMousePosition  ', gndMousePosition);

      const scaleFactor = e.deltaY > 0 ? 2 : 0.5;
      const newScaleDenom = context.scaleDenom * scaleFactor;
      logger.info('Scale: ', context.scaleDenom, ' => ', newScaleDenom);

      const newGndMousePositionDelta = mul(scaleFactor, gndMousePositionDelta);
      logger.info('newGndMousePositionDelta  ', newGndMousePositionDelta);

      const newPixelToGroundFactor = getPixelToGroundFactor({
        dpi: context.dpi,
        groundUnit: context.groundUnit,
        scaleDenom: newScaleDenom,
      });
      const newGndSize: Position = mul(newPixelToGroundFactor, [context.width, context.height]);
      logger.info('New Ground Size  ', newGndSize);
      const newGroundMin = sub(gndMousePosition, newGndMousePositionDelta);
      logger.info('New Ground min  ', newGroundMin);

      const [xMin, yMin] = newGroundMin;
      logger.info('New Extent min  ', { xMin, yMin });

      const newGroundExtent: Extent = [xMin, yMin, xMin + newGndSize[0], yMin + newGndSize[1]];
      logger.info('Pre Extent', context.groundExtent);
      logger.info('New Extent', newGroundExtent);

      setRenderingContext((context) => {
        const newContext = {
          ...context,
          scaleDenom: newScaleDenom,
          groundExtent: newGroundExtent,
        };

        newContext.groundToPixelFactor = getGroundToPixelFactor(newContext);
        newContext.pixelToGroundFactor = getPixelToGroundFactor(newContext);

        return newContext;
      });
    }
  }, []);

  return (
    <MapViewCtx.Provider value={mapViewContext}>
      <div
        className={className}
        ref={initContainerRef}
        onClick={onClickCb}
        onWheel={noZoom ? undefined : onWheelCb}>
        <div className="mapview-overlay">
          <div>{groundMousePos.join('; ')}</div>
          <div>{renderingContext.groundExtent.join('; ')}</div>
          <div>{`1:${renderingContext.scaleDenom}`}</div>
        </div>
        <canvas
          onMouseDown={noPan ? undefined : onStartPanCb}
          onMouseMove={onPanCb}
          onMouseUp={onStopPanCb}
          ref={initCanvasCb}
          width={renderingContext.width}
          height={renderingContext.height}>
          {children}
        </canvas>
      </div>
    </MapViewCtx.Provider>
  );
}
