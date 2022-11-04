import {Position} from "geojson";
import * as React from "react";
import {add, mul, sub} from "../geom/helpers";
import {getLogger} from "../logger";
import {Style} from "../model/rule";
import {getGroundToPixelFactor, getPixelToGroundFactor} from "../model/Uom";
import {Extent, render, SeRenderingContext} from "../renderer/renderer";
import {LayerId, MapCtx } from "./MapDefinition";

const logger = getLogger("MapView");

interface IdlePanState {
  type: 'idle',
}

interface LivePanState {
  type: 'pan';
  /** media coordinate */
  startPosition: Position;
  initialExtent: Extent;
}

type PanState = IdlePanState | LivePanState;

function getMediaPosition(container: HTMLDivElement, e: React.MouseEvent): Position {
  const {left, top} = container.getBoundingClientRect();
  return [e.clientX - left, e.clientY - top];
}

export interface MapViewContext {
  registerLayer: (
    layerId: LayerId,
    style: Style,
    index: number,
    visible: boolean,
  ) => void;
  deleteLayer: (layerId: LayerId) => void;
}

export const MapViewCtx = React.createContext<MapViewContext>({
  registerLayer: () => "",
  deleteLayer: () => {},
});

interface StyledLayerInternal {
  layerId: LayerId;
  style: Style;
  index: number;
  visible: boolean;
}

export interface MapViewProps {
  center?: Position;
  scaleDenom?: number;
  className: string;
  children: React.ReactNode;
  noPan?: boolean;
  noZoom?: boolean;
}

function computeExtent(center: Position, context: SeRenderingContext): Extent {
  const factor = context.pixelToGroundFactor;
  const halfGndSize: Position = mul(
    factor * 0.5,
    [
      context.width,
      context.height,
    ]);
  const newExtent: Extent = [
    center[0] - halfGndSize[0],
    center[1] - halfGndSize[1],
    center[0] + halfGndSize[0],
    center[1] + halfGndSize[1],
  ];
  logger.info("ComputeExtent: ", {center, halfGndSize, newExtent})
  return newExtent;
}

/**
 * MapView
 */
