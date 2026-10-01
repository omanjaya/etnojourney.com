type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

/** Structured data for search engines. `<` is escaped so content can't close the script tag. */
export function JsonLd({ data }: { data: JsonLdData }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
