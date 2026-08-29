import * as SwitchPrimitive from "@kobalte/core/switch";
import { type ReactNode, type RefObject, useImperativeHandle, useRef } from "@keybr/solid-compat/react";
import { type Focusable } from "../types.ts";

export type ToggleProps = {
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly label?: ReactNode;
  readonly title?: string;
  readonly ref?: RefObject<Focusable | null>;
  readonly onChange?: (checked: boolean) => void;
};

export function Toggle(props: ToggleProps): ReactNode {
  const input = useRef<HTMLInputElement>(null);
  useImperativeHandle(props.ref, () => ({
    focus: () => input.current?.focus(),
    blur: () => input.current?.blur(),
  }));
  return (
    <SwitchPrimitive.Root
      class="keybr-toggle"
      data-cursor-round=""
      checked={props.checked}
      disabled={props.disabled}
      onChange={props.onChange}
      title={props.title}
    >
      <SwitchPrimitive.Input ref={(el) => (input.current = el)} />
      <SwitchPrimitive.Label class="keybr-toggle-label">{props.label}</SwitchPrimitive.Label>
      <SwitchPrimitive.Control class="samey-switch-control">
        <SwitchPrimitive.Thumb class="samey-switch-thumb" />
      </SwitchPrimitive.Control>
    </SwitchPrimitive.Root>
  );
}
