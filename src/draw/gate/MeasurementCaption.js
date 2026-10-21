import { CanvasTheme } from "../../config/CanvasTheme.js";
import { Typography } from "../../config/Typography.js";
import { fitText } from "../text/TextLayout.js";

/**
 * A label outside the symbol, with enough room for click/no click and deferred measurement.
 * Drawn only for an active gate in a circuit slot: a lone tile (drag ghost, preview) has no slot
 * for the caption to sit in, and a deactivated gate does nothing for it to describe.
 */
function drawMeasurementCaption(
  args,
  text,
  { below = false, fill = CanvasTheme.text.muted } = {},
) {
  if (args.positionInCircuit === undefined || args.gate.deactivated) return;
  fitText(args.painter, text, {
    x: args.rect.center().x,
    y: below ? args.rect.bottom() + 4 : args.rect.y - 4,
    align: "center",
    baseline: below ? "hanging" : "bottom",
    fill,
    font: { fontSize: 11, fontFamily: Typography.DEFAULT_FONT_FAMILY },
    width: Math.max(args.rect.w, 72),
    height: 14,
  });
}

/** Missing, disabled, future and zero-survival results must not become a false no-click. */
function displayedDetectorResult(args) {
  const slot = args.positionInCircuit;
  if (!args.isReached || slot === undefined || args.gate.deactivated)
    return undefined;
  if (
    args.stats.circuitDefinition.gateAtLocIsDisabledReason(
      slot.col,
      slot.row,
    ) !== undefined
  )
    return undefined;
  const survival = args.stats.survivalRate(slot.col);
  return Number.isFinite(survival) &&
    survival > 0 &&
    typeof args.customStats === "boolean"
    ? args.customStats
    : undefined;
}

export { drawMeasurementCaption, displayedDetectorResult };
