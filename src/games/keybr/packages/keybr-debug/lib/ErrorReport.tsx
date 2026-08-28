import * as styles from "./ErrorReport.module.css";
export function ErrorReport({ report }: {
    readonly report: string;
}) {
    return <pre class={styles.report}>{report}</pre>;
}
