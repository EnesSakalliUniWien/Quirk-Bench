import { parseAmplitudes } from "../../../gates/prepare/PrepareGates.js";
import { inspectComplexEntry } from "../../math/structured-entry.js";

/**
 * Checks the entries of an amplitudes editor one at a time, so an error names the basis state.
 * @param {!Array.<!string>} texts One entry per basis state; a blank entry counts as zero.
 * @param {!int} span
 * @returns {!{amplitudes: !Array.<!Array.<!number>>}|!{error: !string}} The first entry that is
 *     not a finished expression, as "Amplitude of |01⟩: ...", else what parseAmplitudes finds.
 */
export function validateAmplitudes(texts, span) {
  for (const [k, text] of texts.entries()) {
    const issue = inspectComplexEntry(text, { allowEmpty: true });
    if (issue.error) {
      const ket = `|${k.toString(2).padStart(span, "0")}⟩`;
      return {
        error: `Amplitude of ${ket}: ${issue.incomplete ? "Complete this expression." : issue.error}`,
      };
    }
  }
  return parseAmplitudes(texts.join(","), span);
}
