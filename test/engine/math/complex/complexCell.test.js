import { Suite, assertThat } from "../../../TestUtil.js";
import { Complex } from "../../../../src/engine/math/complex/Complex.js";
import { interpretComplexCell } from "../../../../src/engine/math/complex/complexCell.js";

const suite = new Suite("complexCell");

suite.test("zero and nonfinite cells have undefined phase", () => {
  for (const value of [Complex.ZERO, new Complex(-0, -0)]) {
    assertThat(interpretComplexCell(value)).isEqualTo({
      finite: true,
      magnitude: 0,
      phase: undefined,
    });
  }
  for (const value of [
    new Complex(NaN, 0),
    new Complex(0, NaN),
    new Complex(Infinity, 1),
    new Complex(1, -Infinity),
  ]) {
    const cell = interpretComplexCell(value);
    assertThat(cell.finite).isEqualTo(false);
    assertThat(cell.phase).isEqualTo(undefined);
  }
  // The mathematical API still uses its established atan2 convention at zero.
  assertThat(Complex.ZERO.phase()).isEqualTo(0);
});

suite.test("coherence controls phase without changing magnitude", () => {
  const value = new Complex(0, -0.5);
  assertThat(interpretComplexCell(value)).isEqualTo({
    finite: true,
    magnitude: 0.5,
    phase: -Math.PI / 2,
  });
  assertThat(interpretComplexCell(value, false)).isEqualTo({
    finite: true,
    magnitude: 0.5,
    phase: undefined,
  });
  assertThat(interpretComplexCell(new Complex(-1, 0)).phase).isEqualTo(Math.PI);
  assertThat(
    interpretComplexCell(new Complex(Number.MIN_VALUE, 0)).phase,
  ).isEqualTo(0);
});
