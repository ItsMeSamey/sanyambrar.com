import { Header } from "../widget/components/text/Header.tsx";
import { Para } from "../widget/components/text/Para.tsx";
import { ErrorReport } from "./ErrorReport.tsx";
import styles from "./ErrorScreen.module.css";

export function ErrorScreen(props: { readonly report: string }) {
  return (
    <article class={styles.root}>
      <Header level={1}>Error</Header>

      <Para>Oh no, something bad has happened!</Para>

      <ErrorReport report={props.report} />
    </article>
  );
}
