# Panels

`panels.jsx` registers the dock panels. Each panel has a directory named after its
registry key and an entry component in `<name>-panel.jsx`. Each supporting React
component has its own file, using the existing kebab-case naming convention.

| Directory        | Responsibility                                                                                                                                                                                                                     |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `algebra/`       | Operation equations, step cards, state factors and evolution chart                                                                                                                                                                 |
| `bloch/`         | Enlarged Bloch sphere and its readings                                                                                                                                                                                             |
| `circuit/`       | Circuit canvas host, gutter rename box, gutter menu, the gate menu, the dial on a rotation gate's wire, the selection's bar, menu, commands and keys, and the keyboard's cell cursor with what the circuit says to a screen reader |
| `export/`        | Circuit and simulation exports, including copy feedback                                                                                                                                                                            |
| `forge/`         | Custom gate creation from matrices, rotations and circuit ranges                                                                                                                                                                   |
| `gate-param/`    | Editing a selected gate's parameter                                                                                                                                                                                                |
| `gates/`         | Gate toolbox panel                                                                                                                                                                                                                 |
| `probabilities/` | Basis-state probabilities traced step by step up to the playhead, in index order or grouped by correlated qubits                                                                                                                   |
| `qubits/`        | Per-qubit readings                                                                                                                                                                                                                 |
| `registers/`     | Register editing, value labels and readings                                                                                                                                                                                        |
| `state/`         | Playhead state table                                                                                                                                                                                                               |
| `tape/`          | Recorded takes, comparison, import/export, recording controls and the animation, sampling and measurement settings                                                                                                                 |
| `shared/`        | Completed-result subscription and dock wrapper used across panels                                                                                                                                                                  |

Keep panel-specific hooks and helpers with their panel. The circuit's gutter
editors live in `circuit/` because they are positioned and mounted by the circuit
host. Recording controls live in `tape/` and are also used by the transport bar.

Shared matrix renderers remain in `src/components/math/`, shared gate details in
`src/components/gate/`, and toolbox components in `src/components/toolbox/`.
The shared Bloch analyzer is `src/components/math/bloch-analysis.jsx`: pass
physical states through `BlochAnalysis`, or a single-qubit operator through
`OperationBlochAnalysis`. Both reuse the Bloch window's figures, projections,
layers, axis controls and readouts through `useBlochView.js`. Embedded instances
use unique IDs and mount their render surfaces only while expanded. Keep joint
state matrices and distributions alongside the selected-qubit reduced state.
Physical per-qubit readings come from `qubitReadings` in
`src/engine/simulation/qubitMarginals.js`, including display-column controls and
deferred measurement. Step and preparation vectors use `qubitMarginals` from
the same module. Both feed the shared analyzer directly as `{wire, bloch}`
readings; panels pass register metadata for labels rather than rebuilding it.
Amplitude displays request these densities for every covered wire, because an
entangled span's ket does not determine its wires' states. Density displays do
not: `displayData.js` reads each wire from the display's own matrix with
`densityQubits` in `src/engine/math/blochAnalysis.js`, and the single-wire
Density display requests its own density for its renderer.
Saved takes use `src/results/take/bloch.js`; exploratory operators use
`src/engine/math/blochAnalysis.js`. Do not reconstruct coherence from probabilities
or sample counts. The readout quaternion describes a state direction, not the
operator's rotation or global phase.
Simulation and saved-result logic remain in their existing engine and results
directories. Panel styles live in `src/styles/panels/`, with shared panel rules in its `shared/` directory.

To add a panel, create its directory and component, then register it in
`panels.jsx`. Keep registry keys stable: Dockview persists those keys in layouts.
