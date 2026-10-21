/** A compact version of the circuit's meter, detector, control and reset notation. The caller
 * supplies the accessible gate name; the drawing is decorative. Projectors keep their notation. */
function MeasurementSymbol({ description, symbol }) {
  const { kind, axis } = description;
  if (kind === "postselection") return <span aria-hidden="true">{symbol}</span>;
  const reset = kind === "reset";
  return (
    <svg
      className="measurement-symbol"
      viewBox="0 0 48 28"
      aria-hidden="true"
      focusable="false"
    >
      {kind === "deferred" ? (
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <path d="M6 22a13 13 0 0 1 26 0M19 22 27 6m-5 2 5-2 1 5" />
          <text x="39" y="18" stroke="none" fill="currentColor">
            Z
          </text>
        </g>
      ) : (
        <>
          <path
            d={reset ? "M5 4a10 10 0 0 1 0 20Z" : "M16 4a10 10 0 0 1 0 20Z"}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <text
            x={reset ? 10 : 21}
            y="18"
            textAnchor="middle"
            fill="currentColor"
          >
            {axis}
          </text>
          {reset && (
            <>
              <path d="M15 14h14" stroke="currentColor" />
              {axis === "Z" ? (
                <circle cx="24" cy="14" r="3" fill="currentColor" />
              ) : (
                <g stroke="currentColor" strokeWidth="1">
                  <circle cx="24" cy="14" r="3" fill="none" />
                  <path
                    d={
                      axis === "X" ? "M21 14h6M24 11v6" : "m22 12 4 4m-4 0 4-4"
                    }
                  />
                </g>
              )}
              <text x="38" y="18" textAnchor="middle" fill="currentColor">
                |0⟩
              </text>
            </>
          )}
        </>
      )}
    </svg>
  );
}

function MeasurementExplanation({ description }) {
  return (
    <ol className="measurement-explanation">
      {description.steps.map((step) => (
        <li key={step}>{step}</li>
      ))}
    </ol>
  );
}

export { MeasurementSymbol, MeasurementExplanation };
