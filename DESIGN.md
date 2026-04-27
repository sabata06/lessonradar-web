---
name: Academic Authority
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#7e3000'
  on-tertiary: '#ffffff'
  tertiary-container: '#a44100'
  on-tertiary-container: '#ffd2be'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ffb695'
  on-tertiary-fixed: '#351000'
  on-tertiary-fixed-variant: '#7b2f00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  h1:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 0.5rem
  sm: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  container-max: 1280px
  gutter: 1rem
---

## Brand & Style

The brand personality of this design system is built on the intersection of academic reliability and modern efficiency. It targets students and parents seeking immediate educational solutions, requiring a UI that feels both authoritative and frictionless. 

The design style follows a **Corporate / Modern** aesthetic with **Minimalist** influences. By utilizing heavy whitespace and high-contrast typography, the system directs focus toward conversion-driving elements. The emotional response is one of "informed confidence"—users should feel that the platform is high-end, secure, and populated by verified professionals.

## Colors

The palette is strategically split between "Trust" and "Action." Indigo-600 serves as the primary brand anchor, used for navigation, branding, and secondary interactions to establish stability. Orange-500 is reserved strictly for high-value conversion points—such as "Book Now" buttons or "Limited Availability" alerts—to create a clear visual hierarchy of urgency.

The background uses a subtle Slate-50 to provide a soft contrast against the pure white of the content cards, helping to define the layout without heavy borders. Text utilizes Slate-900 for maximum legibility in headings, while Slate-500 provides a legible but distinct hierarchy for supporting body copy and metadata.

## Typography

This design system utilizes **Inter** exclusively to ensure a clean, systematic, and utilitarian feel across all devices. The typographic scale emphasizes high contrast between weights (Bold for headings, Regular for body) to facilitate quick scanning—essential for users comparing multiple tutor profiles.

Tight letter-spacing is applied to larger headlines to maintain a modern, "tight" look, while body text uses a generous line height (1.6) to ensure long-form tutor biographies remain accessible and easy to read.

## Layout & Spacing

The system employs a **Fixed Grid** model for desktop and a fluid, single-column model for mobile. On desktop, content is housed within a 1280px central container with a 12-column structure. Spacing is governed by an 8px baseline grid to ensure mathematical harmony across all components.

Mobile layouts prioritize "Safe Margins" of 1rem (16px) to ensure touch targets do not bleed into screen edges. Horizontal scrolling "Shelves" are recommended for mobile tutor categories to maximize vertical screen real estate for search results.

## Elevation & Depth

Hierarchy is achieved through **Tonal Layers** and **Ambient Shadows**. The base layer is the Slate-50 background. Content sits on Layer 1 (White Cards) with a very soft, diffused shadow (Y: 1px, Blur: 3px, Opacity: 0.05) to distinguish them from the page.

Higher elevation tiers, such as Dialogs or Sheets, use a more pronounced shadow with a larger blur radius to create a physical sense of "overlay." This system avoids heavy borders, relying instead on subtle value changes to communicate depth and interactivity.

## Shapes

The design system uses a **Rounded** (Level 2) shape language. This ensures that UI elements feel approachable and modern rather than clinical or sharp. 

- Standard components (Buttons, Inputs) use a 0.5rem (8px) radius.
- Large containers (Cards, Dialogs) use a 1rem (16px) radius.
- Specific elements like Avatars and "Verified" badges should use a full pill/circular radius to denote personality and status respectively.

## Components

### Buttons
- **Primary Action (Orange-500):** Reserved for "Book," "Contact," and "Pay." Uses white text and a subtle hover shift to Orange-600.
- **Brand Action (Indigo-600):** Used for "View Profile," "Search," and "Filter."
- **Ghost/Outline:** Used for secondary navigation items.

### Cards & Trust Signals
- **Tutor Cards:** Must feature a prominent Avatar with a "Verified" badge overlay. Ratings (Stars) should appear in a specialized "Gold" text color (#f59e0b) for immediate recognition.
- **Badges:** Use Indigo-50 backgrounds with Indigo-600 text for skills/tags to maintain brand consistency without competing with CTAs.

### Inputs & Selection
- **Search Bar:** Large, centered, with a 1rem roundedness to feel like a focal point of the landing page.
- **Slider (shadcn):** Used for price filtering, utilizing the Indigo-600 color for the track and thumb.

### Mobile Navigation
- **Sheets/Drawers:** Use for filtering menus on mobile to maintain a "thumb-friendly" interface. Bottom-aligned drawers are preferred for selecting tutor subjects or date ranges.