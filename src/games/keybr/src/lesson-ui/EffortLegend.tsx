import { useIntlNumbers } from "../intl/numbers.ts";
import { FormattedMessage } from "../intl/runtime.tsx";
import { type Effort } from "./effort.ts";
import styles from "./EffortLegent.module.css";
export function EffortLegend(props: {
    effort: Effort;
}) {
    const { formatPercents } = useIntlNumbers();
    return (<>
      <FormattedMessage id="t_Daily_goal:" defaultMessage="Daily goal:"/>{" "}
      {[1.0, 0.75, 0.5, 0.25, 0.0].map((value) => (<span class={styles.cell}>
          <span class={styles.item} style={{ "background-color": String(props.effort.shade(value)), color: props.effort.textShade(value) }}>
            {formatPercents(value)}
          </span>
        </span>))}
    </>);
}
