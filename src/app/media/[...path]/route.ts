import { auth } from "@/server/auth";
import { activeSession } from "@/server/auth/guards";
import { can } from "@/server/auth/permissions";
import { reviewService } from "@/server/services/review.service";
import { getStorage } from "@/server/storage";
import { normalizeKey } from "@/server/storage/storage";

const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });

/**
 * Traveller review photos are served only while they belong to a published
 * review and are not hidden (moderators can still view hidden ones). They are
 * cached briefly so hiding a photo takes effect; uploads never attached to a
 * review are not served at all. Returns the Cache-Control to use, or null.
 */
async function reviewPhotoCacheControl(request: Request, key: string): Promise<string | null> {
  const access = await reviewService.photoAccess(`/media/${key}`);
  if (access === "public") return "public, max-age=300";
  if (access === "moderators") {
    const session = activeSession(await auth.api.getSession({ headers: request.headers }));
    if (session && can(session.user.role, "reviews.manage")) return "private, no-store";
  }
  return null;
}

/** Serves uploaded media from storage. Keys are validated before touching the disk. */
export async function GET(request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const key = normalizeKey(path.join("/"));
  if (!key) return notFound();

  let cacheControl = "public, max-age=31536000, immutable";
  if (key.startsWith("reviews/")) {
    const reviewCache = await reviewPhotoCacheControl(request, key);
    if (!reviewCache) return notFound();
    cacheControl = reviewCache;
  }

  const object = await getStorage().get(key);
  if (!object) return notFound();

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.size),
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
