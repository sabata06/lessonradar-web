---
name: Warm Trust
palette: warm-trust
tokens_source: src/app/globals.css
typography:
  family: Plus Jakarta Sans
  scale:
    h1: { size: 48px, weight: 700, lineHeight: 1.1, tracking: -0.02em }
    h2: { size: 32px, weight: 700, lineHeight: 1.2, tracking: -0.018em }
    h3: { size: 22px, weight: 600, lineHeight: 1.3, tracking: -0.012em }
    body-lg: { size: 18px, weight: 400, lineHeight: 1.6 }
    body-md: { size: 16px, weight: 400, lineHeight: 1.6 }
    body-sm: { size: 14px, weight: 400, lineHeight: 1.5 }
    label-caps: { size: 12px, weight: 600, lineHeight: 1, tracking: 0.06em }
radius:
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  2xl: 2rem
  full: 9999px
spacing:
  base: 4px
  rhythm: 8px
  container-max: 1280px
  gutter-mobile: 1rem
  gutter-desktop: 2rem
---

## Brand & Style

LessonRadar's brand voice sits at the intersection of **academic authority** and **warm, local trust**. We are not a SaaS template, not a bank, not a cartoon edtech: we are the platform a Turkish parent or a YKS student lands on at 23:00 looking for a tutor and feels — within five seconds — that the people listed here are real, vetted, and reachable tonight.

Aesthetic is **"Calm Editorial"**: heavy whitespace, restrained color, high-contrast typography, no decorative gradients. Trust is communicated through what we *omit* (clutter, sales pressure, fake urgency) as much as what we show (verification badges, real response times, transparent prices). The emotional north star is **informed confidence — without coldness**.

## Colors — Warm Trust palette

The palette breaks deliberately from the indigo-and-orange SaaS convention that dominates Turkish edtech competitors. It is built on three intentions:

- **Differentiate:** every TR tutoring competitor lives in the same banking-blue pool. Petrol/teal carries the same "trust + intellect" semantic without the sterile institutional feel.
- **Resonate locally:** İznik petrol-teal and honey/amber are part of Turkish visual heritage (tile, calligraphy, market). They read as *warm authority*, not generic tech.
- **Sustain attention:** a parent comparing 5 tutor profiles at night should not be assaulted by saturated orange. Honey amber claims attention without screaming.

| Role | Token | Approx. value | Use |
|---|---|---|---|
| Trust / brand anchor | `--brand` / `--primary` | deep İznik teal `oklch(0.42 0.075 195)` | Logo, links, "View Profile", brand surfaces |
| Brand soft (badge bg) | `--brand-soft` | light teal tint | Verified badge, tag chips, accent panels |
| Action (CTA) | `--action` | honey amber `oklch(0.71 0.155 65)` | "Contact", "Request Lesson", "Pay" — high-intent buttons only |
| Action foreground | `--action-foreground` | warm near-black | Text on amber buttons (white fails AA) |
| Surface (page) | `--background` | cream `oklch(0.985 0.006 85)` | Default page background |
| Surface (card) | `--card` | pure white | Tutor cards, modals, inputs |
| Foreground | `--foreground` | warm near-black `oklch(0.22 0.022 65)` | Body and headings |
| Muted | `--muted-foreground` | warm gray | Metadata, helper text |
| Border | `--border` | warm light gray | Card edges, dividers |
| Gold (rating) | `--gold` | bright amber `oklch(0.82 0.16 85)` | Star ratings only — kept yellower than action so users do not confuse the two |
| Success | `--success` | muted emerald | Verified state, "responds fast", confirmation |
| Destructive | `--destructive` | warm red | Errors and destructive confirmations |

**Strict rule:** the action color is sacred. Use it *only* for primary conversion CTAs (lesson request, contact, pay). Brand teal carries everything else (navigation, secondary actions, links, branding). Two action buttons on the same fold is a red flag — pick one.

**Dark mode:** reserved for the teacher operations panel (Faz 6+). Customer-facing pages render in light mode only for now.

## Typography

The system uses **Plus Jakarta Sans** as the single typeface across UI and content. Inter is intentionally avoided — it has become the default of every AI-generated SaaS template and dilutes brand identity. Plus Jakarta Sans has full Turkish glyph support (`latin-ext`) and a slightly humanist character that complements the warm palette.

