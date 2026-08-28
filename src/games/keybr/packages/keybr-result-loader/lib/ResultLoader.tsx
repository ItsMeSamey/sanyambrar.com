import { catchError } from "@keybr/debug";
import { type Result } from "@keybr/result";
import { createEffect, createMemo, createSignal, onCleanup, Show, type JSX } from "solid-js";
import { ResultProvider } from "./internal/ResultProvider.tsx";
import { createResultStorage, type ResultStorage } from "./internal/storage.ts";

export function ResultLoader(props: { readonly children: JSX.Element; readonly fallback?: JSX.Element }) {
  const storage = createMemo<ResultStorage>(() => createResultStorage());
  const [state, setState] = createSignal<{ type: "loading" } | { type: "ready"; results: readonly Result[] }>({ type: "loading" });
  createEffect(() => {
    const target = storage();
    let cancelled = false;
    target.load().then(results => { if (!cancelled) setState({ type: "ready", results }); }).catch(error => {
      catchError(error);
      if (!cancelled) setState({ type: "ready", results: [] });
    });
    onCleanup(() => { cancelled = true; });
  });
  return <Show when={state().type === "ready" ? state() as { type:"ready"; results:readonly Result[] } : null} fallback={props.fallback ?? null}>
    {(ready) => <ResultProvider storage={storage()} initialResults={ready().results}>{props.children}</ResultProvider>}
  </Show>;
}
