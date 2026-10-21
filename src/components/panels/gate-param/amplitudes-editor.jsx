import { useRef, useState } from "react";
import { Button } from "../../ui/button.jsx";
import { Matrix } from "../../../engine/math/matrix/Matrix.js";
import { qubitMarginals } from "../../../engine/simulation/qubitMarginals.js";
import { BlochAnalysis } from "../../math/bloch-analysis.jsx";
import { pureStateOf } from "../../../gates/assertions/assertionVerdicts.js";
import { validateAmplitudes } from "./amplitudeValidation.js";
import {
  inspectComplexEntry,
  parseEntryRows,
} from "../../math/structured-entry.js";

/**
 * @param {!number} value
 * @returns {!string} A number as the formula field reads it back: 12 significant digits, with
 *     simulation noise (|value| < 1e-12) as 0, so 0.7071067811865476 reads 0.707106781187.
 */
const numberText = (value) =>
  String(Math.abs(value) < 1e-12 ? 0 : Number(value.toPrecision(12)));

/**
 * @param {!Array.<!number>} amplitude [real, imaginary]
 * @returns {!string} The amplitude as a formula: "0.707107", "-i", "0.5+0.5i".
 */
function amplitudeText([real, imag]) {
  const [re, im] = [numberText(real), numberText(imag)];
  if (im === "0") return re;
  const imaginary = im === "1" ? "i" : im === "-1" ? "-i" : `${im}i`;
  return re === "0" ? imaginary : `${re}${imag > 0 ? "+" : ""}${imaginary}`;
}

/**
 * The editor of a state given as amplitudes: a formula field for each basis state, instead of one
 * line of commas, and the state the wires are in at the gate, to start from. It hands the amplitudes
 * on as the text the gate's paramDialog applies.
 *
 * @param {!{target: !{col: !int, row: !int, gate: !Gate}, deps: !Object, inputRef: !Object,
 *     onChange: !function(!string): void}} props
 */
