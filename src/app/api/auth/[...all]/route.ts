import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

const handler = toNextJsHandler(auth);

/**
 * Allowlist of Better Auth HTTP routes. The app performs every auth action
 * through server actions (`auth.api.*`), which apply our validation and rate
 * limits. Raw HTTP routes would bypass both (e.g. `POST /update-user` accepts
 * a multi-megabyte name), and new Better Auth versions may add more, so only
 * what the browser genuinely needs is exposed:
 *
 * - `GET /reset-password/:token`: the link in the password reset email.
 */
const ALLOWED: { method: "GET" | "POST"; pattern: RegExp }[] = [
  { method: "GET", pattern: /^\/reset-password\/[^/]+$/ },
];

const BASE_PATH = "/api/auth";

function isAllowed(request: Request): boolean {
  const path = new URL(request.url).pathname;
  if (!path.startsWith(`${BASE_PATH}/`)) return false;
  const route = path.slice(BASE_PATH.length);
  return ALLOWED.some((rule) => rule.method === request.method && rule.pattern.test(route));
}

const notFound = () => new Response("Not Found", { status: 404 });

export async function GET(request: Request) {
  return isAllowed(request) ? handler.GET(request) : notFound();
}

export async function POST(request: Request) {
  return isAllowed(request) ? handler.POST(request) : notFound();
}
