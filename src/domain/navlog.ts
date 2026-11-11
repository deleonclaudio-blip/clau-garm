// Build a navlog from a flight plan and an aircraft. No wind in v1 (TAS = GS).
// Planning aid only; cross-check everything against approved sources in flight.

import { distanceNm, initialBearingDeg, M_PER_NM } from "./geo";
import type { Aircraft, FlightPlan, Navlog, NavlogLeg } from "./types";

/** Cruise true airspeed in knots, from the SI value stored on the aircraft. */
export const tasKnots = (ac: Aircraft) => (ac.cruiseTasMs * 3600) / M_PER_NM;

export function buildNavlog(plan: FlightPlan, aircraft?: Aircraft): Navlog {
  const legs: NavlogLeg[] = [];
  const wps = plan.waypoints;
  const gsKt = aircraft ? tasKnots(aircraft) : 0;
  const burnLph = aircraft?.fuelBurnLph ?? 0;

  let clockMs = plan.departureTime ? Date.parse(plan.departureTime) : NaN;

  for (let i = 0; i < wps.length - 1; i++) {
    const from = wps[i];
    const to = wps[i + 1];
    const distanceNmVal = distanceNm(from, to);
    const trueCourseDeg = initialBearingDeg(from, to);
    const eteHours = gsKt > 0 ? distanceNmVal / gsKt : 0;
    const eteSeconds = Math.round(eteHours * 3600);
    const fuelL = +(eteHours * burnLph).toFixed(2);

    let etaUtc: string | undefined;
    if (!Number.isNaN(clockMs) && eteSeconds > 0) {
      clockMs += eteSeconds * 1000;
      etaUtc = new Date(clockMs).toISOString();
    }

    legs.push({
      from: from.ident,
      to: to.ident,
      distanceNm: +distanceNmVal.toFixed(1),
      trueCourseDeg: Math.round(trueCourseDeg),
      eteSeconds,
      etaUtc,
      fuelL,
    });
  }

  return {
    legs,
    totalDistanceNm: +legs.reduce((s, l) => s + l.distanceNm, 0).toFixed(1),
    totalEteSeconds: legs.reduce((s, l) => s + l.eteSeconds, 0),
    totalFuelL: +legs.reduce((s, l) => s + l.fuelL, 0).toFixed(2),
  };
}

/** "1:23" from seconds, for display. */
export function formatHms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}
