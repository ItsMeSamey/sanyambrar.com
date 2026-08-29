import { useIntlNumbers } from "@keybr/intl";
import { type LearningRate, type LessonKey } from "@keybr/lesson";
import { Name, Para, Value } from "@keybr/widget";
import { type ReactNode } from "@keybr/solid-compat/react";
import { FormattedMessage } from "@keybr/solid-compat/intl";
export function LearningRateDescription(solidProps: {
    readonly lessonKey: LessonKey;
    readonly learningRate: LearningRate | null;
}): ReactNode {
    const { formatNumber, formatPercents } = useIntlNumbers();
    const content = () => {
        if ((solidProps.lessonKey.bestConfidence ?? 0) >= 1) {
            return (<Para align="center"><Name><FormattedMessage id="learningRate.alreadyUnlocked" defaultMessage="This letter is already unlocked."/></Name></Para>);
        }
        const rate = solidProps.learningRate;
        if (rate != null && rate.remainingLessons > 0 && rate.certainty > 0) {
            return (<Para align="center"><Name><FormattedMessage id="learningRate.remainingLessons" defaultMessage={"Approximately {remainingLessons} lessons remaining to " + "unlock the next letter ({certainty} certainty)."} values={{
                remainingLessons: <Value value={formatNumber(rate.remainingLessons)}/>,
                certainty: <Value value={formatPercents(rate.certainty)}/>,
            }}/></Name></Para>);
        }
        return (<Para align="center"><Name><FormattedMessage id="learningRate.unknown" defaultMessage="Need more data to compute the remaining lessons to unlock this letter."/></Name></Para>);
    };
    return <>{content()}</>;
}
