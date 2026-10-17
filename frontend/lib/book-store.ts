/**
 * Local-first storage for the family book. The shapes match the
 * Supabase tables; when Supabase is configured, every save is also pushed
 * there under the owner's session (see lib/data/remote.ts) so the book
 * survives beyond this device. Demo mode works with no keys at all.
 */
import { hasSupabase } from "@/lib/supabase/client";
import { pushBook } from "@/lib/data/remote";
export type Relation = "Nani" | "Nana" | "Dadi" | "Dada" | "Other";
export type Language = "Urdu" | "Punjabi" | "Sindhi" | "Pashto" | "English";
export type Theme = "Childhood" | "My city back then" | "1947" | "Wedding day" | "Kitchen and recipes" | "Folk tales" | "Free talk";

export type Elder = {
  id: string;
  name: string;
  relation: Relation;
  language: Language;
  birthplace?: string;
  birthYear?: string;
  /** When the elder agreed to be recorded (M1). Recording never starts without it. */
  consentAt?: string;
};

export type FamilyBook = {
  /** UUID: the book's row id in Supabase. Assigned on first save; absent on books from older builds. */
  id?: string;
  familyName: string;
  elders: Elder[];
  /** The topic picked during onboarding, used for the first story. */
  theme: Theme;
  createdAt: string;
  /** Supabase user id of whoever created it, so a shared phone never shows one person's book to another. */
  ownerId?: string;
  /** Present while the family book is shared by link. */
  shareToken?: string;
};

const KEY = "baithak-book";

export function newId() {
  try {
    return crypto.randomUUID();
  } catch {
    // Very old secure contexts: build a v4 UUID from getRandomValues.
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }
}

/** An unguessable share-link token: 24 random bytes as 48 hex characters (what the API and database accept). */
export function newShareToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function saveBook(book: FamilyBook) {
  // Older books have no id; mint one now so the remote row has a stable key.
  const next: FamilyBook = book.id ? book : { ...book, id: newId() };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage blocked: the dashboard falls back to onboarding */
  }
  if (hasSupabase) void pushBook(next).catch(() => {});
}

/** Reads the book, upgrading the older one-elder shape if it finds one. */
export function loadBook(): FamilyBook | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as FamilyBook & { elder?: Omit<Elder, "id"> };
    if (!data.elders && data.elder) {
      const { elder, ...rest } = data;
      const upgraded: FamilyBook = { ...rest, elders: [{ id: newId(), ...elder }] };
      saveBook(upgraded);
      return upgraded;
    }
    return data;
  } catch {
    return null;
  }
}

/** Removes the book, its sessions and chapters, and every voice clip on this device. */
export function clearBook() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem("baithak-sessions");
    localStorage.removeItem("baithak-chapters");
  } catch {
    /* ignore */
  }
  void import("./audio-store").then((m) => m.clearClips());
}

export function updateBook(patch: Partial<FamilyBook>) {
  const book = loadBook();
  if (book) saveBook({ ...book, ...patch });
}

export function addElder(elder: Omit<Elder, "id">) {
  const book = loadBook();
  if (!book) return null;
  const created = { id: newId(), ...elder };
  saveBook({ ...book, elders: [...book.elders, created] });
  return created;
}

export function updateElder(id: string, patch: Partial<Elder>) {
  const book = loadBook();
  if (!book) return;
  saveBook({ ...book, elders: book.elders.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
}

export function getElder(id: string | null | undefined) {
  const book = loadBook();
  if (!book) return null;
  return book.elders.find((e) => e.id === id) ?? null;
}

/**
 * Call right after someone signs in. If the saved book belongs to a
 * different account (a shared family phone), it is cleared.
 */
export function claimBook(userId: string) {
  const book = loadBook();
  if (!book) return;
  if (book.ownerId && book.ownerId !== userId) clearBook();
  else if (!book.ownerId) saveBook({ ...book, ownerId: userId });
}

/** "Nani Zubaida", or just the name when the relation is "Other". */
export function elderLabel(elder: Pick<Elder, "name" | "relation">) {
  return elder.relation === "Other" ? elder.name : `${elder.relation} ${elder.name}`;
}
