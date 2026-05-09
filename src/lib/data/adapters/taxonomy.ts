import "server-only";

import type {
  ApiDiscipline,
  ApiDomain,
} from "@/lib/types/api/marketplace";
import type {
  MarketplaceDiscipline,
  MarketplaceDomain,
} from "@/lib/types/discipline";

/**
 * API → view-model adapter for the marketplace taxonomy.
 *
 * The web's discovery components consume `MarketplaceDomain` /
 * `MarketplaceDiscipline` shapes (see `src/lib/types/discipline.ts`).
 * Backend serializers ship snake_case rows with localized fields
 * spread out (`name_tr`, `name_en`); we collapse them into the
 * `{tr, en}` `Localized` shape consumers expect.
 */

export function adaptDomain(api: ApiDomain): MarketplaceDomain {
  return {
    slug: api.slug,
    name: { tr: api.name_tr, en: api.name_en },
    sortOrder: api.sort_order,
  };
}

export function adaptDiscipline(api: ApiDiscipline): MarketplaceDiscipline {
  return {
    slug: api.slug,
    domainSlug: api.domain.slug,
    name: { tr: api.name_tr, en: api.name_en },
    description: {
      tr: api.description_tr,
      en: api.description_en,
    },
    isFeatured: api.is_featured,
    sortOrder: api.sort_order,
  };
}
