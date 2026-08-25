import { clsx } from "clsx";
import { type ReactNode, type RefObject, useImperativeHandle, useRef } from "react";
import * as styles from "./Checkable.module.less";
import { type Focusable, type FocusProps, type KeyboardProps, type MouseProps } from "./types.ts";

export type CheckableInputProps = {
  readonly checked?: boolean;
  readonly children?: ReactNode;
  readonly label?: ReactNode;
  readonly name?: string;
  readonly ref?: RefObject<Focusable | null>;
  readonly title?: string;
  readonly value?: string;
  readonly onChange?: (checked: boolean) => void;
} & FocusProps & MouseProps & KeyboardProps;

export type CheckableProps = CheckableInputProps & {
  readonly iconOff: string;
  readonly iconOn: string;
  readonly type: "checkbox" | "radio";
  readonly onSelect?: (value?: string) => void;
};

export function Checkable({
  checked,
  children,
  disabled,
  iconOff,
  iconOn,
  label,
  name,
  ref,
  tabIndex,
  title,
  type,
  value,
  onBlur,
  onChange,
  onFocus,
  onSelect,
  ...props
}: CheckableProps): ReactNode {
  const element = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => ({
    focus: () => element.current?.focus(),
    blur: () => element.current?.blur(),
  }));
  return (
    <label {...props} className={clsx(styles.root, disabled && styles.disabled)} title={title}>
      <input
        ref={element}
        checked={checked}
        disabled={disabled}
        name={name}
        tabIndex={tabIndex}
        type={type}
        value={value}
        onBlur={onBlur}
        onChange={(event) => {
          const { checked } = event.target as HTMLInputElement;
          onChange?.(checked);
          if (checked) onSelect?.(value);
        }}
        onFocus={onFocus}
      />
      <svg className={styles.icon} viewBox="0 0 24 24">
        <path d={checked ? iconOn : iconOff} />
      </svg>
      <span className={styles.label}>{label || children}</span>
    </label>
  );
}
