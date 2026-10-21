import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Suite, assertThat } from "../../../TestUtil.js";
import { Complex } from "../../../../src/engine/math/complex/Complex.js";
import { Matrix } from "../../../../src/engine/math/matrix/Matrix.js";
import { AmplitudesEditor } from "../../../../src/components/panels/gate-param/amplitudes-editor.jsx";

const suite = new Suite("AmplitudesEditor");

/** @param {!Matrix=} density What the simulator found at the gate; given, the gate offers it. */
function mount(density) {
  const original = [
    [1, 0],
    [0, 0],
  ];
  const target = {
    col: 0,
    row: 0,
    gate: {
      height: 1,
      param: original,
      knownPreparation: density ? undefined : {},
      paramDialog: { message: "Enter amplitudes." },
    },
  };
  const deps = {
    completed: {
      getState: () => ({
        value: { fullStats: { customStatsForSlot: () => ({ density }) } },
      }),
    },
  };
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const changes = [];
  flushSync(() =>
    root.render(
      createElement(AmplitudesEditor, {
        target,
        deps,
        inputRef: { current: null },
        onChange: (text) => changes.push(text),
      }),
    ),
  );
  return {
    host,
    original,
    changes,
    close: () => {
      root.unmount();
      host.remove();
    },
  };
}

function enter(element, text) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  flushSync(() => {
    Object.getOwnPropertyDescriptor(prototype, "value").set.call(element, text);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

suite.test(
  "live incomplete amplitude retains text and identifies the basis state",
  () => {
    const view = mount();
    try {
      const input = view.host.querySelector('[aria-label="Amplitude of |1⟩"]');
      enter(input, "sqrt(");
      assertThat(input.value).isEqualTo("sqrt(");
      assertThat(input.getAttribute("aria-invalid")).isEqualTo("true");
      assertThat(
        view.host
          .querySelector("#amplitude-error-1")
          .textContent.includes("|1⟩: Complete"),
      ).isEqualTo(true);
      assertThat(view.original).isEqualTo([
        [1, 0],
        [0, 0],
      ]);
    } finally {
      view.close();
    }
  },
);

suite.test(
  "vector paste stages exact expressions and normalizes only the preview",
  () => {
    const view = mount();
    try {
      const paste = view.host.querySelector("#amplitudes-paste");
      enter(paste, "sqrt(2)\n-i*sqrt(2)");
      assertThat(view.changes).isEqualTo([]);
      const use = view.host.querySelector("#amplitudes-use-vector");
      assertThat(use.disabled).isEqualTo(false);
      flushSync(() => use.click());
      assertThat(view.changes).isEqualTo(["sqrt(2), -i*sqrt(2)"]);
      assertThat(
        Array.from(
          view.host.querySelectorAll(".amplitudes-editor input"),
          (input) => input.value,
        ),
      ).isEqualTo(["sqrt(2)", "-i*sqrt(2)"]);
      assertThat(
        view.host
          .querySelector("#amplitudes-preview")
          .textContent.includes("0.7071068"),
      ).isEqualTo(true);
      assertThat(view.original).isEqualTo([
        [1, 0],
        [0, 0],
      ]);
      enter(paste, "1,2,3");
      assertThat(use.disabled).isEqualTo(true);
      assertThat(paste.value).isEqualTo("1,2,3");
      assertThat(view.changes.length).isEqualTo(1);
      assertThat(
        view.host
          .querySelector("#amplitudes-paste-feedback")
          .textContent.includes("Expected 2 amplitudes; got 3"),
      ).isEqualTo(true);
    } finally {
      view.close();
    }
  },
);

suite.test(
  "multi-entry clipboard paste is staged while scalar paste keeps native behavior",
  () => {
    const view = mount();
    try {
      const input = view.host.querySelector(".amplitudes-editor input");
      const pasteEvent = (text) => {
        const event = new Event("paste", { bubbles: true, cancelable: true });
        Object.defineProperty(event, "clipboardData", {
          value: { getData: () => text },
        });
        flushSync(() => input.dispatchEvent(event));
        return event;
      };
      assertThat(pasteEvent("1\t-i").defaultPrevented).isEqualTo(true);
      assertThat(view.host.querySelector("#amplitudes-paste").value).isEqualTo(
        "1\t-i",
      );
      assertThat(view.changes).isEqualTo([]);
      assertThat(pasteEvent("sqrt(1/2)").defaultPrevented).isEqualTo(false);
    } finally {
      view.close();
    }
  },
);

suite.test(
  "the state at the gate fills the fields as readable numbers, without simulation noise",
  () => {
    const ket = Matrix.col(
      0.7071067811865476,
      new Complex(-2.4492935982947064e-16, -0.7071067811865476),
    );
    const view = mount(ket.times(ket.adjoint()));
    try {
      flushSync(() =>
        view.host.querySelector("#amplitudes-use-state-button").click(),
      );
      assertThat(
        Array.from(
          view.host.querySelectorAll(".amplitudes-editor input"),
          (input) => input.value,
        ),
      ).isEqualTo(["0.707106781187", "-0.707106781187i"]);
      assertThat(view.changes).isEqualTo(["0.707106781187, -0.707106781187i"]);
    } finally {
      view.close();
    }
  },
);
