import type { NextConfig } from "next";

/**
 * Security settings sent with every page.
 * - frame-ancestors / X-Frame-Options: no other site can load our login page inside a frame (clickjacking).
 * - nosniff: browsers don't guess file types.
 * - Referrer-Policy: other sites never see full URLs from inside the app.
 * - Permissions-Policy: only our own pages may ask for the microphone; camera and location are off.
 * - HSTS: browsers always use HTTPS once they have visited.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@baithak/agents", "@baithak/backend"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
