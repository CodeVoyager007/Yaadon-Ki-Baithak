import type { NextConfig } from "next";

/** The origin of a configured URL, or "" when it's missing or malformed. */
function originOf(url: string | undefined) {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

const supabase = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);
const api = originOf(process.env.NEXT_PUBLIC_API_URL);
const dev = process.env.NODE_ENV !== "production";

/*
 * Content Security Policy: scripts only from this site, and the page may only
 * talk to Supabase and our own API, so injected code couldn't load anything or
 * send data elsewhere. Next's inline bootstrap scripts need 'unsafe-inline'
 * (nonces would make every page dynamic); dev mode also needs 'unsafe-eval'.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  `media-src 'self' data: blob: ${supabase}`,
  // blob: and data: let the PDF maker read paintings kept on this device (nothing leaves the page).
  `connect-src 'self' blob: data: ${supabase} ${supabase.replace(/^http/, "ws")} ${api}`,
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
]
  .map((d) => d.replace(/\s+/g, " ").trim())
  .join("; ");

/**
 * Security headers on every page.
 * - CSP above; frame-ancestors / X-Frame-Options stop clickjacking of the login page.
 * - nosniff: browsers don't guess file types.
 * - Referrer-Policy: other sites never see full URLs from inside the app.
 * - Permissions-Policy: only our own pages may ask for the microphone; camera and location are off.
 * - HSTS: browsers always use HTTPS once they have visited.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
