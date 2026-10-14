/**
 * The elder's real voice clips, kept in the browser's IndexedDB until
 * Supabase Storage (private "audio" bucket) takes over. Clips never leave
 * this device in the meantime.
 */
const DB = "baithak-audio";
const STORE = "clips";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putClip(id: string, blob: Blob) {
  await run("readwrite", (s) => s.put(blob, id));
}

export async function getClip(id: string): Promise<Blob | null> {
  try {
    return ((await run("readonly", (s) => s.get(id))) as Blob | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function deleteClips(ids: string[]) {
  for (const id of ids) await run("readwrite", (s) => s.delete(id)).catch(() => {});
}

export async function clearClips() {
  await run("readwrite", (s) => s.clear()).catch(() => {});
}
