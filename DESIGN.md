---
name: Quirk-Bench
description: Quiet instrument chrome around a precise quantum-circuit workspace.
colors:
  chrome-ground: "#1A1D25"
  ink: "#FAFAFC"
  primary-ink: "#E5E7EF"
  primary-ink-hover: "#FFFFFF"
  quiet-surface: "#232630"
  slate-fill: "#2B2F3B"
  muted-ink: "#B0B7C9"
  guide-grey: "#8B93A6"
  control-surface: "#41495B"
  control-hover: "#505B70"
  control-border: "rgba(227, 230, 238, 0.6135)"
  error-fuchsia: "#E879F9"
  chrome-ground-light: "#F4F5F7"
  ink-light: "#0B0F19"
  primary-ink-light: "#1A1F2B"
  primary-ink-hover-light: "#0B0F19"
  quiet-surface-light: "#FFFFFF"
  slate-fill-light: "#F3F4F6"
  muted-ink-light: "#4A5263"
  guide-grey-light: "#5E6675"
  control-surface-light: "#FFFFFF"
  control-hover-light: "#F3F4F6"
  control-border-light: "rgba(0, 0, 0, 0.46)"
  error-wine-light: "#9D174D"
typography:
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
rounded:
  small: "4px"
  tile: "6px"
  medium: "8px"
  control: "10px"
spacing:
  compact: "2px"
  unit: "4px"
  small: "8px"
  medium: "12px"
  large: "16px"
  section: "24px"
components:
  button-ghost:
    backgroundColor: "transparent"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0 0.625rem"
  button-ghost-hover:
    backgroundColor: "color-mix(in oklab, #2B2F3B 50%, transparent)"
    textColor: "{colors.ink}"
  button-outline:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0 0.625rem"
  button-outline-hover:
    backgroundColor: "{colors.control-hover}"
    textColor: "{colors.ink}"
  button-primary:
    backgroundColor: "{colors.primary-ink}"
    textColor: "{colors.quiet-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0 0.625rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-ink-hover}"
    textColor: "{colors.quiet-surface}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.error-fuchsia}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0 0.625rem"
  button-pressed:
    backgroundColor: "{colors.slate-fill}"
    textColor: "{colors.ink}"
  button-size-sm:
    height: "1.75rem"
    padding: "0 0.5rem"
  button-size-default:
    height: "2rem"
    padding: "0 0.625rem"
  button-size-icon:
    size: "2rem"
---

# Design System: Quirk-Bench

## Overview

**Creative North Star: "The Lab Bench"**

The chrome is the bench, not the experiment. The circuit, its readouts and its colours belong to the science; every button and icon around them stays quiet so a phase hue, a probability bar or the amber playhead is never competing with a control. Dark is the default scheme and light follows the system; both share the same roles.

Buttons are refined and restrained. Most are ghosts that only show a fill under the pointer, one filled primary marks the single most important action in a region, and colour on a control means danger and nothing else. Density is that of a desktop instrument: 32px controls, 16px icons, tight groups separated by hairlines, growing to 44px on coarse pointers.

This file records the button and icon system the chrome is consolidating on. Where the shipped code still differs, the Components section says so; those notes are the migration list, not alternatives.

**Key Characteristics:**

- Ghost by default; one filled primary per region; colour only for danger.
- One `Button` component for every button, with variants and sizes, built on Base UI.
- Every icon is a lucide icon at one 1.5 stroke; none is drawn by hand.
- Toggles say they are on with a quiet fill and a ring, never with the primary fill.

## Colors

Indigo-cast neutrals (OKLCH hue about 268°) with a single near-white ink for emphasis; the chrome carries no hue of its own.

### Primary

- **Bench Light** (`primary-ink`; light: `primary-ink-light`): the fill of the one prominent button in a region, such as Play steps or a form's commit action. Lifts to `primary-ink-hover` under the pointer (white in dark, deeper ink in light).

### Neutral

