import { recoverResults, Result } from "@keybr/result";
import { type ProgressListener, type ResultStorage } from "./types.ts";

export function wrapResultStorage(storage: ResultStorage): ResultStorage {
  return validateResults(storage);
}

function validateResults(storage: ResultStorage): ResultStorage {
  return new (class implements ResultStorage {
    async load(pl?: ProgressListener): Promise<Result[]> {
      return recoverResults(await storage.load(pl));
    }

    async append(
      results: readonly Result[],
      pl?: ProgressListener,
    ): Promise<void> {
      const valid = results.filter(Result.isValid);
      if (valid.length > 0) {
        await storage.append(valid, pl);
      }
    }

    async clear(): Promise<void> {
      await storage.clear();
    }
  })();
}
