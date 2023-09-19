import {
  FeatureCollection,
  MultiPolygon,
  MultiLineString,
  Polygon,
  LineString,
  Point,
  Position,
  Feature,
  GeoJsonProperties,
  MultiPoint,
} from 'geojson';
import LayerDefinition from './Map/LayerDefinition';

import * as React from 'react';
import './styles.css';
import MapDefinition from './Map/MapDefinition';
import MapView from './Map/MapView';
import StyledLayer from './Map/StyledLayer';
import { Style } from './model/rule';

import buildings from './data/buildings';
import roads from './data/roads';
import chaumont from './data/chaumont.json';
import paths from './data/path';
import WMTSLayerDefinition from './Map/WMTSLayerDefinition';
import WMTSLayer from './Map/WMTSLayer';

interface MyProperties {
  label: string;
}

export function point<P = GeoJsonProperties>(coords: Position, properties: P): Feature<Point, P> {
  return {
    type: 'Feature',
    properties: properties,
    geometry: {
      type: 'Point',
      coordinates: coords,
    },
  };
}

export function multiPoint<P = GeoJsonProperties>(
  coords: Position[],
  properties: P
): Feature<MultiPoint, P> {
  return {
    type: 'Feature',
    properties: properties,
    geometry: {
      type: 'MultiPoint',
      coordinates: coords,
    },
  };
}

export function line<P = GeoJsonProperties>(
  coords: Position[],
  properties: P
): Feature<LineString, P> {
  return {
    type: 'Feature',
    properties: properties,
    geometry: {
      type: 'LineString',
      coordinates: coords,
    },
  };
}

export function multiLine<P = GeoJsonProperties>(
  coords: Position[][],
  properties: P
): Feature<MultiLineString, P> {
  return {
    type: 'Feature',
    properties: properties,
    geometry: {
      type: 'MultiLineString',
      coordinates: coords,
    },
  };
}

export function polygon<P = GeoJsonProperties>(
  coords: Position[][],
  properties: P
): Feature<Polygon, P> {
  return {
    type: 'Feature',
    properties: properties,
    geometry: {
      type: 'Polygon',
      coordinates: coords,
    },
  };
}

export function multiPolygon<P = GeoJsonProperties>(
  coords: Position[][][],
  properties: P
): Feature<MultiPolygon, P> {
  return {
    type: 'Feature',
    properties: properties,
    geometry: {
      type: 'MultiPolygon',
      coordinates: coords,
    },
  };
}

export const multiPolygons: FeatureCollection<MultiPolygon, MyProperties> = {
  type: 'FeatureCollection',
  features: [
    multiPolygon(
      [
        [
          [
            // outer ring
            [10, 10],
            [210, 10],
            [210, 210],
            [10, 210],
            [10, 10],
          ],
          [
            // inner ring
            [50, 50],
            [50, 150],
            [150, 150],
            [150, 50],
            [50, 50],
          ],
        ],
      ],
      { label: 'Salut' }
    ),
  ],
};

export const polygons: FeatureCollection<Polygon, MyProperties> = {
  type: 'FeatureCollection',
  features: [
    polygon(
      [
        [
          [10, 10],
          [210, 10],
          [210, 210],
          [10, 210],
          [10, 10],
        ],
        [
          [50, 50],
          [50, 150],
          [150, 150],
          [150, 50],
          [50, 50],
        ],
      ],
      { label: 'polygon' }
    ),
    polygon(
      [
        [
          [300, 300],
          [350, 300],
          [350, 350],
          [300, 350],
          [300, 300],
        ],
      ],
      { label: 'second other' }
    ),
  ],
};

export const multiLines: FeatureCollection<MultiLineString, MyProperties> = {
  type: 'FeatureCollection',
  features: [
    //    multiLine([[
    //      [50, 500],
    //      [200, 305],
    //    ]], {label: 'xx'}),
    multiLine(
      [
        //          [
        //            //l1
        //            [10, 40],
        //            [400, 450],
        //            [450, 450],
        //          ],
        [
          [150, 550],
          [50, 500],
          [200, 305],
        ],
      ],
      { label: 'x' }
    ),
  ],
};

export const lines: FeatureCollection<LineString, MyProperties> = {
  type: 'FeatureCollection',
  features: [
    line(
      [
        [300, 10],
        [300, 1000],
      ],
      { label: '1 vSeg' }
    ),
    line(
      [
        [50, 750],
        [750, 50],
      ],
      { label: '1 vSeg' }
    ),
    line(
      [
        [10, 500],
        [710, 500],
      ],
      { label: '1 hSeg' }
    ),
  ],
};

