/**
 * One error shape for every route: { error: "short friendly sentence" }.
 * frontend/lib/api.ts treats any non-2xx as "use the stand-in", so these messages
 * never break the elder's flow. Raw provider errors stay in the server log.
 */
export function error(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

/** 200 with a JSON body. Plain Response, so handlers don't depend on any framework. */
export function ok(body: unknown) {
  return Response.json(body);
}

/** 501: the provider's key isn't configured. The app keeps working on stand-ins. */
export function notConfigured(what: string) {
  return error(501, `${what} isn't connected yet.`);
}

/** 401: not signed in (only possible when Supabase is configured). */
export function notSignedIn() {
  return error(401, "Please sign in to continue.");
}

/** 400: the body failed validation. */
export function badBody() {
  return error(400, "That request didn't look right.");
}

/** 502: the provider answered badly or not at all. Never invent content here. */
export function providerFailed(what: string) {
  return error(502, `${what} didn't work this time. Try again in a moment.`);
}

/** Hard cap on JSON bodies: a giant payload never gets parsed at all. */
const MAX_JSON_BYTES = 256_000;

/**
 * Parse a JSON body with a size cap, checked on the declared Content-Length
 * and again on the actual text (chunked requests declare nothing). Returns
 * null for anything oversized or malformed, which routes answer with 400.
 */
export async function readJson<T = Record<string, unknown>>(
  request: Request,
  maxBytes = MAX_JSON_BYTES,
): Promise<T | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null && Number(declared) > maxBytes) return null;
  let text: string;
  try {
    text = await request.text();
  } catch {
    return null;
  }
  if (text.length > maxBytes) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
