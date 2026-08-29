import * as styles from "./ErrorReport.module.css";
export function ErrorReport(solidProps: {
    readonly report: string;
}) {
    return <pre class={styles.report}>{solidProps.report}</pre>;
}
