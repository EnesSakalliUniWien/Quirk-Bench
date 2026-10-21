import assert from "node:assert/strict";
import {
  test,
  withQuirkPage,
  waitForPanel,
  closePanel,
  currentCircuit,
  waitForCanvasViewport,
  circuitTopForWires,
  circuitMetrics,
} from "./harness.js";

const circuit = {
  cols: [["H"], ["•", "X"]],
  registers: [{ name: "pair", wires: [0, 2] }],
};
const analysis = (panel) => `[data-panel-id="${panel}"] .shared-bloch-analysis`;

test("amplitude windows share physical analysis for coherent, entangled and measured states", async (browser) => {
  for (const { cols, column, purity } of [
    { cols: [["H"], ["Amps1"]], column: 1, purity: "1.000" },
    { cols: [["H"], ["•", "X"], ["Amps1"]], column: 2, purity: "0.500" },
    { cols: [["H"], ["Measure"], ["Amps1"]], column: 2, purity: "0.500" },
  ]) {
    await withQuirkPage(browser, { cols }, async (page) => {
      await waitForCanvasViewport(page);
      const top = await circuitTopForWires(page, 2);
      const bounds = await page.$eval("#drawCanvas canvas", (e) =>
        e.getBoundingClientRect().toJSON(),
      );
      await page.mouse.click(
        bounds.x +
          column * circuitMetrics.columnSpacing +
          circuitMetrics.firstColumnLeft +
          10,
        bounds.y + top + circuitMetrics.wireSpacing / 2,
      );
      await waitForPanel(page, "complex-display", true);
      const root = analysis("complex-display");
      await page.click(`${root} > summary`);
      await page.waitForFunction(
        (selector, expected) =>
          document.querySelector(`${selector} [id$="-tr-rho2"]`)
            ?.textContent === expected,
        {},
        root,
        purity,
      );
      if (purity === "0.500") {
        assert.equal(
          await page.$eval(`${root} [id$="-alpha"]`, (e) => e.textContent),
          "—",
        );
        assert.match(
          await page.$eval(`${root} .bloch-canvas`, (e) =>
            e.getAttribute("aria-label"),
          ),
          /maximally mixed/,
        );
      }
      if (cols.some((col) => col.includes("Measure"))) {
        assert.match(
          await page.$eval(".complex-display-panel", (e) => e.innerText),
          /physical density matrices after measurement/,
        );
      }
      assert.deepEqual(await currentCircuit(page), { cols });
    });
  }
});

async function expandAnalysis(page, panel) {
  await page.click("#inspect-button");
  await page.waitForSelector(`[data-inspect-panel="${panel}"]`, {
    visible: true,
  });
  await page.click(`[data-inspect-panel="${panel}"]`);
  await waitForPanel(page, panel, true);
  await page.waitForSelector(`${analysis(panel)} > summary`);
  await page.click(`${analysis(panel)} > summary`);
  await page.waitForSelector(`${analysis(panel)} .bloch-figure-sphere canvas`);
}

