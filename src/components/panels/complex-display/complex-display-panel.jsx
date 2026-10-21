import { useColourScheme } from "../../useColourScheme.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "zustand";
import { appStore } from "../../../state/appStore.js";
import { useCompletedResult } from "../shared/usePlayheadStats.js";
import { useOnScreen } from "../shared/useOnScreen.js";
import { displayData } from "./displayData.js";
import { BlochAnalysis } from "../../math/bloch-analysis.jsx";
import { DataView } from "../../math/data-view.jsx";
import { Matrix } from "../../../engine/math/matrix/Matrix.js";
import { Complex } from "../../../engine/math/complex/Complex.js";
import { paintInto } from "../../../draw/surface/SharedPaintSurface.js";
import {
  DATA_RENDERERS,
  stateGridRect,
} from "../../../draw/renderers/dataRenderers.js";
import { densityGridRect } from "../../../draw/displays/density/DensityMatrixView.js";
import { rectangle } from "../../../draw/shapes/ShapeView.js";
import { CanvasTheme, phaseColor } from "../../../config/CanvasTheme.js";
import { Rect } from "../../../geometry/Rect.js";
import { bin } from "../../../base/Format.js";
import { ketLabel } from "../../../circuit/registerLabels.js";
import { interpretComplexCell } from "../../../engine/math/complex/complexCell.js";

const SIZE = 320;

export function ComplexDisplayPanel() {
  const target = useStore(appStore, (state) => state.complexDisplayTarget);
  const result = useCompletedResult();
  const data = displayData(result?.fullStats, target);
  if (!data?.matrix)
    return (
      <div className="panel-body">
        Select an amplitude or density display in the circuit to inspect its
        values.
      </div>
    );
  return (
    <DisplayInspector
      key={`${target.col}:${target.row}:${target.gate.serializedId}`}
      data={data}
    />
  );
}

function DisplayInspector({ data }) {
  useColourScheme();
  const { matrix, kind, coherent, wireCount, registers, phaseLockIndex } = data;
  const [selection, select] = useState({ row: 0, col: 0 });
  const row = Math.min(selection.row, matrix.height() - 1),
    col = Math.min(selection.col, matrix.width() - 1);
  const value = matrix.cell(col, row);
  const { finite, magnitude, phase } = interpretComplexCell(value, coherent);
  const phaseMatrix = useMemo(
    () =>
      phase === undefined ? undefined : Matrix.square(Complex.polar(1, phase)),
    [phase],
  );
  const bits = Math.round(Math.log2(matrix.height()));
  const label =
    kind === "density"
      ? `Row |${bin(row, bits)}⟩ · column ⟨${bin(col, bits)}|`
      : `Basis |${ketLabel(registers, wireCount, row * matrix.width() + col)}⟩`;
  return (
    <div className="panel-body complex-display-panel">
      <h2>{kind === "density" ? "Density matrix" : "Amplitudes"}</h2>
      <p>Choose a cell, or use the arrow keys on the grid.</p>
      <BlochAnalysis getStates={() => [data.analysis]} />
      {data.measured && (
        <p>
          Measurement deferred: this grid shows simulation amplitudes. Bloch
          analysis uses the physical density matrices after measurement.
        </p>
      )}
      <DisplayGrid data={data} row={row} col={col} select={select} />
      <div className="complex-cell-controls">
        {["row", "col"].map((axis) => {
          const max = (axis === "row" ? matrix.height() : matrix.width()) - 1;
          return (
            <label key={axis}>
              {axis === "row" ? "Row" : "Column"}{" "}
              <input
                type="number"
                min="0"
                max={max}
                value={axis === "row" ? row : col}
                onChange={(event) =>
                  select({
                    row,
                    col,
                    [axis]: Math.max(
                      0,
                      Math.min(
                        max,
                        Math.trunc(Number(event.target.value)) || 0,
                      ),
                    ),
                  })
                }
              />
            </label>
          );
        })}
      </div>
      <h3>{label}</h3>
      {phaseMatrix && (
        <DataView
          kind="matrix"
          data={phaseMatrix}
          width={150}
          height={150}
          className="complex-phase-figure"
          label="Selected complex entry's phase direction; radius is normalized"
        />
      )}
      <dl aria-live="polite">
        <dt>{coherent ? "Stored complex value" : "Probability"}</dt>
        <dd>
          {!finite
            ? "Unavailable"
            : coherent
              ? `${value.real} ${value.imag < 0 ? "−" : "+"} ${Math.abs(value.imag)}i`
              : `${magnitude * magnitude}`}
        </dd>
        {coherent && (
          <>
            <dt>Magnitude</dt>
            <dd>{finite ? String(magnitude) : "Unavailable"}</dd>
          </>
        )}
        {coherent && (kind !== "density" || row === col) && (
          <>
            <dt>Probability</dt>
            <dd>
              {finite
                ? String(
                    kind === "density" ? value.real : magnitude * magnitude,
                  )
                : "Unavailable"}
            </dd>
          </>
        )}
        <dt>Phase</dt>
        <dd>
          {phase === undefined
            ? "Undefined"
            : `${((phase * 180) / Math.PI).toFixed(6)}°`}
        </dd>
      </dl>
      <h3>How to read the display</h3>
      <p>
        The enlarged circle shows phase direction only; its radius is
        normalized.
      </p>
      <p>
        {kind === "density"
          ? "Diagonal bar height is probability. Circle radius is the magnitude of the density-matrix entry."
          : "Circle area and bar height show probability; circle radius shows amplitude magnitude."}{" "}
        A hand shows phase and ends on a faint ring that makes small nonzero
        values visible on a logarithmic scale.
      </p>
      <p>
        Dense grids use colour for phase and opacity for magnitude relative to
        the largest entry, with a visibility floor for small values. Select a
        cell for its stored value.
      </p>
      {coherent && (
        <div
          className="complex-phase-key"
          role="group"
          aria-label="Phase colour key"
        >
          {[0, 90, 180, 270].map((degrees) => (
            <span key={degrees}>
              <i
                aria-hidden="true"
                style={{ backgroundColor: phaseColor(degrees) }}
              />
              {degrees}°
            </span>
          ))}
        </div>
      )}
      {!coherent && (
        <p>
          Entanglement with other qubits makes local amplitudes and phase
          undefined. This view shows probabilities. Dense cells use one colour,
          with opacity based on the square root of probability relative to the
          largest entry.
        </p>
      )}
      {kind === "amplitudes" && coherent && phaseLockIndex !== undefined && (
        <p>
          Phase reference: |{ketLabel(registers, wireCount, phaseLockIndex)}⟩.
        </p>
      )}
      <p>
        Values are the simulator’s stored floating-point results, not symbolic
        expressions.
      </p>
    </div>
  );
}

