import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactCompiler: true,
  // NOTE: Next 16's `cacheComponents: true` (= PPR) would let us stream
  // cookie-bound auth state inside an otherwise SSG layout. Tried 2026-05-08
  // and it conflicts with `export const runtime/dynamic` on route handlers —
  // requires a full caching-model migration (every page needs `"use cache"`
  // and a curated cache strategy). Out of B2 scope; revisit as its own phase
  // before launch. For now we keep auth client-hydrated to preserve SSG.
  output: "standalone",
  // Pin Turbopack to this app's directory so the root-level package-lock.json
  // (from the Expo/RN workspace) does not hijack the workspace root.
  turbopack: {
    root: import.meta.dirname,
  },
  images: {
    remotePatterns: [
      // Backend-served avatars (uploaded teacher / customer photos).
      { protocol: "https", hostname: "api.lessonradar.com" },
      // Stock imagery used by editorial banners (homepage hero, etc.).
      { protocol: "https", hostname: "images.unsplash.com" },
      // Mock-only avatar source. Prod data never references it; whitelist
      // is kept so `LR_USE_MOCK=1` builds don't trip the optimizer.
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
};

export default withNextIntl(nextConfig);
