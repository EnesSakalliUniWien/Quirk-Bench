import { Suite, assertThat, assertThrows } from "../../../TestUtil.js";
import {
  parseRotationDraft,
  parseMatrixDraft,
  inspectMatrix,
  validateCircuitRange,
  parseCircuitDraft,
  buildMatrixGate,
  matrixEntriesForGrid,
  matrixTextFromCells,
  applyMatrixPaste,
} from "../../../../src/components/panels/forge/construction.js";
import { MATRIX_RENDERER } from "../../../../src/draw/gate/GateRenderers.js";
import { renderCustomGateCircuit } from "../../../../src/draw/gate/CustomGateCircuitRenderer.js";
import { Matrix } from "../../../../src/engine/math/matrix/Matrix.js";
import { QubitMatrix } from "../../../../src/engine/math/matrix/QubitMatrix.js";
import { GateBuilder } from "../../../../src/circuit/model/Gate.js";
import { GateColumn } from "../../../../src/circuit/model/GateColumn.js";
import { CircuitDefinition } from "../../../../src/circuit/model/CircuitDefinition.js";
const suite = new Suite("Gate construction");
suite.test(
  "a whole-circuit range includes trailing columns occupied by a wide gate",
  () => {
    const gate = new GateBuilder()
      .setWidth(2)
      .setKnownEffectToMatrix(Matrix.identity(2)).gate;
    const circuit = new CircuitDefinition(2, [
      new GateColumn([gate, undefined]),
    ]);
    const result = parseCircuitDraft(circuit, {
      cols: "1:∞",
      rows: "1:∞",
      name: "Wide",
    });
    assertThat(result.range.colEnd).isEqualTo(2);
    assertThat(result.gate.knownCircuit.columns[0].gates[0]).isEqualTo(gate);
    assertThat(result.gate.customRenderer).isEqualTo(renderCustomGateCircuit);
    assertThat(result.gate.height).isEqualTo(1);
  },
);
suite.test("unnamed construction previews use the matrix renderer", () => {
  const gate = buildMatrixGate(Matrix.identity(4), "");
  assertThat(gate.customRenderer).isEqualTo(MATRIX_RENDERER);
  assertThat(gate.width).isEqualTo(2);
  assertThat(gate.knownMatrixAt(0)).isEqualTo(Matrix.identity(4));
});
suite.test("rotation includes global phase and rejects zero axes", () => {
  assertThat(
    parseRotationDraft({
      axis: "X+Z",
      angle: "180",
      phase: "90",
      unit: "degrees",
    }),
  ).isApproximatelyEqualTo(QubitMatrix.HADAMARD);
  assertThat(
    parseRotationDraft({
      axis: "Y",
      angle: "pi/3",
      phase: "0",
      unit: "radians",
    }),
  ).isApproximatelyEqualTo(
    parseRotationDraft({ axis: "Y", angle: "60", phase: "0", unit: "degrees" }),
  );
  assertThrows(() =>
    parseRotationDraft({
      axis: "X-X",
      angle: "45",
      phase: "0",
      unit: "degrees",
    }),
  );
});
suite.test("matrix correction is opt in and finite input is required", () => {
  assertThat(inspectMatrix(parseMatrixDraft("1,i,i,1")).unitary).isEqualTo(
    false,
  );
  assertThat(
    inspectMatrix(parseMatrixDraft("1,i,i,1", true)).unitary,
  ).isEqualTo(true);
  assertThat(inspectMatrix(Matrix.identity(16)).qubits).isEqualTo(4);
  for (const text of ["", "1/0", "1+"])
    assertThrows(() => parseMatrixDraft(text));
});
suite.test("ranges cannot discard any part of an intersecting gate", () => {
  const gate = new GateBuilder()
    .setHeight(2)
    .setKnownEffectToMatrix(Matrix.identity(4)).gate;
  const circuit = new CircuitDefinition(2, [new GateColumn([gate, undefined])]);
  assertThat(validateCircuitRange(circuit, "1:1", "1:2")).isEqualTo({
    colStart: 0,
    colEnd: 1,
    wireStart: 0,
    wireEnd: 2,
  });
  for (const range of ["1:1", "2:2", "1.5:2", "2:1", "1:3", ""])
    assertThrows(() => validateCircuitRange(circuit, "1:1", range));
});

