interface LegalContentProps {
  /** Sanitized HTML produced by `getLegalDocument()`. Safe to inject. */
  html: string;
}

/**
 * Renders the sanitized document body with prose styling. The HTML has
 * already been run through sanitize-html (see `lib/data/legal.ts`) — no
 * raw user input ever reaches this component, so `dangerouslySetInnerHTML`
 * is appropriate.
 *
 * Prose styles are applied via Tailwind child-selector utilities rather
 * than the `@tailwindcss/typography` plugin, which would pull in dark-mode
 * tokens and prose-color variants that conflict with our Calm Editorial
 * brand tokens. The selector list intentionally matches the tag whitelist
 * in `processHtml()` — keep them in sync if you add new allowed tags.
 */
export function LegalContent({ html }: LegalContentProps) {
  return (
    <div
      className="
        text-[0.95rem] leading-7 text-foreground/85
        [&_h2]:scroll-mt-24 [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-foreground
        [&_h2:first-of-type]:mt-0
        [&_h3]:scroll-mt-24 [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground
        [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-foreground
        [&_p]:my-4
        [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-5
        [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-5
        [&_li]:my-1
        [&_strong]:font-semibold [&_strong]:text-foreground
        [&_a]:text-brand [&_a]:underline-offset-4 hover:[&_a]:underline
        [&_blockquote]:my-6 [&_blockquote]:border-l-4 [&_blockquote]:border-brand-soft [&_blockquote]:pl-4 [&_blockquote]:italic
        [&_hr]:my-10 [&_hr]:border-border
        [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse
        [&_th]:border [&_th]:border-border [&_th]:bg-secondary [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-semibold
        [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
