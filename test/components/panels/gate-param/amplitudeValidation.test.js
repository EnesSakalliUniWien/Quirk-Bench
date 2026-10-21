import { Suite, assertThat } from "../../../TestUtil.js";
import { validateAmplitudes } from "../../../../src/components/panels/gate-param/amplitudeValidation.js";

const suite = new Suite("amplitudeValidation");

const s = Math.SQRT1_2;

suite.test(
  "amplitude entries are checked one at a time, naming the basis state",
  () => {
    assertThat(validateAmplitudes(["sqrt(", "0"], 1).error).isEqualTo(
      "Amplitude of |0⟩: Complete this expression.",
    );
    assertThat(validateAmplitudes(["1", "1+", "0", "0"], 2).error).isEqualTo(
      "Amplitude of |01⟩: Complete this expression.",
    );
    assertThat(validateAmplitudes(["1", "tea"], 1).error).isEqualTo(
      "Amplitude of |1⟩: Use a valid complex expression, such as 1 + i or sqrt(1/2).",
    );
    assertThat(validateAmplitudes(["0", ""], 1).error).isEqualTo(
      "At least one amplitude must be nonzero.",
    );
    assertThat(validateAmplitudes(["1"], 1).error).isEqualTo(
      "2 amplitudes are needed, one per basis state; got 1.",
    );
    assertThat(validateAmplitudes(["1", " -i "], 1).amplitudes)
      .withInfo("blank and padded entries read as the editor reads them")
      .isApproximatelyEqualTo(
        [
          [s, 0],
          [0, -s],
        ],
        1e-9,
      );
  },
);
