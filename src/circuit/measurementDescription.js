/** Presentation of the built-in measurement operations. Serialized IDs and simulation effects
 * stay with the gates; these descriptions are shared by the toolbox, details and result readout. */
const descriptions = new Map();

descriptions.set("Measure", {
  kind: "deferred",
  axis: "Z",
  summary: "Deferred Z-axis measurement; no single outcome is sampled.",
  steps: [
    "Measure ON or OFF without conditioning on one result.",
    "Read probabilities and density matrices for the physical state. The retained simulation amplitudes do not describe a physical pure state after measurement.",
  ],
});

for (const [axis, clickState] of [
  ["X", "|−⟩"],
  ["Y", "|−i⟩"],
  ["Z", "|1⟩"],
]) {
  descriptions.set(`${axis}Detector`, {
    kind: "detector",
    axis,
    clickState,
    summary: `Sample a ${axis}-axis measurement and condition the state on the result.`,
    steps: [
      `Click means the target is ${clickState} and any controls are satisfied.`,
      "No click is the complementary result: the target condition or the controls were not satisfied. The circuit state is conditioned on that result.",
    ],
  });
  descriptions.set(`${axis}DetectControlReset`, {
    kind: "reset",
    axis,
    clickState,
    summary: `Sample in the ${axis} basis, control with the result, then reset to |0⟩.`,
    steps: [
      `Measure in the ${axis} basis: ${clickState} gives click.`,
      "Use the result as a control for operations in the same column. Click enables this control; no click disables it.",
      "Reset the target to |0⟩ after those operations, for either result.",
    ],
  });
}

for (const [id, axis, keptState] of [
  ["|0⟩⟨0|", "Z", "|0⟩"],
  ["|1⟩⟨1|", "Z", "|1⟩"],
  ["|+⟩⟨+|", "X", "|+⟩"],
  ["|-⟩⟨-|", "X", "|−⟩"],
  // Y's historical serialized IDs differ from the symbols shown on the gates.
  ["|X⟩⟨X|", "Y", "|i⟩"],
  ["|/⟩⟨/|", "Y", "|−i⟩"],
]) {
  descriptions.set(id, {
    kind: "postselection",
    axis,
    keptState,
    summary: `Post-select ${keptState} in the ${axis} basis; probabilities are conditional on surviving runs.`,
    steps: [
      `Keep ${keptState} where controls are satisfied; discard the orthogonal component there. Components with unsatisfied controls are retained.`,
      "Normalize the surviving state. Survival is reported for the whole column, including any other operations there.",
      "With zero survival there is no conditional output state.",
    ],
  });
}

/** @param {!Gate} gate */
function measurementDescription(gate) {
  return descriptions.get(gate.serializedId);
}

export { measurementDescription };
