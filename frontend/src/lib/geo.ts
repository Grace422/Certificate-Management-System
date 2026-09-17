import type { GeoPoint, MunicipalOffice } from './types';

const EARTH_RADIUS_KM = 6371;

const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres between two coordinates. */
export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Annotate offices with distanceKm and sort nearest-first. */
export function sortByDistance(offices: MunicipalOffice[], from: GeoPoint): MunicipalOffice[] {
  return offices
    .map((o) => ({ ...o, distanceKm: haversineKm(from, o) }))
    .sort((x, y) => (x.distanceKm ?? Infinity) - (y.distanceKm ?? Infinity));
}

export function formatDistance(km?: number): string {
  if (km == null || !Number.isFinite(km)) return '—';
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

/** Deep-link that opens turn-by-turn directions in the user's map app. */
export function directionsUrl(to: GeoPoint, from?: GeoPoint | null): string {
  const dest = `${to.latitude},${to.longitude}`;
  const origin = from ? `&origin=${from.latitude},${from.longitude}` : '';
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${origin}&travelmode=driving`;
}