function DisplayGrid({ data, row, col, select }) {
  const scheme = useColourScheme();
  const canvas = useRef(null);
  const { matrix, kind } = data;
  const area = useMemo(() => new Rect(0, 0, SIZE, SIZE), []);
  const grid = useMemo(
    () =>
      kind === "density"
        ? densityGridRect(matrix, area)
        : stateGridRect(matrix, area).grid,
    [kind, matrix, area],
  );
  const cell = Math.min(grid.w / matrix.width(), grid.h / matrix.height());
  const onScreen = useOnScreen(canvas);
  useEffect(() => {
    if (!onScreen) return undefined;
    let active = true;
    void paintInto(
      canvas.current,
      SIZE,
      SIZE,
      (view) => {
        if (kind === "density")
          DATA_RENDERERS.matrix(view, matrix, area, { style: "density" });
        else
          DATA_RENDERERS.state(view, matrix, area, {
            ...data,
            indicatorAlpha: data.coherent ? 1 : 0,
          });
        rectangle(
          view,
          new Rect(grid.x + col * cell, grid.y + row * cell, cell, cell),
          { stroke: { color: CanvasTheme.interaction.outline, width: 2 } },
        );
      },
      () => active,
    ).catch(() => {});
    return () => {
      active = false;
    };
  }, [
    data,
    row,
    col,
    onScreen,
    scheme,
    area,
    cell,
    grid.x,
    grid.y,
    kind,
    matrix,
  ]);
  return (
    <canvas
      ref={canvas}
      className="complex-display-grid"
      tabIndex="0"
      role="img"
      aria-label={`Select cell: row ${row}, column ${col}. Use arrow keys.`}
      onClick={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        const c = Math.floor(
          (((event.clientX - bounds.left) * SIZE) / bounds.width - grid.x) /
            cell,
        );
        const r = Math.floor(
          (((event.clientY - bounds.top) * SIZE) / bounds.height - grid.y) /
            cell,
        );
        if (r >= 0 && r < matrix.height() && c >= 0 && c < matrix.width())
          select({ row: r, col: c });
      }}
      onKeyDown={(event) => {
        const moves = {
          ArrowLeft: [0, -1],
          ArrowRight: [0, 1],
          ArrowUp: [-1, 0],
          ArrowDown: [1, 0],
        };
        const delta = moves[event.key];
        if (!delta) return;
        event.preventDefault();
        event.stopPropagation();
        select({
          row: Math.max(0, Math.min(matrix.height() - 1, row + delta[0])),
          col: Math.max(0, Math.min(matrix.width() - 1, col + delta[1])),
        });
      }}
    />
  );
}
