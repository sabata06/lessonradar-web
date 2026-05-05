<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# LessonRadar Web Instructions

Before coding the web app, read the repo-level context:

1. `../AGENTS.md`
2. `../docs/AI_AGENT_HANDOFF.md`
3. `../lessonradar-proje-bilgi-dosyasi.md`
4. `../lessonradar-master-plan.md`
5. `../ozel-ders-platformu-seo-yol-haritasi.md`
6. `../lessonradar-ui-ux-master-plan.md`
7. `DESIGN.md`

Use `_designs/*/screen.png` as visual reference and `_designs/*/code.html` as layout inspiration only. Rebuild with Next.js, TypeScript, Tailwind CSS 4, and the existing component system.

Web priorities:

- First conversion is web lesson request/lead submission, not app download.
- App CTA appears after lead submission or as a follow-up/teacher operations value.
- Initial SEO pages should focus on Gaziantep and data-rich branch/district combinations.
- pSEO pages must respect `seo_quality_score`, canonical, sitemap, and `index/noindex` rules.
- Teacher-empty pages use lead collection mode and should not be indexed.
- Keep pages mobile-first, fast, trust-heavy, and aligned with `DESIGN.md`.
