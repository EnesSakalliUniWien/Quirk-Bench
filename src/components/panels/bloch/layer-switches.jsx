import { Checkbox } from "@base-ui/react/checkbox";

import { LAYERS } from "./analyzerModel.js";
import { ControlRow } from "./control-row.jsx";

/**
 * @typedef {object} LayerSwitchesProps
 * @property {string=} idPrefix Unique prefix when embedded; the standalone panel retains its IDs.
 * @property {import("./analyzerModel.js").Layers} layers Which constructions are drawn.
 * @property {(key: keyof import("./analyzerModel.js").Layers, checked: boolean) => void} onChange
 */

/**
 * One switch per construction the sphere can draw, so a reading shows only what it asks about.
 *
 * @param {LayerSwitchesProps} props
 */
function LayerSwitches({ idPrefix = "bloch", layers, onChange }) {
  return (
    <>
      <ControlRow label="Show" role="group" ariaLabel="Constructions to draw">
        {LAYERS.map(([key, label]) => (
          <label key={key} className="bloch-layer">
            <Checkbox.Root
              id={`${idPrefix}-layer-${key}`}
              className="bloch-check"
              checked={layers[key]}
              aria-describedby={
                key === "trig" && layers.trig
                  ? `${idPrefix}-trig-help`
                  : undefined
              }
              onCheckedChange={(checked) => onChange(key, checked)}
            >
              <Checkbox.Indicator className="bloch-check-indicator" />
            </Checkbox.Root>
            {label}
          </label>
        ))}
      </ControlRow>
      {/* Said only while the switch it explains is on. */}
      {layers.trig && (
        <p id={`${idPrefix}-trig-help`} className="bloch-note">
          cos · sin labels the sphere only with Components on; the meridian and
          equator label themselves.
        </p>
      )}
    </>
  );
}

export { LayerSwitches };
