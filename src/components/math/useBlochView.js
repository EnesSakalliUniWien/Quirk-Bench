import { onColourSchemeChange } from "../../appearance/colourScheme.js";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  DEFAULT_VIEW,
  drawBlochScene,
} from "../../draw/displays/bloch/BlochScene.js";
import { drawBlochProjection } from "../../draw/displays/bloch/BlochProjections.js";
import { drawBlochStrip } from "../../draw/displays/bloch/BlochStrip.js";
import { clock } from "../../base/Clock.js";
import { prefersReducedMotion } from "../../browser/reducedMotion.js";
import { Animation } from "../../config/Animation.js";
import { motionSettings } from "../../state/motionSettings.js";
import { RenderSurface } from "../../draw/surface/RenderSurface.js";
import { blochReading, blochVectorBetween } from "../../engine/math/bloch.js";
import { glidesBetween, panelReadout } from "../panels/bloch/analyzerModel.js";
import { usePanelVisibility } from "../panels/shared/usePanelVisibility.js";

const NO_STEPS = [];

/** Shared sphere, projections, camera and render-surface lifetime, independent of any panel target.
 * @param {object} inputs
 * @param {object | undefined} inputs.vector The physical Bloch vector, or undefined when unavailable.
 * @param {object} inputs.source Identity of the state, used for camera reset and transitions.
 * @param {object} inputs.layers Visible constructions.
 * @param {string | undefined} inputs.focusAxis Axis highlighted by the controls.
 * @param {Array=} inputs.steps Optional vectors for the circuit's step strip.
 * @param {number=} inputs.selectedStep Selected step in the strip.
 * @param {object=} inputs.settings Motion settings store.
 */
