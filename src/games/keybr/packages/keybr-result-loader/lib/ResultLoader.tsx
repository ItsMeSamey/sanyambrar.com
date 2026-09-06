import { catchError } from "@keybr/debug";
import { createMemo, Loading, Show } from 'solid-js';
import { type JSX } from '@solidjs/web';
import { ResultProvider } from "./internal/ResultProvider.tsx";
import { createResultStorage, type ResultStorage } from "./internal/storage.ts";

export function ResultLoader(props: { readonly children: JSX.Element; readonly fallback?: JSX.Element }) {
  const storage = createMemo<ResultStorage>(() => createResultStorage());
  const results = createMemo(() => storage().load().catch(error => {
    catchError(error);
    return [];
  }));
  return <Loading fallback={props.fallback ?? null}>
    <Show keyed when={results()}>{value =>
      <ResultProvider storage={storage()} initialResults={value}>{props.children}</ResultProvider>
    }</Show>
  </Loading>;
}
