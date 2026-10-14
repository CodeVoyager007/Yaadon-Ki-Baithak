/**
 * Only allow redirects to paths on our own site. Blocks tricks like
 * "//evil.com", "/\\evil.com" and "@evil.com" that would send someone
 * to another website after they log in.
 */
export function safePath(path: string | null | undefined, fallback = "/onboarding") {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  try {
    const base = "http://baithak.local";
    const url = new URL(path, base);
    return url.origin === base ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}
