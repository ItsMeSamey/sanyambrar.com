import { type ReactNode, useMemo } from "react";
import { useLoader } from "./internal/loader.ts";
import { PersistentResultStorage } from "./internal/local.ts";
import { ResultProvider } from "./internal/ResultProvider.tsx";
import { wrapResultStorage } from "./internal/storage.ts";
import { type ResultStorage } from "./internal/types.ts";

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
    () => wrapResultStorage(new PersistentResultStorage()),
    [],
  );
}