- Headings: weight 600–800, tight tracking (−0.015 to −0.02em).
- Body: weight 400, line-height 1.6 for tutor biographies and long-form content.
- Numerals: rely on default tabular for stat displays.
- Locale-aware formatting (currency, dates) lives in `src/lib/format.ts` — never hard-code Turkish strings into formatters.

## Layout & Spacing

Desktop content lives inside a 1280px container with a 12-column rhythm. Mobile uses a fluid single column with 16px safe margins. Spacing follows an **8px baseline rhythm** (use Tailwind's `gap-2/4/6/8`, not arbitrary pixel values).

Mobile-first is non-negotiable: every screen is designed at 375px first, then progressively enhanced. Critical CTAs surface as a sticky bottom bar on small screens (`MobileBottomBar`). Card-in-card layouts are forbidden — flatten one level.

## Elevation & Depth

Three layers, no more:

1. **Page (cream).** Where you stand.
2. **Card (white) with `--shadow-card`.** Repeated content units, sit one rest above the page.
3. **Overlay (white) with `--shadow-elevated`.** Sheets, dialogs, popovers — physically lifted off the page.

Hover lifts use `-translate-y-0.5` plus `--shadow-elevated`. CTAs may carry `--shadow-action` (subtle amber glow) for added emphasis on hero placements only — never inside dense lists.

## Shapes

Rounded but not playful.

- Buttons, inputs, chips: 0.5–0.75rem (`rounded-md`/`rounded-lg`).
- Cards, dialogs: 1rem–1.5rem (`rounded-2xl`/`rounded-3xl`).
- Avatars: full circle for round photo style, `rounded-2xl` for editorial squares.
- Verified rosettes and rating badges: full pill / circle.

## Components

### Buttons
- **Action (`bg-action`):** the only orange/amber on the page. Reserved for primary conversion (lesson request, contact, pay). Uses dark warm text, never white.
- **Brand (`bg-primary`):** teal. Used for "View Profile", "Search", branded selections.
- **Outline / Ghost:** secondary navigation, tertiary actions.

### Trust Signals (TeacherCard)
- **Verified badge:** teal-soft pill with shield icon. Only when both identity *and* diploma checks pass.
- **Premium badge:** amber-soft pill, distinct from `--action` button so users don't read it as a CTA.
- **Rating:** gold stars (`--gold`), 0.0–5.0 with one decimal, count in muted gray.
- **Response time:** clock pill — turns success-green if under 30 minutes.
- **Last active:** dot + relative time. Dot is success-green if active within 24h, otherwise muted.

### Inputs & Selection
- Search bar is a focal point on landing pages — large height, `rounded-2xl`, never compressed.
- Sliders (price filter): teal track and thumb.
- Forms group with `react-hook-form` + `zod`. Error styles use `--destructive` only on submit, not on every keystroke.
- **No native `<select>` anywhere — ever.** Browser-default dropdowns ignore our palette, type ramp, focus ring, and rounded geometry; they also break the searchable + grouped + Turkish-fold behaviour we ship in filters. Use `BrandCombobox` (`src/components/ui/brand-combobox.tsx`) for single-select with search. For sort menus or short fixed lists where search is unnecessary, use the shadcn `Select` primitive (`src/components/ui/select.tsx`) — it shares our tokens and focus ring. Same rule for date and color pickers: no `<input type="date">` / `type="color">` — wrap our calendar primitive or build a brand picker.

### Mobile Navigation
- Drawers/Sheets via radix `Sheet`, side-anchored on mobile. Filter menus and locale switcher live here.
- A sticky bottom CTA bar (`MobileBottomBar`) carries the lead-request action on customer-facing pages — hidden on the lead form itself to avoid CTA-on-CTA.

## What this design system explicitly avoids

- Indigo + orange (overused in SaaS; doesn't differentiate from competitors).
- Cool slate-blue grays (banking-cold; signals "kurumsal" not "insan").
- Inter typeface (dilutes identity).
- Multi-color gradient backgrounds (cheap, distracts from trust signals).
- Decorative cartoon illustrations of students (childish; conflicts with parent audience).
- Drop-in stock photo collages (anonymous; defeats the verified-teacher message).
- Excessive viewport-unit font scaling (introduces hydration risk and unstable widths).
