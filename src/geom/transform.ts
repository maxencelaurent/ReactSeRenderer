import {Geometry, LineString, MultiLineString, MultiPoint, MultiPolygon, Point, Polygon, Position} from 'geojson';
import proj4 from 'proj4';
import {checkUnreachable} from '../helper';
import getLogger from '../logger';
import {MapUnit} from '../Map/MapDefinition';
import epsgDefs from './epsgDefs.json';

const logger = getLogger("Transform");

export function loadProjection(projectionCode: string) {
  const projection = epsgDefs[projectionCode as keyof typeof epsgDefs];
  if (projection != null) {
    proj4.defs(projectionCode, projection);
  }
}

export function getProj(name: string): proj4.ProjectionDefinition | undefined {
  loadProjection(name);
  return proj4.defs(name);
}

export function getConverter(from: string, to: string){
  loadProjection(from);
  loadProjection(to);
  return proj4(from, to);
}


export const toMeter: Record<MapUnit, number> = {
  "us-ft":  1200 / 3937,
  degree: 111319.44444444,
  ft: 0.3048,
  m: 1,
}

export type TransformPoint = (point: Position) => Position;

function convertPoint(feature: Point, cb: TransformPoint): Geometry {
  return {
    type: 'Point',
    coordinates: cb(feature.coordinates)
  }
}

function convertLine(feature: LineString | MultiPoint, cb: TransformPoint): LineString | MultiPoint {
  return {
    type: feature.type,
    coordinates: feature.coordinates.map(point =>
      cb(point)
    )
  };
}

function convertPolygon(feature: MultiLineString | Polygon, cb: TransformPoint): MultiLineString | Polygon {
  return {
    type: feature.type,
    coordinates: feature.coordinates.map(points =>
      points.map(point =>
        cb(point)
      )
    )
  };
}

function convertMultiPolygon(feature: MultiPolygon, cb: TransformPoint): MultiPolygon {
  return {
    type: feature.type,
    coordinates: feature.coordinates.map(polygon =>
      polygon.map(
        points =>
          points.map(point =>
            cb(point)
          )
      )
    )
  };
}

export function applyToEachPoint<T extends Geometry = Geometry>(feature: T, cb: TransformPoint): T {
  switch (feature.type) {
    case 'Point':
      return convertPoint(feature, cb) as T;
    case 'MultiPoint':
    case 'LineString':
      return convertLine(feature, cb) as T;
    case 'MultiLineString':
    case 'Polygon':
      return convertPolygon(feature, cb) as T;
    case 'MultiPolygon':
      return convertMultiPolygon(feature, cb) as T;
    case 'GeometryCollection':
      return {
        type: 'GeometryCollection',
        geometries: feature.geometries.map(geom => applyToEachPoint(geom, cb))
      } as T;
    default:
      checkUnreachable(feature);
      throw new Error("Unreachable code");
  }
}
