import { error } from "./http.ts";
import { requireUser } from "./auth.ts";

export type GuardResult =
  | { ok: true; userId: string | null }
  | { ok: false; response: Response };

/** Best-effort per-client, per-route fixed window: enough for a family's
 * whole interview (each route has its own counter), far too little for a
 * script to burn free-tier quota. Lives in this server instance's memory —
 * honest about being per-instance, not a global guard. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;
const hits = new Map<string, { count: number; resetAt: number }>();

/** Vercel and most proxies set one of these; local dev falls back. */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "local";
}

function rateLimited(request: Request, route: string): boolean {
  const now = Date.now();
  const key = `${route}:${clientKey(request)}`;
  const bucket = hits.get(key);
  if (!bucket || bucket.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    // Lazy sweep so a long-lived process never accumulates dead keys.
    if (hits.size > 500) for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_PER_WINDOW;
}

/**
 * CSRF defence: a browser labels any request another site initiated with a
 * foreign Origin header. Non-browser clients send no Origin, and they would
 * need our session cookie anyway. Hosts must match exactly (name + port).
 */
function crossSite(request: Request): boolean {
  if (request.method === "GET" || request.method === "HEAD") return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  if (origin === "null") return true; // sandboxed iframe or a file: page
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
}

/**
 * One line per AI route, in this order:
 * foreign origin -> 403, over the window -> 429, signed out -> 401/503.
 * The rate check runs before auth so a cookie storm can't spend the
 * Supabase auth quota either. Every outcome is a status frontend/lib/api.ts maps
 * back to its stand-in, so nothing here can break the elder's screen.
 */
export async function guardApi(request: Request, route: string): Promise<GuardResult> {
  if (crossSite(request)) return { ok: false, response: error(403, "This request came from another site.") };
  if (rateLimited(request, route)) {
    return { ok: false, response: error(429, "Too many tries. Wait a minute and try again.") };
  }
  return requireUser(request);
}
