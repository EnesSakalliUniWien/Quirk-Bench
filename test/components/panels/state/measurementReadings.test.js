import { Suite, assertThat } from "../../../TestUtil.js";
import { measurementReadings } from "../../../../src/components/panels/state/measurementReadings.js";
import { measurementDescription } from "../../../../src/circuit/measurementDescription.js";
import { displayedDetectorResult } from "../../../../src/draw/gate/MeasurementCaption.js";
import { GateRenderParams } from "../../../../src/draw/gate/GateRenderParams.js";
import { Gates } from "../../../../src/gates/AllGates.js";
import { MeasurementGate } from "../../../../src/gates/probes/MeasurementGate.js";
import { CircuitDefinition } from "../../../../src/circuit/model/CircuitDefinition.js";
import { GateColumn } from "../../../../src/circuit/model/GateColumn.js";
import { CircuitStats } from "../../../../src/engine/simulation/CircuitStats.js";

const suite = new Suite("measurementReadings");
const { X, H } = Gates.HalfTurns;
const { ZDetector, ZDetectControlClear } = Gates.Detectors;
const { PostSelectOff, PostSelectOn } = Gates.PostSelectionGates;

function run(columns) {
  const wireCount = Math.max(1, ...columns.map((column) => column.length));
  const circuit = new CircuitDefinition(
    wireCount,
    columns.map(
      (column) =>
        new GateColumn(
          Array.from({ length: wireCount }, (_, row) => column[row]),
        ),
    ),
  );
  const stats = CircuitStats.fromCircuitAtTime(circuit, 0);
  return { circuit, stats, fullStats: stats, step: columns.length };
}

suite.test(
  "all thirteen operations have descriptions, including the historical Y IDs",
  () => {
    const gates = [
      MeasurementGate,
      ...Gates.Detectors.all,
      ...Gates.PostSelectionGates.all,
    ];
    assertThat(gates.length).isEqualTo(13);
    assertThat(
      gates.every((gate) => measurementDescription(gate)?.steps.length >= 2),
    ).isEqualTo(true);
    assertThat(
      measurementDescription(Gates.PostSelectionGates.PostSelectAntiY)
        .keptState,
    ).isEqualTo("|i⟩");
    assertThat(
      measurementDescription(Gates.PostSelectionGates.PostSelectY).keptState,
    ).isEqualTo("|−i⟩");
    assertThat(measurementDescription(H)).isEqualTo(undefined);
    assertThat(measurementReadings(undefined)).isEqualTo([]);
  },
);

suite.testUsingWebGL(
  "results remain tied to the completed run and explicit circuit locations",
  () => {
    const sample = run([[X], [ZDetector, ZDetector]]);
    const readings = measurementReadings(sample);
    assertThat(readings.map((r) => r.result)).isEqualTo(["click", "no click"]);
    assertThat(readings[0].location).isEqualTo("q0 (wire 1), column 2");
    assertThat(measurementReadings(sample)).isEqualTo(readings);
    assertThat(sample.stats.customStatsForSlot(1, 0)).isEqualTo(true);
  },
);

suite.testUsingWebGL(
  "future and missing results do not masquerade as no click",
  () => {
    const sample = run([[ZDetector]]);
    assertThat(measurementReadings({ ...sample, step: 0 })[0].status).isEqualTo(
      "pending",
    );
    const missing = CircuitStats.withNanDataFromCircuitAtTime(
      sample.circuit,
      0,
    );
    assertThat(
      measurementReadings({ ...sample, stats: missing })[0].status,
    ).isEqualTo("unavailable");
    const args = GateRenderParams.inCircuit(
      undefined,
      undefined,
      undefined,
      ZDetector,
      sample.stats,
      { row: 0, col: 0 },
      { customStats: false, isReached: false },
    );
    assertThat(displayedDetectorResult(args.withPainter(undefined))).isEqualTo(
      undefined,
    );
    args.isReached = true;
    assertThat(displayedDetectorResult(args)).isEqualTo(false);
  },
);

suite.testUsingWebGL(
  "deferred measurement is distinct from sampled outcomes",
  () => {
    const sample = run([[H], [MeasurementGate], [ZDetector]]);
    const [deferred, sampled] = measurementReadings(sample);
    assertThat(deferred.result).isEqualTo("Deferred");
    assertThat(["click", "no-click"].includes(sampled.status)).isEqualTo(true);
  },
);

suite.testUsingWebGL(
  "controlled no click does not claim the target was OFF",
  () => {
    const sample = run([
      [undefined, X],
      [Gates.Controls.Control, ZDetector],
    ]);
    const [reading] = measurementReadings(sample);
    assertThat(reading.result).isEqualTo("no click");
    assertThat(reading.note.includes("controls")).isEqualTo(true);
    assertThat(
      sample.stats.controlledWireProbabilityJustAfter(1, Infinity),
    ).isEqualTo(1);
  },
);

suite.testUsingWebGL(
  "reset reports its control result and leaves the target OFF",
  () => {
    const sample = run([[X], [ZDetectControlClear], [ZDetector]]);
    const readings = measurementReadings(sample);
    assertThat(readings[0].result).isEqualTo("click");
    assertThat(readings[0].note).isEqualTo(
      "Control active; target reset to |0⟩.",
    );
    assertThat(readings[1].result).isEqualTo("no click");
  },
);

suite.testUsingWebGL(
  "survival is jointly attributed to the column, never to each gate",
  () => {
    const sample = run([
      [H, H],
      [PostSelectOff, PostSelectOn],
    ]);
    assertThat(sample.stats.survivalRate(1)).isApproximatelyEqualTo(0.25);
    assertThat(measurementReadings(sample).map((r) => r.result)).isEqualTo([
      "25% survive column",
      "25% survive column",
    ]);
  },
);

suite.testUsingWebGL(
  "zero survival has no conditional output or later detector result",
  () => {
    const sample = run([[X], [PostSelectOff], [ZDetector], [ZDetector]]);
    const [postselect, detector, later] = measurementReadings(sample);
    assertThat(postselect.result).isEqualTo("0% survive column");
    assertThat(postselect.status).isEqualTo("empty");
    assertThat(detector.result).isEqualTo("No surviving state");
    assertThat(later.result).isEqualTo("No surviving state");
  },
);

suite.testUsingWebGL(
  "disabled and switched-off gates stay distinguishable from pending ones",
  () => {
    const sample = run([
      [Gates.Controls.Control, MeasurementGate],
      [ZDetector.withDeactivated(true)],
    ]);
    const readings = measurementReadings({ ...sample, step: 0 });
    assertThat(readings.map((r) => r.status)).isEqualTo(["disabled", "off"]);
  },
);
