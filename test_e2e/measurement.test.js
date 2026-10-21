import assert from "node:assert/strict";
import {
  test,
  withQuirkPage,
  waitForPanel,
  TEST_TIMEOUT_MILLIS,
} from "./harness.js";

for (const reducedMotion of [false, true]) {
  test(`measurement results follow Steps with ${reducedMotion ? "reduced" : "normal"} motion and independent Time`, async (browser) => {
    const circuit = {
      cols: [["X", "X^t"], ["ZDetectControlReset"], ["ZDetector"]],
    };
    await withQuirkPage(browser, circuit, async (page) => {
      await page.emulateMediaFeatures([
        {
          name: "prefers-reduced-motion",
          value: reducedMotion ? "reduce" : "no-preference",
        },
      ]);
      if (!reducedMotion) await page.click("#time-play-button");
      await page.waitForFunction(
        () => document.getElementById("time-hold").textContent === "paused",
      );
      // Pausing is published before the last simulated frame reaches the Time readout.
      await new Promise((resolve) => setTimeout(resolve, 200));
      const time = await page.$eval("#time-scrub", (e) => e.value);
      await page.click("#state-button");
      await waitForPanel(page, "state", true);
      const reset = '[data-measurement="1:0"]';
      const detector = '[data-measurement="2:0"]';
      await page.waitForSelector(`${reset}[data-status="click"]`);
      assert.equal(
        await page.$eval(
          `${detector} .measurement-result`,
          (e) => e.textContent,
        ),
        "no click",
      );
      assert.match(
        await page.$eval(reset, (e) => e.textContent),
        /q0 \(wire 1\), column 2/,
      );

      // Native details and the Before/After controls work from the keyboard.
      await page.focus(`${reset} summary`);
      await page.keyboard.press("Enter");
      await page.waitForSelector(`${reset} details[open]`);
      assert.match(
        await page.$eval(`${reset} details`, (e) => e.textContent),
        /Control active; target reset to \|0⟩/,
      );
      await page.keyboard.press("Tab");
      assert.match(
        await page.evaluate(() =>
          document.activeElement.getAttribute("aria-label"),
        ),
        /^State before Z Detect-Control-Reset/,
      );
      await page.keyboard.press("Enter");
      await page.waitForSelector(`${reset}[data-status="pending"]`);
      assert.equal(
        await page.$eval(
          `${detector} .measurement-result`,
          (e) => e.textContent,
        ),
        "Not reached",
      );
      assert.equal(await page.$eval("#time-scrub", (e) => e.value), time);

      // Observe real Web Animations calls without replacing their behavior.
      await page.evaluate(() => {
        window.measurementAnimations = [];
        const animate = Element.prototype.animate;
        Element.prototype.animate = function (...args) {
          if (this.classList.contains("measurement-result")) {
            window.measurementAnimations.push(args[1].duration);
          }
          return animate.apply(this, args);
        };
      });
      await page.focus(`${reset} [aria-label^="State after"]`);
      await page.keyboard.press("Enter");
      await page.waitForSelector(`${reset}[data-status="click"]`);
      await page.waitForFunction(
        () =>
          document
            .querySelector(
              '[data-measurement="1:0"] [aria-label^="State after"]',
            )
            .getAttribute("aria-pressed") === "true",
      );
      assert.equal(await page.$eval("#time-scrub", (e) => e.value), time);
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.deepEqual(
        await page.evaluate(() => window.measurementAnimations),
        reducedMotion ? [] : [180],
      );
      assert.equal(
        await page.$eval(
          `${reset} .measurement-result`,
          (e) => e.getAnimations().length,
        ),
        0,
      );

      // A new completed run with the same outcome must not restart the emphasis.
      await page.click("#time-forward-button");
      await new Promise((resolve) => setTimeout(resolve, 300));
      assert.deepEqual(
        await page.evaluate(() => window.measurementAnimations),
        reducedMotion ? [] : [180],
      );
      assert.equal(
        await page.$eval(`${reset} .measurement-result`, (e) => e.textContent),
        "click",
      );
    });
  });
}

test("measurement details explain deferred, sampled, reset and post-selection behavior by keyboard", async (browser) => {
  await withQuirkPage(browser, { cols: [["Measure"]] }, async (page) => {
    for (const [id, expected] of [
      ["Measure", /no single outcome is sampled/],
      ["YDetector", /target is \|−i⟩ and any controls are satisfied/],
      [
        "XDetectControlReset",
        /Reset the target to \|0⟩ after those operations, for either result/,
      ],
      ["|/⟩⟨/|", /With zero survival there is no conditional output state/],
    ]) {
      await page.focus(`.gate-tile[data-gate-id=${JSON.stringify(id)}]`);
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");
      await page.waitForSelector(".gate-details-popup", {
        visible: true,
        timeout: TEST_TIMEOUT_MILLIS,
      });
      const details = await page.$eval(
        ".gate-details-popup",
        (e) => e.textContent,
      );
      assert.match(details, /Measurement behavior/);
      assert.match(details, expected);
      await page.keyboard.press("Escape");
      await page.waitForSelector(".gate-details-popup", { hidden: true });
    }
  });
});
