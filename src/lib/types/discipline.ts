/**
 * Mirrors backend lessonradar.MarketplaceDomain / Discipline.
 * Slug values must stay in sync with backend taxonomy seeds.
 */
import type { LocalizedText } from "./locale";

export interface MarketplaceDomain {
  slug: string;
  name: LocalizedText;
  description?: Partial<LocalizedText>;
  sortOrder: number;
}

export interface MarketplaceDiscipline {
  slug: string;
  domainSlug: string;
  name: LocalizedText;
  description?: Partial<LocalizedText>;
  searchAliases?: Partial<Record<keyof LocalizedText, string[]>>;
  isFeatured: boolean;
  sortOrder: number;
}
