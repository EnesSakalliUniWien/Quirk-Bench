import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { Suite, assertThat } from "../../../TestUtil.js";
import { Registers } from "../../../../src/circuit/model/Registers.js";
import { RegisterRow } from "../../../../src/components/panels/registers/register-row.jsx";

const suite = new Suite("RegisterRow");

suite.test(
  "edits and refused numbers use committed values while readings lag",
  () => {
    const reading = {
      register: { name: "a", start: 1, length: 1 },
      values: [],
      qubits: [],
    };
    let registers = new Registers([reading.register]);
    const errors = [];
    const host = document.createElement("ul");
    const root = createRoot(host);
    const actions = {
      current: () => registers,
      replace: (name, next) => {
        const list = registers.list.map((r) => (r.name === name ? next : r));
        const error = Registers.problemWith(list);
        if (error === undefined) registers = new Registers(list);
        return error;
      },
    };
    try {
      // Keep the rendered reading unchanged while the actions commit newer values.
      flushSync(() =>
        root.render(
          createElement(RegisterRow, {
            reading,
            registers,
            actions,
            focused: false,
            onRefused: (error) => errors.push(error),
          }),
        ),
      );
      const first = host.querySelector('[aria-label="First wire of a"]');
      const qubits = host.querySelector(
        '[aria-label="How many qubits a covers"]',
      );
      const enter = (input, value) => {
        input.value = value;
        input.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            bubbles: true,
            cancelable: true,
          }),
        );
      };
      enter(first, "0");
      enter(qubits, "2");
      assertThat(registers.named("a").start).isEqualTo(0);
      assertThat(registers.named("a").length).isEqualTo(2);
      enter(first, "1.5");
      assertThat(first.value).isEqualTo("0");
      assertThat(typeof errors.at(-1)).isEqualTo("string");
      enter(qubits, "");
      assertThat(qubits.value).isEqualTo("2");
      assertThat(typeof errors.at(-1)).isEqualTo("string");
    } finally {
      root.unmount();
    }
  },
);
