/** Interpret a displayed complex cell without assigning a phase to zero or incoherent data. */
export function interpretComplexCell(value, coherent = true) {
  const finite = Number.isFinite(value.real) && Number.isFinite(value.imag);
  const magnitude = Math.hypot(value.real, value.imag);
  const phase =
    finite && coherent && magnitude > 0
      ? Math.atan2(value.imag, value.real)
      : undefined;
  return { finite, magnitude, phase };
}
