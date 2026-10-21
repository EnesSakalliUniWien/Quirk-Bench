import { Button as ButtonPrimitive } from "@base-ui/react/button";

/**
 * The chrome's button: Base UI's primitive with the app's own styling from
 * src/styles/ui/buttons.css, the one button DESIGN.md allows. `variant` is "ghost" (no fill at
 * rest), "outline" (a bordered control surface), "primary" (the one filled action in a region) or
 * "danger" (a destructive action). `size` is "sm" (1.75rem, compact clusters), "default" (text
 * with an optional inline icon) or "icon" (a 2rem square).
 */
/**
 * @param {{ className?: string, variant?: ("ghost" | "outline" | "primary" | "danger"),
 *     size?: ("sm" | "default" | "icon") } & Record<string, any>} props Any other prop is passed
 *     to Base UI's button.
 */
function Button({ className, variant = "ghost", size = "default", ...props }) {
  return (
    <ButtonPrimitive
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={["ui-button", className].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export { Button };
