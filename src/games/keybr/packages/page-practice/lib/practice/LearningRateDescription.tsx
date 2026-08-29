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
    if ((solidProps.lessonKey.bestConfidence ?? 0) >= 1) {
        return (<Para align="center">
        <Name>
          <FormattedMessage id="learningRate.alreadyUnlocked" defaultMessage="This letter is already unlocked."/>
        </Name>
      </Para>);
    }
    if (solidProps.learningRate != null &&
        solidProps.learningRate.remainingLessons > 0 &&
        solidProps.learningRate.certainty > 0) {
        return (<Para align="center">
        <Name>
          <FormattedMessage id="learningRate.remainingLessons" defaultMessage={"Approximately {remainingLessons} lessons remaining to " +
                "unlock the next letter ({certainty} certainty)."} values={{
                remainingLessons: (<Value value={formatNumber(solidProps.learningRate.remainingLessons)}/>),
                certainty: (<Value value={formatPercents(solidProps.learningRate.certainty)}/>),
            }}/>
        </Name>
      </Para>);
    }
    return (<Para align="center">
      <Name>
        <FormattedMessage id="learningRate.unknown" defaultMessage="Need more data to compute the remaining lessons to unlock this letter."/>
      </Name>
    </Para>);
}
