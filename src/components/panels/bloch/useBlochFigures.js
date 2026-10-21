import { useEffect, useMemo } from "react";
import { blochCoordinates } from "../../../engine/math/bloch.js";
import { appStore } from "../../../state/appStore.js";
import { closePanel } from "../../dock.jsx";
import { useBlochView } from "../../math/useBlochView.js";
import { densityMatrixOf } from "./analyzerModel.js";

/** Circuit selection belongs here; the shared view owns drawing, camera and surface cleanup. */
function useBlochFigures({
  deps,
  completed,
  target,
  mode,
  layers,
  focusAxis,
  steps,
  currentStep,
}) {
  const density = useMemo(
    () =>
      target && deps ? densityMatrixOf(deps, completed, target) : undefined,
    [deps, completed, target],
  );
  useEffect(() => {
    if (
      mode.kind !== "explore" &&
      target &&
      deps &&
      completed &&
      density === undefined &&
      densityMatrixOf(deps, deps.completed.getState().value, target) ===
        undefined
    ) {
      appStore.setState({ blochTarget: undefined });
      closePanel("bloch");
    }
  }, [mode.kind, target, deps, completed, density]);
  const vector = useMemo(
    () =>
      mode.kind === "explore"
        ? mode.vec
        : mode.kind === "step"
          ? steps[mode.index]?.vec
          : density && !density.hasNaN()
            ? blochCoordinates(density)
            : undefined,
    [mode, steps, density],
  );
  const selectedStep =
    mode.kind === "step"
      ? mode.index
      : mode.kind === "circuit"
        ? currentStep
        : undefined;
  const source = useMemo(
    () => ({
      target,
      kind: mode.kind,
      index: selectedStep,
      circuit: completed?.circuit,
    }),
    [target, mode.kind, selectedStep, completed?.circuit],
  );
  return useBlochView({
    vector,
    source,
    layers,
    focusAxis,
    steps,
    selectedStep,
    settings: deps?.settings,
  });
}
export { useBlochFigures };
