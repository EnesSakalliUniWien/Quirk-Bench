import { Matrix } from "./Matrix.js";
import { QubitMatrix } from "./QubitMatrix.js";

/**
 * Display classification uses the same Frobenius-distance tolerance as GateBuilder's matrix
 * acceptance and QubitMatrix's rotation extraction. This does not change either math policy.
 */
const DISPLAY_UNITARITY_TOLERANCE = 0.01;

/** Analyze a finite square operator for gate descriptions and construction previews. */
export function analyzeOperator(matrix) {
  const unitary = matrix.isUnitary(DISPLAY_UNITARITY_TOLERANCE);
  return {
    unitary,
    // Preserve the displayed residual ||U†U - I||F, independent of the classification tolerance.
    residual: Math.sqrt(
      matrix
        .adjoint()
        .times(matrix)
        .minus(Matrix.identity(matrix.width()))
        .norm2(),
    ),
    rotation:
      unitary && matrix.width() === 2
        ? QubitMatrix.operationToAngleAxisRotation(matrix)
        : undefined,
  };
}