suite.test(
  "explicit pasted matrix tables retain rows and form the intended operator",
  () => {
    for (const text of ["0\t1\n1\t0", "0,1;1,0", "[[0,1],[1,0]]"])
      assertThat(parseMatrixDraft(text)).isEqualTo(QubitMatrix.PAULI_X);
    for (const text of ["1\t0\n0", "1\t\n0\t1", "1,0;0,1+"])
      assertThrows(() => parseMatrixDraft(text));
    assertThrows(() =>
      parseMatrixDraft(
        Array(17).fill(Array(17).fill("0").join("\t")).join("\n"),
      ),
    );
  },
);
suite.test("ragged explicit tables are rejected with a row message", () => {
  for (const text of ["1\t0\n0", "1,0;0", "[[1,0],[0]]"])
    assertThat(assertThrows(() => parseMatrixDraft(text)).subject.message).is(
      "Row 2 has 1 entries; expected 2.",
    );
  assertThat(
    assertThrows(() => parseMatrixDraft("1\t0\t0\n0\t1\t0\n0\t0\t1")).subject
      .message,
  ).is("Use 2×2, 4×4, 8×8, or 16×16 rows and columns.");
});
suite.test(
  "legacy newline lists are accepted and keep their entries for the grid",
  () => {
    const identity = Matrix.identity(2);
    for (const text of [
      "1\n0\n0\n1",
      "1, 0, 0\n1",
      "1,0\n0,1\n",
      "1\r\n0\r\n0\r\n1",
    ])
      assertThat(parseMatrixDraft(text)).isEqualTo(identity);
    assertThat(matrixEntriesForGrid("1\n0\n0\n1")).isEqualTo({
      size: 2,
      cells: ["1", "0", "0", "1"],
    });
    assertThat(matrixEntriesForGrid("1, 0, 0\n1")).isEqualTo({
      size: 2,
      cells: ["1", "0", "0", "1"],
    });
    assertThat(matrixEntriesForGrid("1\n0\n0")).isEqualTo({
      size: 2,
      cells: ["1", "0", "0", "0"],
    });
    assertThat(matrixEntriesForGrid("0\t1\n1\t0")).isEqualTo({
      size: 2,
      cells: ["0", "1", "1", "0"],
    });
    assertThrows(() => parseMatrixDraft("1\n0\n0\n1+"));
  },
);
suite.test(
  "raw to grid preserves exact formulas and documented legacy padding",
  () => {
    const cells = ["1/sqrt(2)", "-i", "pi/4", "cos(45)"];
    const text = matrixTextFromCells(cells, 2);
    assertThat(matrixEntriesForGrid(text)).isEqualTo({ size: 2, cells });
    assertThat(matrixEntriesForGrid("1/sqrt(2),-i,pi/4")).isEqualTo({
      size: 2,
      cells: [...cells.slice(0, 3), "0"],
    });
    assertThat(matrixEntriesForGrid("pi/4")).isEqualTo({
      size: 2,
      cells: ["pi/4", "0", "0", "pi/4"],
    });
    assertThat(parseMatrixDraft("1,0,0")).isEqualTo(Matrix.square(1, 0, 0, 0));
  },
);
suite.test(
  "matrix block paste validates atomically and preserves surrounding entries",
  () => {
    const original = Array.from({ length: 16 }, (_, i) => String(i));
    const result = applyMatrixPaste(original, 4, 5, [
      ["1/sqrt(2)", "-i"],
      ["pi", "0"],
    ]);
    const expected = [...original];
    expected[5] = "1/sqrt(2)";
    expected[6] = "-i";
    expected[9] = "pi";
    expected[10] = "0";
    assertThat(result).isEqualTo(expected);
    assertThat(original).isEqualTo(
      Array.from({ length: 16 }, (_, i) => String(i)),
    );
    for (const [start, rows] of [
      [3, [["1", "0"]]],
      [12, [["1"], ["0"]]],
      [0, [["1", "0"], ["1"]]],
      [0, [["1", "1+"]]],
      [0, [["1/0"]]],
      [0, [[""]]],
    ])
      assertThrows(() => applyMatrixPaste(original, 4, start, rows));
  },
);