export function AmplitudesEditor({ target, deps, inputRef, onChange }) {
  const span = target.gate.height;
  const [fields, setFields] = useState(() =>
    target.gate.param.map(amplitudeText),
  );
  const [paste, setPaste] = useState("");
  const [pasteOpen, setPasteOpen] = useState(false);
  const pasteRef = useRef(null);
  const update = (next) => {
    setFields(next);
    onChange(next.join(", "));
  };
  // What the simulator found at the gate: a pure state of these wires, or none.
  const found = () => {
    const density = deps.completed
      .getState()
      .value?.fullStats.customStatsForSlot(target.col, target.row)?.density;
    return density === undefined || density.hasNaN()
      ? undefined
      : pureStateOf(density);
  };
  const [unavailable, setUnavailable] = useState(false);
  const inspected = fields.map((text) =>
    inspectComplexEntry(text, { allowEmpty: true }),
  );
  const result = validateAmplitudes(fields, span);
  const ketAt = (k) => `|${k.toString(2).padStart(span, "0")}⟩`;
  let pasted, pasteError;
  if (paste.trim()) {
    try {
      const rows = parseEntryRows(paste);
      if (rows.length !== 1 && rows.some((row) => row.length !== 1))
        throw new Error("Paste one row or one column of amplitudes.");
      pasted = rows.flat();
      if (pasted.length !== fields.length)
        throw new Error(
          `Expected ${fields.length} amplitudes; got ${pasted.length}.`,
        );
      const checked = validateAmplitudes(pasted, span);
      if (checked.error) throw new Error(checked.error);
    } catch (error) {
      pasteError = error.message;
      pasted = undefined;
    }
  }

  return (
    <>
      <p className="field-description" id="amplitudes-entry-hint">
        {fields.length} amplitudes in basis order. Blank entries count as zero;
        Apply normalizes the vector.
      </p>
      <div className="amplitudes-editor" role="group" aria-label="Amplitudes">
        {fields.map((field, k) => {
          const ket = ketAt(k);
          const issue = inspected[k];
          return (
            <div className="amplitudes-editor-entry" key={ket}>
              <label className="amplitudes-editor-row">
                <span className="amplitudes-editor-ket">{ket}</span>
                <input
                  ref={k === 0 ? inputRef : undefined}
                  className="gate-param-input"
                  aria-label={`Amplitude of ${ket}`}
                  aria-invalid={!!issue.error}
                  aria-describedby={`amplitudes-entry-hint${issue.error ? ` amplitude-error-${k}` : ""}`}
                  value={field}
                  spellCheck={false}
                  onPaste={(event) => {
                    const text = event.clipboardData.getData("text");
                    if (!/[\t\n\r,;]|^\s*[[{]/.test(text)) return;
                    event.preventDefault();
                    setPaste(text);
                    setPasteOpen(true);
                    requestAnimationFrame(() => pasteRef.current?.focus());
                  }}
                  onChange={(e) =>
                    update(
                      fields.map((old, i) => (i === k ? e.target.value : old)),
                    )
                  }
                />
              </label>
              {issue.error && (
                <p
                  className={
                    issue.incomplete ? "field-description" : "field-error"
                  }
                  id={`amplitude-error-${k}`}
                >
                  {ket}:{" "}
                  {issue.incomplete ? "Complete this expression." : issue.error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div id="amplitudes-preview" className="amplitudes-preview">
        <h3>Result after Apply</h3>
        {result.error ? (
          <p className="field-description">
            Complete the entries to preview the result.
          </p>
        ) : (
          <>
            <p className="field-description">
              Normalized amplitudes, in basis order (rounded for display).
            </p>
            <ol className="amplitudes-result">
              {result.amplitudes.map((entry, k) => (
                <li key={k}>
                  {ketAt(k)}:{" "}
                  {amplitudeText(entry.map((n) => Number(n.toPrecision(7))))}
                </li>
              ))}
            </ol>
            <BlochAnalysis
              getStates={() => [
                {
                  label: "Result after Apply",
                  qubits: qubitMarginals(
                    new Matrix(
                      1,
                      1 << span,
                      Float64Array.from(result.amplitudes.flat()),
                    ),
                    span,
                  ),
                },
              ]}
            />
          </>
        )}
      </div>
      <details className="formula-help">
        <summary>Amplitude help</summary>
        <p className="gate-param-message">{target.gate.paramDialog.message}</p>
        <p className="field-description">
          Expressions stay in the fields. Trigonometric functions use degrees.
        </p>
      </details>
      <details
        className="amplitudes-paste"
        open={pasteOpen}
        onToggle={(event) => setPasteOpen(event.currentTarget.open)}
      >
        <summary>Paste vector</summary>
        <p className="field-description">
          Use vector replaces the entries above. Apply uses those entries;
          pasted text is not applied until you choose Use vector.
        </p>
        <label htmlFor="amplitudes-paste">
          {fields.length} amplitudes in basis order, separated by commas, tabs
          or newlines
        </label>
        <textarea
          id="amplitudes-paste"
          ref={(element) => {
            pasteRef.current = element;
          }}
          value={paste}
          onChange={(event) => setPaste(event.target.value)}
          spellCheck={false}
          aria-invalid={!!pasteError}
          aria-describedby="amplitudes-paste-feedback"
        />
        <div id="amplitudes-paste-feedback" aria-live="polite">
          {pasteError && (
            <p className="field-error">
              {pasteError} The current entries are unchanged.
            </p>
          )}
          {pasted && (
            <p className="field-description">
              {pasted.map((entry, k) => `${ketAt(k)}: ${entry}`).join("; ")}
            </p>
          )}
        </div>
        <Button
          id="amplitudes-use-vector"
          type="button"
          variant="outline"
          disabled={!pasted}
          onClick={() => {
            if (pasted) update(pasted);
          }}
        >
          Use vector
        </Button>
      </details>
      {target.gate.knownPreparation === undefined && (
        <Button
          id="amplitudes-use-state-button"
          type="button"
          variant="outline"
          onClick={() => {
            const state = found();
            setUnavailable(state === undefined);
            if (state !== undefined) update(state.map(amplitudeText));
          }}
        >
          Use the state at this gate
        </Button>
      )}
      <p className="gate-param-message" role="status" hidden={!unavailable}>
        These wires have no pure state of their own here: they are entangled
        with others, or measured.
      </p>
    </>
  );
}
