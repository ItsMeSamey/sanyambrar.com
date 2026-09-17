import { type MouseProps } from "@keybr/widget";
import { clsx } from "clsx";
import * as styles from "./styles.module.css";
import { useKeyStyles } from "./styles.ts";
import { omit, merge } from 'solid-js';
export const KeyLegend = (allProps: {
    confidence: number | null;
    isIncluded: boolean;
    isFocused: boolean;
    isForced: boolean;
    size?: "normal" | "large";
    title?: string;
} & MouseProps) => {
    const mergedProps = merge(allProps, { get size() { return allProps.size ?? "normal"; } });
    const local = mergedProps, props = omit(mergedProps, "confidence", "isIncluded", "isFocused", "isForced", "size", "title");
    const keyStyles = useKeyStyles();
    return (<span {...props} class={clsx(styles.lessonKey, local.size === "normal" && styles.lessonKeyNormal, local.size === "large" && styles.lessonKeyLarge, local.isIncluded ? styles.lessonKeyIncluded : styles.lessonKeyExcluded, local.isIncluded && local.confidence == null && styles.lessonKeyUncalibrated, local.isIncluded && local.isFocused && styles.lessonKeyFocused, local.isIncluded && local.isForced && styles.lessonKeyForced)} style={keyStyles().keyStyles(local.isIncluded ?? false, local.confidence ?? null)} title={local.title}>
      ?
      {local.isIncluded || (<svg viewBox="0 0 100 100" class={styles.cross}>
          <path d="M 0 100 L 100 0"/>
        </svg>)}
    </span>);
};
