import { ErrorAlert, catchError } from "@keybr/debug";
import { createMemo, createSignal, Loading, Show } from "solid-js";
import { type JSX } from "@solidjs/web";
import { ResultContext } from "./context.ts";
import { resultFromJson, resultToJson } from "./json.ts";
import { recoverResults } from "./recover.ts";
import { Result } from "./result.ts";

type ResultStorage = {
  load(): Promise<Result[]>;
  append(results: readonly Result[]): Promise<void>;
  clear(): Promise<void>;
};

export function ResultLoader(props: { readonly children: JSX.Element; readonly fallback?: JSX.Element }) {
  const storage = createMemo<ResultStorage>(() => createResultStorage());
  const results = createMemo(() => storage().load().catch(error => {
    catchError(error);
    return [];
  }));
  return <Loading fallback={props.fallback ?? null}>
    <Show keyed when={results()}>{value =>
      <ResultProvider storage={storage()} initialResults={value}>{props.children}</ResultProvider>
    }</Show>
  </Loading>;
}

function ResultProvider(props: {
  readonly storage: ResultStorage;
  readonly initialResults: readonly Result[];
  readonly children: JSX.Element;
}) {
  const [results, setResults] = createSignal<readonly Result[]>(props.initialResults, { equals: false });
  const value = {
    results,
    appendResults(newResults: readonly Result[]) {
      setResults(current => [...current, ...newResults]);
      props.storage.append(newResults).catch(reportStorageError);
    },
    clearResults() {
      setResults([]);
      props.storage.clear().catch(reportStorageError);
    },
  };
  return <ResultContext value={value}>{props.children}</ResultContext>;
}

function reportStorageError(error: unknown) {
  console.error(error);
  ErrorAlert.toast(<>
    <p>Could not access local typing history.</p>
    <p>Check that this browser allows local site storage.</p>
  </>, error);
}

function createResultStorage(): ResultStorage {
  const local = new PersistentResultStorage();
  let pending = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    const next = pending.then(task, task);
    pending = next.catch(() => {});
    return next;
  };
  return {
    async load() { return recoverResults(await local.load()); },
    async append(results) {
      const valid = results.filter(Result.isValid);
      if (valid.length > 0) await enqueue(() => local.append(valid));
    },
    async clear() { await enqueue(() => local.clear()); },
  };
}

const DB_NAME = "history";
class PersistentResultStorage implements ResultStorage {
  async load(): Promise<Result[]> {
    const db = await openDatabase();
    try {
      const tx = db.transaction(DB_NAME, "readonly");
      const values = await request(tx.objectStore(DB_NAME).getAll());
      await completed(tx);
      return values.map(resultFromJson).filter((value): value is Result => value != null);
    } finally { db.close(); }
  }

  async append(results: readonly Result[]): Promise<void> {
    const db = await openDatabase();
    try {
      const tx = db.transaction(DB_NAME, "readwrite");
      const store = tx.objectStore(DB_NAME);
      for (const result of results) store.add(resultToJson(result));
      await completed(tx);
    } finally { db.close(); }
  }

  async clear(): Promise<void> {
    const db = await openDatabase();
    try {
      const tx = db.transaction(DB_NAME, "readwrite");
      tx.objectStore(DB_NAME).clear();
      await completed(tx);
    } finally { db.close(); }
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("Database is blocked"));
    req.onupgradeneeded = () => req.result.createObjectStore(DB_NAME, { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function completed(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Operation aborted"));
    tx.oncomplete = () => resolve();
  });
}
