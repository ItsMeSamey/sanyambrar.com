import { mixColors, parseColor } from "@keybr/color";
import { useComputedStyles } from "@keybr/themes";
import { type CSSProperties, useMemo } from "@keybr/solid-compat/react";
export function useKeyStyles() {
    const computed = useComputedStyles();
    return useMemo(() => {
        const min = parseColor(computed.resolveColor("--slow-key-color", "#cc0000"));
        const max = parseColor(computed.resolveColor("--fast-key-color", "#60d788"));
        function confidenceColor(confidence: number) {
            return mixColors(min, max, confidence);
        }
        function keyStyles(isIncluded: boolean, confidence: number | null): CSSProperties {
            if (isIncluded && confidence != null) {
                return {
                    backgroundColor: String(confidenceColor(confidence)),
                };
            }
            else {
                return {};
            }
        }
        return { confidenceColor, keyStyles };
    }, [computed]);
}
