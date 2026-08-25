import { type ReactNode, useEffect, useMemo, useState } from "react";
import { catchError } from "@keybr/debug";
import { type Result } from "@keybr/result";
import { ResultProvider } from "./internal/ResultProvider.tsx";
import { createResultStorage, type ResultStorage } from "./internal/storage.ts";

export function ResultLoader({
  children,
  fallback = null,
}: {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}): ReactNode {
  const storage = useResultStorage();
  const state = useLoader(storage);
  if (state.type === "loading") {
    return fallback;
  }
  return (
    <ResultProvider storage={storage} initialResults={state.results}>
      {children}
    </ResultProvider>
  );
}

function useResultStorage(): ResultStorage {
  return useMemo(
    () => createResultStorage(),
    [],
  );
}

function useLoader(storage: ResultStorage): { readonly type: "loading" } | { readonly type: "ready"; readonly results: readonly Result[] } {
  const [state, setState] = useState<{ readonly type: "loading" } | { readonly type: "ready"; readonly results: readonly Result[] }>({ type: "loading" });
  useEffect(() => {
    let cancelled = false;
    storage.load().then((results) => { if (!cancelled) setState({ type: "ready", results }); }).catch(catchError);
    return () => { cancelled = true; };
  }, [storage]);
  return state;
}
