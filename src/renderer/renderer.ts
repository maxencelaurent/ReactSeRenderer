import lineOffset from '@turf/line-offset';

import GeoJSONReader from 'jsts/org/locationtech/jts/io/GeoJSONReader';
import GeoJSONWriter from 'jsts/org/locationtech/jts/io/GeoJSONWriter';
import BufferOp from 'jsts/org/locationtech/jts/operation/buffer/BufferOp';

import {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  LineString,
  Position,
} from 'geojson';
import { LayerId, MapUnit, WMTSLayerData } from '../Map/MapDefinition';
import { add, mul } from '../geom/helpers';
import { applyToEachPoint } from '../geom/transform';
import { checkUnreachable } from '../helper';
import { ParameterValue, resolveParameter } from '../model/Parameter';
import {
  AreaSymbolizer,
  LineSymbolizer,
  PointSymbolizer,
  Symbolizer,
  TextSymbolizer,
} from '../model/Symbolizer';
import { Uom, WithUom, getPixelToGroundFactor, toPixel } from '../model/Uom';
import { Rule, Style } from '../model/rule';
import { drawFill } from './fillRenderer';
import { drawGraphics } from './graphicRenderer';
import { drawStroke } from './strokeRenderer';
import { drawText } from './textRenderer';

import { TileMatrix } from '../Map/WmtsUtils';
import { NORTH } from '../model/Graphic';
import { Label } from '../model/Label';

// minX. minY, maxY, maxY
export type Extent = [number, number, number, number];

export function computeContext({ uom }: WithUom, context: SeRenderingContext) {
  const myUom = uom || context.uom;
  return myUom === context.uom
    ? context
    : {
        ...context,
        uom: myUom,
      };
}

export interface SeRenderingContext {
  width: number;
  height: number;
  uom: Uom;
  scaleDenom: number;
  dpi: number;
  groundUnit: MapUnit;
  pixelToGroundFactor: number;
  groundToPixelFactor: number;
  layerId: string;
  registerLabel: (
    localRenderingContext: SeRenderingContext,
    geometry: Geometry,
    feature: Feature,
    label: Label
  ) => void;
  clearLabels: () => void;
  drawLabels: () => void;
  getCanvas: (layerId: LayerId) => CanvasRenderingContext2D | undefined;
  getLabelCanvas: () => CanvasRenderingContext2D | undefined;
  flatten: () => void;
  groundExtent: Extent;
}

function applyPerpendicalarOffset<G extends Geometry = Geometry, P = GeoJsonProperties>(
  feature: Feature<G, P>,
  pOffset: number | undefined
): Feature<G, P> {
  if (!pOffset) {
    return feature;
  } else {
    if (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString') {
      return lineOffset(feature as Feature<LineString>, pOffset, { units: 'degrees' }) as Feature<
        G,
        P
      >;
    } else if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
      const reader = new GeoJSONReader();
      const geom = reader.read(feature.geometry);
      const buffered = BufferOp.bufferOp(geom, pOffset);
      const writer = new GeoJSONWriter();
      const result = writer.write(buffered);

      const x: Feature<G, P> = {
        ...feature,
        geometry: result as G,
      };
      return x;
    }
    return feature;
  }
}

function forEachFeature<G extends Geometry = Geometry, P = GeoJsonProperties>(
  features: Feature<G, P>[],
  perpendicularOffset: ParameterValue<number> | undefined,
  context: SeRenderingContext,
  fn: (feature: Feature<G, P>) => void
): void {
  features.forEach((feature) => {
    const pOffset = toPixel(resolveParameter(perpendicularOffset, feature) || 0, context);
    const pFeat = applyPerpendicalarOffset(feature, pOffset);
    fn(pFeat);
  });
}

function renderAreaSymbolizer(
  layer: FeatureCollection,
  { fill, stroke, perpendicularOffset }: AreaSymbolizer,
  context: SeRenderingContext
) {
  if (fill || stroke) {
    forEachFeature(layer.features, perpendicularOffset, context, (feature) => {
      if (fill) {
        drawFill(fill, feature.geometry, feature, context);
      }
      if (stroke) {
        drawStroke(stroke, feature.geometry, feature, context);
      }
    });
  }
}

