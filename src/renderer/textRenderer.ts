import {Feature, Geometry} from "geojson";
import {Label} from "../model/Label";
import {resolveParameter} from "../model/Parameter";
import {toPixel} from "../model/Uom";
import {getAllPoints} from "./graphicRenderer";
import {computeContext, SeRenderingContext} from "./renderer";


import { Font, load } from 'opentype.js/dist/opentype.module';
import getLogger from "../logger";

const logger = getLogger('TextRenderer');
logger.setLevel(4);

let roboto: Font | undefined = undefined;

load('fonts/Roboto-Black.ttf', function(err, font) {
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

export function drawText(label: Label, geometry: Geometry, feature: Feature, context: SeRenderingContext): void {

  const ctx = context.canvas;

  if (ctx) {
    const points = getAllPoints(geometry, false);
    const myContext = computeContext(label, context);

    const fontSize = toPixel(resolveParameter(label.font?.fontSize || 12, feature), context) || 1

    label.fill;
    label.stroke

    ctx.fillStyle = 'black';
    if (label.halo) {
      ctx.shadowBlur = toPixel(resolveParameter(label.halo.radius || 0, feature), context) || 1
      ctx.shadowColor = 'hotpink';
    }

    const text = resolveParameter(label.textLabel, feature);
    //const metrics = ctx.measureText(text);
    // Stupid implementation: TODO do it
    // base on metrics, create an canvas. and create full-space shape
    // fill the shape and create pattern
    // use the patter to fillText

    points.forEach((point) => {
//      if (roboto) {
//        roboto.draw(ctx, text, point[0], point[1], fontSize,  {});
//        ctx.fillText(text, point[0], point[1]);
//      }
      if (label.fill) {
        ctx.fillText(text, point[0], point[1]);
      }

      if (label.stroke) {
        ctx.strokeText(text, point[0], point[1]);
      }
    });
    ctx.shadowBlur = 0;
    ctx.shadowColor = '';
  }
}