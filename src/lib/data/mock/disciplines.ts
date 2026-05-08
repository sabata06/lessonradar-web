import type { MarketplaceDiscipline, MarketplaceDomain } from "@/lib/types";

export const MOCK_DOMAINS: MarketplaceDomain[] = [
  { slug: "akademik", name: { tr: "Akademik", en: "Academic" }, sortOrder: 0 },
  { slug: "sinav-hazirlik", name: { tr: "Sınav Hazırlık", en: "Exam Prep" }, sortOrder: 1 },
  { slug: "diller", name: { tr: "Yabancı Diller", en: "Languages" }, sortOrder: 2 },
  { slug: "muzik-sanat", name: { tr: "Müzik & Sanat", en: "Music & Arts" }, sortOrder: 3 },
  { slug: "spor", name: { tr: "Spor", en: "Sports" }, sortOrder: 4 },
  { slug: "teknoloji", name: { tr: "Teknoloji", en: "Technology" }, sortOrder: 5 },
];

// IMPORTANT: slugs MUST match backend `MarketplaceDiscipline.slug` values
// served at `/api/marketplace/taxonomy/`. The web's pSEO routes use these
// slugs as the URL path component (`/<city>/<slug>`), and the discovery
// endpoint validates the `discipline=<slug>` filter against this exact
// set — a slug that exists here but not on the backend yields a 400 →
// empty listing. Keep this list a strict subset of the backend taxonomy.
export const MOCK_DISCIPLINES: MarketplaceDiscipline[] = [
  {
    slug: "matematik",
    domainSlug: "akademik",
    name: { tr: "Matematik Özel Ders", en: "Math Tutoring" },
    description: {
      tr: "İlkokuldan üniversiteye matematik özel dersleri.",
      en: "Math tutoring from primary school to university.",
    },
    searchAliases: { tr: ["matematik dersi", "matematik öğretmeni"], en: ["math tutor"] },
    isFeatured: true,
    sortOrder: 0,
  },
  {
    slug: "fizik",
    domainSlug: "akademik",
    name: { tr: "Fizik Özel Ders", en: "Physics Tutoring" },
    description: {
      tr: "Lise ve üniversite fizik dersleri için özel ders.",
      en: "High school and university physics tutoring.",
    },
    isFeatured: true,
    sortOrder: 1,
  },
  {
    slug: "yks-matematik",
    domainSlug: "sinav-hazirlik",
    name: { tr: "YKS Matematik", en: "YKS Math" },
    description: {
      tr: "TYT ve AYT matematik için yoğun YKS hazırlık.",
      en: "Intensive YKS prep covering TYT and AYT math.",
    },
    isFeatured: true,
    sortOrder: 0,
  },
  {
    slug: "ingilizce",
    domainSlug: "diller",
    name: { tr: "İngilizce Özel Ders", en: "English Tutoring" },
    description: {
      tr: "Genel İngilizce, sınav ve iş İngilizcesi.",
      en: "General, exam and business English.",
    },
    isFeatured: true,
    sortOrder: 0,
  },
  {
    slug: "piyano",
    domainSlug: "muzik-sanat",
    name: { tr: "Piyano Dersi", en: "Piano Lessons" },
    description: {
      tr: "Başlangıçtan ileri seviyeye piyano eğitimi.",
      en: "Piano lessons from beginner to advanced.",
    },
    isFeatured: false,
    sortOrder: 0,
  },
];

export function getDisciplineBySlug(slug: string) {
  return MOCK_DISCIPLINES.find((d) => d.slug === slug);
}
