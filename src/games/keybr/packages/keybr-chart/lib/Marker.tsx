import { type ReactNode } from "@keybr/solid-compat/react";
import * as styles from "./Marker.module.css";
type Props = {
    readonly type: "slow" | "fast" | "speed" | "accuracy" | "complexity" | "threshold" | "histogram-h" | "histogram-m" | "histogram-r";
};
export function Marker(solidProps: Props): ReactNode {
    let cn;
    switch (solidProps.type) {
        case "slow":
            cn = styles.slow;
            break;
        case "fast":
            cn = styles.fast;
            break;
        case "speed":
            cn = styles.speed;
            break;
        case "accuracy":
            cn = styles.accuracy;
            break;
        case "complexity":
            cn = styles.complexity;
            break;
        case "threshold":
            cn = styles.threshold;
            break;
        case "histogram-h":
            cn = styles.histogramH;
            break;
        case "histogram-m":
            cn = styles.histogramM;
            break;
        case "histogram-r":
            cn = styles.histogramR;
            break;
    }
    return <span class={cn}>{"\u00A0"}</span>;
}