function renderLineSymbolizer(
  layer: FeatureCollection,
  { stroke, perpendicularOffset }: LineSymbolizer,
  context: SeRenderingContext
) {
  if (stroke) {
    forEachFeature(layer.features, perpendicularOffset, context, (feature) => {
      // TODO apply transform
      drawStroke(stroke, feature.geometry, feature, context);
    });
  }
}

function renderPointSymbolizer(
  layer: FeatureCollection,
  symbolizer: PointSymbolizer,
  context: SeRenderingContext
) {
  if (symbolizer.graphics) {
    layer.features.forEach((feature) => {
      // TODO apply transform
      drawGraphics(
        symbolizer.graphics,
        symbolizer.onVertex,
        NORTH,
        feature.geometry,
        feature,
        context
      );
    });
  }
}

function renderTextSymbolizer(
  layer: FeatureCollection,
  symbolizer: TextSymbolizer,
  context: SeRenderingContext
) {
  if (symbolizer.label) {
    forEachFeature(layer.features, symbolizer.perpendicularOffset, context, (feature) => {
      // TODO apply transform
      drawText(symbolizer.label, feature.geometry, feature, context);
    });
  }
}

function renderSymbolizer(
  layer: FeatureCollection,
  symbolizer: Symbolizer,
  context: SeRenderingContext
) {
  const newContext = computeContext(symbolizer, context);
  if (symbolizer.type === 'AreaSymbolizer') {
    renderAreaSymbolizer(layer, symbolizer, newContext);
  } else if (symbolizer.type === 'LineSymbolizer') {
    renderLineSymbolizer(layer, symbolizer, newContext);
  } else if (symbolizer.type === 'PointSymbolizer') {
    renderPointSymbolizer(layer, symbolizer, newContext);
  } else if (symbolizer.type === 'TextSymbolizer') {
    renderTextSymbolizer(layer, symbolizer, newContext);
  } else {
    checkUnreachable(symbolizer);
  }
}

function renderRule(layer: FeatureCollection, rule: Rule, context: SeRenderingContext) {
  rule.symbolizers
    .sort((a, b) => {
      return (a.level ?? 0) - (b.level ?? 0);
    })
    .forEach((symbolizer) => {
      renderSymbolizer(layer, symbolizer, context);
    });
}

function toMediaFeature(
  feature: Geometry,
  translate: Position,
  factor: number,
  context: SeRenderingContext
): Geometry {
  return applyToEachPoint(feature, (point: Position) => {
    const mPoint = mul(factor, add(point, translate));
    mPoint[1] = (mPoint[1] - context.height) * -1; // TODO: axis direction
    return mPoint;
  });
}

function convertToMediaCoordinateSystem(
  layer: FeatureCollection,
  context: SeRenderingContext
): FeatureCollection {
  const factor = context.groundToPixelFactor;

  const translate: Position = [-context.groundExtent[0], -context.groundExtent[1]];

  const mediaLayer: FeatureCollection = {
    type: 'FeatureCollection',
    features: layer.features.map((feature) => {
      return {
        ...feature,
        geometry: toMediaFeature(feature.geometry, translate, factor, context),
      };
    }),
  };

  return mediaLayer;
}

export function render(layer: FeatureCollection, style: Style, context: SeRenderingContext) {
  const rules = style.rules.filter((rule) => {
    if (rule.minScale != null && context.scaleDenom < rule.minScale) {
      return false;
    }
    if (rule.maxScale != null && context.scaleDenom > rule.maxScale) {
      return false;
    }
    // Apply filter
    return true;
  });

  // TODO:
  // forEach feature
  //    detect rules to apply
  // forEach rules
  //   render all features

  if (rules.length > 0) {
    // project to media coordinate system
    // generalize
    const mediaLayer = convertToMediaCoordinateSystem(layer, context);

    rules.forEach((rule) => {
      renderRule(mediaLayer, rule, context);
    });
  }
}

