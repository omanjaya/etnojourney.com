import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { RETURN_PATH_HEADER, returnPath } from "./lib/return-path";

const handleI18nRouting = createMiddleware(routing);

export default function proxy(request: NextRequest) {
  // Lets `requireUser` send a signed-out visitor to /login?next=<this page>.
  // next-intl forwards the request headers upstream; `set` overwrites any
  // value the client sent.
  request.headers.set(
    RETURN_PATH_HEADER,
    returnPath(request.nextUrl.pathname, request.nextUrl.search),
  );
  return handleI18nRouting(request);
}

export const config = {
  // Skip API routes, Next internals and static files.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
