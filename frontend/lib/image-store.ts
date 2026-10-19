/**
 * Paintings made without cloud storage (local demo) arrive as data: URLs of a
 * few hundred KB each. A storybook has several, which would fill localStorage,
 * so they live in IndexedDB and the chapter keeps an "idb:<id>" reference.
 */
import { newId } from "./book-store";

const DB = "baithak-images";
const STORE = "images";
export const IDB_PREFIX = "idb:";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB is not supported"));
    }
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB error"));
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB transaction error"));
  });
}

/** Decoded in place: fetch() on a data: URL would be blocked by the page's connect-src policy. */
function dataUrlToBlob(url: string) {
  const [head, data] = url.split(",", 2);
  const type = /^data:([^;,]+)/.exec(head)?.[1] ?? "image/png";
  const bytes = head.includes(";base64") ? Uint8Array.from(atob(data), (c) => c.charCodeAt(0)) : new TextEncoder().encode(decodeURIComponent(data));
  return new Blob([bytes], { type });
}

/** A data: URL goes into IndexedDB and comes back as "idb:<id>"; anything else is returned as it is. */
export async function keepImage(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  if (!url.startsWith("data:")) return url;
  try {
    const blob = dataUrlToBlob(url);
    const id = newId();
    await run("readwrite", (s) => s.put(blob, id));
    return `${IDB_PREFIX}${id}`;
  } catch {
    return null; // storage full or blocked: the page shows its theme picture
  }
}

export async function getImage(ref: string): Promise<Blob | null> {
  try {
    return ((await run("readonly", (s) => s.get(ref.slice(IDB_PREFIX.length)))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function deleteImages(refs: (string | null | undefined)[]) {
  for (const ref of refs) {
    if (ref?.startsWith(IDB_PREFIX)) await run("readwrite", (s) => s.delete(ref.slice(IDB_PREFIX.length))).catch(() => {});
  }
}

export async function clearImages() {
  await run("readwrite", (s) => s.clear()).catch(() => {});
}
