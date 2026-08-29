import { LearningRate, type LessonKey, Target } from "@keybr/lesson";
import { timeToSpeed } from "@keybr/result";
import { useSettings } from "@keybr/settings";
import { Name, NameValue, Value } from "@keybr/widget";
import { clsx } from "@keybr/solid-compat/clsx";
import { useIntl } from "@keybr/solid-compat/intl";
import { useFormatter } from "./format.ts";
import { createMemo, Show } from "solid-js";
import { Happiness } from "./Happiness.tsx";
import * as styles from "./styles.module.css";
export const KeyDetails = (solidProps: {
    lessonKey: LessonKey;
}) => {
    const { formatMessage } = useIntl();
    const { formatSpeed, formatConfidence, formatLearningRate } = useFormatter();
    const { settings } = useSettings();
    const details = createMemo(() => {
        const { timeToType, bestTimeToType, confidence, bestConfidence } = solidProps.lessonKey;
        if (timeToType == null || bestTimeToType == null || confidence == null || bestConfidence == null) return null;
        const learningRate = LearningRate.from(solidProps.lessonKey.samples, new Target(settings))?.learningRate ?? null;
        return { timeToType, bestTimeToType, confidence, bestConfidence, learningRate };
    });
    return (<Show when={details()} keyed fallback={<span class={clsx(styles.keyDetails, styles.keyDetailsUncalibrated)}>
      {formatMessage({ id: "t_Not_calibrated_", defaultMessage: "Not calibrated, need more samples." })}
    </span>}>{({ timeToType, bestTimeToType, confidence, bestConfidence, learningRate }) => <span class={clsx(styles.keyDetails, styles.keyDetailsCalibrated)}>
        <NameValue name={<Name name={formatMessage({
                    id: "t_Last_speed",
                    defaultMessage: "Last speed",
                })}/>} value={<Value>
              {`${formatSpeed(timeToSpeed(timeToType))}`}
              {` (${formatConfidence(confidence)})`}
            </Value>}/>
        <NameValue name={<Name name={formatMessage({
                    id: "t_Top_speed",
                    defaultMessage: "Top speed",
                })}/>} value={<Value>
              {`${formatSpeed(timeToSpeed(bestTimeToType))}`}
              {` (${formatConfidence(bestConfidence)})`}
            </Value>}/>
        <NameValue name={<Name name={formatMessage({
                    id: "t_Learning_rate",
                    defaultMessage: "Learning rate",
                })}/>} value={<Value value={<>
                  {formatLearningRate(learningRate)}
                  {"\u00A0"}
                  <Happiness learningRate={learningRate ?? 0}/>
                </>} delta={learningRate ?? 0}/>}/>
      </span>}</Show>);
};
