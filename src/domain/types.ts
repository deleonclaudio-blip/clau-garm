// Core domain types for clau-garm. Pure TypeScript, no React, no I/O.
// Units are SI internally (metres, m/s, seconds, kg); display converts.

export type WaypointType =
  | "airport"
  | "vor"
  | "ndb"
  | "intersection"
  | "vrp"
  | "user";

export interface LatLon {
  lat: number; // degrees, WGS84
  lon: number; // degrees, WGS84
}

export interface Waypoint extends LatLon {
  ident: string;
  type: WaypointType;
  name?: string;
}

export interface Airport extends Waypoint {
  type: "airport";
  elevationFt?: number;
  runways?: string[];
}

export interface Aircraft {
  id: string;
  tailNumber: string;
  type?: string;
  cruiseTasMs: number; // true airspeed, metres/second
  fuelBurnLph: number; // litres/hour
  fuelCapacityL?: number;
}

export type FlightPlanStatus = "planned" | "filed" | "active" | "flown";

export interface FlightPlan {
  id: string;
  name?: string;
  aircraftId?: string;
  waypoints: Waypoint[]; // ordered; index is the leg order
  cruiseAltitudeFt?: number;
  departureTime?: string; // ISO 8601, UTC ("Zulu")
  status: FlightPlanStatus;
}

export interface NavlogLeg {
  from: string;
  to: string;
  distanceNm: number;
  trueCourseDeg: number;
  eteSeconds: number; // at the aircraft's cruise TAS (no wind in v1)
  etaUtc?: string; // ISO, if departureTime and a cruise speed are known
  fuelL: number; // burned on this leg
}

export interface Navlog {
  legs: NavlogLeg[];
  totalDistanceNm: number;
  totalEteSeconds: number;
  totalFuelL: number;
}
