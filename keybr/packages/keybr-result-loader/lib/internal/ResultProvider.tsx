import { type Result, ResultContext } from "@keybr/result";
import { type ReactNode, useRef, useState } from "react";
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
  const results = useRef<Result[]>([...initialResults]);
  const [revision, setRevision] = useState(0);
  return (
    <ResultContext.Provider
      value={{
        results: results.current,
        revision,
        appendResults: (newResults) => {
          for (const result of newResults) {
            results.current.push(result);
          }
          setRevision((revision) => revision + 1);
          storage.append(newResults).catch(catchError);
        },
        clearResults: () => {
          results.current = [];
          setRevision((revision) => revision + 1);
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
