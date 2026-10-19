import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL } from "@/lib/supabase/url";

/** Pages that need a signed-in family historian. /record stays open for elders. */
const PROTECTED = ["/book", "/onboarding"];

/**
 * Runs before every page:
 * 1. Refreshes the Supabase login cookie so sessions don't silently expire.
 * 2. Sends signed-out visitors away from private pages.
 */
export async function proxy(request: NextRequest) {
  const url = SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!url || !anonKey) {
    // Demo mode on your own computer only. A deployed site without keys stays locked.
    if (isProtected && process.env.NODE_ENV === "production") {
      return NextResponse.redirect(new URL("/signup?error=setup", request.url));
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // getUser() checks the token with Supabase, so a forged cookie doesn't pass.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const to = new URL("/signup", request.url);
    to.searchParams.set("mode", "signin");
    to.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(to);
  }

  return response;
}

export const config = {
  // Skip static files and images; run on pages and API routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|svg|gif|ico|mp3|woff2?)$).*)"],
};
