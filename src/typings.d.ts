import { Geometry } from 'geojson';

declare module 'rtree' {
  // // Type definitions for rtree 1.4.0
  // Project: https://github.com/leaflet-extras/RTree
  // Definitions by: Omede Firouz <https://github.com/oefirouz>
  // Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

  export interface Rectangle {
    x: number;
    y: number;
    w: number;
    h: number;
  }

  export class RTree<T> {
    insert(bounds: Rectangle, element: T): boolean;
    remove(area: Rectangle, element?: T): any[];
    geoJSON(geoJSON: GeoJSON): void;
    bbox(arg1: any, arg2?: any, arg3?: number, arg4?: number): any[];
    search(area: Rectangle, return_node?: boolean, return_array?: any[]): any[];
    toJSON(printing?: string | number): string;
  }

  declare const rtreeLib: {
    (max_node_width?: number): RTree;
    fromJSON(json: string): RTree;
  };
  export default rtreeLib;
}

declare module 'opentype.js/dist/opentype.module' {
  export interface DrawOptions {}

  export class Font {
    public getPath(text: string, x: number, y: number, fontSize: number): unknown;
    public draw(
      ctx: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      fontSize: number,
      options: DrawOptions
    );
  }
  export function load(url: string, then: (err: unknown, font: Font) => void);
}

declare module 'jsts/org/locationtech/jts/io/GeoJSONReader' {
  export default class GeoJSONReader {
    constructor(geometryFactory?: jsts.geom.GeometryFactory);

    /**
     * Converts a GeoJSON to its <code>Geometry</code> representation.
     *
     * @param {Object} The GeoJSON representation of the Geometry.
     * @return {jsts.geom.Geometry}
     * geometry a <code>Geometry</code> to process.
     */
    read(geometry: Object): geom.Geometry;
  }
}

declare module 'jsts/org/locationtech/jts/io/GeoJSONWriter' {
  export default class GeoJSONWriter {
    /**
     * Writes the GeoJSON representation of a {@link Geometry}. The
     * The GeoJSON format is defined <A
     * HREF="http://geojson.org/geojson-spec.html">here</A>.
     * <p>
     * The <code>GeoJSONWriter</code> outputs coordinates rounded to the precision
     * model. Only the maximum number of decimal places necessary to represent the
     * ordinates to the required precision will be output.
     * <p>
     *
     * @see WKTReader
     * @constructor
     */
    constructor();

    /**
     * Converts a <code>Geometry</code> to its GeoJSON representation.
     *
     * @param {jsts.geom.Geometry}
     *          geometry a <code>Geometry</code> to process.
     * @return {Object} The GeoJSON representation of the Geometry.
     */
    write(geometry: geom.Geometry): Object;
  }
}

declare module 'jsts/org/locationtech/jts/operation/buffer/BufferOp' {
  export default class BufferOp {
    /**
     * A number of digits of precision which leaves some computational "headroom"
     * for floating point operations.
     *
     * This value should be less than the decimal precision of double-precision
     * values (16).
     *
     * @type {int}
     */
    static MAX_PRECISION_DIGITS: number;

    /**
     * Initializes a buffer computation for the given geometry with the given set of
     * parameters.
     *
     * @param {Geometry}
     *          g the geometry to buffer.
     * @param {BufferParameters}
     *          bufParams the buffer parameters to use.
     * @constructor
     */
    constructor(g: Geometry, bufParams: BufferParameters);

    /**
     * Compute a scale factor to limit the precision of a given combination of
     * Geometry and buffer distance. The scale factor is determined by a combination
     * of the number of digits of precision in the (geometry + buffer distance),
     * limited by the supplied <code>maxPrecisionDigits</code> value.
     *
     * @param {Geometry}
     *          g the Geometry being buffered.
     * @param {double}
     *          distance the buffer distance.
     * @param {int}
     *          maxPrecisionDigits the max # of digits that should be allowed by the
     *          precision determined by the computed scale factor.
     *
     * @return {double} a scale factor for the buffer computation.
     */
    static precisionScaleFactor(g: Geometry, distance: number, maxPrecisionDigits: number): number;

    /**
     * Computes the buffer of a geometry for a given buffer distance.
     *
     * @param {Geometry}
     *          g the geometry to buffer.
     * @param {double}
     *          distance the buffer distance.
     * @return {Geometry} the buffer of the input geometry.
     */
    static bufferOp(g: Geometry, distance: number): Geometry;

    /**
     * Computes the buffer for a geometry for a given buffer distance and accuracy
     * of approximation.
     *
     * @param {Geometry}
     *          g the geometry to buffer.
     * @param {double}
     *          distance the buffer distance.
     * @param {BufferParameters}
     *          params the buffer parameters to use.
     * @return {Geometry} the buffer of the input geometry.
     *
     */
    static bufferOp2(g: Geometry, distance: number, params: BufferParameters): Geometry;

    /**
     * Computes the buffer for a geometry for a given buffer distance and accuracy
     * of approximation.
     *
     * @param {Geometry}
     *          g the geometry to buffer.
     * @param {double}
     *          distance the buffer distance.
     * @param {int}
     *          quadrantSegments the number of segments used to approximate a
     *          quarter circle.
     * @return {Geometry} the buffer of the input geometry.
     *
     */
    static bufferOp3(g: Geometry, distance: number, quadrantSegments: number): Geometry;

    /**
     * Computes the buffer for a geometry for a given buffer distance and accuracy
     * of approximation.
     *
     * @param {Geometry}
     *          g the geometry to buffer.
     * @param {double}
     *          distance the buffer distance.
     * @param {int}
     *          quadrantSegments the number of segments used to approximate a
     *          quarter circle.
     * @param {int}
     *          endCapStyle the end cap style to use.
     * @return {Geometry} the buffer of the input geometry.
     *
     */
    static bufferOp4(
      g: Geometry,
      distance: number,
      quadrantSegments: number,
      endCapStyle: number
    ): Geometry;

    /**
     * Specifies the end cap style of the generated buffer. The styles supported are
     * {@link #CAP_ROUND}, {@link #CAP_BUTT}, and {@link #CAP_SQUARE}. The
     * default is CAP_ROUND.
     *
     * @param {int}
     *          endCapStyle the end cap style to specify.
     */
    setEndCapStyle(endCapStyle: number): void;

    /**
     * Sets the number of segments used to approximate a angle fillet
     *
     * @param {int}
     *          quadrantSegments the number of segments in a fillet for a quadrant.
     */
    setQuadrantSegments(quadrantSegments: number): void;

    /**
     * Returns the buffer computed for a geometry for a given buffer distance.
     *
     * @param {double}
     *          dist the buffer distance.
     * @return {Geometry} the buffer of the input geometry.
     */
    getResultGeometry(dist: number): Geometry;

    /**
     * @param {int}
     *          precisionDigits
     */
    bufferReducedPrecision2(precisionDigits: number): void;

    /**
     * @param {PrecisionModel}
     *          fixedPM
     */
    bufferFixedPrecision(fixedPM: PrecisionModel): void;
  }
}
