import { mixColors, parseColor } from "@keybr/color";
import { useComputedStyles } from "@keybr/themes";
import { type CSSProperties, useMemo } from "@keybr/solid-compat/react";
export function useKeyStyles() {
    const computed = useComputedStyles();
    return useMemo(() => {
        const min = parseColor(computed.resolveColor("--slow-key-background-color", "#f0caca"));
        const max = parseColor(computed.resolveColor("--fast-key-background-color", "#cce8d5"));
        function confidenceColor(confidence: number) {
            return mixColors(min, max, confidence);
        }
        function keyStyles(isIncluded: boolean, confidence: number | null): CSSProperties {
            if (isIncluded && confidence != null) {
                return {
                    "background-color": String(confidenceColor(confidence)),
                };
            }
            else {
                return {};
            }
        }
        return { confidenceColor, keyStyles };
    }, [computed]);
}