- **Chrome Ground** (`chrome-ground`): the app background behind toolbars and panels.
- **Quiet Surface** (`quiet-surface`): cards, popovers, and the text colour on a primary fill.
- **Slate Fill** (`slate-fill`): the open, current and pressed fill; at 50% it is the ghost hover.
- **Bench Ink** (`ink`): label text on hover, pressed and outline buttons.
- **Muted Ink** (`muted-ink`): secondary text and resting icon tone where a control steps back.
- **Guide Grey** (`guide-grey`): focus rings and the pressed ring.
- **Control Surface / Hover / Border** (`control-surface`, `control-hover`, `control-border`): the outline variant's fill, hover fill and edge. The light border holds at least 3.16:1 against white and #F4F5F7.

### Danger

- **Error Fuchsia** (`error-fuchsia`; light: `error-wine-light`): the text of a destructive action such as Clear all, and error text. Recorded as shipped; in dark mode it reads close to a brand accent, which is a known open question, not a rule.

### Named Rules

**The No-Hue Chrome Rule.** A control never borrows a hue that already means something on the circuit: gate families, axes, phase, probability green or the amber playhead. Chrome uses neutrals, the primary ink, and the error colour only.

## Typography

**Body Font:** Geist Variable (with sans-serif)
**Label/Mono Font:** ui-monospace stack, for values, not buttons

**Character:** One neutral sans at a single label size keeps every button the same voice.

### Hierarchy

- **Label** (500, 0.875rem / 14px, 1.25rem line height): every button label, in sentence case. Only menu items take title-style capitalization.

### Named Rules

**The One Label Rule.** Buttons do not change weight to signal importance. Emphasis comes from the variant (primary fill), never from weight 550 or 650.

## Shapes

Gently curved controls (10px, `rounded.control`) on every button, at every size. Tiles on the circuit keep their own 6px corner (`rounded.tile`); the 8px and 4px steps belong to inputs and small inner marks, not buttons. Buttons in a group share their inner edges: only the group's outer corners are rounded.

## Components

### Buttons

Every button is the shared `Button` (`src/components/ui/button.jsx`, styled by `src/styles/ui/buttons.css`), built on Base UI's button. A raw `<button>` is not part of the system.

- **Shape:** gently curved (10px), 1px border transparent until a state needs it.
- **Ghost (default variant):** no fill at rest; Slate Fill at 50% on hover with Bench Ink text. Used for nearly every toolbar, transport and panel action.
- **Outline:** Control Surface fill with Control Border edge; Control Hover on hover. For secondary actions in forms and panels that must read as buttons at rest, such as Cancel or Choose file.
- **Primary:** Bench Light fill with Quiet Surface text; lifts on hover. At most one per region: Play steps on the transport, Apply or Create gate in a form.
- **Danger:** ghost with Error Fuchsia text, separated from its neighbours by the row's slack (Clear all).
- **Sizes:** `sm` (1.75rem / 28px tall, 0.5rem side padding, 14px icon) for compact clusters such as the circuit zoom; `default` (2rem / 32px, 0.625rem side padding); `icon` (a 2rem square). On a coarse pointer every size grows to at least 44×44px.
- **Pressed (toggles):** Slate Fill with a 1px Guide Grey border and Bench Ink text, set by `aria-pressed="true"` or a selected tab's `data-active`. An outline button, which already rests on a fill, steps up to Control Hover instead of down to Slate Fill, so the chosen one reads raised. A primary button keeps its primary fill and hover in every pressed state, so Play steps stays filled while it plays. Distinct from hover (50% fill, no ring) and from open or current (`aria-expanded`, `data-current`: full fill, no ring); an open menu's trigger is open, not pressed, even though Base UI marks it `data-pressed`.
- **Hover / Focus / Active:** colour, fill and border transition over 150ms (`cubic-bezier(0.4, 0, 0.2, 1)`). Focus shows a Guide Grey border plus a 3px Guide Grey ring at 50%. A non-menu button presses down 1px while active.
- **Disabled:** 50% opacity and no pointer events, on every variant.
- **Labels:** an icon-only button always has an `aria-label`, and its visible text, if any, is part of that name.

