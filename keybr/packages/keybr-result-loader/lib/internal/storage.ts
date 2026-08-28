import { recoverResults, Result } from "@keybr/result";
import { resultFromJson, resultToJson } from "@keybr/result-io";

export type ResultStorage = {
  load(): Promise<Result[]>;
  append(results: readonly Result[]): Promise<void>;
  clear(): Promise<void>;
};

const DB_NAME = "history";

export function createResultStorage(): ResultStorage {
  const local = new PersistentResultStorage();
  let pending = Promise.resolve();
  const enqueue = (task: () => Promise<void>) => {
    const next = pending.then(task, task);
    pending = next.catch(() => {});
    return next;
  };
  return {
    async load() {
      return recoverResults(await local.load());
    },
    async append(results) {
      const valid = results.filter(Result.isValid);
      if (valid.length > 0) await enqueue(() => local.append(valid));
    },
    async clear() {
      await enqueue(() => local.clear());
    },
  };
}

class PersistentResultStorage implements ResultStorage {
  async load(): Promise<Result[]> {
    const db = await openDatabase();
    try {
      const tx = db.transaction(DB_NAME, "readonly");
      const values = await request(tx.objectStore(DB_NAME).getAll());
      await completed(tx);
      return values.map(resultFromJson).filter((value): value is Result => value != null);
    } finally {
      db.close();
    }
  }

  async append(results: readonly Result[]): Promise<void> {
    const db = await openDatabase();
    try {
      const tx = db.transaction(DB_NAME, "readwrite");
      const store = tx.objectStore(DB_NAME);
      for (const result of results) store.add(resultToJson(result));
      await completed(tx);
    } finally {
      db.close();
    }
  }

  async clear(): Promise<void> {
    await deleteDatabase();
  }
}


function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("Database deletion is blocked by another tab"));
    req.onsuccess = () => resolve();
  });
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
