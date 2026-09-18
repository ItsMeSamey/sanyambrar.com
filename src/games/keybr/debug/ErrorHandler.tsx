import { Errored, Show, createEffect, createSignal, onSettled, type Accessor, type Component } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { Header } from "../widget/components/text/Header.tsx";
import { Para } from "../widget/components/text/Para.tsx";
import { ErrorReport } from "./ErrorReport.tsx";
import styles from "./ErrorHandler.module.css";
import { catchError, silentCatchError } from "./logger.ts";

function ErrorScreen(props: { readonly report: string }) {
  return <article class={styles.root}>
    <Header level={1}>Error</Header>
    <Para>Oh no, something bad has happened!</Para>
    <ErrorReport report={props.report}/>
  </article>;
}

type Props = {
  readonly children?: JSX.Element;
  readonly display?: Component<{ readonly report: string }>;
};

export function ErrorHandler(props: Props): JSX.Element {
  const [report, setReport] = createSignal<string | null>(null);
  onSettled(() => {
    catchError.addHandler(setReport);
    return () => catchError.deleteHandler(setReport);
  });
  const Display = props.display ?? ErrorScreen;
  const BoundaryReport = (props: { error: Accessor<unknown> }) => {
    createEffect(props.error, error => { silentCatchError(error); });
    return <Display report={String(props.error())} />;
  };
  return (
    <Show when={report()} fallback={
      <Errored fallback={error => <BoundaryReport error={error} />}>
        {props.children}
      </Errored>
    }>
      {(value) => <Display report={value()} />}
    </Show>
  );
}
