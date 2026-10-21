import { Suite, assertThat } from "../../TestUtil.js";
import { Matrix } from "../../../src/engine/math/matrix/Matrix.js";
import { QubitMatrix } from "../../../src/engine/math/matrix/QubitMatrix.js";
import { analyzeOperator } from "../../../src/engine/math/matrix/operatorAnalysis.js";
import { inspectMatrix } from "../../../src/components/panels/forge/construction.js";
import { GateBuilder } from "../../../src/circuit/model/Gate.js";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { GateDetails } from "../../../src/components/gate/gate-details.jsx";
import { OperationPreview } from "../../../src/components/panels/forge/operation-preview.jsx";

const suite = new Suite("Operator analysis");

suite.test(
  "gate details and Forge show the same accepted approximate rotation",
  () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    try {
      for (const scale of [1.002, 1.006]) {
        const matrix = Matrix.square(scale, 0, 0, 1);
        const gate = new GateBuilder()
          .setSerializedId("~analysis")
          .setKnownEffectToMatrix(matrix).gate;
        flushSync(() =>
          root.render(createElement(GateDetails, { gate, time: 0 })),
        );
        const detailsRotation =
          host.querySelector(".gate-details-rotation") !== null;
        flushSync(() =>
          root.render(createElement(OperationPreview, { matrix })),
        );
        const forgeRotation = [...host.querySelectorAll("h3")].some(
          (heading) => heading.textContent === "Bloch rotation",
        );
        assertThat(detailsRotation).isEqualTo(scale === 1.002);
        assertThat(forgeRotation).isEqualTo(detailsRotation);
        assertThat(
          host.querySelector(".operation-status span").textContent,
        ).isEqualTo(scale === 1.002 ? "Unitary" : "Nonunitary operation");
      }
    } finally {
      flushSync(() => root.unmount());
    }
  },
);

suite.test(
  "display classification and rotation follow gate acceptance at its boundary",
  () => {
    // A single diagonal perturbation makes the Frobenius unitarity residual equal to error.
    // Include the old GateDetails (.001) and Forge (.009) disagreement region.
    for (const error of [0.002, 0.0095, 0.009999, 0.010001]) {
      const matrix = Matrix.square(Math.sqrt(1 + error), 0, 0, 1);
      const analysis = analyzeOperator(matrix);
      const accepted = new GateBuilder()
        .setKnownEffectToMatrix(matrix)
        .gate.isDefinitelyUnitary();
      assertThat(analysis.unitary).isEqualTo(error < 0.01);
      assertThat(analysis.unitary).isEqualTo(accepted);
      assertThat(analysis.rotation !== undefined).isEqualTo(accepted);
      assertThat(analysis.residual).isApproximatelyEqualTo(error);
      assertThat(inspectMatrix(matrix)).isEqualTo({ qubits: 1, ...analysis });
    }
  },
);

suite.test("exact rotations retain their axis angle and global phase", () => {
  const matrix = QubitMatrix.HADAMARD;
  assertThat(analyzeOperator(matrix).rotation).isEqualTo(
    QubitMatrix.operationToAngleAxisRotation(matrix),
  );
  assertThat(analyzeOperator(matrix).residual).isApproximatelyEqualTo(0);
});

suite.test(
  "nonunitary and multi-qubit operators have no Bloch rotation",
  () => {
    const nonunitary = analyzeOperator(Matrix.square(1, 0, 0, 0));
    assertThat(nonunitary.unitary).isEqualTo(false);
    assertThat(nonunitary.rotation).isEqualTo(undefined);
    assertThat(nonunitary.residual).isEqualTo(1);
    const twoQubits = analyzeOperator(Matrix.identity(4));
    assertThat(twoQubits.unitary).isEqualTo(true);
    assertThat(twoQubits.rotation).isEqualTo(undefined);
    assertThat(twoQubits.residual).isEqualTo(0);
  },
);
