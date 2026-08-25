import { type Result, ResultContext } from "@keybr/result";
import { type ReactNode, useState } from "react";
import { ErrorAlert } from "@keybr/debug";
import { type ResultStorage } from "./storage.ts";

export function ResultProvider({
  storage,
  initialResults,
  children,
}: {
  readonly storage: ResultStorage;
  readonly initialResults: readonly Result[];
  readonly children: ReactNode;
}): ReactNode {
  const [results, setResults] = useState(initialResults);
  return (
    <ResultContext.Provider
      value={{
        results,
        appendResults: (newResults) => {
          setResults([...results, ...newResults]);
          storage.append(newResults).catch(catchError);
        },
        clearResults: () => {
          setResults([]);
          storage.clear().catch(catchError);
        },
      }}
    >
      {children}
    </ResultContext.Provider>
  );
}

function catchError(error: unknown) {
  console.error(error);
  ErrorAlert.toast(
    <>
      <p>Could not access local typing history.</p>
      <p>Check that this browser allows local site storage.</p>
    </>,
    error,
  );
}