export default function MapView({
  className,
  center: initialCenter,
  scaleDenom: initialScaleDenom = 25000,
  children,
  noPan=false,
  noZoom=false,
}: MapViewProps): JSX.Element {
  const [layers, setLayers] = React.useState<StyledLayerInternal[]>([]);

  const {getFeatures, groundUnit} = React.useContext(MapCtx);

  const [groundMousePos, setGroundMousePos] = React.useState<Position>([0, 0]);
  //const [center, setCenter] = React.useState<Position>([0, 0]);

  const [renderingContext, setRenderingContext] =
    React.useState<SeRenderingContext>({
      canvas: undefined,
      dpi: 96,
      groundExtent: [0, 0, 0, 0],
      height: 0,
      width: 0,
      groundUnit: 'm',
      scaleDenom: initialScaleDenom,
      uom: "PX",
      groundToPixelFactor: 1, // TODO
      pixelToGroundFactor: 1, // TODO
    });

  React.useEffect(() => {
    setRenderingContext(ctx => {
      const newContext: SeRenderingContext = {
        ...ctx,
        groundUnit: groundUnit,
      };
      newContext.groundToPixelFactor = getGroundToPixelFactor(newContext);
      newContext.pixelToGroundFactor = getPixelToGroundFactor(newContext);
      return newContext;
    })
  }, [groundUnit])

  const contextRef = React.useRef(renderingContext);
  contextRef.current = renderingContext;

  const initCanvasCb = React.useCallback((ref: HTMLCanvasElement | null) => {
    setRenderingContext((c) => ({
      ...c,
      canvas: ref?.getContext("2d") || undefined,
    }));
  }, []);

  const registerLayerCb = React.useCallback(
    (layerId: LayerId, style: Style, index: number, visible: boolean) => {
      logger.info(`Register StyledLayer ${layerId}`);
      setLayers((layers) => {
        const newLayers = [...layers];
        const index = newLayers.findIndex((l) => l.layerId === layerId);

        if (index < 0) {
          newLayers.push({
            index,
            layerId,
            style,
            visible,
          });
        } else {
          newLayers[index] = {
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

  const deleteLayerCb = React.useCallback((layerId: LayerId) => {
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

  const [mapViewContext] = React.useState<MapViewContext>({
    registerLayer: registerLayerCb,
    deleteLayer: deleteLayerCb,
  });

  const containerRef = React.useRef<HTMLDivElement>();
  const roRef = React.useRef<ResizeObserver>();

  const updateExtent = React.useCallback(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      const {width, height} = container.getBoundingClientRect();
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
  }, []);


  /* Make sure to adapt canvas size ot the container size */
  const initContainerRef = React.useCallback((container: HTMLDivElement | null) => {
    containerRef.current = container || undefined;

    if (roRef.current) {
      roRef.current.disconnect();
    }
    updateExtent();

    if (container) {
      const ro = new ResizeObserver((x) => {
        updateExtent();
      });
      ro.observe(container);
    }
  }, []);

  // MapView Render Effect
  React.useEffect(() => {
    const ctx = renderingContext.canvas;
    if (ctx) {
      ctx.clearRect(0, 0, renderingContext.width, renderingContext.height);
      layers
        .filter((layer) => layer.visible)
        .sort((a, b) => a.index - b.index)
        .forEach((layer) => {
          const data = getFeatures(layer.layerId, renderingContext.groundExtent);
          //          const data = layersData[layer.layerId];
          if (data) {
            render(data, layer.style, renderingContext);
          } else {
            logger.warn(`Render Layer ${layer.layerId}: No Data`);
          }
        });
    }
  }, [layers, renderingContext, groundUnit]);

  const onClickCb = React.useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const {left, top} = containerRef.current.getBoundingClientRect();
      logger.info("Click at media coord ", e.clientX - left, e.clientY - top);
    }
  }, []);

  const panRef = React.useRef<PanState>({
    type: 'idle'
  });

  const onStartPanCb = React.useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      const position = getMediaPosition(containerRef.current, e);
      logger.info("Start Pan at ", position);
      panRef.current = {
        type: 'pan',
        startPosition: position,
        initialExtent: [...contextRef.current.groundExtent]
      }
    }
  }, []);
  const onPanCb = React.useCallback((e: React.MouseEvent) => {
    if (containerRef.current) {
      if (panRef.current.type === 'pan' && e.buttons === 1) {
        //if (e.buttons === 1) {
        const position = getMediaPosition(containerRef.current, e);
        //throttle !
        logger.debug("Move Pan at ", position, e.buttons);
        const groundDelta = mul(contextRef.current.pixelToGroundFactor, sub(panRef.current.startPosition, position));
        groundDelta[1] = -groundDelta[1];
        const extent = panRef.current.initialExtent;
        const size: Position = [
          extent[2] - extent[0],
          extent[3] - extent[1]
        ];
        const topLeft: Position = [
          extent[0],
          extent[1]
        ];
        const newTopLeft = add(topLeft, groundDelta);
        const newBottomRight = add(newTopLeft, size);
        const newExtent: Extent = [
          newTopLeft[0],
          newTopLeft[1],
          newBottomRight[0],
          newBottomRight[1],
        ];
        logger.debug("new ", {topLeft, groundDelta, newTopLeft, size, newExtent})
        setRenderingContext(current => ({
          ...current,
          groundExtent: newExtent,
        }))
      } else {
        logger.info("Cancel Move");
        panRef.current = {
          type: 'idle',
        };
        const mousePosition = getMediaPosition(containerRef.current, e);
        mousePosition[1] = contextRef.current.height - mousePosition[1];

        const delta = mul(contextRef.current.pixelToGroundFactor, mousePosition)

        const gndMousePosition = add([
          contextRef.current.groundExtent[0],
          contextRef.current.groundExtent[1],
        ], delta);
        setGroundMousePos(gndMousePosition);

        //}
      }
    }
  }, []);

  const onStopPanCb = React.useCallback((e: React.MouseEvent) => {
    logger.debug("Move Stop", e.buttons);
    if (containerRef.current && panRef.current.type === 'pan') {
      // const position = getMediaPosition(containerRef.current, e);
      // logger.info("Stop Pan at ", position);
      panRef.current = {
        type: 'idle',
      }
      //e.stopPropagation();
    }
  }, []);

  const onWheelCb = React.useCallback((e: React.WheelEvent) => {
    if (containerRef.current) {
      const context = contextRef.current;

      const mousePosition = getMediaPosition(containerRef.current, e);
      mousePosition[1] = context.height - mousePosition[1];

      const gndMousePositionDelta = mul(context.pixelToGroundFactor, mousePosition);

      logger.info("Media mousePosition ", mousePosition);
      logger.info("GndMousePositionDelta  ", gndMousePositionDelta);

      const gndMousePosition = add([
        context.groundExtent[0],
        context.groundExtent[1],
      ], gndMousePositionDelta);
      logger.info("GndMousePosition  ", gndMousePosition);

      const scaleFactor = e.deltaY > 0 ? 2 : 0.5;
      const newScaleDenom = context.scaleDenom * scaleFactor;
      logger.info("Scale: ", context.scaleDenom, " => ", newScaleDenom);

      const newGndMousePositionDelta = mul(scaleFactor, gndMousePositionDelta);
      logger.info("newGndMousePositionDelta  ", newGndMousePositionDelta);

      const newGndSize: Position = mul(
        newScaleDenom,
        [
          context.width,
          context.height
        ]);
      logger.info("New Ground Size  ", newGndSize);
      const newGroundMin = sub(gndMousePosition, newGndMousePositionDelta);
      logger.info("New Ground min  ", newGroundMin);

      const [xMin, yMin] = newGroundMin;
      logger.info("New Extent min  ", {xMin, yMin});

      const newGroundExtent: Extent = [xMin, yMin, xMin + newGndSize[0], yMin + newGndSize[1]];
      logger.info("Pre Extent", context.groundExtent);
      logger.info("New Extent", newGroundExtent);

      setRenderingContext(context => {
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
      <div className={className} ref={initContainerRef}
        onClick={onClickCb}
        onWheel={noZoom ? undefined : onWheelCb}
      >
        <div className='mapview-overlay'>
          <div>{groundMousePos.join("; ")}</div>
          <div>{renderingContext.groundExtent.join("; ")}</div>
          <div>{`1:${renderingContext.scaleDenom}`}</div>
        </div>
        <canvas
          onMouseDown={noPan ? undefined : onStartPanCb }
          onMouseMove={onPanCb}
          onMouseUp={onStopPanCb}
          ref={initCanvasCb}
          width={renderingContext.width}
          height={renderingContext.height}
        >
          {children}
        </canvas>
      </div>
    </MapViewCtx.Provider>
  );
}
