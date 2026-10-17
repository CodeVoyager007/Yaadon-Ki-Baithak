/**
 * Brings this device up to date with what the signed-in account has saved,
 * so the family book never depends on one browser's storage.
 */
import { claimBook, loadBook, restoreBook } from "@/lib/book-store";
import { restoreChapters } from "@/lib/chapter-store";
import { pullFamily } from "@/lib/data/remote";
import { hasSupabase, supabaseBrowser } from "@/lib/supabase/client";
import { THEMES } from "@/lib/themes";

const themeScene = (theme: string) => (THEMES.find((t) => t.id === theme) ?? THEMES[THEMES.length - 1]).scene;

async function sync(userId: string) {
  claimBook(userId); // a different account's book on a shared phone is cleared first
  const remote = await pullFamily(userId, themeScene);
  if (!remote) return;
  const local = loadBook();
  if (!local) {
    restoreBook(remote.book);
  } else if (local.id === remote.book.id) {
    const have = new Set(local.elders.map((e) => e.id));
    const missing = remote.book.elders.filter((e) => !have.has(e.id));
    if (missing.length) restoreBook({ ...local, elders: [...local.elders, ...missing] });
  } else {
    return; // a book made on this device before syncing: keep it, don't mix two families
  }
  restoreChapters(remote.sessions, remote.chapters);
}

/**
 * Restores the signed-in user's book from Supabase. Returns their user id, or
 * null when nobody is signed in. Never waits more than `ms` on the network.
 */
export async function syncBook(ms = 6000): Promise<string | null> {
  if (!hasSupabase) return null;
  try {
    const {
      data: { user },
    } = await supabaseBrowser().auth.getUser();
    if (!user) return null;
    await Promise.race([sync(user.id).catch(() => {}), new Promise((r) => setTimeout(r, ms))]);
    return user.id;
  } catch {
    return null;
  }
}
