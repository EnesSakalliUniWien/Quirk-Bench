/**
 * The icons for the two corners of the page built without React - the zoom cluster over the
 * circuit and the error banner. They are lucide-react's own minus, plus and x: rendered once, at
 * module load, into a detached element, and kept as markup for iconElement to clone. At load,
 * because a first use can fall inside React's own render, where flushSync cannot flush, and the
 * banner must draw while the app is failing. A worker imports this module through the error
 * reporter but draws no icons and has no document, so it skips the render. Every other icon is a
 * lucide-react component in the tree.
 * test/resources/icons.test.js holds them to Lucide's weight and accessibility.
 */

import { LucideProvider, Minus, Plus, X } from "lucide-react";
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

/** The stroke every icon in the app is drawn with, on Lucide's 24px grid. */
const ICON_STROKE_WIDTH = 1.5;

const ICONS = Object.freeze({ minus: Minus, plus: Plus, x: X });

/** The names iconElement draws. */
const ICON_NAMES = Object.freeze(Object.keys(ICONS));

/** @returns {!Object.<!string, !string>} */
function renderMarkup() {
  const host = document.createElement("div");
  const root = createRoot(host);
  flushSync(() =>
    root.render(
      createElement(
        LucideProvider,
        { strokeWidth: ICON_STROKE_WIDTH },
        ...Object.values(ICONS).map((Icon, i) =>
          createElement(Icon, { key: i }),
        ),
      ),
    ),
  );
  const rendered = Object.fromEntries(
    ICON_NAMES.map((name, i) => [name, host.children[i].outerHTML]),
  );
  root.unmount();
  return Object.freeze(rendered);
}

/** @type {(undefined|!Object.<!string, !string>)} */
const markup = typeof document === "undefined" ? undefined : renderMarkup();

/**
 * One icon as an element, for the parts of the page built without React. The size is the
 * stylesheet's to decide, as it is for a lucide-react icon.
 *
 * @param {!string} name
 * @returns {!Element}
 */
function iconElement(name) {
  const template = document.createElement("template");
  template.innerHTML = markup[name];
  return template.content.firstElementChild;
}

export { ICON_NAMES, ICON_STROKE_WIDTH, iconElement };
