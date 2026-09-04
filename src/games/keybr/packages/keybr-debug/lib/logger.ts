import { formatReport, inspectError } from "./inspect.ts";

type Handler = (report: string) => void;

const handlers = new Set<Handler>();

export function catchError(error: unknown) {
  console.error(error);
  silentCatchError(error);
}

export function silentCatchError(error: unknown) {
  const report = formatReport(inspectError(error));
  for (const handler of handlers) {
    try {
      handler(report);
    } catch (tmp: unknown) {
      console.error(tmp);
    }
  }
}

catchError.addHandler = (handler: Handler) => {
  handlers.add(handler);
};

catchError.deleteHandler = (handler: Handler) => {
  handlers.delete(handler);
};
