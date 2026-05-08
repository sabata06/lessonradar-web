import "server-only";

import sanitizeHtml from "sanitize-html";

import type { Locale } from "@/i18n/routing";
import { getTeacherAgreementDraft } from "@/lib/legal/teacher-agreement-content";

const BACKEND_BASE = process.env.DJANGO_API_BASE;
const MOCK_MODE = process.env.LR_USE_MOCK === "1";

if (!BACKEND_BASE && !MOCK_MODE) {
  throw new Error(
    "DJANGO_API_BASE is not set. Required for /yasal/* pages to fetch backend legal documents (or set LR_USE_MOCK=1 to skip the backend fetch at build time; the page will still need a reachable backend at request time).",
  );
}

// `mock.invalid` is a placeholder under `LR_USE_MOCK=1` so module load
// doesn't crash. Legal pages aren't part of the mock catalog — the
// runtime fetch will still need a real backend, but build-time page
// collection no longer fails.
const TRUSTED_BASE = BACKEND_BASE ?? "http://mock.invalid";

export const LEGAL_SLUGS = [
  "gizlilik",
  "kosullar",
  "ogretmen-sozlesmesi",
] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

export interface LegalTocItem {
  id: string;
  label: string;
}

export interface LegalDocumentView {
  slug: LegalSlug;
  title: string;
  intro: string | null;
  bodyHtml: string;
  toc: LegalTocItem[];
  version: string;
  isDraft: boolean;
  indexable: boolean;
  contactEmail: string;
}

const TITLE_FALLBACK: Record<LegalSlug, Record<Locale, string>> = {
  gizlilik: {
    tr: "Gizlilik Politikası ve KVKK Aydınlatma Metni",
    en: "Privacy Policy and KVKK Disclosure",
  },
  kosullar: {
    tr: "Kullanım Koşulları",
    en: "Terms of Service",
  },
  "ogretmen-sozlesmesi": {
    tr: "Öğretmen Hizmet Sözleşmesi",
    en: "Teacher Service Agreement",
  },
};

const CONTACT_BY_SLUG: Record<LegalSlug, string> = {
  gizlilik: "kvkk@lessonradar.com",
  kosullar: "destek@lessonradar.com",
  "ogretmen-sozlesmesi": "destek@lessonradar.com",
};

const BACKEND_PATH_BY_SLUG: Partial<Record<LegalSlug, string>> = {
  gizlilik: "/privacy-policy/",
  kosullar: "/terms-of-service/",
};

export async function getLegalDocument(
  slug: LegalSlug,
  locale: Locale,
): Promise<LegalDocumentView> {
  if (slug === "ogretmen-sozlesmesi") {
    const draft = getTeacherAgreementDraft(locale);
    const processed = processHtml(draft.html);
    return {
      slug,
      title: draft.title,
      intro: processed.intro,
      bodyHtml: processed.bodyHtml,
      toc: processed.toc,
      version: draft.version,
      isDraft: true,
      indexable: false,
      contactEmail: CONTACT_BY_SLUG[slug],
    };
  }

  const backendPath = BACKEND_PATH_BY_SLUG[slug];
  if (!backendPath) {
    throw new Error(`No backend mapping for legal slug: ${slug}`);
  }

  const url = new URL(backendPath, TRUSTED_BASE);
  url.searchParams.set("lang", locale);

  const res = await fetch(url.toString(), {
    headers: { Accept: "text/html" },
    next: { revalidate: 3600, tags: [`legal:${slug}:${locale}`] },
  });

  if (!res.ok) {
    throw new Error(
      `Legal document fetch failed (${slug}/${locale}): HTTP ${res.status}`,
    );
  }

  const fullHtml = await res.text();
  const fragment = extractMainContent(fullHtml);
  const { extractedTitle, remainingHtml } = extractFirstH1(fragment);
  const processed = processHtml(remainingHtml);

  return {
    slug,
    title: extractedTitle ?? TITLE_FALLBACK[slug][locale],
    intro: processed.intro,
    bodyHtml: processed.bodyHtml,
    toc: processed.toc,
    version: "1.0",
    isDraft: false,
    indexable: true,
    contactEmail: CONTACT_BY_SLUG[slug],
  };
}

function extractMainContent(html: string): string {
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) return bodyMatch[1];
  return html;
}

function extractFirstH1(html: string): {
  extractedTitle: string | null;
  remainingHtml: string;
} {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return { extractedTitle: null, remainingHtml: html };
  const text = stripTags(match[1]).trim();
  return {
    extractedTitle: text.length > 0 ? text : null,
    remainingHtml: html.replace(match[0], "").trim(),
  };
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function slugifyHeading(input: string): string {
  return input
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

interface ProcessedHtml {
  bodyHtml: string;
  toc: LegalTocItem[];
  intro: string | null;
}

function processHtml(rawHtml: string): ProcessedHtml {
  const toc: LegalTocItem[] = [];
  const usedIds = new Set<string>();

  // Pass 1: anchor every <h2>, collect ToC entries.
  const anchored = rawHtml.replace(
    /<h2([^>]*)>([\s\S]*?)<\/h2>/gi,
    (_match, attrs: string, inner: string) => {
      const text = stripTags(inner);
      const base = slugifyHeading(text) || `section-${toc.length + 1}`;
      let unique = base;
      let suffix = 2;
      while (usedIds.has(unique)) {
        unique = `${base}-${suffix++}`;
      }
      usedIds.add(unique);
      toc.push({ id: unique, label: text });
      const cleanedAttrs = (attrs ?? "").replace(/\sid=("[^"]*"|'[^']*')/i, "");
      return `<h2${cleanedAttrs} id="${unique}">${inner}</h2>`;
    },
  );

  // Pass 2: sanitize. Keep only prose tags; drop scripts/styles/iframes.
  const sanitized = sanitizeHtml(anchored, {
    allowedTags: [
      "h2",
      "h3",
      "h4",
      "p",
      "ul",
      "ol",
      "li",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "a",
      "br",
      "hr",
      "blockquote",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "code",
      "pre",
      "span",
      "dl",
      "dt",
      "dd",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      h2: ["id"],
      h3: ["id"],
      h4: ["id"],
    },
    allowedSchemes: ["http", "https", "mailto", "tel"],
    transformTags: {
      a: (_tagName, attribs) => {
        const href = attribs.href ?? "";
        const isExternal = /^https?:\/\//i.test(href);
        return {
          tagName: "a",
          attribs: {
            href,
            ...(attribs.title ? { title: attribs.title } : {}),
            ...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {}),
          },
        };
      },
    },
    disallowedTagsMode: "discard",
  });

  const introMatch = sanitized.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  const intro = introMatch ? stripTags(introMatch[1]).slice(0, 200) : null;

  return { bodyHtml: sanitized, toc, intro };
}
