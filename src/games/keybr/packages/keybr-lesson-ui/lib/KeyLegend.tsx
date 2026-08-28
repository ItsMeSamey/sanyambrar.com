import { type MouseProps } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./styles.module.css";
import { useKeyStyles } from "./styles.ts";
export const KeyLegend = ({ confidence, isIncluded, isFocused, isForced, size = "normal", title, ...props }: {
    confidence: number | null;
    isIncluded: boolean;
    isFocused: boolean;
    isForced: boolean;
    size?: "normal" | "large";
    title?: string;
} & MouseProps) => {
    const { keyStyles } = useKeyStyles();
    return (<span {...props} class={clsx(styles.lessonKey, size === "normal" && styles.lessonKeyNormal, size === "large" && styles.lessonKeyLarge, isIncluded ? styles.lessonKeyIncluded : styles.lessonKeyExcluded, isIncluded && confidence == null && styles.lessonKeyUncalibrated, isIncluded && isFocused && styles.lessonKeyFocused, isIncluded && isForced && styles.lessonKeyForced)} style={keyStyles(isIncluded ?? false, confidence ?? null)} title={title}>
      ?
      {isIncluded || (<svg viewBox="0 0 100 100" class={styles.cross}>
          <path d="M 0 100 L 100 0"/>
        </svg>)}
    </span>);
};
