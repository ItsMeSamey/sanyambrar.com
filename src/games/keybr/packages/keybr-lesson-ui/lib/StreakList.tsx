import { useIntlNumbers } from "@keybr/intl";
import { type StreakList as StreakListType } from "@keybr/result";
import { type ClassName, styleTextTruncate, Value } from "@keybr/widget";
import { FormattedMessage } from "@keybr/solid-compat/intl";
export const StreakList = ({ id, className, streakList, }: {
    id?: string;
    className?: ClassName;
    streakList: StreakListType;
}) => {
    const { formatPercents } = useIntlNumbers();
    const children = [];
    for (const { level, results } of streakList) {
        if (results.length > 0) {
            if (children.length > 0) {
                children.push(" ");
            }
            children.push(<FormattedMessage id="streakList.streakLength" defaultMessage="{length, plural, =1 {One lesson} other {# lessons}} with {accuracy} accuracy." values={{
                    length: results.length,
                    accuracy: <Value value={formatPercents(level)}/>,
                }}/>);
        }
    }
    if (children.length === 0) {
        children.push(<FormattedMessage id="streakList.noStreaks" defaultMessage="No accuracy streaks."/>);
    }
    return (<span id={id} class={className}>
      <span class={styleTextTruncate}>{...children}</span>
    </span>);
};