test("analytical panels share Bloch controls with independent IDs and release closed figures", async (browser) => {
  await withQuirkPage(browser, circuit, async (page) => {
    for (const panel of [
      "state",
      "qubits",
      "algebra",
      "probabilities",
      "registers",
    ]) {
      await expandAnalysis(page, panel);
      assert.equal(
        await page.$$eval(`${analysis(panel)} canvas`, (nodes) => nodes.length),
        3,
      );
      const axisColors = await page.$eval(analysis(panel), (root) =>
        ["x", "y", "z"].map((axis) => {
          const button = root.querySelector(`.bloch-axis-${axis}`);
          const swatch = button.querySelector(".bloch-swatch");
          const expected = document.createElement("span");
          expected.style.color = `var(--bloch-axis-${axis}-text)`;
          expected.style.backgroundColor = `var(--bloch-axis-${axis})`;
          root.append(expected);
          const tokens = getComputedStyle(expected);
          const result = {
            axis,
            text: getComputedStyle(button).color,
            swatch: getComputedStyle(swatch).backgroundColor,
            expectedText: tokens.color,
            expectedSwatch: tokens.backgroundColor,
          };
          expected.remove();
          return result;
        }),
      );
      for (const colors of axisColors) {
        assert.equal(
          colors.text,
          colors.expectedText,
          `${panel} ${colors.axis} text follows its axis token.`,
        );
        assert.equal(
          colors.swatch,
          colors.expectedSwatch,
          `${panel} ${colors.axis} swatch follows its axis token.`,
        );
      }
      const sphere = `${analysis(panel)} .bloch-figure-sphere canvas`;
      await page.focus(sphere);
      await page.keyboard.press("ArrowRight");
      await page.waitForSelector(`${analysis(panel)} .bloch-reset-view`);
      await page.click(`${analysis(panel)} .bloch-reset-view`);
      await page.waitForFunction(
        (selector) => !document.querySelector(selector),
        {},
        `${analysis(panel)} .bloch-reset-view`,
      );
      const layer = `${analysis(panel)} [role="checkbox"]`;
      const before = await page.$eval(layer, (node) =>
        node.getAttribute("aria-checked"),
      );
      await page.click(layer);
      assert.notEqual(
        await page.$eval(layer, (node) => node.getAttribute("aria-checked")),
        before,
      );
    }
    const ids = await page.$$eval(".shared-bloch-analysis [id]", (nodes) =>
      nodes.map((node) => node.id),
    );
    assert.equal(
      new Set(ids).size,
      ids.length,
      "Simultaneously mounted analyses need independent control IDs.",
    );
    await page.click(`${analysis("registers")} > summary`);
    await page.waitForFunction(
      (selector) =>
        document.querySelector(selector)?.querySelector("canvas") === null,
      {},
      analysis("registers"),
    );
    await closePanel(page, "registers");
  });
});

test("shared Bloch analysis fits a narrow State panel and preserves the state table", async (browser) => {
  await withQuirkPage(
    browser,
    circuit,
    async (page) => {
      await expandAnalysis(page, "state");
      assert.ok(await page.$("#state-table"));
      const layout = await page.$eval(analysis("state"), (node) => {
        const body = node.querySelector(".shared-bloch-body");
        return {
          width: body.clientWidth,
          scroll: body.scrollWidth,
          canvases: [...body.querySelectorAll("canvas")].map(
            (canvas) => canvas.getBoundingClientRect().width,
          ),
        };
      });
      assert.ok(layout.width > 0);
      assert.ok(
        layout.scroll <= layout.width + 2,
        "Bloch controls fit without horizontal overflow.",
      );
      assert.ok(
        layout.canvases.every((width) => width > 0 && width <= layout.width),
      );
    },
    { width: 390, height: 844 },
  );
});

test("Forge operation exploration updates the output for the chosen input without changing the circuit", async (browser) => {
  await withQuirkPage(browser, { cols: [["H"]] }, async (page) => {
    await page.click("#gate-forge-button");
    await waitForPanel(page, "forge", true);
    await page.$$eval('.construction-tabs [role="tab"]', (tabs) =>
      tabs.find((tab) => tab.textContent === "Matrix").click(),
    );
    await page.$$eval(".entry-modes button", (buttons) =>
      buttons.find((button) => button.textContent === "Raw text").click(),
    );
    await page.$eval("#gate-forge-matrix", (node) => {
      node.focus();
      node.select();
    });
    await page.keyboard.press("Backspace");
    await page.type("#gate-forge-matrix", "0,1,1,0");
    const root = analysis("forge");
    await page.waitForSelector(`${root} > summary`);
    await page.click(`${root} > summary`);
    const sphere = `${root} .bloch-figure-sphere canvas`;
    await page.waitForSelector(sphere);
    await page.waitForFunction(
      (selector) =>
        document
          .querySelector(selector)
          ?.getAttribute("aria-label")
          .includes("θ 180.0°"),
      {},
      sphere,
    );
    await page.$$eval(`${root} .bloch-presets button`, (buttons) =>
      buttons.find((button) => button.textContent === "|1⟩").click(),
    );
    await page.waitForFunction(
      (selector) =>
        document
          .querySelector(selector)
          ?.getAttribute("aria-label")
          .includes("θ 0.0°"),
      {},
      sphere,
    );
    assert.deepEqual(await currentCircuit(page), { cols: [["H"]] });
    await closePanel(page, "forge");
  });
});
