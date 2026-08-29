import { type ReactNode } from "@keybr/solid-compat/react";
import { For } from "solid-js";

export type SegmentedOption<T> = {
  readonly value: T;
  readonly label: ReactNode;
  readonly title?: string;
};

export function SegmentedControl<T>(props: {
  readonly value: T;
  readonly options: readonly SegmentedOption<T>[];
  readonly disabled?: boolean;
  readonly label?: string;
  readonly onChange?: (value: T) => void;
}): ReactNode {
  const select = (index: number) => {
    if (props.disabled || props.options.length === 0) return;
    const normalized = (index + props.options.length) % props.options.length;
    props.onChange?.(props.options[normalized].value);
  };
  const currentIndex = () => Math.max(0, props.options.findIndex((item) => Object.is(item.value, props.value)));
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      select(currentIndex() - 1);
    } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      select(currentIndex() + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      select(0);
    } else if (event.key === "End") {
      event.preventDefault();
      select(props.options.length - 1);
    }
  };
  return (
    <div class="keybr-segmented" role="radiogroup" aria-label={props.label} onKeyDown={onKeyDown}>
      <For each={props.options}>{(item, index) => {
        const selected = () => Object.is(item.value, props.value);
        return (
          <button
            type="button"
            role="radio"
            class="keybr-segmented-item"
            aria-checked={selected()}
            data-selected={selected() ? "" : undefined}
            disabled={props.disabled}
            tabIndex={selected() || (currentIndex() === index() && props.options.every((entry) => !Object.is(entry.value, props.value))) ? 0 : -1}
            title={item.title}
            onClick={() => props.onChange?.(item.value)}
          >
            <span>{item.label}</span>
          </button>
        );
      }}</For>
    </div>
  );
}
