import { useComputedStyles } from "@keybr/themes";
import { useMemo } from "@keybr/solid-compat/react";
import * as styles from "./styles.module.css";
export type ChartStyles = ReturnType<typeof useChartStyles>;
export function useChartStyles() {
    const { computeStyle, computeLineHeight } = useComputedStyles();
    return useMemo(() => {
        return {
            frame: computeStyle(styles.frame),
            headerText: computeStyle(styles.headerText),
            subheaderText: computeStyle(styles.subheaderText),
            keyLabel: computeStyle(styles.value, styles.keyFont),
            value: computeStyle(styles.value),
            valueLabel: computeStyle(styles.value, styles.valueFont),
            threshold: computeStyle(styles.threshold),
            thresholdLabel: computeStyle(styles.threshold, styles.valueFont),
            complexity: computeStyle(styles.complexity),
            accuracy: computeStyle(styles.accuracy),
            speed: computeStyle(styles.speed),
            histHit: computeStyle(styles.histH),
            histMiss: computeStyle(styles.histM),
            histRatio: computeStyle(styles.histR),
            lineHeight: computeLineHeight(null),
        };
    }, [computeStyle, computeLineHeight]);
}
