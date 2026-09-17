import type { JSX } from "@solidjs/web";
import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import { type FocusProps } from "../types.ts";
type CheckBoxProps = {
  readonly checked?: boolean;
  readonly children?: JSX.Element;
  readonly label?: JSX.Element;
  readonly name?: string;
  readonly title?: string;
  readonly value?: string;
  readonly onChange?: (checked: boolean) => void;
} & FocusProps;

/** Solid/Kobalte checkbox using the same interaction model as Solid UI. */
export function CheckBox(props: CheckBoxProps): JSX.Element {
  return (
    <CheckboxPrimitive.Root
      class="keybr-checkbox"
      data-cursor-round=""
      checked={props.checked}
      disabled={props.disabled}
      name={props.name}
      value={props.value}
      onChange={props.onChange}
      title={props.title}
    >
      <CheckboxPrimitive.Input
        tabindex={props.tabIndex}
        onFocus={(event) => props.onFocus?.(event)}
        onBlur={(event) => props.onBlur?.(event)}
      />
      <CheckboxPrimitive.Control class="keybr-checkbox-control">
        <CheckboxPrimitive.Indicator class="keybr-checkbox-indicator">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.25 8.25 6.5 11.5 12.75 4.75" /></svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Control>
      <CheckboxPrimitive.Label class="keybr-checkbox-label">{props.label ?? props.children}</CheckboxPrimitive.Label>
    </CheckboxPrimitive.Root>
  );
}
