// Fake in-memory data layer for the vertical slice. The function signatures are
// the contract the real layer (Supabase + on-device SQLite) will implement, so
// swapping it in changes no screen code. replica-backend replaces the body.

import type { Aircraft, FlightPlan, Waypoint } from "../domain/types";

let idSeq = 1;
const newId = () => `local-${idSeq++}`;

const seedAircraft: Aircraft = {
  id: "seed-ac",
  tailNumber: "CX-DEMO",
  type: "Cessna 172",
  cruiseTasMs: 56.6, // ~110 kt
  fuelBurnLph: 32,
  fuelCapacityL: 160,
};

const plans = new Map<string, FlightPlan>();
const aircraft = new Map<string, Aircraft>([[seedAircraft.id, seedAircraft]]);

export interface DataLayer {
  listFlightPlans(): Promise<FlightPlan[]>;
  getFlightPlan(id: string): Promise<FlightPlan | undefined>;
  createFlightPlan(input: {
    departure: Waypoint;
    destination: Waypoint;
    aircraftId?: string;
  }): Promise<FlightPlan>;
  setWaypoints(id: string, waypoints: Waypoint[]): Promise<FlightPlan>;
  listAircraft(): Promise<Aircraft[]>;
  /** Test-only: wipe state back to seed. */
  _reset(): Promise<void>;
}

export const fakeData: DataLayer = {
  async listFlightPlans() {
    return [...plans.values()];
  },
  async getFlightPlan(id) {
    return plans.get(id);
  },
  async createFlightPlan({ departure, destination, aircraftId }) {
    const plan: FlightPlan = {
      id: newId(),
      aircraftId: aircraftId ?? seedAircraft.id,
      waypoints: [departure, destination],
      status: "planned",
    };
    plans.set(plan.id, plan);
    return plan;
  },
  async setWaypoints(id, waypoints) {
    const plan = plans.get(id);
    if (!plan) throw new Error(`flight plan ${id} not found`);
    const next = { ...plan, waypoints };
    plans.set(id, next);
    return next;
  },
  async listAircraft() {
    return [...aircraft.values()];
  },
  async _reset() {
    plans.clear();
    idSeq = 1;
  },
};
