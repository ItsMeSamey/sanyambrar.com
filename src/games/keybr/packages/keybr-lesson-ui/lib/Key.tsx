import { type LessonKey } from "@keybr/lesson";
import { type MouseProps } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./styles.module.css";
import { useKeyStyles } from "./styles.ts";
import { splitProps, mergeProps } from "solid-js";
export const Key = (solidAllProps: {
    lessonKey: LessonKey;
    isSelectable?: boolean;
    isCurrent?: boolean;
    size?: "normal" | "large" | "announcement";
    title?: string;
} & MouseProps) => {
    const solidMergedProps = mergeProps({ isSelectable: false, isCurrent: false, size: "normal" }, solidAllProps);
    const [solidLocal, props] = splitProps(solidMergedProps, ["lessonKey", "isSelectable", "isCurrent", "size", "title"]);
    const { keyStyles } = useKeyStyles();
    const { letter: { codePoint, label }, confidence, isIncluded, isFocused, isForced, } = solidLocal.lessonKey;
    return (<span {...props} ref={Key.attach(solidLocal.lessonKey)} class={clsx(styles.lessonKey, solidLocal.size === "normal" && styles.lessonKeyNormal, solidLocal.size === "large" && styles.lessonKeyLarge, solidLocal.size === "announcement" && styles.lessonKeyAnnouncement, isIncluded ? styles.lessonKeyIncluded : styles.lessonKeyExcluded, isIncluded && confidence == null && styles.lessonKeyUncalibrated, isIncluded && isFocused && styles.lessonKeyFocused, isIncluded && isForced && styles.lessonKeyForced, solidLocal.isSelectable && styles.lessonKeySelectable, solidLocal.isCurrent && styles.lessonKeyCurrent)} style={keyStyles(true, confidence)} title={solidLocal.title} data-code-point={codePoint}>
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
