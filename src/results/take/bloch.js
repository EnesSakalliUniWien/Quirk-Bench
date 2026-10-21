import { qubitReadings } from "../../engine/simulation/qubitMarginals.js";
import { restoreStats } from "./snapshot.js";

/** Use the recorded physical density history, including deferred measurements, at the saved step. */
export function takeQubits(take) {
  if (!take.result.available) return [];
  return qubitReadings(restoreStats(take), take.wires);
}
