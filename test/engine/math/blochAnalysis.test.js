import { Suite, assertThat } from "../../TestUtil.js";
import { Complex } from "../../../src/engine/math/complex/Complex.js";
import { Matrix } from "../../../src/engine/math/matrix/Matrix.js";
import {
  densityQubits,
  densityFromBloch,
} from "../../../src/engine/math/blochAnalysis.js";

import {
  qubitMarginals,
  qubitReadings,
} from "../../../src/engine/simulation/qubitMarginals.js";

const vectors = (readings) =>
  readings.map(({ wire, bloch }) => ({ wire, bloch }));

const suite = new Suite("Bloch analysis reductions");

suite.test(
  "state and conventional density agree on positive imaginary phase",
  () => {
    const state = Matrix.col(Math.SQRT1_2, new Complex(0, Math.SQRT1_2));
    const expected = [{ wire: 0, bloch: { x: 0, y: 1, z: 0 } }];
    assertThat(vectors(qubitMarginals(state, 1))).isApproximatelyEqualTo(
      expected,
    );
    assertThat(
      densityQubits(state.times(state.adjoint())),
    ).isApproximatelyEqualTo(expected);
    assertThat(
      densityQubits(densityFromBloch(expected[0].bloch)),
    ).isApproximatelyEqualTo(expected);
  },
);

suite.test(
  "Bell state reductions are mixed and preserve both wire indices",
  () => {
    const state = Matrix.col(Math.SQRT1_2, 0, 0, Math.SQRT1_2);
    const expected = [
      { wire: 0, bloch: { x: 0, y: 0, z: 0 } },
      { wire: 1, bloch: { x: 0, y: 0, z: 0 } },
    ];
    assertThat(vectors(qubitMarginals(state, 2))).isApproximatelyEqualTo(
      expected,
    );
    assertThat(
      densityQubits(state.times(state.adjoint())),
    ).isApproximatelyEqualTo(expected);
  },
);

suite.test(
  "deferred measurement removes coherence only from measured wires",
  () => {
    const state = Matrix.col(0.5, 0.5, 0.5, 0.5);
    assertThat(vectors(qubitMarginals(state, 2, 1))).isApproximatelyEqualTo([
      { wire: 0, bloch: { x: 0, y: 0, z: 0 } },
      { wire: 1, bloch: { x: 1, y: 0, z: 0 } },
    ]);
  },
);

suite.test("zero norm and unavailable data do not become qubit states", () => {
  assertThat(qubitMarginals(Matrix.col(0, 0), 1)).isEqualTo([]);
  assertThat(qubitMarginals(Matrix.col(NaN, 0), 1)).isEqualTo([]);
  assertThat(qubitMarginals(undefined, 1)).isEqualTo([]);
  assertThat(densityQubits(Matrix.zero(2, 2))).isEqualTo([]);
  assertThat(densityQubits(Matrix.zero(2, 2).times(NaN))).isEqualTo([]);
  assertThat(densityQubits(undefined)).isEqualTo([]);
  assertThat(qubitReadings(undefined, 1)).isEqualTo([]);
  assertThat(
    Number.isNaN(
      qubitReadings(
        { qubitDensityMatrix: () => Matrix.zero(2, 2).times(NaN) },
        1,
      )[0].bloch.x,
    ),
  ).isEqualTo(true);
});

suite.test(
  "U rho U adjoint normalizes surviving postselection and rejects impossible output",
  () => {
    const input = densityFromBloch({ x: 0, y: 1, z: 0 });
    const keepZero = Matrix.square(1, 0, 0, 0);
    const selected = keepZero.times(input).times(keepZero.adjoint());
    assertThat(selected.trace().real).isApproximatelyEqualTo(0.5);
    assertThat(densityQubits(selected)).isApproximatelyEqualTo([
      { wire: 0, bloch: { x: 0, y: 0, z: 1 } },
    ]);
    const scaledX = Matrix.square(0, 0.9, 0.9, 0);
    const output = scaledX.times(input).times(scaledX.adjoint());
    assertThat(output.trace().real).isApproximatelyEqualTo(0.81);
    assertThat(densityQubits(output)).isApproximatelyEqualTo([
      { wire: 0, bloch: { x: 0, y: -1, z: 0 } },
    ]);
    const impossible = keepZero
      .times(densityFromBloch({ x: 0, y: 0, z: -1 }))
      .times(keepZero.adjoint());
    assertThat(densityQubits(impossible)).isEqualTo([]);
  },
);
