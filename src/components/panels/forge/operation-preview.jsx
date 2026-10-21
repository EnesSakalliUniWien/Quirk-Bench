import { OperatorMatrix } from "../../math/operator-matrix.jsx";
import { OperationBlochAnalysis } from "../../math/bloch-analysis.jsx";
import { inspectMatrix } from "./construction.js";

export function OperationPreview({ matrix }) {
  const { qubits, unitary, residual, rotation } = inspectMatrix(matrix);
  return (
    <div className="forge-operation-preview">
      <div className="operation-status">
        <strong>
          {matrix.width()}×{matrix.height()} · {qubits} qubit
          {qubits === 1 ? "" : "s"}
        </strong>
        <span>{unitary ? "Unitary" : "Nonunitary operation"}</span>
      </div>
      <OperatorMatrix matrix={matrix} label="Operator" />
      <p className="field-description">
        Unitarity residual: {Number(residual.toPrecision(5))}
      </p>
      {rotation && (
        <>
          <h3>Bloch rotation</h3>
          <OperationBlochAnalysis matrix={matrix} />
        </>
      )}
    </div>
  );
}
