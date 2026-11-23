"use client";

/**
 * 아주 작은 IndexedDB 래퍼.
 * 촬영 원본(Blob)은 localStorage 에 넣을 수 없으므로 IndexedDB 에 보관한다.
 * 이 기기 · 이 브라우저에만 남으며, 사용자가 동의한 경우에만 Supabase 로 업로드된다.
 */

const DB_NAME = "refound";
const DB_VERSION = 1;
export const STORES = ["scan_sessions", "scan_blobs", "registered_images"] as const;
export type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB를 사용할 수 없는 환경입니다."));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        for (const name of STORES) {
          if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error);
      };
    });
  }
  return dbPromise;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export const idb = {
  get: <T>(store: StoreName, key: string) => run<T | undefined>(store, "readonly", (s) => s.get(key)),
  set: (store: StoreName, key: string, value: unknown) => run(store, "readwrite", (s) => s.put(value, key)),
  del: (store: StoreName, key: string) => run(store, "readwrite", (s) => s.delete(key)),
  keys: (store: StoreName) => run<IDBValidKey[]>(store, "readonly", (s) => s.getAllKeys()),
};
