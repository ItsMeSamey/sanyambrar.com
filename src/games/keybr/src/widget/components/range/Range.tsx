import type { JSX } from "@solidjs/web";
import { clsx } from "clsx";
import { omit } from 'solid-js';
import { sizeClassName } from "../../styles/size.ts";
import styles from "./Range.module.css";
import { type SizeName } from "../../styles/size.ts";
import { type FocusProps, type KeyboardProps, type MouseProps, } from "../types.ts";
type RangeProps = {
    readonly max: number;
    readonly min: number;
    readonly name?: string;
    readonly size?: SizeName;
    readonly step: number;
    readonly title?: string;
    readonly value: number;
    readonly onChange?: (value: number) => void;
} & FocusProps & MouseProps & KeyboardProps;

const THUMB_SIZE = 16;

export function Range(allProps: RangeProps): JSX.Element {
  const local = allProps, props = omit(allProps, "disabled", "max", "min", "name", "size", "step", "tabIndex", "title", "value", "onChange");
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
