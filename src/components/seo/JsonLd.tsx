import type { JsonLd as JsonLdType } from "@/lib/seo/jsonld";

interface JsonLdProps {
  data: JsonLdType | JsonLdType[];
}

export function JsonLd({ data }: JsonLdProps) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item, (_, v) => (v === undefined ? undefined : v)),
          }}
        />
      ))}
    </>
  );
}
