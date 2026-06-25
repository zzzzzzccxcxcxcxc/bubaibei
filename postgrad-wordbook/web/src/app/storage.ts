export type KeyValueStore = {
  get<T>(key: string, fallback: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
};

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function openDatabase(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  dbName: string,
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase(dbName, storeName);
  try {
    const tx = db.transaction(storeName, mode);
    const transactionDone = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    const result = await requestToPromise(run(tx.objectStore(storeName)));
    await transactionDone;
    return result;
  } finally {
    db.close();
  }
}

export function createIndexedDbStore(
  dbName = 'postgrad-wordbook-pwa',
  storeName = 'kv',
): KeyValueStore {
  if (!window.indexedDB) {
    throw new Error('INDEXED_DB_UNAVAILABLE');
  }
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      const value = await withStore<unknown>(dbName, storeName, 'readonly', (store) => store.get(key));
      return value === undefined ? fallback : (value as T);
    },
    async set<T>(key: string, value: T): Promise<void> {
      await withStore<IDBValidKey>(dbName, storeName, 'readwrite', (store) => store.put(value, key));
    },
    async remove(key: string): Promise<void> {
      await withStore<undefined>(dbName, storeName, 'readwrite', (store) => store.delete(key));
    },
  };
}

export function createLocalStorageSettingsStore(
  storage: Storage = window.localStorage,
): KeyValueStore {
  return {
    async get<T>(key: string, fallback: T): Promise<T> {
      const raw = storage.getItem(key);
      return raw === null ? fallback : (JSON.parse(raw) as T);
    },
    async set<T>(key: string, value: T): Promise<void> {
      storage.setItem(key, JSON.stringify(value));
    },
    async remove(key: string): Promise<void> {
      storage.removeItem(key);
    },
  };
}
