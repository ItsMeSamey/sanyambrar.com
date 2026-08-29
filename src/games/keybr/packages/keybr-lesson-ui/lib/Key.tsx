import { type LessonKey } from "@keybr/lesson";
import { type MouseProps } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./styles.module.css";
import { useKeyStyles } from "./styles.ts";
import { mergeProps, splitProps } from "solid-js";

export const Key = (allProps: {
  lessonKey: LessonKey;
  isSelectable?: boolean;
  isCurrent?: boolean;
  size?: "normal" | "large" | "announcement";
  title?: string;
} & MouseProps) => {
  const merged = mergeProps(
    { isSelectable: false, isCurrent: false, size: "normal" as const },
    allProps,
  );
  const [local, props] = splitProps(merged, [
    "lessonKey",
    "isSelectable",
    "isCurrent",
    "size",
    "title",
  ]);
  const { keyStyles } = useKeyStyles();
  const key = () => local.lessonKey;

  return (
    <span
      {...props}
      ref={Key.attach(key())}
      class={clsx(
        styles.lessonKey,
        local.size === "normal" && styles.lessonKeyNormal,
        local.size === "large" && styles.lessonKeyLarge,
        local.size === "announcement" && styles.lessonKeyAnnouncement,
        key().isIncluded ? styles.lessonKeyIncluded : styles.lessonKeyExcluded,
        key().isIncluded && key().confidence == null && styles.lessonKeyUncalibrated,
        key().isIncluded && key().isFocused && styles.lessonKeyFocused,
        key().isIncluded && key().isForced && styles.lessonKeyForced,
        local.isSelectable && styles.lessonKeySelectable,
        local.isCurrent && styles.lessonKeyCurrent,
      )}
      style={keyStyles(key().isIncluded, key().confidence)}
      title={local.title}
      data-code-point={key().letter.codePoint}
    >
      {key().letter.label}
      {key().isIncluded || (
        <svg viewBox="0 0 100 100" class={styles.cross}>
          <path d="M 0 100 L 100 0" />
        </svg>
      )}
    </span>
  );
};

const attachment = Symbol();
Key.attach = (key: LessonKey) => (target: Element | null): void => {
  if (target != null) (target as any)[attachment] = key;
};
Key.attached = (target: Element | null): LessonKey | null =>
  (target as any)?.[attachment] ?? null;
