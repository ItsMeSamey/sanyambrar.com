import { clsx } from "@keybr/solid-compat/clsx";
import {
  type ReactNode,
  useImperativeHandle,
  useRef,
} from "@keybr/solid-compat/react";
import { omit } from 'solid-js';
import { sizeClassName } from "../../styles/index.ts";
import * as styles from "./Range.module.css";
import { type RangeProps } from "./Range.types.ts";

const THUMB_SIZE = 16;

export function Range(allProps: RangeProps): ReactNode {
  const local = allProps, props = omit(allProps, "disabled", "max", "min", "name", "ref", "size", "step", "tabIndex", "title", "value", "onChange");
  const element = useRef<HTMLInputElement>(null);
  useImperativeHandle(local.ref, () => ({
    focus: () => element.current?.focus(),
    blur: () => element.current?.blur(),
  }));

  const progress = () => {
    const span = local.max - local.min;
    if (!(span > 0)) return 0;
    return Math.max(0, Math.min(1, (local.value - local.min) / span));
  };
  const fillWidth = () => {
    const ratio = progress();
    return `calc(${ratio * 100}% + ${THUMB_SIZE / 2 - ratio * THUMB_SIZE}px)`;
  };

  return (
    <span
      class={clsx(
        styles.root,
        "game-settings-slider",
        local.disabled && styles.disabled,
        sizeClassName(local.size ?? 16),
      )}
      style={{ "--range-fill-width": fillWidth() }}
    >
      <span class="game-range-shell">
        <span class="game-range-track" aria-hidden="true">
          <span class="game-range-fill" />
        </span>
        <input
          {...props}
          ref={(el) => (element.current = el)}
          disabled={local.disabled}
          max={local.max}
          min={local.min}
          name={local.name}
          step={local.step}
          tabindex={local.tabIndex}
          title={local.title}
          type="range"
          value={local.value}
          onInput={(event) =>
            local.onChange?.(Number((event.target as HTMLInputElement).value))
          }
        />
      </span>
    </span>
  );
}
