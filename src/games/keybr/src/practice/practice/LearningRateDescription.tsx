import type { JSX } from "@solidjs/web";
import { useIntlNumbers } from "../../intl/numbers.ts";
import { type LearningRate } from "../../lesson/learningrate.ts";
import { type LessonKey } from "../../lesson/key.ts";
import { Name, Value } from "../../widget/components/text/NameValue.tsx";
import { Para } from "../../widget/components/text/Para.tsx";

import { FormattedMessage } from "../../intl/runtime.tsx";
export function LearningRateDescription(props: {
    readonly lessonKey: LessonKey;
    readonly learningRate: LearningRate | null;
}): JSX.Element {
    const { formatNumber, formatPercents } = useIntlNumbers();
    const content = () => {
        if ((props.lessonKey.bestConfidence ?? 0) >= 1) {
            return (<Para align="center"><Name><FormattedMessage id="learningRate.alreadyUnlocked" defaultMessage="This letter is already unlocked."/></Name></Para>);
        }
        const rate = props.learningRate;
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
