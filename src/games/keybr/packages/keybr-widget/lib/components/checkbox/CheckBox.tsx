import * as CheckboxPrimitive from "@kobalte/core/checkbox";
import { type ReactNode, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { type CheckBoxProps } from "./CheckBox.types.ts";

/** Solid/Kobalte checkbox using the same interaction model as Solid UI. */
export function CheckBox(props: CheckBoxProps): ReactNode {
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(props.ref, () => ({
    focus: () => input.current?.focus(),
    blur: () => input.current?.blur(),
  }));
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
        ref={(el) => (input.current = el)}
        tabIndex={props.tabIndex}
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
