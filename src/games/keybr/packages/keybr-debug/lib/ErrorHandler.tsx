import { Errored, Show, createEffect, createSignal, onSettled, type Accessor, type Component } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { ErrorScreen } from "./ErrorScreen.tsx";
import { catchError, silentCatchError } from "./logger.ts";

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
