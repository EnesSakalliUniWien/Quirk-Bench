import { useEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import { appStore } from "../../../state/appStore.js";
import { Animation } from "../../../config/Animation.js";
import { prefersReducedMotion } from "../../../browser/reducedMotion.js";
import { Button } from "../../ui/button.jsx";
import {
  MeasurementExplanation,
  MeasurementSymbol,
} from "../../gate/measurement-symbol.jsx";
import { measurementReadings } from "./measurementReadings.js";

function MeasurementResult({ reading, step, onSeek }) {
  const resultRef = useRef(null);
  const signature = `${reading.status}:${reading.result}`;
  const previous = useRef(signature);
  useEffect(() => {
    const changed = previous.current !== signature;
    previous.current = signature;
    if (!changed || reading.status === "pending" || prefersReducedMotion())
      return;
    const animation = resultRef.current?.animate(
      [{ transform: "translateY(2px)" }, { transform: "translateY(0)" }],
      {
        duration: Animation.MEASUREMENT_FEEDBACK_DURATION_MS,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    );
    return () => animation?.cancel();
  }, [signature, reading.status]);
  return (
    <li
      className="measurement-reading"
      data-measurement={reading.key}
      data-status={reading.status}
    >
      <div className="measurement-reading-header">
        <span className="measurement-reading-symbol">
          <MeasurementSymbol
            description={reading.description}
            symbol={reading.symbol}
          />
        </span>
        <div className="measurement-reading-identity">
          <strong>{reading.name}</strong>
          <span>{reading.location}</span>
        </div>
        <strong ref={resultRef} className="measurement-result">
          {reading.result}
        </strong>
      </div>
      <details className="measurement-reading-details">
        <summary>Inspect state change</summary>
        <p>{reading.note}</p>
        <div className="measurement-state-actions">
          <Button
            aria-label={`State before ${reading.name} at ${reading.location}`}
            aria-pressed={step === reading.col}
            onClick={() => onSeek(reading.col)}
          >
            Before
          </Button>
          <Button
            aria-label={`State after ${reading.name} at ${reading.location}`}
            aria-pressed={step === reading.col + 1}
            onClick={() => onSeek(reading.col + 1)}
          >
            After
          </Button>
        </div>
        <p className="measurement-state-help">
          Before and After move Steps; the state table and Qubits panel follow
          the playhead. Time stays independent.
        </p>
        <MeasurementExplanation description={reading.description} />
      </details>
    </li>
  );
}

function MeasurementResults({ sample }) {
  const playhead = useStore(appStore, (state) => state.playhead);
  const readings = useMemo(() => measurementReadings(sample), [sample]);
  if (readings.length === 0) return null;
  return (
    <section className="state-measurements" aria-label="Measurement results">
      <h3>Measurements</h3>
      <ul className="measurement-readings">
        {readings.map((reading) => (
          <MeasurementResult
            key={reading.key}
            reading={reading}
            step={sample.step}
            onSeek={(step) => playhead?.seek(step)}
          />
        ))}
      </ul>
    </section>
  );
}

export { MeasurementResults };