export const points: FeatureCollection<Point, MyProperties> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { label: 'Salut' },
      geometry: {
        type: 'Point',
        coordinates: [250, 350],
      },
    },
    {
      type: 'Feature',
      properties: { label: 'Salut' },
      geometry: {
        type: 'Point',
        coordinates: [50, 400],
      },
    },
  ],
};

export const polygonStyle: Style = {
  type: 'Style',
  rules: [
    {
      type: 'Rule',
      symbolizers: [
        {
          type: 'AreaSymbolizer',
          level: 1,
          fill: {
            type: 'SolidFill',
            color: 'red',
            opacity: 0.5,
          },
          stroke: {
            type: 'PenStroke',
            width: 1,
            uom: 'MM',
            fill: {
              type: 'SolidFill',
              color: 'hotpink',
            },
            lineCap: 'round',
            lineJoin: 'round',
          },
        },
        {
          type: 'AreaSymbolizer',
          level: 2,
          uom: 'MM',
          perpendicularOffset: 10,
          stroke: {
            type: 'PenStroke',
            width: 1,
            uom: 'MM',
            dashArray: '10 10',
            fill: {
              type: 'SolidFill',
              color: 'hotpink',
            },
            lineCap: 'round',
            lineJoin: 'round',
          },
        },
        {
          type: 'LineSymbolizer',
          level: 100,
          stroke: {
            type: 'PenStroke',
            width: 0.3,
            uom: 'MM',
            fill: {
              type: 'SolidFill',
              color: '#000000',
            },
            dashArray: '5 2 2 5',
            lineCap: 'butt',
            lineJoin: 'bevel',
          },
        },
        {
          type: 'PointSymbolizer',
          level: 1,
          graphics: [
            {
              type: 'MarkGraphic',
              wellKnownName: 'circle',
              size: {
                type: 'ViewBox',
                width: 10,
                height: 10,
                uom: 'PX',
              },
              fill: {
                type: 'SolidFill',
                color: 'hotpink',
              },
              stroke: {
                type: 'PenStroke',
                width: 1,
                uom: 'PX',
                fill: {
                  type: 'SolidFill',
                  color: '#000000',
                },
                lineCap: 'butt',
                lineJoin: 'bevel',
              },
            },
          ],
        },
        {
          type: 'PointSymbolizer',
          level: 1,
          onVertex: true,
          graphics: [
            {
              type: 'MarkGraphic',
              wellKnownName: 'triangle',
              size: {
                type: 'ViewBox',
                width: 5,
                height: 5,
                uom: 'PX',
              },
              fill: {
                type: 'SolidFill',
                color: 'yellow',
              },
              stroke: {
                type: 'PenStroke',
                width: 1,
                uom: 'PX',
                fill: {
                  type: 'SolidFill',
                  color: '#000000',
                },
                lineCap: 'butt',
                lineJoin: 'bevel',
              },
            },
          ],
        },
      ],
    },
  ],
};

export const linesStyle = (color: string): Style => ({
  type: 'Style',
  rules: [
    {
      type: 'Rule',
      symbolizers: [
        {
          type: 'LineSymbolizer',
          level: 2,
          stroke: {
            type: 'PenStroke',
            width: 3,
            uom: 'MM',
            fill: {
              type: 'SolidFill',
              color: color,
            },
            lineCap: 'round',
            lineJoin: 'round',
          },
        },
        {
          type: 'LineSymbolizer',
          level: 2,
          stroke: {
            type: 'PenStroke',
            width: 1,
            uom: 'MM',
            fill: {
              type: 'SolidFill',
              color: 'hotpink',
            },
            lineCap: 'butt',
            lineJoin: 'bevel',
          },
        },
        {
          type: 'LineSymbolizer',
          level: 100,
          stroke: {
            type: 'PenStroke',
            width: 1,
            uom: 'PX',
            fill: {
              type: 'SolidFill',
              color: '#000000',
            },
            dashArray: '5 5',
            lineCap: 'butt',
            lineJoin: 'bevel',
          },
        },
        {
          type: 'LineSymbolizer',
          level: 100,
          stroke: {
            type: 'GraphicStroke',
            distance: 20,
            uom: 'MM',
            graphics: [
              {
                type: 'MarkGraphic',
                wellKnownName: 'triangle',
                size: {
                  type: 'ViewBox',
                  width: 10,
                  height: 10,
                  uom: 'PX',
                },
                fill: {
                  type: 'SolidFill',
                  color: 'red',
                },
                stroke: {
                  type: 'PenStroke',
                  width: 1,
                  uom: 'PX',
                  fill: {
                    type: 'SolidFill',
                    color: '#000000',
                  },
                  lineCap: 'butt',
                  lineJoin: 'bevel',
                },
              },
            ],
          },
        },
      ],
    },
  ],
});