export function renderTiles(layer: WMTSLayerData, context: SeRenderingContext, opacity: number) {
  console.log('RENDER WMTS TILES', layer, context);
  let tmMin: TileMatrix | undefined = undefined as TileMatrix | undefined;
  let tmMax: TileMatrix | undefined = undefined as TileMatrix | undefined;
  layer.tileMatrixSet.TileMatrix.forEach((tm) => {
    if (tm.ScaleDenominator > context.scaleDenom) {
      tmMin = tm;
    } else {
      if (!tmMax) {
        tmMax = tm;
      }
    }
  });
  console.log('TileMatrix', tmMin, tmMax);
  const selectedTm = tmMin || tmMax;
  if (!selectedTm) {
    return;
  }
  console.log('Top Left', selectedTm.TopLeftCorner);
  console.log('Matrix', selectedTm.MatrixWidth, selectedTm.MatrixHeight);
  console.log('Tile', selectedTm.TileWidth, selectedTm.TileHeight);

  // WMTS spec 1px = 0.28mm; 0.28 mm => dpi= 25.4/ 0.28 inch
  const factor = getPixelToGroundFactor({
    dpi: 25.4 / 0.28, // context.dpi,
    groundUnit: context.groundUnit,
    scaleDenom: selectedTm.ScaleDenominator,
  });

  const groundTileHeight = selectedTm.TileHeight * factor;
  const groundTileWidth = selectedTm.TileWidth * factor;

  console.log(
    'Extent: ',
    context.groundExtent[0],
    '\t',
    context.groundExtent[1],
    '\t',
    context.groundExtent[2],
    '\t',
    context.groundExtent[3],
    '\t'
  );
  console.log('TileGround Size', groundTileWidth, groundTileHeight, context.groundUnit);
  const leftTileIndex = Math.max(
    0,
    Math.floor((context.groundExtent[0] - selectedTm.TopLeftCorner[0]) / groundTileWidth)
  );
  const rightTileIndex = Math.min(
    selectedTm.MatrixWidth - 1,
    Math.ceil((context.groundExtent[2] - selectedTm.TopLeftCorner[0]) / groundTileWidth)
  );
  const topTileIndex = Math.max(
    0,
    Math.floor((selectedTm.TopLeftCorner[1] - context.groundExtent[3]) / groundTileHeight)
  );

  const bottomTileIndex = Math.min(
    selectedTm.MatrixHeight - 1,
    Math.ceil((selectedTm.TopLeftCorner[1] - context.groundExtent[1]) / groundTileHeight)
  );

  // tileX = matrix.scale
  // eTileX = context.scale
  const tileWidthPx = groundTileWidth * context.groundToPixelFactor;
  const tileHeightPx = groundTileHeight * context.groundToPixelFactor;
  const canvas = context.getCanvas(layer.layerId);

  if (canvas) {
    const tiles: Promise<boolean>[] = [];
    canvas.globalAlpha = opacity;

    console.log('Tiles', leftTileIndex, topTileIndex, rightTileIndex, bottomTileIndex);
    if (leftTileIndex <= rightTileIndex && topTileIndex <= bottomTileIndex) {
      for (let x = leftTileIndex; x <= rightTileIndex; x++) {
        for (let y = topTileIndex; y <= bottomTileIndex; y++) {
          const url = layer.getTileUrl(selectedTm.Identifier, x, y);
          const img = document.createElement('img');
          const gridPx = tileToPixel(
            selectedTm,
            [groundTileWidth, groundTileHeight],
            x,
            y,
            context
          );

          const p = new Promise<boolean>((resolve) => {
            img.onload = () => {
              canvas.drawImage(img, gridPx[0], gridPx[1], tileWidthPx, tileHeightPx);
              resolve(true);
            };
            img.src = url;
          });

          tiles.push(p);
          console.log('tile ', url);
          console.log('Position', gridPx);
        }
      }
    } else {
      console.error('Tiles range is invalid');
    }
    Promise.all(tiles).then(() => {
      context.flatten();
      canvas.globalAlpha = 1;
    });
  }
}

function tileToPixel(
  matrix: TileMatrix,
  groundTileSize: Position,
  row: number,
  col: number,
  context: SeRenderingContext
): Position {
  const tileGroundCoord: Position = [
    matrix.TopLeftCorner[0] + row * groundTileSize[0],
    matrix.TopLeftCorner[1] - col * groundTileSize[1],
  ];
  console.log('');

  const factor = context.groundToPixelFactor;
  const translate: Position = [-context.groundExtent[0], -context.groundExtent[1]];

  const mPoint = mul(factor, add(tileGroundCoord, translate));
  mPoint[1] = (mPoint[1] - context.height) * -1; // TODO: axis direction
  return mPoint;
}
