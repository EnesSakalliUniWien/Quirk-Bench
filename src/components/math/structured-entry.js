import { Complex } from "../../engine/math/complex/Complex.js";
import { ComplexFormula } from "../../engine/math/formula/ComplexFormula.js";

const closing = { "(": ")", "[": "]", "{": "}" };

/** Find matching delimiters before splitting, so formulas retain their grouping. */
function delimiters(text) {
  const stack = [];
  const pairs = new Map();
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (closing[c]) stack.push(i);
    else if (")]}".includes(c)) {
      const open = stack.pop();
      if (open === undefined || closing[text[open]] !== c)
        throw new Error(`Mismatched '${c}' at character ${i + 1}.`);
      pairs.set(open, i);
    }
  }
  if (stack.length)
    throw new Error(
      `Close '${text[stack.at(-1)]}' at character ${stack.at(-1) + 1}.`,
    );
  return pairs;
}

// Tabs delimit columns even at the edges of a pasted row.
const trimOutside = (text) => text.replace(/^[ \n]+|[ \n]+$/g, "");

function unwrap(text) {
  const pairs = delimiters(text);
  return "[{".includes(text[0]) && pairs.get(0) === text.length - 1
    ? trimOutside(text.slice(1, -1))
    : text;
}

/** Split only outside formulas and bracketed rows. */
function split(text, separators) {
  const pairs = delimiters(text);
  const parts = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    if (pairs.has(i)) i = pairs.get(i);
    else if (separators.includes(text[i])) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
}

/** Parse pasted rows without evaluating or altering the cell expressions. */
export function parseEntryRows(text) {
  if (text.length > 65536)
    throw new Error("Paste at most 65536 characters at a time.");
  const source = unwrap(
    trimOutside(text.replaceAll("\r\n", "\n").replaceAll("\r", "\n")),
  );
  if (!source) throw new Error("Paste at least one entry.");
  const nested = "[{".includes(source[0]);
  const rowTexts = nested
    ? split(source, ",;").flatMap((part) =>
        trimOutside(part)
          ? split(part, "\n").filter((row) => trimOutside(row))
          : [""],
      )
    : split(source, ";\n");
  let cellCount = 0;
  const rows = rowTexts.map((row, r) => {
    row = trimOutside(row);
    if (nested && (!"[{".includes(row[0]) || unwrap(row) === row))
      throw new Error(`Wrap row ${r + 1} in matching brackets.`);
    const cells = split(nested ? unwrap(row) : row, ",\t").map((cell) =>
      cell.trim(),
    );
    for (let c = 0; c < cells.length; c++) {
      if (!cells[c])
        throw new Error(`Enter a value at row ${r + 1}, column ${c + 1}.`);
      if (/[[\]{}]/.test(cells[c]))
        throw new Error(
          `Unexpected brackets at row ${r + 1}, column ${c + 1}.`,
        );
      cellCount++;
      if (cellCount > 256)
        throw new Error(
          `Use at most 256 entries; row ${r + 1}, column ${c + 1} exceeds this limit.`,
        );
    }
    return cells;
  });
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].length !== rows[0].length)
      throw new Error(
        `Row ${r + 1} has ${rows[r].length} entries; expected ${rows[0].length}.`,
      );
  }
  return rows;
}

/** Inspect a draft using the same degree-based complex formulas as matrix entry. */
export function inspectComplexEntry(text, { allowEmpty = false } = {}) {
  const source = text.trim();
  const incomplete = (error = "Complete the expression.") => ({
    error,
    incomplete: true,
  });
  const invalid = (error) => ({ error, incomplete: false });
  if (!source) return allowEmpty ? { value: Complex.ZERO } : incomplete();
  if (source.length > 65536) return invalid("Use at most 65536 characters.");
  let depth = 0;
  for (const c of source) {
    if (c === "(") depth++;
    if (c === ")" && --depth < 0)
      return invalid("Remove the extra closing parenthesis.");
  }
  if (depth) return incomplete("Close the expression's parentheses.");
  if (/[+*/^-]\s*(?:\)|$)/.test(source) || /\(\s*\)/.test(source))
    return incomplete();
  const tokens = ComplexFormula.tokenMap();
  for (const match of source.matchAll(/([a-z]+|√)\s*(?=\)|$)/gi)) {
    const token = tokens.get(match[1].toLowerCase());
    if (token?.unary_action && !token.binary_action) return incomplete();
  }
  try {
    const value = ComplexFormula.parse(source);
    if (!Number.isFinite(value.real) || !Number.isFinite(value.imag))
      return invalid("Use an expression with a finite value.");
    return { value };
  } catch {
    return invalid(
      "Use a valid complex expression, such as 1 + i or sqrt(1/2).",
    );
  }
}
