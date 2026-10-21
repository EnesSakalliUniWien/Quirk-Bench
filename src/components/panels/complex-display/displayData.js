import { isAmplitudeCoherent } from "../../../engine/math/amplitudeCoherence.js";
import { densityQubits } from "../../../engine/math/blochAnalysis.js";
import { qubitReadings } from "../../../engine/simulation/qubitMarginals.js";

/** Read the same local state that the selected circuit display paints. */
export function displayData(stats, target) {
  if (!stats || !target) return undefined;
  const gate = stats.circuitDefinition.columns[target.col]?.gates[target.row];
  if (!gate || gate.serializedId !== target.gate.serializedId) return undefined;
  const analysis = (qubits) => ({
    label: `At display in column ${target.col + 1}`,
    registers: stats.circuitDefinition.registers,
    qubits,
  });
  if (gate.serializedId.startsWith("Density")) {
    const matrix =
      gate.height === 1
        ? stats.qubitDensityMatrix(target.col, target.row).transpose()
        : stats.customStatsForSlot(target.col, target.row);
    return {
      kind: "density",
      // The grid holds the reduced state of every wire it covers, so each wire is read from it.
      analysis: analysis(
        densityQubits(matrix).map(({ wire, bloch }) => ({
          wire: target.row + wire,
          bloch,
        })),
      ),
      matrix,
      coherent: true,
      wireCount: gate.height,
    };
  }
  const data = stats.customStatsForSlot(target.col, target.row);
  if (!data) return undefined;
  const coherent = isAmplitudeCoherent(data.quality);
  return {
    kind: "amplitudes",
    // Not the ket: an incoherent one holds only probabilities, and a coherent one is only
    // near-pure, so the per-wire densities that Amps requests are the readings.
    analysis: analysis(
      qubitReadings(stats, gate.height, target.col, target.row),
    ),
    matrix: coherent ? data.ket : data.incoherentKet,
    coherent,
    phaseLockIndex: data.phaseLockIndex,
    wireCount: gate.height,
    measured:
      ((stats.circuitDefinition.colIsMeasuredMask(target.col) >> target.row) &
        ((1 << gate.height) - 1)) !==
      0,
    registers: stats.circuitDefinition.registers.within(
      target.row,
      gate.height,
    ),
  };
}
