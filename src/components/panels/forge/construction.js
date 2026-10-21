import {
  parseEntryRows,
  inspectComplexEntry,
} from "../../math/structured-entry.js";
import { Axis } from "../../../engine/math/formula/Axis.js";
import { parseAngleExpression } from "../../../engine/math/formula/AngleExpression.js";
import { analyzeOperator } from "../../../engine/math/matrix/operatorAnalysis.js";
import { GateBuilder } from "../../../circuit/model/Gate.js";
import { GateColumn } from "../../../circuit/model/GateColumn.js";
import {
  MATRIX_RENDERER,
  LABEL_RENDERER,
  LOCATION_INDEPENDENT_GATE_RENDERER,
} from "../../../draw/gate/GateRenderers.js";
import { renderCustomGateCircuit } from "../../../draw/gate/CustomGateCircuitRenderer.js";
import { setGateBuilderEffectToCircuit } from "../../../engine/simulation/CircuitComputeUtil.js";
import {
  parseUserRotation,
  parseUserMatrix,
  parseUserGateFromCircuitRange,
} from "../../../serialization/customGateParsing.js";
import {
  gatesMeetingRange,
  occupiedColumns,
} from "../../../circuit/circuitRange.js";

export function normalizedAxis(text) {
  let axis;
  try {
    axis = Axis.parse(text);
  } catch {
    throw new Error("Enter an axis, such as X, Y, Z, or X+Z.");
  }
  const components = [axis.x, axis.y, axis.z];
  const length = Math.hypot(...components);
  if (
    !components.every(Number.isFinite) ||
    !Number.isFinite(length) ||
    length === 0
  ) {
    throw new Error("Axis must be finite and nonzero.");
  }
  return components.map((value) => value / length);
}

export function parseRotationDraft({ axis, angle, phase, unit }) {
  normalizedAxis(axis);
  const rotation = parseAngleExpression(angle, unit);
  let global;
  try {
    global = parseAngleExpression(phase, unit);
  } catch (error) {
    throw new Error(`Global phase: ${error.message}`, { cause: error });
  }
  return parseUserRotation(
    String(rotation.degrees),
    String(global.degrees),
    axis,
  );
}

export function inspectMatrix(matrix) {
  const n = matrix.width();
  if (n !== matrix.height() || ![2, 4, 8, 16].includes(n))
    throw new Error("Choose a 2×2, 4×4, 8×8, or 16×16 matrix.");
  if (![...matrix.rawBuffer()].every(Number.isFinite))
    throw new Error("Every matrix entry must be finite.");
  return {
    qubits: Math.log2(n),
    ...analyzeOperator(matrix),
  };
}

export const matrixTextFromCells = (cells, size) =>
  `{${Array.from({ length: size }, (_, row) => `{${cells.slice(row * size, (row + 1) * size).join(",")}}`).join(",")}}`;

function validateEntries(rows) {
  for (const [row, entries] of rows.entries()) {
    for (const [col, text] of entries.entries()) {
      const result = inspectComplexEntry(text);
      if (result.error)
        throw new Error(`Row ${row + 1}, column ${col + 1}: ${result.error}`);
    }
  }
}

// Tabs, semicolons and brackets mark an explicit table; commas and newlines alone are a legacy list.
const isTable = (text) => /[\t;[\]{}]/.test(text);

/** Legacy list entries as parseUserGateMatrix_noCorrection reads them: newlines act as commas. */
const listEntries = (text) =>
  text
    .split(/,?\s*\n\s*(?!$)/)
    .join(",")
    .trim()
    .replace(/,$/, "")
    .split(",")
    .map((entry) => entry.trim() || "0");

export function parseMatrixDraft(text, corrected = false) {
  if (!text.trim()) throw new Error("Enter a matrix.");
  let source = text;
  // Explicit tables must retain their row/column structure. Legacy lists keep zero padding.
  if (isTable(text)) {
    const rows = parseEntryRows(text);
    if (rows.length !== rows[0].length || ![2, 4, 8, 16].includes(rows.length))
      throw new Error("Use 2×2, 4×4, 8×8, or 16×16 rows and columns.");
    validateEntries(rows);
    source = matrixTextFromCells(rows.flat(), rows.length);
  } else {
    validateEntries([listEntries(text)]);
  }
  const matrix = parseUserMatrix(source, corrected);
  inspectMatrix(matrix);
  return matrix;
}

