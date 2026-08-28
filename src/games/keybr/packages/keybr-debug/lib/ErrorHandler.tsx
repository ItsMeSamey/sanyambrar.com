import { ErrorBoundary, Show, createSignal, onCleanup, onMount, type Component, type JSX } from "solid-js";
import { ErrorScreen } from "./ErrorScreen.tsx";
import { catchError, silentCatchError } from "./logger.ts";

type Props = {
  readonly children?: JSX.Element;
  readonly display?: Component<{ readonly report: string }>;
};

export function ErrorHandler(props: Props): JSX.Element {
  const [report, setReport] = createSignal<string | null>(null);
  onMount(() => catchError.addHandler(setReport));
  onCleanup(() => catchError.deleteHandler(setReport));
  const Display = props.display ?? ErrorScreen;
  return (
    <Show when={report()} fallback={
      <ErrorBoundary fallback={(error) => {
        silentCatchError(error instanceof Error ? error : new Error(String(error)));
        return <Display report={String(error)} />;
      }}>
        {props.children}
      </ErrorBoundary>
    }>
      {(value) => <Display report={value()} />}
    </Show>
  );
}