**Not buttons:** rows, tiles and chips that act as buttons but carry their own layout (gate tiles, algebra and probabilities step headers, the Bloch step strip and axis key, register value chips, the selection bar's inline link) stay raw `<button>`s with their own component class and full styling. They are list items, not `Button` variants. Base UI tabs (Forge's methods, Probabilities' layouts) and the parts of the page built without React (the circuit zoom cluster, the error banner) wear the shared `ui-button` class and `data-variant` / `data-size` attributes directly.

### Button groups

- **Style:** `ButtonGroup` joins buttons edge to edge; inner corners square, the outer corners keep 10px, and a focused member rises above its neighbours.
- **Toggle sets:** a set where one option is on (Forge's entry modes, axis presets, Bloch presets, Before/After) is a row of `Button`s, each with `aria-pressed`, wearing the pressed state, not the primary fill. Selected Base UI tabs (`data-active`) wear the same state.

### Icons

Every icon comes from lucide and is rendered through `lucide-react`, inside `IconProvider` (`src/components/ui/icon.jsx`), which sets the stroke for the whole app.

- **Stroke:** 1.5 on Lucide's 24px grid, everywhere (`ICON_STROKE_WIDTH`). An icon that needs another weight is the one that says so.
- **Sizes:** 16px in every button. 14px only in compact controls: `sm` buttons, dock tabs, toasts and the error banner. The logo is the one exception.
- **Colour:** `currentColor`, so an icon always matches its button's text.
- **Meaning:** a panel's icon is its mark, defined once in the panel registry and reused on its tab and its toolbar button; no two panels share a mark.
- **Decoration:** an icon inside a labelled button is `aria-hidden`; the button carries the name.

**Not icons:** scientific notation drawn to mirror the canvas, such as the measurement symbol on gate chips (`measurement-symbol.jsx`) and the dial readout in the Time lane. These are compact drawings of the circuit's own notation and instruments, which lucide has no equivalent for. They follow the 1.5 stroke but are not used as icons.

The two parts of the page built without React (the circuit zoom cluster and the error banner) take their icons from `iconElement` in `src/resources/icons/index.js`, which renders lucide-react's own icons once at load, so they need no copied SVG files.

### Named Rules

**The One Button Rule.** Every button in the chrome is the shared `Button`. A new look is a new variant in `buttons.css`, never a local class on a raw `<button>`.

**The One Fill Rule.** At most one primary-filled button per region. Commit actions are primary; selection never is.

**The Quiet Toggle Rule.** A toggle that is on shows a quiet fill and a Guide Grey ring: Slate Fill on a ghost, Control Hover on an outline. It never borrows the primary fill, and hover alone never looks like on.

**The Lucide-Only Rule.** No hand-rolled icons. Every icon is a lucide icon rendered by lucide-react: no hand-drawn SVG paths, no copied SVG files, no text glyphs (×, +, ⓘ) and no emoji standing in for an icon.

**The One Stroke Rule.** Every icon is drawn at stroke 1.5, set once by `IconProvider`.

## Do's and Don'ts

### Do:

- **Do** use `Button` with a `variant` (ghost, outline, primary, danger) and a `size` (sm, default, icon) for every button.
- **Do** keep one primary button per region, and make a form's commit action that button.
- **Do** show a toggle's on state with the pressed style (quiet fill + 1px Guide Grey ring) via `aria-pressed`.
- **Do** take every icon from lucide-react at 16px in buttons, 14px in compact controls, stroke 1.5.
- **Do** give every icon-only button an `aria-label`, and keep its visible text inside that name.
- **Do** keep a coarse-pointer target of at least 44×44px on every button size.

### Don't:

- **Don't** hand-roll an icon: no hand-drawn `<svg>` paths, copied SVG files, text glyphs or emoji as icons.
- **Don't** style a raw `<button>` with its own class or rely on the classless base rule.
- **Don't** use the primary fill for a selected tab, mode or preset.
- **Don't** signal importance with font weight (550, 650); use the variant.
- **Don't** set a disabled opacity other than 0.5.
- **Don't** colour a control with a circuit hue (gate families, axes, phase, probability green, playhead amber).
