import { measurementDescription } from "../../../circuit/measurementDescription.js";
import { wireLabel } from "../../../circuit/registerLabels.js";

/** Keep very small/nonzero and almost-certain survival distinct from zero and certainty. */
function survivalText(rate) {
  if (rate > 0 && rate < 0.0001) return "<0.01%";
  if (rate < 1 && rate > 0.9999) return ">99.99%";
  return `${Number((rate * 100).toFixed(2))}%`;
}

/** Presentation only: use the completed run, never resample to obtain a readout. */
function measurementReadings(sample) {
  if (sample === undefined) return [];
  const { circuit, stats, step } = sample;
  const readings = [];
  let noSurvivingInput = false;
  circuit.columns.forEach((column, col) => {
    // Normalizing a zero-survival state can make later statistics NaN. Preserve the
    // known reason for the missing state through subsequent columns.
    noSurvivingInput ||= stats.survivalRate(col - 1) === 0;
    column.gates.forEach((gate, row) => {
      if (gate === undefined) return;
      const description = measurementDescription(gate);
      if (description === undefined) return;
      const reading = {
        key: `${col}:${row}`,
        col,
        name: gate.name,
        symbol: gate.symbol,
        location: `${wireLabel(circuit.registers, row)} (wire ${row + 1}), column ${col + 1}`,
        description,
        status: "unavailable",
        result: "Unavailable",
        note: "No measurement result is available for this step.",
      };
      const disabled = circuit.gateAtLocIsDisabledReason(col, row);
      const before = stats.survivalRate(col - 1);
      const after = stats.survivalRate(col);
      if (gate.deactivated) {
        Object.assign(reading, {
          status: "off",
          result: "Deactivated",
          note: "This gate is switched off.",
        });
      } else if (disabled !== undefined) {
        Object.assign(reading, {
          status: "disabled",
          result: "Disabled",
          note: disabled.replaceAll("\n", " "),
        });
      } else if (col >= step) {
        Object.assign(reading, {
          status: "pending",
          result: "Not reached",
          note: "Advance Steps to inspect the state after this column.",
        });
      } else if (noSurvivingInput) {
        Object.assign(reading, {
          result: "No surviving state",
          note: "No runs survived the earlier columns; this outcome is unavailable.",
        });
      } else if (!Number.isFinite(before) || !Number.isFinite(after)) {
        // Missing or invalid simulation data is never a no-click result.
      } else if (description.kind === "postselection") {
        const rate = after / before;
        if (rate >= 0 && rate <= 1 + 1e-6) {
          Object.assign(reading, {
            status: after === 0 ? "empty" : "selected",
            result: `${survivalText(Math.min(1, rate))} survive column`,
            note:
              after === 0
                ? "Zero survival: no conditional output state exists after this column."
                : "Combined survival for all operations in this column. Output probabilities are conditional on surviving runs.",
          });
        } else {
          reading.note =
            "This column's survival is outside the probability range; inspect its nonunitary operations.";
        }
      } else if (after <= 0) {
        Object.assign(reading, {
          result: "No surviving state",
          note: "No runs survived this column; its conditional output state is undefined.",
        });
      } else if (description.kind === "deferred") {
        Object.assign(reading, {
          status: "deferred",
          result: "Deferred",
          note: "No single outcome was sampled. Use the Qubits panel for measurement-aware density matrices and Bloch vectors.",
        });
      } else {
        const result = stats.customStatsForSlot(col, row);
        if (typeof result === "boolean") {
          Object.assign(reading, {
            status: result ? "click" : "no-click",
            result: result ? "click" : "no click",
            note:
              description.kind === "reset"
                ? `Control ${result ? "active" : "inactive"}; target reset to |0⟩.`
                : result
                  ? "The click condition was satisfied. The state is conditioned on this result."
                  : "The target condition or controls were not satisfied. The state is conditioned on this result.",
          });
        }
      }
      readings.push(reading);
    });
  });
  return readings;
}

export { measurementReadings };
