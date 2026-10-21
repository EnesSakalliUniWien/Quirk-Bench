import { Suite, assertThat } from "../../TestUtil.js";
import { CircuitDefinition } from "../../../src/circuit/model/CircuitDefinition.js";
import { Gates } from "../../../src/gates/AllGates.js";
import { Rect } from "../../../src/geometry/Rect.js";
import { DisplayView } from "../scene/TestDisplayView.js";
import { labelsIn } from "../../editor/rendering/RenderingTestUtil.js";

const suite = new Suite("MeasurementCaption");

const CAPTIONS = [
  [Gates.Special.Measurement, "deferred"],
  [Gates.PostSelectionGates.PostSelectOff, "post-select"],
  [Gates.Detectors.ZDetectControlClear, "reset |0⟩"],
];

/** Whether the gate, painted at `positionInCircuit`, draws `caption` as text. */
async function drawsCaption(gate, caption, positionInCircuit) {
  const painter = new DisplayView(document.createElement("canvas"));
  gate.customRenderer({
    painter,
    rect: new Rect(30, 30, 40, 40),
    gate,
    positionInCircuit,
    stats: {
      time: 0,
      circuitDefinition: CircuitDefinition.fromTextDiagram(
        new Map([
          ["-", undefined],
          ["G", gate],
        ]),
        "-G-",
      ),
    },
    isHighlighted: false,
    isResizeShowing: false,
    isResizeHighlighted: false,
    focusPoints: [],
    isReached: false,
  });
  await painter.commit();
  return labelsIn(painter).some((label) => label.text === caption);
}

suite.test(
  "a measurement caption is drawn in a circuit slot, not on a lone tile",
  async () => {
    for (const [gate, caption] of CAPTIONS) {
      assertThat(await drawsCaption(gate, caption, { row: 0, col: 1 }))
        .withInfo({ gate: gate.serializedId })
        .isEqualTo(true);
      assertThat(await drawsCaption(gate, caption, undefined))
        .withInfo({ gate: gate.serializedId })
        .isEqualTo(false);
    }
  },
);

suite.test("a deactivated gate draws no measurement caption", async () => {
  for (const [gate, caption] of CAPTIONS) {
    assertThat(
      await drawsCaption(gate.withDeactivated(true), caption, {
        row: 0,
        col: 1,
      }),
    )
      .withInfo({ gate: gate.serializedId })
      .isEqualTo(false);
  }
});
