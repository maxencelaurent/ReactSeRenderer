import { FeatureCollection, Position } from 'geojson';
import { MapUnit, WMTSLayerData } from '../Map/MapDefinition';
import createRTree, { RTree, Rectangle } from 'rtree';
import { TileMatrix } from '../Map/WmtsUtils';
import { getPixelToGroundFactor } from '../model/Uom';
import { mul } from '../geom/helpers';
import getLogger from '../logger';

type LayerId = string;
type URL = string;
type Tile = ImageBitmap;

type TileCache = Record<LayerId, Record<URL, Tile>>;

const logger = getLogger('WMTSCache');
logger.setLevel(4);

const cache: TileCache = {};

let simulateOffline = true;

let count = 0;
// let size = 0;

export function getTile<T>(
  layerId: string,
  url: URL,
  payload: T
): undefined | Tile | Promise<{ img: Tile; payload: T }> {
  const layerCache = (cache[layerId] = cache[layerId] || {});

  const cachedTile = layerCache[url];

  if (cachedTile) {
    return cachedTile;
  } else {
    count++;
    if (simulateOffline) {
      return undefined;
    }
    logger.trace('DownLoad ', layerId, url);

    // return fetch(url).then(async (res) => {
    //   const length = res.headers.get('Content-Length');
    //   size += +(length || 0);
    //   const bitmap = await createImageBitmap(await res.blob());
    //   layerCache[url] = bitmap;

    //   return { img: bitmap, payload };
    // });

    const img = document.createElement('img');
    const p = new Promise<{ img: Tile; payload: T }>((resolve) => {
      img.onload = async () => {
        const bitmap = await createImageBitmap(img);
        layerCache[url] = bitmap;
        resolve({ img: bitmap, payload });
      };
      img.src = url;
    });

    return p;
  }
}

export function computeGroundTileSize(tileMatrix: TileMatrix, groundUnit: MapUnit): Position {
  // WMTS spec 1px = 0.28mm; 0.28 mm => dpi= 25.4/ 0.28 inch
  const factor = getPixelToGroundFactor({
    dpi: 25.4 / 0.28, // context.dpi,
    groundUnit: groundUnit,
    scaleDenom: tileMatrix.ScaleDenominator,
  });

  return [tileMatrix.TileHeight * factor, tileMatrix.TileWidth * factor];
}

interface TileToProcess {
  n: number;
  fromTile: Position;
  toTile: Position;
}

async function processMatrix(
  layer: WMTSLayerData,
  rTree: RTree<unknown>,
  initialN: number,
  matrix: TileMatrix,
  initialFromTile: Position,
  initialToTile: Position,
  groundUnit: MapUnit
) {
  logger.trace(
    'ProcessMatrix',
    matrix,
    'with n=',
    initialN,
    'from',
    initialFromTile,
    ' to',
    initialToTile
  );
  if (initialN < 1) {
    throw new Error('No Way n less than 1');
  }
  if (matrix.MatrixHeight * matrix.MatrixWidth < 20) {
    // load all tiles
    logger.trace('Load all tiles for matrix', matrix);
    for (let x = 0; x < matrix.MatrixWidth; x += 1) {
      for (let y = 0; y < matrix.MatrixHeight; y += 1) {
        logger.trace('Load All: ', x, y);
        await getTile(layer.layerId, layer.getTileUrl(matrix.Identifier, x, y), undefined);
      }
    }
    return;
  }

  const queue: TileToProcess[] = [];
  queue.push({
    n: initialN,
    fromTile: initialFromTile,
    toTile: initialToTile,
  });
  while (queue.length) {
    const toProcess = queue.shift();
    logger.info('Queue length', queue.length);
    if (toProcess) {
      const { n, fromTile, toTile } = toProcess;
      const [left, top] = fromTile;
      const [right, bottom] = toTile;
      const groundTileSize = computeGroundTileSize(matrix, groundUnit);

      const nTilesSize = mul(n, groundTileSize);
      logger.trace('1-Tile GnSize', groundTileSize);
      logger.trace('N-Tile GnSize', nTilesSize);

      for (let x = left; x < right; x += n) {
        for (let y = top; y < bottom; y += n) {
          const rLeft = matrix.TopLeftCorner[0] + x * groundTileSize[0];
          const rBottom = matrix.TopLeftCorner[1] - y * groundTileSize[1] - nTilesSize[1];
          const rect: Rectangle = { x: rLeft, y: rBottom, w: nTilesSize[0], h: nTilesSize[1] };
          const objects = rTree.search(rect);
          logger.trace(
            `Search in tile (${x},${y}), ${rect.x}, ${rect.y}, ${rect.x + rect.w}, ${
              rect.y + rect.h
            }`
          );
          if (objects.length > 0) {
            logger.trace('NTiles containes features', x, y);
            // this (n)tiles contains features
            if (n === 1) {
              // let's feed the cache
              await getTile(layer.layerId, layer.getTileUrl(matrix.Identifier, x, y), undefined);
            } else {
              // Do deep in that direction

              queue.push({
                n: n / 2,
                fromTile: [x, y],
                toTile: [x + n, y + n],
              });
              //await processMatrix(layer, rTree, n / 2, matrix, [x, y], [x + n, y + n], groundUnit);
            }
          }
        }
      }
    }
  }
}

export async function preloadCache(
  layer: WMTSLayerData,
  feature: FeatureCollection,
  groundUnit: MapUnit
) {
  const rTree = createRTree();
  rTree.geoJSON(feature);
  simulateOffline = false;
  return;

  for (const matrix of layer.tileMatrixSet.TileMatrix.slice(-1)) {
    const nPow = Math.floor(Math.log2(Math.min(matrix.MatrixHeight, matrix.MatrixWidth) / 2));
    let n = 2 ** nPow;
    n = n < 1 ? 1 : n;
    logger.info(
      `Let's process matrix ${matrix.Identifier} 1/${matrix.ScaleDenominator} with n='${n}`
    );
    await processMatrix(
      layer,
      rTree,
      n,
      matrix,
      [0, 0],
      [matrix.MatrixWidth, matrix.MatrixHeight],
      groundUnit
    );
  }
  logger.info('Nb Cached Tiles: ', count);
  //logger.info('Size: ', size);

  simulateOffline = true;
}
