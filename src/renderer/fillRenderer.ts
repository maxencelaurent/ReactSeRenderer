import { checkUnreachable } from '../helper';
import { Fill, HatchedFill } from '../model/Fill';

import { SolidFill } from '../model/Fill';

import { Feature, Geometry, Position } from 'geojson';
import { SeRenderingContext } from './renderer';
import { getColor } from '../model/Parameter';
import getLogger from '../logger';

const logger = getLogger('FillRenderer');

export function solidFillDraw(
  fill: SolidFill,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  const ctx = context.getCanvas(context.layerId);
  if (ctx == null) {
    logger.info('NoContext');
    return;
  }
  ctx.fillStyle = getColor(fill.color, fill.opacity ?? 1);

  let allGeoms: Position[][][] = [];

  logger.debug('The Geom: ', geometry);
  switch (geometry.type) {
    case 'Polygon':
      allGeoms.push(geometry.coordinates);
      break;
    case 'MultiPolygon':
      allGeoms = geometry.coordinates;
      break;
  }

  allGeoms.forEach((feature) => {
    ctx.beginPath();
    feature.forEach((part) => {
      const [first, ...others] = part;
      ctx.moveTo(first[0], first[1]);
      others.forEach((p) => {
        ctx.lineTo(p[0], p[1]);
      });
      ctx.closePath();
    });
    ctx.fill();
  });
}

export function hatchFillDraw(
  fill: HatchedFill,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  console.warn('HatchFill Not Yet Implemented', fill, geometry, feature, context);
}

export function drawFill(
  fill: Fill,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  if (fill.type === 'SolidFill') {
    solidFillDraw(fill, geometry, feature, context);
  } else if (fill.type === 'HatchedFill') {
    hatchFillDraw(fill, geometry, feature, context);
  } else {
    checkUnreachable(fill);
  }
}
