import { type LessonKey } from "@keybr/lesson";
import { type MouseProps } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./styles.module.css";
import { useKeyStyles } from "./styles.ts";
export const Key = ({ lessonKey, isSelectable = false, isCurrent = false, size = "normal", title, ...props }: {
    lessonKey: LessonKey;
    isSelectable?: boolean;
    isCurrent?: boolean;
    size?: "normal" | "large" | "announcement";
    title?: string;
} & MouseProps) => {
    const { keyStyles } = useKeyStyles();
    const { letter: { codePoint, label }, confidence, isIncluded, isFocused, isForced, } = lessonKey;
    return (<span {...props} ref={Key.attach(lessonKey)} class={clsx(styles.lessonKey, size === "normal" && styles.lessonKeyNormal, size === "large" && styles.lessonKeyLarge, size === "announcement" && styles.lessonKeyAnnouncement, isIncluded ? styles.lessonKeyIncluded : styles.lessonKeyExcluded, isIncluded && confidence == null && styles.lessonKeyUncalibrated, isIncluded && isFocused && styles.lessonKeyFocused, isIncluded && isForced && styles.lessonKeyForced, isSelectable && styles.lessonKeySelectable, isCurrent && styles.lessonKeyCurrent)} style={keyStyles(true, confidence)} title={title} data-code-point={codePoint}>
      {label}
      {isIncluded || (<svg viewBox="0 0 100 100" class={styles.cross}>
          <path d="M 0 100 L 100 0"/>
        </svg>)}
    </span>);
};
const attachment = Symbol();
Key.attach = (key: LessonKey) => {
    return (target: Element | null): void => {
        if (target != null) {
            (target as any)[attachment] = key;
        }
    };
};
Key.attached = (target: Element | null): LessonKey | null => {
    return (target as any)?.[attachment] ?? null;
};
