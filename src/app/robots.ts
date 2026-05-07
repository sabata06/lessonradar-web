import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo/site";

/**
 * Robots policy.
 *
 * Crawlers explicitly allowed: Googlebot + AI search bots (OAI-SearchBot,
 * PerplexityBot, GPTBot, Google-Extended). Generic `*` crawlers also allowed
 * but the same disallow list applies.
 *
 * Disallowed: API routes, lead success page, and the future filter/search
 * route at `/ara` (kept here so it stays out of the index when Faz 7 ships).
 *
 * Quality-score-driven `noindex` is enforced per-page via metadata; this
 * file only handles structural exclusions.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/api/",
    "/*/ders-talebi/tesekkurler",
    "/*/ara",
    "/*/ara/*",
  ];

  const userAgents = [
    "*",
    "Googlebot",
    "Googlebot-Image",
    "Bingbot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "GPTBot",
    "PerplexityBot",
    "Perplexity-User",
    "Google-Extended",
  ];

  return {
    rules: userAgents.map((userAgent) => ({
      userAgent,
      allow: "/",
      disallow,
    })),
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
