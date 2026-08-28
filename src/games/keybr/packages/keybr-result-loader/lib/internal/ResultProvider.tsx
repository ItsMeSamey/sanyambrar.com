import { ErrorAlert } from "@keybr/debug";
import { type Result, ResultContext } from "@keybr/result";
import { liveArray } from "@keybr/solid-compat/live";
import { createSignal, type JSX } from "solid-js";
import { type ResultStorage } from "./storage.ts";

export function ResultProvider(props: {
  readonly storage: ResultStorage;
  readonly initialResults: readonly Result[];
  readonly children: JSX.Element;
}) {
  const [results, setResults] = createSignal<readonly Result[]>(props.initialResults, { equals: false });
  const liveResults = liveArray(results);
  const value = {
    results: liveResults,
    appendResults(newResults: readonly Result[]) {
      setResults((current) => [...current, ...newResults]);
      props.storage.append(newResults).catch(catchError);
    },
    clearResults() {
      setResults([]);
      props.storage.clear().catch(catchError);
    },
  };
  return <ResultContext.Provider value={value}>{props.children}</ResultContext.Provider>;
}

function catchError(error: unknown) {
  console.error(error);
  ErrorAlert.toast(<>
    <p>Could not access local typing history.</p>
    <p>Check that this browser allows local site storage.</p>
  </>, error);
}
