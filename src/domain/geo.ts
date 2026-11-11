// Great-circle geometry. Pure functions, SI in, SI out unless named otherwise.
// WARNING: this is planning maths for a VFR aid, never a primary nav source.

import type { LatLon } from "./types";

export const EARTH_RADIUS_M = 6_371_008.8; // WGS84 mean radius
export const M_PER_NM = 1852;

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export const metresToNm = (m: number) => m / M_PER_NM;
export const distanceNm = (a: LatLon, b: LatLon) => metresToNm(distanceM(a, b));

/** Initial true course from a to b, degrees 0..360. */
export function initialBearingDeg(a: LatLon, b: LatLon): number {
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(la2);
  const x =
    Math.cos(la1) * Math.sin(la2) -
    Math.sin(la1) * Math.cos(la2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}
