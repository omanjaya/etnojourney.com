import { notFound } from "next/navigation";

/** Routes unknown localized URLs to the branded `[locale]/not-found.tsx`. */
export default function CatchAllPage() {
  notFound();
}
