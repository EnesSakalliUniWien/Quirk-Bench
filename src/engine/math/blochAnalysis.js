import { Matrix } from "./matrix/Matrix.js";
import { Complex } from "./complex/Complex.js";

const finite = (matrix) => [...matrix.rawBuffer()].every(Number.isFinite);

/** Partial traces of a conventional density matrix (rho[row,col] = a[row] conj(a[col])). */
export function densityQubits(density) {
  const size = density?.width();
  const wires = Math.log2(size);
  if (
    !Number.isInteger(wires) ||
    wires < 1 ||
    density.height() !== size ||
    !finite(density)
  )
    return [];
  const trace = density.trace().real;
  if (!(trace > 1e-12)) return [];
  return Array.from({ length: wires }, (_, wire) => {
    const bit = 1 << wire;
    let p0 = 0,
      p1 = 0,
      re = 0,
      im = 0;
    for (let i = 0; i < size; i++) {
      if (i & bit) continue;
      p0 += density.cell(i, i).real;
      p1 += density.cell(i | bit, i | bit).real;
      const off = density.cell(i | bit, i);
      re += off.real;
      im += off.imag;
    }
    return {
      wire,
      bloch: {
        x: (2 * re) / trace,
        y: (-2 * im) / trace,
        z: (p0 - p1) / trace,
      },
    };
  });
}

/** A physical qubit density, including mixed states. This does not encode a gate quaternion. */
export function densityFromBloch({ x, y, z }) {
  return Matrix.square(
    (1 + z) / 2,
    new Complex(x / 2, -y / 2),
    new Complex(x / 2, y / 2),
    (1 - z) / 2,
  );
}
