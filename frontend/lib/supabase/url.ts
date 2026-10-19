/**
 * The Supabase project address, reduced to its origin (https://<ref>.supabase.co). The dashboard
 * also shows the REST endpoint (…/rest/v1/); if that gets pasted into the environment, every
 * auth call would go to …/rest/v1/auth/v1/… and fail with "No API key found", so any path is dropped.
 */
function originOf(raw: string | undefined) {
  if (!raw) return undefined;
  try {
    return new URL(raw.trim()).origin;
  } catch {
    return undefined;
  }
}

export const SUPABASE_URL = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
