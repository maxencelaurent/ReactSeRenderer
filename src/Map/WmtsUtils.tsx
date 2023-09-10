import WMTSCapabilities from 'ol/format/WMTSCapabilities';

const mapCRS = ['urn:ogc:def:crs:EPSG:2056', 'EPSG:2056'];

export async function getWmtsLayers(getCapabilitiesUrl: string) {
  const parser = new WMTSCapabilities();

  const response = await fetch(getCapabilitiesUrl);
  const text = await response.text();
  const getCap = parser.read(text) as GetCapabilities;

  // extract matrix set which match the map CRS
  const tileMatrixSet = getCap.Contents?.TileMatrixSet.filter((tms) =>
    mapCRS.includes(tms.SupportedCRS)
  )[0];
  if (!tileMatrixSet) {
    console.log('MatrixSets', getCap.Contents?.TileMatrixSet);
    throw new Error('WMTS Service do not provide tile for the given CRS');
  }

  console.log('Matrix Set: ', tileMatrixSet);

  // auto select a layer which match the selected tile matrix set
  const layer = getCap.Contents?.Layer.filter((layer) => {
    return layer.TileMatrixSetLink.find((link) => link.TileMatrixSet === tileMatrixSet?.Identifier);
  })[0];

  if (!layer) {
    throw new Error('Unable to find a layer');
  }

  const resourceUrl = layer.ResourceURL?.find((r) => r.resourceType === 'tile');

  if (resourceUrl) {
    let url = resourceUrl.template;
    layer.Dimension?.forEach((dim) => {
      url = url.replace(`{${dim.Identifier}}`, dim.Default);
    });
    url = url.replace('{TileMatrix}', tileMatrixSet.TileMatrix[0].Identifier);
    url = url.replace('{TileCol}', '0');
    url = url.replace('{TileRow}', '1');
    console.log('GetTile From Template', url);
  } else {
    const style = layer.Style.find((style) => style.isDefault) || layer.Style[0];

    if (!style) {
      throw new Error('There is no style');
    }

    //const bbox = layer?.WGS84BoundingBox; // todo convert to Map CRS
    layer?.Identifier;

    const getTile = getCap.OperationsMetadata?.GetTile;
    const href = getTile?.DCP.HTTP.Get[0].href;

    const kvp = {
      Service: 'WMTS',
      Request: 'GetTile',
      Version: '1.0.0',
      Format: layer.Format[0],
      Layer: layer.Identifier,
      Style: style.Identifier,
      TileMatrixSet: tileMatrixSet.Identifier,
      TIleMatrix: tileMatrixSet.TileMatrix[0].Identifier,
      TileRow: 0,
      TileCol: 0,
    };

    const url =
      href +
      (href?.endsWith('?') ? '' : '?') +
      Object.entries(kvp)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    console.log('GetTiel URL', href);
    console.log('URL', url);
  }
}

export interface ServiceIdentification {
  Title: string;
  Abstract: string;
  ServiceType: string;
  ServiceTypeVersion: string;
  Fees: string;
  AccessConstraints: string;
}

export interface ServiceProvider {
  ProviderName: string;
  ProviderSite: string;
  ServiceContact: {
    IndividualName: string;
    PositionName: string;
    ContactInfo: {
      Phone: {
        Voice: string;
        Facsimile: string;
      };
      Address: {
        DeliveryPoint: string;
        City: string;
        AdministrativeArea: string;
        PostalCode: string;
        Country: string;
        ElectronicMailAddress: string;
      };
    };
  };
}

export interface OperationMetadata {
  DCP: {
    HTTP: {
      Get: [
        {
          href: string;
          Constraint: {
            name: string;
            AllowedValues: {
              Value: string[];
            };
          }[];
        },
      ];
    };
  };
}

export interface Layer {
  Title: string;
  Abstract: string;
  WGS84BoundingBox: [number, number, number, number];
  Identifier: string;
  Style: [
    {
      Identifier: string;
      Title?: string;
      isDefault: false;
      LegendURL?: {
        format: string;
        href: string;
      }[];
    },
  ];
  Format: string[];
  Dimension?: {
    Identifier: string;
    Default: string;
    Value: string[];
  }[];
  ResourceURL?: {
    format: string;
    template: string;
    resourceType: 'tile';
  }[];
  TileMatrixSetLink: { TileMatrixSet: string }[];
}

export interface TileMatrix {
  Identifier: string;
  ScaleDenominator: number;
  TopLeftCorner: [number, number];
  TileWidth: number;
  TileHeight: number;
  MatrixWidth: number;
  MatrixHeight: number;
}

export interface TileMatrixSet {
  Identifier: string;
  SupportedCRS: string;
  TileMatrix: TileMatrix[];
}

export interface GetCapabilities {
  ServiceIdentification?: ServiceIdentification;
  ServiceProvider?: ServiceProvider;
  OperationsMetadata?: Partial<
    Record<'GetCapabilities' | 'GetFeatureInfo' | 'GetTile', OperationMetadata>
  >;
  version?: string;
  Contents?: {
    TileMatrixSet: TileMatrixSet[];
    Layer: Layer[];
  };
  Themes?: unknown;
}
