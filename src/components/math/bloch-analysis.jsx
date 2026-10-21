import { useId, useMemo, useState } from "react";
import { BlochFigures } from "../panels/bloch/bloch-figures.jsx";
import { ReadoutSidebar } from "../panels/bloch/readout-sidebar.jsx";
import { LayerSwitches } from "../panels/bloch/layer-switches.jsx";
import { AxisKey } from "../panels/bloch/axis-key.jsx";
import { ExploreControls } from "../panels/bloch/explore-controls.jsx";
import {
  INITIAL_LAYERS,
  anglesOf,
  panelReadout,
} from "../panels/bloch/analyzerModel.js";
import { vectorFromAngles } from "../../engine/math/bloch.js";
import {
  densityFromBloch,
  densityQubits,
} from "../../engine/math/blochAnalysis.js";
import { useBlochView } from "./useBlochView.js";
import { wireLabel } from "../../circuit/registerLabels.js";
import { Registers } from "../../circuit/model/Registers.js";

/** Lazy analysis of existing physical states. Closing releases all figure surfaces.
 * getStates returns [{label, registers?, qubits: [{wire, bloch}]}]; it is called only while expanded.
 * Keep joint-state tables/matrices alongside this selected-qubit analysis.
 */
export function BlochAnalysis({
  getStates,
  title = "Bloch analysis",
  children,
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="shared-bloch-analysis"
      onToggle={(event) => {
        if (event.target === event.currentTarget)
          setOpen(event.currentTarget.open);
      }}
    >
      <summary>{title}</summary>
      {open && (children ?? <StateAnalysis getStates={getStates} />)}
    </details>
  );
}

function StateAnalysis({ getStates, initialState = 0, children }) {
  const states = useMemo(() => getStates(), [getStates]);
  const [selectedState, selectState] = useState(initialState);
  const [wire, selectWire] = useState(0);
  const stateIndex = Math.min(selectedState, Math.max(0, states.length - 1));
  const state = states[stateIndex];
  const qubits = state?.qubits ?? [];
  const qubit = qubits.find((q) => q.wire === wire) ?? qubits[0];
  const vector = qubit?.bloch;
  const available = vector && Object.values(vector).every(Number.isFinite);
  const prefix = useId();
  const source = useMemo(
    () => ({
      target: prefix,
      kind: "state",
      index: `${stateIndex}:${qubit?.wire}`,
    }),
    [prefix, stateIndex, qubit?.wire],
  );
  return (
    <div className="shared-bloch-body">
      <div className="shared-bloch-selectors">
        {states.length > 1 ? (
          <label>
            State{" "}
            <select
              aria-label="State to analyze"
              value={stateIndex}
              onChange={(e) => selectState(Number(e.target.value))}
            >
              {states.map((s, i) => (
                <option key={i} value={i}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p>{state?.label ?? "State unavailable"}</p>
        )}
        {qubits.length > 1 && (
          <label>
            Qubit{" "}
            <select
              aria-label="Qubit to analyze"
              value={qubit?.wire ?? 0}
              onChange={(e) => selectWire(Number(e.target.value))}
            >
              {qubits.map((q) => (
                <option key={q.wire} value={q.wire}>
                  {wireLabel(state.registers ?? Registers.EMPTY, q.wire)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {children}
      {qubits.length > 1 && (
        <p className="bloch-hint">
          Each sphere shows one qubit’s reduced state. Joint correlations remain
          in the accompanying matrix or distribution.
        </p>
      )}
      <BlochStateView
        vector={available ? vector : undefined}
        source={source}
        idPrefix={prefix}
      />
    </div>
  );
}

/** The same figures, layers, axis focus and readout used by the full Bloch window. */
function BlochStateView({ vector, source, idPrefix }) {
  const [layers, setLayers] = useState(INITIAL_LAYERS);
  const [pinnedAxis, pin] = useState(undefined);
  const [hoverAxis, hover] = useState(undefined);
  const figures = useBlochView({
    vector,
    source,
    layers,
    focusAxis: hoverAxis ?? pinnedAxis,
  });
  return (
    <div className="shared-bloch-view">
      {vector === undefined && (
        <p className="bloch-note">
          No physical qubit state is available for this selection.
        </p>
      )}
      <BlochFigures
        idPrefix={idPrefix}
        {...figures}
        onResetView={figures.resetView}
        displayControls={
          <div className="bloch-display">
            <AxisKey
              idPrefix={idPrefix}
              pinnedAxis={pinnedAxis}
              onTogglePin={(axis) =>
                pin((old) => (old === axis ? undefined : axis))
              }
              onPreview={hover}
            />
            <LayerSwitches
              idPrefix={idPrefix}
              layers={layers}
              onChange={(key, checked) =>
                setLayers((old) => ({ ...old, [key]: checked }))
              }
            />
          </div>
        }
      />
      <ReadoutSidebar idPrefix={idPrefix} readout={figures.readout} />
    </div>
  );
}

/** Explore U rho U† on a selected input. State-direction q in the readout is not U's rotation. */
export function OperationBlochAnalysis({
  matrix,
  title = "Explore operation on the Bloch sphere",
}) {
  return (
    <BlochAnalysis title={title}>
      <OperationAnalysis matrix={matrix} />
    </BlochAnalysis>
  );
}

function OperationAnalysis({ matrix }) {
  const id = useId();
  const [input, setInput] = useState({ x: 0, y: 0, z: 1 });
  const [preset, setPreset] = useState("|0⟩");
  const states = useMemo(() => {
    const output = matrix
      .times(densityFromBloch(input))
      .times(matrix.adjoint());
    return [
      { label: "Input state", qubits: [{ wire: 0, bloch: input }] },
      { label: "After operation (normalized)", qubits: densityQubits(output) },
    ];
  }, [matrix, input]);
  const getStates = useMemo(() => () => states, [states]);
  return (
    <StateAnalysis getStates={getStates} initialState={1}>
      <div className="shared-bloch-input">
        <p className="bloch-hint">
          Choose an input state to inspect this operation. The quaternion
          readout describes the selected state’s direction; the gate’s rotation
          and global phase are separate.
        </p>
        <ExploreControls
          idPrefix={`${id}-input`}
          activePreset={preset}
          canReturn={false}
          angles={anglesOf(panelReadout(input))}
          onPreset={(p) => {
            setInput(p.vec);
            setPreset(p.name);
          }}
          onAngles={(theta, phi) => {
            setInput(
              vectorFromAngles(
                (theta * Math.PI) / 180,
                (phi * Math.PI) / 180,
                Math.hypot(input.x, input.y, input.z),
              ),
            );
            setPreset(undefined);
          }}
        />
      </div>
    </StateAnalysis>
  );
}
