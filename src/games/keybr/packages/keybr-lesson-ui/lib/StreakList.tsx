import { useIntlNumbers } from "@keybr/intl";
import { type StreakList as StreakListType } from "@keybr/result";
import { type ClassName, styleTextTruncate, Value } from "@keybr/widget";
import { FormattedMessage } from "@keybr/solid-compat/intl";
export const StreakList = (solidProps: {
    id?: string;
    className?: ClassName;
    streakList: StreakListType;
}) => {
    const { formatPercents } = useIntlNumbers();
    const children = () => {
        const items = [];
        for (const { level, results } of solidProps.streakList) {
            if (results.length > 0) {
                if (items.length > 0) items.push(" ");
                items.push(<FormattedMessage id="streakList.streakLength" defaultMessage="{length, plural, =1 {One lesson} other {# lessons}} with {accuracy} accuracy." values={{
                    length: results.length,
                    accuracy: <Value value={formatPercents(level)}/>,
                }}/>);
            }
        }
        if (items.length === 0) items.push(<FormattedMessage id="streakList.noStreaks" defaultMessage="No accuracy streaks."/>);
        return items;
    };
    return (<span id={solidProps.id} class={solidProps.className}>
      <span class={styleTextTruncate}>{children()}</span>
    </span>);
};
