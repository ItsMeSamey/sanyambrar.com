import styles from "./ErrorReport.module.css";
export function ErrorReport(props: {
    readonly report: string;
}) {
    return <pre class={styles.report}>{props.report}</pre>;
}