function useBlochView({
  vector,
  source,
  layers,
  focusAxis,
  steps = NO_STEPS,
  selectedStep,
  settings = motionSettings,
}) {
  const sphereRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const meridianRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const equatorRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const panelShowing = usePanelVisibility();
  const stripRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const viewRef = useRef({ ...DEFAULT_VIEW });
  const shownVector = useRef(
    /** @type {import("../panels/bloch/analyzerModel.js").BlochVector | undefined} */ (
      undefined
    ),
  );
  const vectorRef = useRef(vector);
  const inputSourceRef = useRef(source);
  const stepsRef = useRef(steps);

  const optionsRef = useRef({ layers, focusAxis });
  const sourceRef = useRef(
    /** @type {import("../panels/bloch/analyzerModel.js").ShownSource | undefined} */ (
      undefined
    ),
  );
  const glideRef = useRef(
    /** @type {{ from: import("../panels/bloch/analyzerModel.js").BlochVector, start: number, duration: number } | undefined} */ (
      undefined
    ),
  );
  const glideFrame = useRef(
    /** @type {(() => void) | undefined} */ (undefined),
  );
  const repaintRef = useRef(() => {});
  // Every canvas painted into, so its surface can be released once it is gone.
  const paintedCanvases = useRef(
    /** @type {Set<HTMLCanvasElement>} */ (new Set()),
  );
  const [readout, setReadout] = useState(
    /** @type {import("../panels/bloch/analyzerModel.js").PanelReadout | null | undefined} */ (
      undefined
    ),
  );
  // Whether the sphere has been turned from the default view, so a Reset view can be offered.
  const [rotated, setRotated] = useState(false);

  // A fresh sphere is shown from the default view.
  useEffect(() => {
    viewRef.current = { ...DEFAULT_VIEW };
    setRotated(false);
  }, [source.target]);

  const repaint = useMemo(() => {
    return () => {
      const canvas = sphereRef.current;
      if (canvas === null) return;
      let vec = vectorRef.current;
      const source = inputSourceRef.current;
      // Projections and controls can remain visible after the sphere scrolls away.
      // Pause painting only when the whole dock panel is hidden.
      if (!panelShowing) {
        sourceRef.current = source;
        shownVector.current = vec;
        glideRef.current = undefined;
        setReadout(vec === undefined ? null : panelReadout(vec));
        return;
      }
      if (
        glidesBetween(sourceRef.current, source) &&
        shownVector.current !== undefined &&
        vec !== undefined &&
        !prefersReducedMotion()
      ) {
        // The glide keeps the duration it started with, whatever the setting does meanwhile.
        glideRef.current = {
          from: shownVector.current,
          start: clock.now(),
          duration: settings.getState().glideMs,
        };
      }
      sourceRef.current = source;
      const glide = glideRef.current;
      const progress =
        glide === undefined || glide.duration <= 0
          ? 1
          : Math.min(1, (clock.now() - glide.start) / glide.duration);
      if (glide !== undefined && vec !== undefined && progress < 1) {
        vec = blochVectorBetween(
          glide.from,
          vec,
          Animation.GLIDE_EASING(progress),
        );
        if (glideFrame.current === undefined) {
          glideFrame.current = clock.after(0, () => {
            glideFrame.current = undefined;
            repaintRef.current();
          });
        }
      } else {
        glideRef.current = undefined;
      }
      shownVector.current = vec;
      const { yaw, pitch } = viewRef.current;
      const reading = vec === undefined ? undefined : blochReading(vec);
      const options = { ...optionsRef.current, reading };
      // A canvas React replaced - the strip's, when the steps come and go - takes its surface along.
      const canvases = [
        canvas,
        meridianRef.current,
        equatorRef.current,
        stripRef.current,
      ];
      for (const painted of paintedCanvases.current) {
        if (!canvases.includes(painted)) {
          paintedCanvases.current.delete(painted);
          void RenderSurface.release(painted);
        }
      }
      for (const current of canvases) {
        if (current !== null) paintedCanvases.current.add(current);
      }
      drawBlochScene(canvas, vec, yaw, pitch, options);
      if (meridianRef.current !== null) {
        drawBlochProjection(meridianRef.current, vec, "meridian", options);
      }
      if (equatorRef.current !== null) {
        drawBlochProjection(equatorRef.current, vec, "equator", options);
      }
      if (stripRef.current !== null) {
        drawBlochStrip(
          stripRef.current,
          stepsRef.current.map((step) => step.vec),
          { selected: selectedStep, yaw, pitch },
        );
      }
      setReadout(vec === undefined ? null : panelReadout(vec, reading));
    };
  }, [panelShowing, settings, selectedStep]);
  repaintRef.current = repaint;
  useEffect(() => onColourSchemeChange(() => repaintRef.current()), []);

  // A glide still under way stops with the panel, and the figures' surfaces go with it.
  useEffect(() => {
    const painted = paintedCanvases.current;
    return () => {
      glideFrame.current?.();
      for (const canvas of painted) void RenderSurface.release(canvas);
      painted.clear();
    };
  }, []);

  // A new simulation sample, a switch, a held axis, a chosen step or an explored state redraws the
  // same figures.
  useEffect(() => {
    optionsRef.current = { layers, focusAxis };
    vectorRef.current = vector;
    inputSourceRef.current = source;
    stepsRef.current = steps;
    repaint();
  }, [vector, source, layers, focusAxis, steps, repaint]);

  // The panel can be resized without a new sample, and that means repaint too.
  useEffect(() => {
    if (!panelShowing) return undefined;
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(() => repaint());
    for (const element of [
      sphereRef.current,
      meridianRef.current,
      equatorRef.current,
      stripRef.current,
    ]) {
      if (observer !== undefined && element !== null) observer.observe(element);
    }
    return () => observer?.disconnect();
  }, [panelShowing, repaint]);

  // Drag rotates the view; pointer events so touch drags work the same way.
  /** @param {import("react").PointerEvent<HTMLCanvasElement>} event */
  const onPointerDown = (event) => {
    if (
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };
  /**
   * Turns the view, the way the surface under a finger turns: a drag right swings the near side
   * right, a drag down tips the near side down and the top toward the reader.
   * @param {number} yawBy @param {number} pitchBy In radians.
   */
  const turn = (yawBy, pitchBy) => {
    const view = viewRef.current;
    view.yaw -= yawBy;
    view.pitch = Math.max(
      Math.PI * -0.49,
      Math.min(Math.PI * 0.49, view.pitch + pitchBy),
    );
    setRotated(true);
    repaint();
  };
  /** @param {import("react").PointerEvent<HTMLCanvasElement>} event */
  const onPointerMove = (event) => {
    const canvas = event.currentTarget;
    if (!canvas.hasPointerCapture(event.pointerId)) {
      return;
    }
    const cssSize = Math.max(1, canvas.clientWidth);
    turn(
      (event.movementX * Math.PI) / cssSize,
      (event.movementY * Math.PI) / cssSize,
    );
  };
  /** The arrow keys turn the sphere 15° a press; Home puts it back. */
  /** @param {import("react").KeyboardEvent<HTMLCanvasElement>} event */
  const onKeyDown = (event) => {
    const step = Math.PI / 12;
    const turns = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    if (event.key === "Home") {
      event.preventDefault();
      resetView();
    } else if (turns[event.key] !== undefined) {
      event.preventDefault();
      turn(...turns[event.key]);
    }
  };
  const resetView = () => {
    viewRef.current = { ...DEFAULT_VIEW };
    setRotated(false);
    repaint();
  };

  return {
    sphereRef,
    meridianRef,
    equatorRef,
    stripRef,
    readout,
    shownVector,
    rotated,
    resetView,
    onPointerDown,
    onPointerMove,
    onKeyDown,
  };
}

export { useBlochView };
