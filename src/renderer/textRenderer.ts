import { Feature, Geometry } from 'geojson';
import { Label } from '../model/Label';
import { resolveParameter } from '../model/Parameter';
import { toPixel } from '../model/Uom';
import { getAllPoints } from './graphicRenderer';
import { computeContext, SeRenderingContext } from './renderer';

import { Font, load } from 'opentype.js/dist/opentype.module';
import getLogger from '../logger';

const logger = getLogger('TextRenderer');
logger.setLevel(4);

let roboto: Font | undefined = undefined;

load('fonts/Roboto-Black.ttf', function (err, font) {
  if (err) {
    logger.error('Font could not be loaded: ' + err);
  } else {
    roboto = font;
    // logger.info("Font: ", font);
    // const path = font.getPath('Hello, World!', 0, 150, 72);
    // logger.info("Path: ", path);

    // If you just want to draw the text you can also use font.draw(ctx, text, x, y, fontSize).
    //path.draw(ctx);
  }
});

export function drawText(
  label: Label,
  geometry: Geometry,
  feature: Feature,
  context: SeRenderingContext
): void {
  const ctx = context.canvas;

  if (ctx) {
    //logger.info('Register Label');
    const myContext = computeContext(label, context);
    context.registerLabel(myContext, geometry, feature, label);
  }
}
