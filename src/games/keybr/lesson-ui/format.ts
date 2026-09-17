import { useIntlNumbers } from "../intl/numbers.ts";
import { SpeedUnit } from "../result/speedunit.ts";
import { uiProps } from "../result/settings.ts";
import { useSettings } from "../settings/context.ts";
import { useIntl } from "../intl/runtime.tsx";
export type FormatterOptions = {
    readonly unit?: boolean;
};
export type Formatter = {
    readonly formatSpeed: (value: number, options?: FormatterOptions) => string;
    readonly formatConfidence: (value: number | null) => string;
    readonly formatLearningRate: (lr: number | null) => string;
};
export const useFormatter = (): Formatter => {
    const { formatMessage } = useIntl();
    const { formatNumber, formatPercents } = useIntlNumbers();
    const { settings } = useSettings();
    const f1 = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
    const f2 = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    const formatSpeed = (value: number, { unit = true }: FormatterOptions = {}): string => {
        const speedUnit = settings.get(uiProps.speedUnit);
        const opts = speedUnit === SpeedUnit.WPS || speedUnit === SpeedUnit.CPS ? f2 : f1;
        const text = formatNumber(speedUnit.measure(value), opts);
        return unit ? text + speedUnit.id : text;
    };
    const formatConfidence = (confidence: number | null): string => confidence != null
        ? formatPercents(confidence, 0)
        : formatMessage({ id: "t_Uncertain", defaultMessage: "Uncertain" });
    const formatLearningRate = (lr: number | null): string => lr != null && lr === lr
        ? signed(formatMessage({ id: "t_Value_per_lesson", defaultMessage: "{value}/lesson" }, { value: formatSpeed(lr) }), lr)
        : formatMessage({ id: "t_Uncertain", defaultMessage: "Uncertain" });
    return { formatSpeed, formatConfidence, formatLearningRate };
};
function signed(value: string, learningRate: number) {
    return learningRate > 0 ? `+${value}` : `${value}`;
}
