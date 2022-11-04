import lineOffset from "@turf/line-offset";

import BufferOp from "jsts/org/locationtech/jts/operation/buffer/BufferOp";
import GeoJSONReader from "jsts/org/locationtech/jts/io/GeoJSONReader";
import GeoJSONWriter from "jsts/org/locationtech/jts/io/GeoJSONWriter";

import {Feature, FeatureCollection, GeoJsonProperties, Geometry, LineString, Position} from "geojson";
import {checkUnreachable} from "../helper";
import {ParameterValue, resolveParameter} from "../model/Parameter";
import {Rule, Style} from "../model/rule";
import {
  AreaSymbolizer,
  LineSymbolizer,
  PointSymbolizer,
  Symbolizer,
  TextSymbolizer,
} from "../model/Symbolizer";
import {toPixel, Uom, WithUom} from "../model/Uom";
import {drawFill} from "./fillRenderer";
import {drawGraphics} from "./graphicRenderer";
import {drawStroke} from "./strokeRenderer";
import {drawText} from "./textRenderer";
import {add, mul} from "../geom/helpers";
import {applyToEachPoint, toMeter} from "../geom/transform";
import {MapUnit} from "../Map/MapDefinition";

import {getLogger} from "../logger";
import {NORTH} from "../model/Graphic";

const logger = getLogger("MapView");

// minX. minY, maxY, maxY
export type Extent = [number, number, number, number];

export function computeContext({uom}: WithUom, context: SeRenderingContext) {
  const myUom = uom || context.uom;
  return myUom === context.uom
    ? context
    : {
      ...context,
      uom: myUom,
    };
}

export interface SeRenderingContext {
  canvas: CanvasRenderingContext2D | undefined;
  groundExtent: Extent;
  width: number;
  height: number;
  uom: Uom;
  scaleDenom: number;
  dpi: number;
  groundUnit: MapUnit;
  pixelToGroundFactor: number;
  groundToPixelFactor: number;
}

function applyPerpendicalarOffset<G extends Geometry = Geometry, P = GeoJsonProperties>(
  feature: Feature<G, P>,
  pOffset: number | undefined
): Feature<G, P> {
  if (!pOffset) {
    return feature;
  } else {
    if (feature.geometry.type === 'LineString'
      || feature.geometry.type === 'MultiLineString') {
      return lineOffset(feature as Feature<LineString>, pOffset, {units: "degrees"}) as Feature<G, P>;
    } else if (feature.geometry.type === 'Polygon'
      || feature.geometry.type === 'MultiPolygon') {

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
  fn: (feature: Feature<G, P>,) => void
): void {
  features.forEach((feature) => {
    const pOffset = toPixel(resolveParameter(perpendicularOffset, feature) || 0, context);
    const pFeat = applyPerpendicalarOffset(feature, pOffset);
    fn(pFeat);
  });
}

function renderAreaSymbolizer(
  layer: FeatureCollection,
  {fill, stroke, perpendicularOffset}: AreaSymbolizer,
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
  {stroke, perpendicularOffset}: LineSymbolizer,
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
      drawText(
        symbolizer.label,
        feature.geometry,
        feature,
        context
      );
    });
  }
}


function renderSymbolizer(
  layer: FeatureCollection,
  symbolizer: Symbolizer,
  context: SeRenderingContext
) {
  const newContext = computeContext(symbolizer, context);
  if (symbolizer.type === "AreaSymbolizer") {
    renderAreaSymbolizer(layer, symbolizer, newContext);
  } else if (symbolizer.type === "LineSymbolizer") {
    renderLineSymbolizer(layer, symbolizer, newContext);
  } else if (symbolizer.type === "PointSymbolizer") {
    renderPointSymbolizer(layer, symbolizer, newContext);
  } else if (symbolizer.type === "TextSymbolizer") {
    renderTextSymbolizer(layer, symbolizer, newContext);
  } else {
    checkUnreachable(symbolizer);
  }
}

function renderRule(
  layer: FeatureCollection,
  rule: Rule,
  context: SeRenderingContext
) {
  rule.symbolizers
    .sort((a, b) => {
      return (a.level ?? 0) - (b.level ?? 0);
    })
    .forEach((symbolizer) => {
      renderSymbolizer(layer, symbolizer, context);
    });
}


function toMediaFeature(feature: Geometry, translate: Position, factor: number, context: SeRenderingContext): Geometry {
  return applyToEachPoint(feature, (point: Position) => {
    const mPoint = mul(factor, add(point, translate));
    mPoint[1] = (mPoint[1] - context.height) * -1; // TODO: axis direction
    return mPoint;
  });
}

function convertToMediaCoordinateSystem(layer: FeatureCollection, context: SeRenderingContext): FeatureCollection {
  const factor = context.groundToPixelFactor;

  const translate: Position = [
    -context.groundExtent[0],
    - context.groundExtent[1]];

  const mediaLayer: FeatureCollection = {
    type: 'FeatureCollection',
    features: layer.features.map(feature => {
      return {
        ...feature,
        geometry: toMediaFeature(feature.geometry, translate, factor, context)
      }
    })
  }

  return mediaLayer;
}

export function render(
  layer: FeatureCollection,
  style: Style,
  context: SeRenderingContext,
) {
  const rules = style.rules
    .filter((rule) => {
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
