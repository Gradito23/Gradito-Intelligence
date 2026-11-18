import type { PvMetadataBuilt } from './pvEventMapping.ts';
import { geocodeAddress } from './geocode.ts';

export type EventGeoFields = {
  geo_lat: number | null;
  geo_lng: number | null;
  geo_source: string | null;
  geo_confidence: string | null;
};

/** ZIP-prefix approximate centers (subset — extends PV zip map for pins). */
const ZIP_CENTROID: Record<string, { lat: number; lng: number }> = {
  '10001': { lat: 40.7506, lng: -73.9971 },
  '11201': { lat: 40.6958, lng: -73.9918 },
  '33101': { lat: 25.7791, lng: -80.1978 },
  '90001': { lat: 33.9731, lng: -118.2479 },
  '94102': { lat: 37.7793, lng: -122.4193 },
  '19102': { lat: 39.9528, lng: -75.1635 },
  '20001': { lat: 38.9071, lng: -77.0369 },
  '60601': { lat: 41.8853, lng: -87.6217 },
};

function zipCentroid(zip: string | null | undefined): EventGeoFields | null {
  if (!zip || zip.length < 5) return null;
  const z = zip.slice(0, 5);
  const hit = ZIP_CENTROID[z];
  if (hit) {
    return {
      geo_lat: hit.lat,
      geo_lng: hit.lng,
      geo_source: 'zip',
      geo_confidence: 'medium',
    };
  }
  return null;
}

export async function resolveEventGeoFromPv(
  metadata: PvMetadataBuilt | null | undefined,
  serviceArea: string | null | undefined,
  areaCentroid?: { lat: number; lng: number } | null,
  options: { allowGeocode?: boolean } = {},
): Promise<EventGeoFields> {
  const allowGeocode = options.allowGeocode === true;
  const address = metadata?.event_address?.trim() || metadata?.event_location_label?.trim();
  if (address && allowGeocode) {
    const composed = metadata?.zip ? `${address}, ${metadata.zip}, USA` : `${address}, USA`;
    const point = await geocodeAddress(composed);
    if (point) {
      return {
        geo_lat: point.lat,
        geo_lng: point.lng,
        geo_source: 'geocode_address',
        geo_confidence: 'high',
      };
    }
  }

  const fromZip = zipCentroid(metadata?.zip ?? null);
  if (fromZip) return fromZip;

  if (areaCentroid?.lat != null && areaCentroid?.lng != null) {
    return {
      geo_lat: areaCentroid.lat,
      geo_lng: areaCentroid.lng,
      geo_source: 'service_area_centroid',
      geo_confidence: 'low',
    };
  }

  return {
    geo_lat: null,
    geo_lng: null,
    geo_source: null,
    geo_confidence: null,
  };
}