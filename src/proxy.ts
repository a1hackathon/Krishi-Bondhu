import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const handleLocale = createMiddleware(routing);

// Next.js 16 uses proxy.ts in place of middleware.ts.
export default function proxy(request: NextRequest) {
  // Behind a TLS-terminating load balancer (e.g. Vercel), the original scheme arrives in this header.
  // Local development has no TLS, so the redirect applies to production builds only.
  if (process.env.NODE_ENV === "production" && request.headers.get("x-forwarded-proto") === "http") {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    return NextResponse.redirect(url, 308);
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/") || /\.[^/]+$/.test(pathname)) {
    return NextResponse.next();
  }
  return handleLocale(request);
}

export const config = {
  // Skip Next internals and static assets; API routes are checked for the HTTPS redirect above.
  matcher: ["/((?!_next|_vercel).*)"],
};
