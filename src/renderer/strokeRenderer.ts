import { Feature, Geometry, Position } from 'geojson';

import lineOffset from '@turf/line-offset';
import lineToPolygon from '@turf/line-to-polygon';

import { checkUnreachable } from '../helper';

import { computeContext, SeRenderingContext } from './renderer';
import { getColor, resolveParameter } from '../model/Parameter';
import {
  DEFAULT_CAP,
  DEFAULT_JOIN,
  GraphicStroke,
  PenStroke,
  RelativeOrientation,
  Stroke,
} from '../model/Stroke';
import { toPixel } from '../model/Uom';
import { drawFill } from './fillRenderer';
import { drawGraphics } from './graphicRenderer';
import getLogger from '../logger';
import { splitLine } from '../geom/split-line';
import { NORTH, SOUTH, WEST } from '../model/Graphic';

const logger = getLogger('StrokeRenderer');
logger.setLevel(2);

function getAllLines(geometry: Geometry): Position[][] {
  const allGeoms: Position[][] = [];

  switch (geometry.type) {
    case 'Polygon':
    case 'MultiLineString':
      return [...geometry.coordinates];
    case 'MultiPolygon':
      // all rings
      geometry.coordinates.forEach((polygon) => {
        allGeoms.push(...polygon);
      });
      break;
    case 'LineString':
      return [geometry.coordinates];
      break;
  }
  return allGeoms;
}

export function setStrokeStyke(context: SeRenderingContext, stroke: PenStroke, feature: Feature) {
  const ctx = context.canvas;

  if (ctx == null) {
    return;
  }

  const newContext = computeContext(stroke, context);

  if (stroke.fill.type === 'SolidFill') {
    // quite simple to stroke with a plain old color
    if (stroke.dashArray) {
      ctx.setLineDash(
        resolveParameter(stroke.dashArray, feature)
          .split(' ')
          .map((seg) => toPixel(Number(seg), newContext))
      );
    } else {
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = getColor(stroke.fill.color, stroke.fill.opacity ?? 1);
    ctx.lineWidth = toPixel(resolveParameter(stroke.width, feature), newContext);
    ctx.lineDashOffset = resolveParameter(stroke.dashOffset, feature) ?? 0;
    ctx.lineCap = stroke.lineCap || DEFAULT_CAP;
    ctx.lineJoin = stroke.lineJoin || DEFAULT_JOIN;
  }
}

export function drawPenStroke(
  stroke: PenStroke,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  const ctx = context.canvas;

  if (ctx == null) {
    return;
  }

  const newContext = computeContext(stroke, context);

  const allGeoms = getAllLines(geometry);

  if (stroke.fill.type === 'SolidFill') {
    setStrokeStyke(context, stroke, feature);

    allGeoms.forEach((feature) => {
      if (feature.length > 1) {
        ctx.beginPath();
        const [first, ...others] = feature;
        ctx.moveTo(first[0], first[1]);
        others.forEach((p) => ctx.lineTo(p[0], p[1]));
        //ctx.closePath();
        ctx.stroke();
      }
    });
  } else {
    // TODO create extra geometry (Multi)Polygon and fill them
    const lineWidth = toPixel(resolveParameter(stroke.width, feature), newContext);
    const half = lineWidth / 2;
    allGeoms.forEach((geom) => {
      const line: Geometry = {
        type: 'LineString',
        coordinates: geom,
      };
      // TODO: lineCap
      const l1 = lineOffset(line, -half, { units: 'degrees' });
      const l2 = lineOffset(line, half, { units: 'degrees' });
      const strokeArea_L: Geometry = {
        type: 'MultiLineString',
        coordinates: [l1.geometry.coordinates, l2.geometry.coordinates],
      };
      const strokeArea = lineToPolygon(strokeArea_L);
      drawFill(stroke.fill, strokeArea.geometry, feature, newContext);
    });
  }
}

export function drawGraphicStroke(
  stroke: GraphicStroke,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  const newContext = computeContext(stroke, context);
  const distance = toPixel(resolveParameter(stroke.distance, feature) || 0, newContext) || 10; // fetch natural length of the graphic collection
  //TODO
  stroke.overlapMark; // ???

  const geoms = getAllLines(geometry);

  const orientation: RelativeOrientation = stroke.orientation || 'PORTRAYAL';
  const computeAngle = orientation != 'PORTRAYAL';

  geoms.forEach((geom) => {
    logger.debug('Geom to GraphicStroke', geom);
    const chunks = splitLine(geom, distance, {
      mode: 'adjust',
      computeAngle,
    });
    logger.info(' => ', chunks);
    chunks.forEach((point) => {
      let angle = point.angle_rad;

      if (orientation === 'LINE') {
        angle += SOUTH;
        if (angle > Math.PI) {
          angle -= 2 * Math.PI;
        }
      }

      if (orientation === 'LINE_UP') {
        logger.info('Angle ', angle, { NORTH, SOUTH });
        if (angle > 0 && angle < WEST) {
          logger.info('Upside down');
          angle += Math.PI;
        }
        angle += SOUTH;
      }

      if (orientation === 'NORMAL_UP') {
        if (angle < NORTH || angle > SOUTH) {
          angle += Math.PI;
        }
      }

      drawGraphics(
        stroke.graphics,
        false,
        angle,
        { type: 'Point', coordinates: point.point },
        feature,
        newContext
      );
    });
  });
}

export function drawStroke(
  stroke: Stroke,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  if (stroke.type === 'PenStroke') {
    drawPenStroke(stroke, geometry, feature, context);
  } else if (stroke.type === 'GraphicStroke') {
    drawGraphicStroke(stroke, geometry, feature, context);
  } else {
    checkUnreachable(stroke);
  }
}
