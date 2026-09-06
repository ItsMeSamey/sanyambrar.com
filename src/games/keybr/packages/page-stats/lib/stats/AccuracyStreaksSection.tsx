import { useIntlNumbers } from "@keybr/intl";
import { useFormatter } from "@keybr/lesson-ui";
import { makeSummaryStats, MutableStreakList, type Result, type Streak, } from "@keybr/result";
import { Explainer, Figure, NameValue, Para } from "@keybr/widget";
import { FormattedMessage, useIntl } from "@keybr/solid-compat/intl";
import { createMemo, For, Show } from 'solid-js';
export function AccuracyStreaksSection(solidProps: {
    results: readonly Result[];
}) {
    const streaks = createMemo(() => MutableStreakList.findLongest(solidProps.results));
    return (<Figure>
      <Figure.Caption>
        <FormattedMessage id="stats.accuracy.header" defaultMessage="Accuracy Streaks"/>
      </Figure.Caption>

      <Show when={streaks().length > 0} fallback={<Para align="center">
          <FormattedMessage id="stats.accuracy.noData" defaultMessage="You don’t have any accuracy streaks. Consider completing a lesson with a highest accuracy possible, regardless of typing speed."/>
        </Para>}>
        <dl>
          <For each={streaks()}>{(streak) => <StreakDetails streak={streak}/>}</For>
        </dl>
      </Show>

      <Explainer>
        <Figure.Description>
          <FormattedMessage id="stats.accuracy.legend" defaultMessage="Above are listed the longest continuous sequences of lessons with accuracy above a given threshold, along with statistics about every such sequence. The longer the sequence of lessons, the better."/>
        </Figure.Description>
      </Explainer>
    </Figure>);
}
function StreakDetails(solidProps: {
    streak: Streak;
}) {
    const { formatMessage, formatDate } = useIntl();
    const { formatNumber, formatPercents } = useIntlNumbers();
    const { formatSpeed } = useFormatter();
    const results = () => solidProps.streak.results;
    const characterCount = createMemo(() => results().reduce((x, { length }) => length + x, 0));
    const stats = createMemo(() => makeSummaryStats(results()));
    return (<>
      <dt>
        <NameValue name={formatMessage({
            id: "t_Accuracy_threshold",
            defaultMessage: "Accuracy threshold",
        })} value={formatPercents(solidProps.streak.level)}/>
      </dt>
      <dd>
        <NameValue name={formatMessage({
            id: "t_num_Lessons",
            defaultMessage: "Lessons",
        })} value={formatNumber(results().length)}/>
        <NameValue name={formatMessage({
            id: "t_num_Characters",
            defaultMessage: "Characters",
        })} value={formatNumber(characterCount())}/>
        <NameValue name={formatMessage({
            id: "t_Top_speed",
            defaultMessage: "Top speed",
        })} value={formatSpeed(stats().speed.max)}/>
        <NameValue name={formatMessage({
            id: "t_Average_speed",
            defaultMessage: "Average speed",
        })} value={formatSpeed(stats().speed.avg)}/>
        <NameValue name={formatMessage({
            id: "t_Start_date",
            defaultMessage: "Start date",
        })} value={formatDate(results()[0].timeStamp, {
            dateStyle: "short",
            timeStyle: "short",
        })}/>
      </dd>
    </>);
}
