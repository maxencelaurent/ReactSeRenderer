import { toMeter } from '../geom/transform';
import { SeRenderingContext } from '../renderer/renderer';

export type Uom = 'IN' | 'MM' | 'PT' | 'GM' | 'GFT' | 'PERCENT' | 'PX';

export interface WithUom {
  uom?: Uom;
}

export const PT_IN_INCH = 72.0;
export const MM_IN_INCH = 25.4;
export const IN_IN_FOOT = 12;
export const ONE_THOUSAND = 1000;
export const ONE_HUNDRED = 100;

type UomUrn =
  | 'urn:ogc:def:uom:se::in'
  | 'urn:ogc:def:uom:se::px'
  | 'urn:ogc:def:uom:se::pt'
  | 'urn:ogc:def:uom:se::percent'
  | 'urn:ogc:def:uom:se::gm'
  | 'urn:ogc:def:uom:se::gf';

///**
// * Build an {@code Uom} from a OGC code that represents a unit of measure.
// *
// * @param unitOfMeasure
// * @return
// */
//export function fromOgcURN(unitOfMeasure: UomUrn): Uom {
//  switch (unitOfMeasure) {
//    case "urn:ogc:def:uom:se::in":
//      return "IN";
//    case "urn:ogc:def:uom:se::px":
//      return "PX";
//    case "urn:ogc:def:uom:se::pt":
//      return "PT";
//    case "urn:ogc:def:uom:se::percent":
//      return "PERCENT";
//    case "urn:ogc:def:uom:se::gm":
//      return "GM";
//    case "urn:ogc:def:uom:se::gf":
//      return "GFT";
//    default:
//      return "MM";
//  }
//}
//
///**
// * Build an OGC code that represents a unit of measure from this
// * {@code Uom}.
// *
// * @return
// */
//export function toURN(uom: Uom): UomUrn {
//  return "urn:ogc:def:uom:se::" + uom.toLowerCase();
//}

/**
 * Convert a value to the corresponding value in pixel
 *
 * Note that converting ground unit to pixel is done by using a constant
 * scale
 *
 * @param value the value to convert
 * @param uom unit of measure for value
 * @param dpi the current resolution
 * @param scale the current scale (for converting ground meters and ground
 * feet to media units)
 * @param v100p the value to return when uom is "percent" and value is 100
 * (%)
 * @return
 * @throws Error
 *
 * @todo return integer !!!
 */
export function toPixel(
  value: number,
  { uom, dpi, scaleDenom }: Pick<SeRenderingContext, 'uom' | 'dpi' | 'scaleDenom'>,
  v100p?: number
): number {
  if (uom == null || uom === 'PX') {
    return value; // no uom ? => return as Pixel !
  }

  if (dpi <= 0) {
    throw new Error('DPI is invalid');
  }

  switch (uom) {
    case 'IN':
      return value * dpi; // [IN] * [PX]/[IN] => [PX]
    case 'MM':
      return (value / MM_IN_INCH) * dpi; // [MM] * [IN]/[MM] * [PX]/[IN] => [PX]
    case 'PT': // 1PT == 1/72[IN] whatever dpi is
      return (value / PT_IN_INCH) * dpi; // 1/72[IN] * 72 *[PX]/[IN] => [PX]
    case 'GM':
      if (scaleDenom <= 0) {
        throw new Error('Scale is invalid');
      }
      return (value * ONE_THOUSAND * dpi) / (scaleDenom * MM_IN_INCH);
    case 'GFT':
      if (scaleDenom <= 0) {
        throw new Error('Scale is invalid');
      }
      return (value * IN_IN_FOOT * dpi) / scaleDenom;
    case 'PERCENT':
      return v100p != null ? (value * v100p) / ONE_HUNDRED : value;
    default:
      return value; // never
  }
}

export function getGroundToPixelFactor(
  context: Pick<SeRenderingContext, 'groundUnit' | 'dpi' | 'scaleDenom'>
): number {
  return toPixel(toMeter[context.groundUnit], {
    uom: 'GM',
    dpi: context.dpi,
    scaleDenom: context.scaleDenom,
  });
}

export function getPixelToGroundFactor(
  context: Pick<SeRenderingContext, 'groundUnit' | 'dpi' | 'scaleDenom'>
): number {
  return (
    (MM_IN_INCH * context.scaleDenom) / (context.dpi * ONE_THOUSAND * toMeter[context.groundUnit])
  );
}
