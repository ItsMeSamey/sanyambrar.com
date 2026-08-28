import { createContext, useContext } from "solid-js";
import { type Result } from "./result.ts";

export type ResultContextProps = {
  readonly results: readonly Result[];
  readonly appendResults: (newResults: readonly Result[]) => void;
  readonly clearResults: () => void;
};

export const ResultContext = createContext<ResultContextProps>();

export function useResults(): ResultContextProps {
  const value = useContext(ResultContext);
  if (value == null) {
    throw new Error(process.env.NODE_ENV !== "production" ? "ResultContext is missing" : undefined);
  }
  return value;
}
