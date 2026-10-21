import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Suite, assertThat } from "../../TestUtil.js";
import {
  BlochAnalysis,
  OperationBlochAnalysis,
} from "../../../src/components/math/bloch-analysis.jsx";
import { Matrix } from "../../../src/engine/math/matrix/Matrix.js";

const suite = new Suite("SharedBlochAnalysis");

async function until(condition) {
  const start = performance.now();
  while (!condition()) {
    if (performance.now() - start > 5000)
      throw new Error("Bloch analysis did not reach the expected readout.");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

function mount(children) {
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:0;top:0;width:1000px;height:1000px;overflow:auto;background:white;z-index:10000";
  document.body.append(host);
  const root = createRoot(host);
  flushSync(() => root.render(children));
  return {
    host,
    unmount: () => {
      flushSync(() => root.unmount());
      host.remove();
    },
  };
}

function toggle(details, open) {
  flushSync(() => {
    details.open = open;
    details.dispatchEvent(new Event("toggle"));
  });
}

function choose(select, value) {
  flushSync(() => {
    select.value = value;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

const value = (host, suffix) =>
  host.querySelector(`[id$="-${suffix}"]`)?.textContent;

suite.test(
  "closed analysis is lazy and simultaneous analyzers have unique IDs",
  () => {
    let calls = 0;
    const getStates = () => {
      calls++;
      return [
        { label: "State", qubits: [{ wire: 0, bloch: { x: 0, y: 0, z: 1 } }] },
      ];
    };
    const view = mount(
      createElement(
        "div",
        null,
        createElement(BlochAnalysis, { getStates }),
        createElement(BlochAnalysis, { getStates }),
      ),
    );
    try {
      assertThat(calls).isEqualTo(0);
      assertThat(view.host.querySelectorAll("canvas").length).isEqualTo(0);
      const details = [...view.host.querySelectorAll("details")];
      toggle(details[0], true);
      toggle(details[1], true);
      assertThat(calls).isEqualTo(2);
      const ids = [...view.host.querySelectorAll("[id]")].map((el) => el.id);
      assertThat(ids.length > 0).isEqualTo(true);
      assertThat(new Set(ids).size).isEqualTo(ids.length);
      toggle(details[0], false);
      assertThat(details[0].querySelectorAll("canvas").length).isEqualTo(0);
      assertThat(calls).isEqualTo(2);
    } finally {
      view.unmount();
    }
  },
);

suite.test(
  "state and qubit selectors update the physical readout including mixed amplitudes",
  async () => {
    const getStates = () => [
      {
        label: "Start",
        qubits: [
          { wire: 0, bloch: { x: 0, y: 0, z: 1 } },
          { wire: 1, bloch: { x: 0, y: 0, z: -1 } },
        ],
      },
      { label: "Mixed", qubits: [{ wire: 0, bloch: { x: 0.5, y: 0, z: 0 } }] },
    ];
    const view = mount(createElement(BlochAnalysis, { getStates }));
    try {
      toggle(view.host.querySelector("details"), true);
      await until(() => value(view.host, "z") === "+1.000");
      choose(view.host.querySelector('[aria-label="Qubit to analyze"]'), "1");
      await until(() => value(view.host, "z") === "-1.000");
      choose(view.host.querySelector('[aria-label="State to analyze"]'), "1");
      await until(() => value(view.host, "purity") === "0.500");
      assertThat(value(view.host, "x")).isEqualTo("+0.500");
      assertThat(value(view.host, "tr-rho2")).isEqualTo("0.625");
      assertThat(value(view.host, "alpha")).isEqualTo("—");
      assertThat(value(view.host, "beta")).isEqualTo("—");
    } finally {
      view.unmount();
    }
  },
);

suite.test(
  "operation presets transform the input and leave mixed-state amplitudes undefined",
  async () => {
    const view = mount(
      createElement(OperationBlochAnalysis, {
        matrix: Matrix.square(0, 1, 1, 0),
      }),
    );
    try {
      toggle(view.host.querySelector("details"), true);
      await until(() => value(view.host, "z") === "-1.000");
      const preset = (name) =>
        [...view.host.querySelectorAll("button")].find(
          (button) => button.textContent === name,
        );
      flushSync(() => preset("|1⟩").click());
      await until(() => value(view.host, "z") === "+1.000");
      flushSync(() => preset("Mixed").click());
      await until(() => value(view.host, "tr-rho2") === "0.500");
      assertThat(value(view.host, "alpha")).isEqualTo("—");
      assertThat(value(view.host, "beta")).isEqualTo("—");
      assertThat(value(view.host, "theta")).isEqualTo("—");
      assertThat(value(view.host, "phi")).isEqualTo("—");
    } finally {
      view.unmount();
    }
  },
);