const roadStyle: Style = {
  type: 'Style',
  rules: [
    {
      type: 'Rule',
      minScale: 1000,
      symbolizers: [
        {
          type: 'LineSymbolizer',
          level: 10,
          stroke: {
            type: 'PenStroke',
            width: 1,
            uom: 'PX',
            fill: {
              type: 'SolidFill',
              color: '#d3d3d3',
            },
          },
        },
        {
          type: 'TextSymbolizer',
          label: {
            textLabel: {
              type: 'ValueReference',
              property: 'highway',
            },
            font: {
              type: 'StyleFont',
              fontSize: 22,
            },
            fill: {
              type: 'SolidFill',
              color: 'black',
            },
            stroke: {
              type: 'PenStroke',
              fill: {
                type: 'SolidFill',
                color: 'white',
              },
              width: 0.5,
              uom: 'MM',
            },
          },
        },
      ],
    },
    {
      type: 'Rule',
      maxScale: 1000,
      symbolizers: [
        {
          type: 'LineSymbolizer',
          level: 10,
          stroke: {
            type: 'PenStroke',
            width: 4,
            uom: 'GM',
            lineCap: 'round',
            fill: {
              type: 'SolidFill',
              color: '#d3d3d3',
            },
          },
        },
        {
          type: 'LineSymbolizer',
          uom: 'GM',
          level: 1,
          perpendicularOffset: 2,
          stroke: {
            type: 'PenStroke',
            uom: 'PX',
            width: 2,
            fill: {
              type: 'SolidFill',
              color: '#000000',
            },
          },
        },
        {
          type: 'LineSymbolizer',
          uom: 'GM',
          level: 1,
          perpendicularOffset: -2,
          stroke: {
            type: 'PenStroke',
            uom: 'PX',
            width: 2,
            dashArray: '5 2',
            fill: {
              type: 'SolidFill',
              color: '#000000',
            },
          },
        },
      ],
    },
  ],
};

export const pointsStyle: Style = {
  type: 'Style',
  rules: [
    {
      type: 'Rule',
      symbolizers: [
        {
          type: 'PointSymbolizer',
          level: 1,
          graphics: [
            {
              type: 'MarkGraphic',
              wellKnownName: 'circle',
              size: {
                type: 'ViewBox',
                width: 10,
                height: 10,
                uom: 'PX',
              },
              fill: {
                type: 'SolidFill',
                color: 'hotpink',
              },
              stroke: {
                type: 'PenStroke',
                width: 1,
                uom: 'PX',
                fill: {
                  type: 'SolidFill',
                  color: '#000000',
                },
                lineCap: 'butt',
                lineJoin: 'bevel',
              },
            },
          ],
        },
        {
          type: 'TextSymbolizer',
          level: 1000,
          label: {
            textLabel: 'Mon Label',
            halo: {
              type: 'Halo',
              fill: {
                type: 'SolidFill',
                color: 'pink',
              },
              radius: 10,
              uom: 'MM',
            },
            fill: {
              type: 'SolidFill',
              color: '#000000',
            },
          },
        },
      ],
    },
  ],
};

const buildingStyle: Style = {
  type: 'Style',
  rules: [
    {
      type: 'Rule',
      symbolizers: [
        {
          type: 'AreaSymbolizer',
          level: 2,
          fill: {
            type: 'SolidFill',
            color: '#808080',
          },
          stroke: {
            type: 'PenStroke',
            width: 1,
            uom: 'PX',
            fill: {
              type: 'SolidFill',
              color: '#000000',
            },
            lineCap: 'butt',
            lineJoin: 'bevel',
          },
        },
      ],
    },
  ],
};

const pathsStyle: Style = {
  type: 'Style',
  rules: [
    {
      type: 'Rule',
      symbolizers: [
        {
          type: 'LineSymbolizer',
          level: 2000,
          stroke: {
            type: 'GraphicStroke',
            distance: 1,
            orientation: 'LINE_UP',
            uom: 'GM',
            graphics: [
              {
                type: 'MarkGraphic',
                wellKnownName: 'triangle',
                size: {
                  type: 'ViewBox',
                  width: 0.15,
                  height: 0.3,
                  uom: 'GM',
                },
                fill: {
                  type: 'SolidFill',
                  color: 'red',
                },
              },
            ],
          },
        },
      ],
    },
  ],
};

