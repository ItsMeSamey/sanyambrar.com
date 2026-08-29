import { useIntlNumbers } from "@keybr/intl";
import { FormattedMessage } from "@keybr/solid-compat/intl";
import { type Effort } from "./effort.ts";
import * as styles from "./EffortLegent.module.css";
export function EffortLegend(solidProps: {
    effort: Effort;
}) {
    const { formatPercents } = useIntlNumbers();
    return (<>
      <FormattedMessage id="t_Daily_goal:" defaultMessage="Daily goal:"/>{" "}
      {[1.0, 0.75, 0.5, 0.25, 0.0].map((value) => (<span class={styles.cell}>
          <span class={styles.item} style={{ "background-color": String(solidProps.effort.shade(value)) }}>
            {formatPercents(value)}
          </span>
        </span>))}
    </>);
}