/** Keep the user's formulas when switching to a grid, including legacy zero padding. */
export function matrixEntriesForGrid(text) {
  const matrix = parseMatrixDraft(text);
  const size = matrix.width();
  if (isTable(text)) return { size, cells: parseEntryRows(text).flat() };
  const cells = listEntries(text);
  if (cells.length === 1)
    return { size, cells: [cells[0], "0", "0", cells[0]] };
  return {
    size,
    cells: [...cells, ...Array(size * size - cells.length).fill("0")],
  };
}

/** Return a new grid only after the entire block and its destination have been validated. */
export function applyMatrixPaste(cells, size, activeCell, rows) {
  const rowStart = Math.floor(activeCell / size);
  const colStart = activeCell % size;
  if (
    !rows.length ||
    !rows[0].length ||
    rows.some((row) => row.length !== rows[0].length)
  )
    throw new Error("Use the same number of entries in every row.");
  if (rowStart + rows.length > size || colStart + rows[0].length > size)
    throw new Error(
      `This ${rows.length}×${rows[0].length} block does not fit at row ${rowStart + 1}, column ${colStart + 1}. Choose another starting entry or a larger matrix dimension.`,
    );
  validateEntries(rows);
  const next = [...cells];
  for (const [row, entries] of rows.entries())
    for (const [col, text] of entries.entries())
      next[(rowStart + row) * size + colStart + col] = text;
  return next;
}

export function buildMatrixGate(matrix, name, kind = "Matrix") {
  const qubits = Math.log2(matrix.height());
  const builder = new GateBuilder()
    .setSerializedId("~preview")
    .setSymbol(name.trim())
    .setTitle(`Custom ${kind} Gate`)
    .setHeight(qubits)
    .setWidth(kind === "Rotation" || name.trim() ? 1 : qubits)
    .setRenderer(
      !name.trim()
        ? MATRIX_RENDERER
        : matrix.isIdentity()
          ? LABEL_RENDERER
          : matrix.isScaler()
            ? LOCATION_INDEPENDENT_GATE_RENDERER
            : undefined,
    )
    .setKnownEffectToMatrix(matrix);
  if (matrix.isIdentity()) builder.markAsNotInterestedInControls();
  return builder.gate;
}

function strictRange(text, max, label) {
  const match = /^\s*(\d+)\s*(?::\s*(\d+|∞)\s*)?$/.exec(text);
  if (!match) throw new Error(`${label}: use a range such as 1:3 or 1:∞.`);
  const start = Number(match[1]);
  const end =
    match[2] === "∞" || match[2] === undefined ? max : Number(match[2]);
  if (!Number.isSafeInteger(start) || start < 1 || start > end || end > max) {
    throw new Error(`${label}: choose an ordered range within 1:${max}.`);
  }
  return [start - 1, end];
}

/** Serialized circuits can omit empty columns occupied by the end of a wide gate. */
export function parseCircuitDraft(circuit, { cols, rows, name }) {
  const range = validateCircuitRange(circuit, cols, rows);
  const padded = circuit.withColumns([
    ...circuit.columns,
    ...Array.from(
      { length: occupiedColumns(circuit) - circuit.columns.length },
      () => new GateColumn(new Array(circuit.numWires).fill(undefined)),
    ),
  ]);
  const extracted = parseUserGateFromCircuitRange(
    padded,
    cols,
    rows,
    name.trim(),
  );
  // Saved custom circuits omit unused trailing wires; preview the same gate that reopening produces.
  const gate = setGateBuilderEffectToCircuit(
    new GateBuilder(),
    extracted.knownCircuit.withMinimumWireCount(),
  )
    .setSerializedId(extracted.serializedId)
    .setSymbol(extracted.symbol)
    .setTitle(extracted.name)
    .setBlurb(extracted.blurb)
    .setRenderer(renderCustomGateCircuit).gate;
  return { range, gate };
}

export function validateCircuitRange(circuit, colsText, rowsText) {
  const [colStart, colEnd] = strictRange(
    colsText,
    occupiedColumns(circuit),
    "Columns",
  );
  const [wireStart, wireEnd] = strictRange(rowsText, circuit.numWires, "Wires");
  const range = { colStart, colEnd, wireStart, wireEnd };
  const met = gatesMeetingRange(circuit, range);
  const cut = met.find((e) => !e.inside);
  if (cut)
    throw new Error(
      `Include the whole ${cut.gate.symbol || "gate"} at wire ${cut.row + 1}, column ${cut.col + 1}.`,
    );
  if (!met.length) throw new Error("No gates in the selected range.");
  return range;
}