// groundExtent: [2537588.801739664, 1180237.8388105312, 2540143.552681168, 1182292.067127078],
const swissTopo = 'https://wmts.geo.admin.ch/EPSG/2056/1.0.0/WMTSCapabilities.xml';

const sitn = 'https://sitn.ne.ch/services/wmts?SERVICE=WMTS&REQUEST=GetCapabilities';

export default function App() {
  const [toggle, setToggle] = React.useState(0);
  return (
    <div className="App" key={toggle}>
      <header>
        <h1>React OGC SymCore feature 2D Renderer</h1>
      </header>
      <div onClick={() => setToggle((x) => x + 1)}>force rebuild</div>
      <MapDefinition crs="EPSG:2056">
        <LayerDefinition
          features={buildings as FeatureCollection}
          layerId="Buildings"
          dataCrs="EPSG:4326"
        />
        <LayerDefinition
          features={chaumont as FeatureCollection}
          layerId="Chaumont"
          dataCrs="EPSG:2056"
        />
        <LayerDefinition
          features={roads as FeatureCollection}
          layerId="Roads"
          dataCrs="EPSG:4326"
        />
        <LayerDefinition features={paths} layerId="Paths" dataCrs="EPSG:4326" />
        {/*<WMTSLayerDefinition
          layerId="baseLayer1"
          getCapabilitiesUrl={swissTopo}
          wmtsLayerId="ch.swisstopo.pixelkarte-farbe"
  />*/}
        <WMTSLayerDefinition
          layerId="baseLayer2"
          getCapabilitiesUrl={sitn}
          wmtsLayerId="ortho2023"
        />
        *
        <MapView center={[2539092, 1181133]} scaleDenom={5000} className="MyMapView">
          {/*<WMTSLayer visible={false} index={0} layerId="baseLayer1" opacity={0.3} />*/}
          <WMTSLayer visible={true} index={2} layerId="baseLayer2" opacity={0.3} />
          <StyledLayer index={3} layerId="Roads" style={roadStyle} />
          <StyledLayer index={5} layerId="Buildings" style={buildingStyle} />
          <StyledLayer index={5} layerId="Chaumont" style={buildingStyle} />
          <StyledLayer index={10} layerId="Paths" style={pathsStyle} />
        </MapView>
        <MapView noZoom noPan center={[2539092, 1181133]} scaleDenom={25000} className="MiniMap">
          <WMTSLayer visible={true} index={0} layerId="baseLayer1" opacity={0.3} />
          <StyledLayer index={10} layerId="Roads" style={roadStyle} />
          <StyledLayer index={5} layerId="Buildings" style={buildingStyle} />
        </MapView>
      </MapDefinition>
    </div>
  );
}

//export default function App() {
//  const [toggle, setToggle] = React.useState(0);
//  return (
//    <div className="App" key={toggle}>
//      <header>
//        <h1>React OGC SymCore feature 2D Renderer</h1>
//      </header>
//      <div onClick={() => setToggle((x) => x + 1)}>salut</div>
//      <MapDefinition crs="">
//        <LayerDefinition features={multiPolygons} layerId="MultiPolygons" dataCrs="" />
//        <LayerDefinition features={polygons} layerId="Polygons" dataCrs="" />
//        <LayerDefinition features={multiLines} layerId="MultiLines" dataCrs="" />
//        <LayerDefinition features={lines} layerId="Lines" dataCrs="" />
//        <LayerDefinition features={points} layerId="Points" dataCrs="" />
//        <MapView center={[500, 500]} scale={1} className="MyMapView">
//          <StyledLayer index={5} layerId="MultiPolygons" style={polygonStyle} />
//          <StyledLayer index={8} layerId="Polygons" style={polygonStyle} />
//          <StyledLayer index={1} layerId="MultiLines" style={linesStyle("yellow")} />
//          <StyledLayer visible={false} index={2} layerId="Lines" style={linesStyle("lightblue")} />
//          <StyledLayer visible index={4} layerId="Lines" style={roadStyle} />
//          <StyledLayer index={10} layerId="Points" style={pointsStyle} />
//        </MapView>
//      </MapDefinition>
//    </div>
//  );
//}
