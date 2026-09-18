import type { JSX } from "@solidjs/web";
import { KeyDetailsChart } from "../chart/KeyDetailsChart.tsx";
import { LearningRate } from "../lesson/learningrate.ts";
import { type LessonKey } from "../lesson/key.ts";
import { Target } from "../lesson/target.ts";
import { Key } from "../lesson-ui/Key.tsx";
import { KeyDetails } from "../lesson-ui/KeyDetails.tsx";
import { type KeyStats } from "../result/keystats.ts";
import { useSettings } from "../settings/context.ts";

import styles from "./KeyExtendedDetails.module.css";
import { useIntlNumbers } from "../intl/numbers.ts";
import { FormattedMessage } from "../intl/runtime.tsx";
import { Name, Value } from "../widget/components/text/NameValue.tsx";
import { Para } from "../widget/components/text/Para.tsx";
export function KeyExtendedDetails(props: {
    readonly lessonKey: LessonKey;
    readonly keyStats: KeyStats;
}): JSX.Element {
    const { settings } = useSettings();
    const learningRate = () => LearningRate.from(props.keyStats.samples, new Target(settings));
    return (<div class={styles.root}>
      <div class={styles.summary}>
        <Key lessonKey={props.lessonKey} size="large"/>
        <KeyDetails lessonKey={props.lessonKey}/>
      </div>
      <LearningRateDescription lessonKey={props.lessonKey} learningRate={learningRate()}/>
      <KeyDetailsChart lessonKey={props.lessonKey} learningRate={learningRate()} width="50rem" height="15rem"/>
    </div>);
}

function LearningRateDescription(props: {
  readonly lessonKey: LessonKey;
  readonly learningRate: LearningRate | null;
}): JSX.Element {
  const { formatNumber, formatPercents } = useIntlNumbers();
  if ((props.lessonKey.bestConfidence ?? 0) >= 1) {
    return <Para align="center"><Name><FormattedMessage id="learningRate.alreadyUnlocked" defaultMessage="This letter is already unlocked."/></Name></Para>;
  }
  const rate = props.learningRate;
  if (rate != null && rate.remainingLessons > 0 && rate.certainty > 0) {
    return <Para align="center"><Name><FormattedMessage
      id="learningRate.remainingLessons"
      defaultMessage={"Approximately {remainingLessons} lessons remaining to unlock the next letter ({certainty} certainty)."}
      values={{
        remainingLessons: <Value value={formatNumber(rate.remainingLessons)}/>,
        certainty: <Value value={formatPercents(rate.certainty)}/>,
      }}
    /></Name></Para>;
  }
  return <Para align="center"><Name><FormattedMessage id="learningRate.unknown" defaultMessage="Need more data to compute the remaining lessons to unlock this letter."/></Name></Para>;
}
