import { Feature, Geometry, Polygon, Position } from 'geojson';
import { Graphic, GraphicSize, MarkGraphic, NORTH, WellKnownName } from '../model/Graphic';
import { resolveParameter } from '../model/Parameter';
import { toPixel } from '../model/Uom';
import { computeContext, SeRenderingContext } from './renderer';

import pointOnFeature from '@turf/point-on-feature';
import { drawFill } from './fillRenderer';
import { drawStroke } from './strokeRenderer';
import { getEllipse } from './WellKnownShape';
import { applyToEachPoint, TransformPoint } from '../geom/transform';

function getPointOnLine(line: Position[]): Position {
  // TODO: crop visible part of line and compute one point in the middle
  return line[0];
}

function getPointInPolygon(polygon: Position[][]): Position {
  // TODO: intersect with extent and get most inner point
  const g: Geometry = {
    type: 'Polygon',
    coordinates: polygon,
  };
  return pointOnFeature(g).geometry.coordinates;
  //return centerOfMass(g).geometry.coordinates;
}

export function getAllPoints(geometry: Geometry, onVertex: boolean): Position[] {
  switch (geometry.type) {
    case 'Point':
      return [geometry.coordinates];
    case 'MultiPoint':
      return geometry.coordinates;
    case 'LineString':
      return onVertex ? geometry.coordinates : [getPointOnLine(geometry.coordinates)];
    case 'MultiLineString':
      return onVertex
        ? geometry.coordinates.flatMap((g) => g)
        : geometry.coordinates.map(getPointOnLine);
    case 'Polygon':
      return onVertex
        ? geometry.coordinates.flatMap((g) => g)
        : [getPointInPolygon(geometry.coordinates)];
    case 'MultiPolygon':
      return geometry.coordinates.flatMap((polygon) =>
        onVertex ? polygon.flatMap((g) => g) : [getPointInPolygon(polygon)]
      );
    case 'GeometryCollection':
      return [];
  }
}

const SQRT_3 = 1.7320508075688772;

function computeSize(
  size: GraphicSize | undefined,
  wellKnownShape: WellKnownName,
  feature: Feature,
  context: SeRenderingContext
): { width: number; height: number } {
  if (size == null) {
    if (wellKnownShape === 'triangle') {
      return {
        height: 1.5 * SQRT_3,
        width: 3,
      };
    } else {
      return {
        height: 3,
        width: 3,
      };
    }
  }
  const myContext = computeContext(size, context);
  if (size.type === 'Size') {
    const x = toPixel(resolveParameter(size.size, feature), myContext);
    if (wellKnownShape === 'triangle') {
      return {
        height: x * SQRT_3,
        width: x,
      };
    } else {
      return {
        height: x,
        width: x,
      };
    }
  } else if (size.type === 'ViewBox') {
    return {
      height: toPixel(resolveParameter(size.height, feature), myContext),
      width: toPixel(resolveParameter(size.width, feature), myContext),
    };
  }
  return {
    height: 3,
    width: 3,
  };
}

export function drawMarkGraphic(
  graphic: MarkGraphic,
  onVertex: boolean,
  angle_rad: number,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  const points = getAllPoints(geometry, onVertex);
  const myContext = computeContext(graphic, context);

  const wellKnownName = resolveParameter(graphic.wellKnownName, feature);

  const size = computeSize(graphic.size, wellKnownName, feature, myContext);

  let dx = 0;
  let dy = 0;
  const hw = size.width / 2;
  const hh = size.height / 2;

  if (
    graphic.anchorPosition === 'UPPER_RIGHT' ||
    graphic.anchorPosition === 'RIGHT' ||
    graphic.anchorPosition === 'LOWER_RIGHT'
  ) {
    dx = hw;
  } else if (
    graphic.anchorPosition === 'UPPER_LEFT' ||
    graphic.anchorPosition === 'LEFT' ||
    graphic.anchorPosition === 'LOWER_LEFT'
  ) {
    dx = -hw;
  }

  if (
    graphic.anchorPosition === 'UPPER_LEFT' ||
    graphic.anchorPosition === 'TOP' ||
    graphic.anchorPosition === 'UPPER_RIGHT'
  ) {
    dy = -hh;
  } else if (
    graphic.anchorPosition === 'LOWER_LEFT' ||
    graphic.anchorPosition === 'BOTTOM' ||
    graphic.anchorPosition === 'LOWER_RIGHT'
  ) {
    dy = hh;
  }

  let rotateFn: TransformPoint | null;

  if (angle_rad != NORTH) {
    const cos = Math.cos(angle_rad);
    const sin = Math.sin(angle_rad);

    rotateFn = ([x, y]: Position): Position => {
      return [x * cos - y * sin, x * sin + y * cos];
    };
  }

  points.forEach((point) => {
    // center of the shape
    const cx = point[0] + dx;
    const cy = point[1] + dy;
    let shape: Polygon = {
      type: 'Polygon',
      coordinates: [],
    };

    if (wellKnownName === 'circle') {
      shape.coordinates = getEllipse(size.width, size.height, 0, 0);
    } else if (wellKnownName === 'square') {
      shape.coordinates = [
        [
          [-hw, -hh],
          [+hw, -hh],
          [+hw, +hh],
          [-hw, +hh],
          [-hw, -hh],
        ],
      ];
    } else if (wellKnownName === 'triangle') {
      shape.coordinates = [
        [
          [-hw, +hh],
          [0, -hh],
          [hw, hh],
          [-hw, hh],
        ],
      ];
    }

    if (rotateFn != null) {
      shape = applyToEachPoint(shape, rotateFn);
    }

    shape = applyToEachPoint(shape, ([x, y]) => {
      return [x + cx, y + cy];
    });

    if (graphic.fill) {
      drawFill(graphic.fill, shape, feature, context);
    }
    if (graphic.stroke) {
      drawStroke(graphic.stroke, shape, feature, context);
    }
  });
}

export function drawGraphic(
  graphic: Graphic,
  onVertex: boolean = false,
  angle_rad: number,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  if (graphic.type === 'MarkGraphic') {
    drawMarkGraphic(graphic, onVertex, angle_rad, geometry, feature, context);
  } else {
    //checkUnreachable(fill);
  }
}

export function drawGraphics(
  graphics: Graphic[],
  onVertex: boolean = false,
  angle_rad: number,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  graphics.forEach((graphic) => {
    drawGraphic(graphic, onVertex, angle_rad, geometry, feature, context);
  });
}
