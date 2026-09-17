import type { JSX } from "@solidjs/web";
import * as SwitchPrimitive from "@kobalte/core/switch";

export type ToggleProps = {
  readonly checked?: boolean;
  readonly disabled?: boolean;
  readonly label?: JSX.Element;
  readonly title?: string;
  readonly onChange?: (checked: boolean) => void;
};

export function Toggle(props: ToggleProps): JSX.Element {
  return (
    <SwitchPrimitive.Root
      class="keybr-toggle"
      data-cursor-round=""
      checked={props.checked}
      disabled={props.disabled}
      onChange={props.onChange}
      title={props.title}
    >
      <SwitchPrimitive.Input />
      <SwitchPrimitive.Label class="keybr-toggle-label">{props.label}</SwitchPrimitive.Label>
      <SwitchPrimitive.Control class="samey-switch-control">
        <SwitchPrimitive.Thumb class="samey-switch-thumb" />
      </SwitchPrimitive.Control>
    </SwitchPrimitive.Root>
  );
}
