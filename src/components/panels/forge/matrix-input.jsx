import { useMemo, useRef, useState } from "react";
import { OperatorMatrix } from "../../math/operator-matrix.jsx";
import {
  parseMatrixDraft,
  matrixEntriesForGrid,
  matrixTextFromCells,
  applyMatrixPaste,
} from "./construction.js";
import {
  parseEntryRows,
  inspectComplexEntry,
} from "../../math/structured-entry.js";
import { MathField } from "../../math/math-field.jsx";
import { Button } from "../../ui/button.jsx";

const identityCells = (size) =>
  Array.from({ length: size * size }, (_, i) =>
    i % (size + 1) === 0 ? "1" : "0",
  );

/** Parse a pasted block and place it at `start`, or report why it cannot be used. */
function previewPaste(text, cells, size, start) {
  try {
    const rows = parseEntryRows(text);
    return { rows, cells: applyMatrixPaste(cells, size, start, rows) };
  } catch (e) {
    return { error: e.message };
  }
}

export function MatrixInput({ draft, onChange }) {
  const [error, setError] = useState("");
  const [activeCell, setActiveCell] = useState(0);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteStatus, setPasteStatus] = useState("");
  const gridInputs = useRef([]);
  const set = (patch) => {
    setError("");
    setPasteStatus("");
    onChange({ ...draft, ...patch });
  };
  const selectMode = (mode) => {
    if (mode === draft.mode) return;
    if (mode === "raw") {
      set({ mode, text: draft.rawBeforeGrid ?? draft.text });
      return;
    }
    try {
      const { size, cells } = matrixEntriesForGrid(draft.text);
      setActiveCell(0);
      set({
        mode,
        size,
        rawBeforeGrid: draft.text,
        grids: { ...draft.grids, [size]: cells },
      });
    } catch (e) {
      setError(e.message);
    }
  };
  const chooseSize = (size) => {
    const cells = draft.grids[size] ?? identityCells(size);
    set({
      size,
      mode: "grid",
      text: matrixTextFromCells(cells, size),
      grids: { ...draft.grids, [size]: cells },
      rawBeforeGrid: undefined,
      correction: "none",
    });
    setActiveCell(0);
  };
  const cells = draft.grids[draft.size];
  const commitCells = (next) =>
    set({
      grids: { ...draft.grids, [draft.size]: next },
      text: matrixTextFromCells(next, draft.size),
      correction: "none",
      rawBeforeGrid: undefined,
    });
  const updateCell = (index, text) => {
    const next = [...cells];
    next[index] = text;
    commitCells(next);
  };
  const selected = Math.min(activeCell, cells.length - 1);
  const cellChecks = useMemo(
    () => cells.map((text) => inspectComplexEntry(text)),
    [cells],
  );
  const cellMessage = (index) => {
    const result = cellChecks[index];
    return result.error
      ? `Row ${Math.floor(index / draft.size) + 1}, column ${(index % draft.size) + 1}: ${result.error}`
      : "";
  };
  const draftError = useMemo(() => {
    try {
      parseMatrixDraft(draft.text);
      return "";
    } catch (e) {
      return e.message;
    }
  }, [draft.text]);
  const pastePreview = useMemo(
    () =>
      pasteText.trim()
        ? previewPaste(pasteText, cells, draft.size, selected)
        : undefined,
    [pasteText, cells, draft.size, selected],
  );
  const acceptPaste = (next, rows, start = selected) => {
    commitCells(next);
    setPasteStatus(
      `Pasted ${rows.length}×${rows[0].length} entries starting at row ${Math.floor(start / draft.size) + 1}, column ${(start % draft.size) + 1}.`,
    );
  };
  const onGridPaste = (event, index) => {
    if (event.nativeEvent.isComposing) return;
    const text = event.clipboardData.getData("text/plain");
    if (!/[\t\r\n,;[\]{}]/.test(text)) return;
    event.preventDefault();
    setActiveCell(index);
    setPasteStatus("");
    const preview = previewPaste(text, cells, draft.size, index);
    if (preview.error) {
      setPasteText(text);
      setPasteOpen(true);
      return;
    }
    setPasteText("");
    acceptPaste(preview.cells, preview.rows, index);
  };
  const navigateCell = (event, index) => {
    if (event.nativeEvent.isComposing) {
      if (event.key === "Enter") event.preventDefault();
      return;
    }
    let next;
    if (event.key === "Enter")
      next = Math.min(cells.length - 1, index + (event.shiftKey ? -1 : 1));
    else if (event.altKey) {
      if (event.key === "ArrowLeft" && index % draft.size) next = index - 1;
      if (event.key === "ArrowRight" && index % draft.size < draft.size - 1)
        next = index + 1;
      if (event.key === "ArrowUp" && index >= draft.size)
        next = index - draft.size;
      if (event.key === "ArrowDown" && index < cells.length - draft.size)
        next = index + draft.size;
    }
    if (next !== undefined || event.key === "Enter") {
      event.preventDefault();
      if (next >= 0) gridInputs.current[next]?.focus();
    }
  };
  return (
    <>
      <div className="field-label-row">
        <span>Matrix entry</span>
        <div
          className="entry-modes"
          role="group"
          aria-label="Matrix entry mode"
        >
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={draft.mode === "grid"}
            onClick={() => selectMode("grid")}
          >
            Grid
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-pressed={draft.mode === "raw"}
            onClick={() => selectMode("raw")}
          >
            Raw text
          </Button>
        </div>
      </div>
      {draft.mode === "raw" ? (
        <label className="forge-field" htmlFor="gate-forge-matrix">
          Matrix values
          <textarea
            id="gate-forge-matrix"
            value={draft.text}
            spellCheck={false}
            aria-invalid={!!draftError}
            aria-describedby="matrix-input-help matrix-draft-error"
            onChange={(e) =>
              set({
                text: e.target.value,
                correction: "none",
                rawBeforeGrid: undefined,
              })
            }
          />
        </label>
      ) : (
        <>
          <div className="field-label-row">
            <label>
              Dimension{" "}
              <select
                aria-label="Matrix dimension"
                value={draft.size}
                onChange={(e) => chooseSize(Number(e.target.value))}
              >
                {[2, 4, 8, 16].map((n) => (
                  <option key={n} value={n}>
                    {n}×{n} · {Math.log2(n)} qubit{n === 2 ? "" : "s"}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const cells = identityCells(draft.size);
                set({
                  text: matrixTextFromCells(cells, draft.size),
                  grids: { ...draft.grids, [draft.size]: cells },
                  correction: "none",
                  rawBeforeGrid: undefined,
                });
              }}
            >
              Reset to identity
            </Button>
          </div>
          <p className="field-description" id="matrix-grid-help">
            Arrows edit the expression. Alt + arrows moves between entries;
            Enter moves to the next entry. Paste a table at the selected entry.
          </p>
          <div className="matrix-input-scroll">
            <table className="matrix-input-grid">
              <thead>
                <tr>
                  <td />
                  {Array.from({ length: draft.size }, (_, col) => (
                    <th key={col} scope="col">
                      {col + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: draft.size }, (_, row) => (
                  <tr key={row}>
                    <th scope="row">{row + 1}</th>
                    {Array.from({ length: draft.size }, (_, col) => (
                      <td key={col}>
                        <input
                          ref={(element) => {
                            gridInputs.current[row * draft.size + col] =
                              element;
                          }}
                          aria-label={`Row ${row + 1}, column ${col + 1}`}
                          aria-invalid={
                            !!cellChecks[row * draft.size + col].error
                          }
                          aria-describedby={`matrix-grid-help matrix-entry-feedback-${row * draft.size + col}`}
                          data-active={
                            selected === row * draft.size + col
                              ? "true"
                              : undefined
                          }
                          onPaste={(event) =>
                            onGridPaste(event, row * draft.size + col)
                          }
                          onKeyDown={(event) =>
                            navigateCell(event, row * draft.size + col)
                          }
                          value={cells[row * draft.size + col]}
                          spellCheck={false}
                          onFocus={() => setActiveCell(row * draft.size + col)}
                          onChange={(event) =>
                            updateCell(
                              row * draft.size + col,
                              event.target.value,
                            )
                          }
                        />
                        <span
                          className="visually-hidden"
                          id={`matrix-entry-feedback-${row * draft.size + col}`}
                        >
                          {cellMessage(row * draft.size + col)}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="forge-field" htmlFor="matrix-cell-editor">
            Selected entry · row {Math.floor(selected / draft.size) + 1}, column{" "}
            {(selected % draft.size) + 1}
          </label>
          <MathField
            key={selected}
            id="matrix-cell-editor"
            label="Selected matrix entry"
            allowComplex
            invalid={!!cellChecks[selected].error}
            describedBy="matrix-selected-feedback matrix-grid-help"
            onPaste={(event) => onGridPaste(event, selected)}
            value={cells[selected]}
            onChange={(text) => updateCell(selected, text)}
          />
          <p
            id="matrix-selected-feedback"
            className={
              cellChecks[selected].error ? "field-error" : "field-description"
            }
            aria-live="polite"
          >
            {cellMessage(selected) ||
              "This entry is finite. Expressions are preserved as entered."}
          </p>
          <details
            className="matrix-paste"
            open={pasteOpen}
            onToggle={(event) => setPasteOpen(event.currentTarget.open)}
          >
            <summary>Paste matrix</summary>
            <label className="forge-field" htmlFor="matrix-paste">
              Matrix values or rectangular block
              <textarea
                id="matrix-paste"
                value={pasteText}
                spellCheck={false}
                aria-invalid={!!pastePreview?.error}
                aria-describedby="matrix-paste-feedback"
                onChange={(event) => {
                  setPasteText(event.target.value);
                  setPasteStatus("");
                }}
              />
            </label>
            <p
              id="matrix-paste-feedback"
              className={
                pastePreview?.error ? "field-error" : "field-description"
              }
              aria-live="polite"
            >
              {pastePreview?.error ||
                (pastePreview
                  ? `${pastePreview.rows.length}×${pastePreview.rows[0].length} entries, starting at row ${Math.floor(selected / draft.size) + 1}, column ${(selected % draft.size) + 1}. Other entries stay as entered.`
                  : "Paste comma-separated values, a tab-separated table, rows on separate lines, or nested lists. Choose the starting entry in the grid.")}
            </p>
            <Button
              id="matrix-use-paste"
              type="button"
              variant="outline"
              disabled={!pastePreview || !!pastePreview.error}
              onClick={() => acceptPaste(pastePreview.cells, pastePreview.rows)}
            >
              Use matrix
            </Button>
          </details>
          <p className="field-description" role="status">
            {pasteStatus}
          </p>
        </>
      )}
      <p id="matrix-draft-error" className="field-error">
        {draftError && `Create gate is unavailable. ${draftError}`}
      </p>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <p className="field-description" id="matrix-input-help">
        Complex entries accept i, pi and formulas. Trigonometric functions in
        matrix entries use degrees. Raw lists of entries separated by commas or
        new lines are padded with zeroes; tables using tabs, semicolons or
        brackets must be 2×2, 4×4, 8×8 or 16×16. The preview shows the complete
        operator.
      </p>
    </>
  );
}

export function MatrixCorrection({ draft, onChange }) {
  const comparison = useMemo(() => {
    try {
      const entered = parseMatrixDraft(draft.text);
      if (draft.correction === "none") return { entered };
      const corrected = parseMatrixDraft(draft.text, true);
      return {
        entered,
        corrected,
        difference: Math.sqrt(entered.minus(corrected).norm2()),
      };
    } catch (error) {
      return { error: error.message };
    }
  }, [draft.text, draft.correction]);
  if (comparison.error)
    return <p className="field-error">{comparison.error}</p>;
  if (!comparison.corrected)
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => onChange({ ...draft, correction: "offered" })}
      >
        Make unitary
      </Button>
    );
  return (
    <section
      className="matrix-correction"
      aria-label="Matrix correction comparison"
    >
      <h3>Compare before accepting</h3>
      <OperatorMatrix matrix={comparison.entered} label="Entered matrix" />
      <OperatorMatrix matrix={comparison.corrected} label="Corrected matrix" />
      <p>Difference norm: {Number(comparison.difference.toPrecision(6))}</p>
      <div className="entry-modes">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={draft.correction === "accepted"}
          onClick={() => onChange({ ...draft, correction: "accepted" })}
        >
          Use corrected matrix
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange({ ...draft, correction: "none" })}
        >
          Keep entered matrix
        </Button>
      </div>
      <p role="status">
        {draft.correction === "accepted"
          ? "The corrected matrix will be created."
          : "The entered matrix will be created until you accept the correction."}
      </p>
    </section>
  );
}
