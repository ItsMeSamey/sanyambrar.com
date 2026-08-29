import { type MouseProps } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import * as styles from "./styles.module.css";
import { useKeyStyles } from "./styles.ts";
import { splitProps, mergeProps } from "solid-js";
export const KeyLegend = (solidAllProps: {
    confidence: number | null;
    isIncluded: boolean;
    isFocused: boolean;
    isForced: boolean;
    size?: "normal" | "large";
    title?: string;
} & MouseProps) => {
    const solidMergedProps = mergeProps({ size: "normal" }, solidAllProps);
    const [solidLocal, props] = splitProps(solidMergedProps, ["confidence", "isIncluded", "isFocused", "isForced", "size", "title"]);
    const { keyStyles } = useKeyStyles();
    return (<span {...props} class={clsx(styles.lessonKey, solidLocal.size === "normal" && styles.lessonKeyNormal, solidLocal.size === "large" && styles.lessonKeyLarge, solidLocal.isIncluded ? styles.lessonKeyIncluded : styles.lessonKeyExcluded, solidLocal.isIncluded && solidLocal.confidence == null && styles.lessonKeyUncalibrated, solidLocal.isIncluded && solidLocal.isFocused && styles.lessonKeyFocused, solidLocal.isIncluded && solidLocal.isForced && styles.lessonKeyForced)} style={keyStyles(solidLocal.isIncluded ?? false, solidLocal.confidence ?? null)} title={solidLocal.title}>
      ?
      {solidLocal.isIncluded || (<svg viewBox="0 0 100 100" class={styles.cross}>
          <path d="M 0 100 L 100 0"/>
        </svg>)}
    </span>);
};
