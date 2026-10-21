import { Suite, assertThat } from "../TestUtil.js";
import {
  ICON_NAMES,
  ICON_STROKE_WIDTH,
  iconElement,
} from "../../src/resources/icons/index.js";
import { PANELS } from "../../src/components/panels/panels.jsx";

const suite = new Suite("icons");

suite.test(
  "the icons for the corners built without React are lucide-react's",
  () => {
    for (const name of ICON_NAMES) {
      const svg = iconElement(name);
      assertThat(svg.tagName.toLowerCase()).withInfo({ name }).isEqualTo("svg");
      assertThat(svg.classList.contains("lucide"))
        .withInfo({ name })
        .isEqualTo(true);
      assertThat(svg.classList.contains(`lucide-${name}`))
        .withInfo({ name })
        .isEqualTo(true);
      assertThat(svg.getAttribute("stroke"))
        .withInfo({ name })
        .isEqualTo("currentColor");
      assertThat(svg.getAttribute("stroke-width"))
        .withInfo({ name })
        .isEqualTo(`${ICON_STROKE_WIDTH}`);
      assertThat(svg.getAttribute("aria-hidden"))
        .withInfo({ name })
        .isEqualTo("true");
    }
  },
);

suite.test("an icon element is a fresh svg each time", () => {
  assertThat(iconElement("x") !== iconElement("x")).isEqualTo(true);
  assertThat(iconElement("x").querySelectorAll("path").length).isEqualTo(2);
});

suite.test(
  "every panel has a mark for its tab and for the button that opens it",
  () => {
    for (const [name, panel] of Object.entries(PANELS)) {
      assertThat(panel.icon !== undefined)
        .withInfo({ panel: name })
        .isEqualTo(true);
      assertThat(panel.title.length > 0)
        .withInfo({ panel: name })
        .isEqualTo(true);
    }
  },
);
