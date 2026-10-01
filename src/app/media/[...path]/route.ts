import { getStorage } from "@/server/storage";
import { normalizeKey } from "@/server/storage/storage";

const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });

/** Serves uploaded media from storage. Keys are validated before touching the disk. */
export async function GET(_request: Request, { params }: RouteContext<"/media/[...path]">) {
  const { path } = await params;
  const key = normalizeKey(path.join("/"));
  if (!key) return notFound();

  const object = await getStorage().get(key);
  if (!object) return notFound();

  return new Response(new Uint8Array(object.body), {
    headers: {
      "Content-Type": object.contentType,
      "Content-Length": String(object.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
