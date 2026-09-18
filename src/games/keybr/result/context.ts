import { type Accessor, createContext, useContext } from 'solid-js';
import { type Result } from "./result.ts";

 type ResultContextProps = {
  readonly results: Accessor<readonly Result[]>;
  readonly appendResults: (newResults: readonly Result[]) => void;
  readonly clearResults: () => void;
};

export const ResultContext = createContext<ResultContextProps>();

export function useResults(): ResultContextProps {
  const value = useContext(ResultContext);
  if (value == null) {
    throw new Error(import.meta.env.MODE !== "production" ? "ResultContext is missing" : undefined);
  }
  return value;
}
