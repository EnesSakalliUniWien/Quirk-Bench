import { Suite, assertThat } from "../../../TestUtil.js";
import { displayData } from "../../../../src/components/panels/complex-display/displayData.js";
import { CircuitDefinition } from "../../../../src/circuit/model/CircuitDefinition.js";
import { CircuitStats } from "../../../../src/engine/simulation/CircuitStats.js";
import { Serializer } from "../../../../src/serialization/Serializer.js";
import { Gates } from "../../../../src/gates/AllGates.js";
import { qubitReadings } from "../../../../src/engine/simulation/qubitMarginals.js";

const suite = new Suite("Complex display physical state");

function inspect(cols, col, row = 0) {
  const circuit = Serializer.fromJson(CircuitDefinition, { cols });
  const stats = CircuitStats.fromCircuitAtTime(circuit, 0);
  return {
    stats,
    data: displayData(stats, {
      col,
      row,
      gate: circuit.columns[col].gates[row],
    }),
  };
}

suite.testUsingWebGL(
  "amplitude analysis reads its column, not the circuit output",
  () => {
    const { data, stats } = inspect([["H"], ["Amps1"], [1], ["H"]], 1);
    assertThat(data.analysis.qubits[0].bloch).isApproximatelyEqualTo({
      x: 1,
      y: 0,
      z: 0,
    });
    assertThat(qubitReadings(stats, 1)[0].bloch).isApproximatelyEqualTo({
      x: 0,
      y: 0,
      z: 1,
    });
  },
);

suite.testUsingWebGL(
  "entangled and measured amplitude displays retain physical mixed states",
  () => {
    for (const cols of [
      [["H"], ["•", "X"], ["Amps1"]],
      [["H"], ["Measure"], ["Amps1"]],
    ]) {
      const { data } = inspect(cols, 2);
      assertThat(data.analysis.qubits[0].bloch).isApproximatelyEqualTo({
        x: 0,
        y: 0,
        z: 0,
      });
      assertThat(data.analysis.qubits[0].purity).isApproximatelyEqualTo(0.5);
    }
    const { data } = inspect([["H"], ["Measure"], ["Amps1"]], 2);
    assertThat(data.measured).isEqualTo(true);
  },
);

suite.testUsingWebGL("display controls condition the physical analysis", () => {
  const { data, stats } = inspect([["H"], ["•", "X"], ["Amps1", "•"]], 2);
  assertThat(data.analysis.qubits[0].bloch).isApproximatelyEqualTo({
    x: 0,
    y: 0,
    z: -1,
  });
  assertThat(qubitReadings(stats, 1)[0].purity).isApproximatelyEqualTo(0.5);
});

suite.testUsingWebGL(
  "amplitude and density displays share every covered wire and phase convention",
  () => {
    for (const id of ["Amps2", "Density2"]) {
      const { data } = inspect(
        [
          [1, "H", "X"],
          [1, Gates.QuarterTurns.SqrtZForward.serializedId],
          [1, id],
        ],
        2,
        1,
      );
      assertThat(data.analysis.qubits.map((q) => q.wire)).isEqualTo([1, 2]);
      assertThat(data.analysis.qubits[0].bloch).isApproximatelyEqualTo({
        x: 0,
        y: 1,
        z: 0,
      });
      assertThat(data.analysis.qubits[1].bloch).isApproximatelyEqualTo({
        x: 0,
        y: 0,
        z: -1,
      });
    }
  },
);

suite.testUsingWebGL(
  "density displays read each wire from their own matrix, as the single-qubit densities do",
  () => {
    const sqrtZ = Gates.QuarterTurns.SqrtZForward.serializedId;
    // |+i>, a Bell pair, a measured wire, a wire entangled with one outside the display, and
    // the same off the first row.
    const bell = [["H"], ["•", "X"]];
    const cases = [
      {
        before: [
          ["H", "H"],
          [1, sqrtZ],
        ],
        row: 0,
        span: 2,
      },
      { before: bell, row: 0, span: 2 },
      { before: bell, row: 0, span: 1 },
      { before: [["H", "H"], ["Measure"]], row: 0, span: 2 },
      {
        before: [
          ["H", "H", "H"],
          [sqrtZ, 1, "•"],
        ],
        row: 0,
        span: 2,
      },
      {
        before: [
          [1, "H", "H", "X"],
          [1, sqrtZ, "•"],
        ],
        row: 1,
        span: 2,
      },
    ];
    for (const { before, row, span } of cases) {
      const lead = Array(row).fill(1);
      const display = span === 1 ? "Density" : `Density${span}`;
      const cols = [
        ...before,
        [...lead, display],
        // The display is `span` columns wide; single-wire densities after it see the same state.
        ...Array(span - 1).fill([]),
        [...lead, ...Array(span).fill("Density")],
      ];
      const circuit = Serializer.fromJson(CircuitDefinition, { cols });
      const stats = CircuitStats.fromCircuitAtTime(circuit, 0);
      const col = before.length;
      const { analysis } = displayData(stats, {
        col,
        row,
        gate: circuit.columns[col].gates[row],
      });
      const vectors = (qubits) =>
        qubits.map(({ wire, bloch }) => ({ wire, bloch }));
      assertThat(analysis.qubits.length).withInfo({ cols }).isEqualTo(span);
      assertThat(vectors(analysis.qubits))
        .withInfo({ cols })
        .isApproximatelyEqualTo(
          vectors(qubitReadings(stats, span, col + span, row)),
        );
    }
  },
);

suite.test("missing display data stays unavailable", () => {
  assertThat(displayData(undefined, undefined)).isEqualTo(undefined);
});
