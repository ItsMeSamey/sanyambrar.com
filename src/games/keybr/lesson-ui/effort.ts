import { type Color } from "../color/color.ts";
import { parseColor } from "../color/parse.ts";
import { MutableDailyGoal } from "../lesson/dailygoal.ts";
import { useSettings } from "../settings/context.ts";
import { useComputedStyles } from "../themes/use-computed-styles.ts";
import { createMemo, type Accessor } from "solid-js";
import { contrastTextRgb, type ContrastText } from "../../../shared/contrast.ts";
export type Effort = {
    readonly effort: (time: number) => number;
    readonly shade: (effort: number) => Color;
    readonly textShade: (effort: number) => ContrastText;
};

export function useEffort(): Accessor<Effort> {
    const { settings } = useSettings();
    const computed = useComputedStyles();
    return createMemo(() => {
        const color = parseColor(computed.resolveColor("--effort-color", "#000000"));
        const background = parseColor(computed.resolveColor("--Calendar-cell--background-color", "#ffffff"));
        const dailyGoal = new MutableDailyGoal(settings);
        const effort = (time: number) => {
            return dailyGoal.goal > 0 ? dailyGoal.measure(time) : 1.0;
        };
        const shade = (effort: number) => color.fade(effort);
        const textShade = (effort: number) => {
            const fg = shade(effort).toRgb(), bg = background.toRgb(), alpha = fg.alpha;
            return contrastTextRgb(fg.r * alpha + bg.r * (1 - alpha), fg.g * alpha + bg.g * (1 - alpha), fg.b * alpha + bg.b * (1 - alpha));
        };
        return { effort, shade, textShade };
    });
}
