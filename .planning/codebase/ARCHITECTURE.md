# Architecture

**Analysis Date:** 2026-01-28

## Pattern Overview

**Overall:** Next.js App Router (Server-Centric)

**Key Characteristics:**
- File-based routing using the `app/` directory convention
- React 19 with Server Components as default rendering strategy
- TypeScript strict mode for type safety
- Tailwind CSS for utility-first styling
- Minimal initial structure (greenfield project)

## Layers

**Presentation Layer:**
- Purpose: React components rendering the user interface
- Location: `app/`
- Contains: Page components, layout components, React UI code
- Depends on: Next.js framework, React, styling utilities
- Used by: Browser client

**Layout Layer:**
- Purpose: Root HTML structure and shared layout templates
- Location: `app/layout.tsx`
- Contains: HTML metadata, font loading, CSS global imports, child route rendering
- Depends on: Next/font for optimized fonts, Next.js Metadata API
- Used by: All routes within the app directory

**Page Layer:**
- Purpose: Route-specific page content
- Location: `app/page.tsx`
- Contains: Home page component with hero section, calls-to-action, images
- Depends on: Next/image for optimized image loading
- Used by: Root route (`/`)

**Configuration Layer:**
- Purpose: Build, type checking, and linting configuration
- Location: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`
- Contains: Next.js build options, TypeScript compiler settings, ESLint rules
- Depends on: Node.js configuration standards
- Used by: Build tools and development server

## Data Flow

**Initial Page Load:**

1. Browser requests root route (`/`)
2. Next.js routes to `app/page.tsx` (Home component)
3. Root layout (`app/layout.tsx`) wraps the page component
4. Server-side rendering produces HTML with:
   - Google fonts (Geist sans and mono)
   - Global styles from `app/globals.css`
   - Tailwind CSS classes applied
   - Next.js Image component optimizations
5. Client receives fully-rendered HTML + hydration script
6. React hydrates interactive elements (currently minimal)

**Component Rendering:**
- `RootLayout` (layout.tsx) provides font variables and global styling context
- `Home` (page.tsx) is a default export Server Component
- Both use Tailwind CSS utility classes for styling
- Images use Next.js optimized Image component (from `next/image`)

**State Management:**
- Not detected. Currently stateless presentation components only.
- No client-side state libraries (React Context, Redux, Zustand, etc.)

## Key Abstractions

**Layout Component:**
- Purpose: Root layout wrapper enforcing consistent structure across routes
- Examples: `app/layout.tsx`
- Pattern: Exported default `RootLayout` functional component accepting `children` prop

**Page Components:**
- Purpose: Route-specific content rendering
- Examples: `app/page.tsx`
- Pattern: Default export functional components with no props (Server Components)

**Styling:**
- Purpose: Utility-first CSS with Tailwind and CSS variables
- Examples: `app/globals.css` (CSS variables), inline className attributes
- Pattern: Tailwind CSS @import, CSS custom properties for theming, responsive Tailwind modifiers (sm:, md:, dark:)

## Entry Points

**Server Entry (Next.js Build):**
- Location: `app/layout.tsx`
- Triggers: Server startup, route requests
- Responsibilities: Renders root HTML structure, loads fonts, applies global styles

**Client Entry (Browser):**
- Location: `app/page.tsx`
- Triggers: Root route (`/`) navigation
- Responsibilities: Renders home page content with hero section and CTAs

**Build Entry:**
- Location: `next.config.ts`
- Triggers: `npm run build`, `npm run dev`
- Responsibilities: Next.js configuration, empty by default

## Error Handling

**Strategy:** Not explicitly implemented. Relies on Next.js defaults.

**Patterns:**
- Error boundaries not configured
- No custom error pages (`error.tsx`) defined
- Error handling deferred to Next.js framework defaults

## Cross-Cutting Concerns

**Logging:** Not detected. No logging framework configured.

**Validation:** Not applicable (no form inputs or data processing in current structure).

**Authentication:** Not detected. No auth libraries or configuration present.

**Styling:** Tailwind CSS v4 via `@tailwindcss/postcss`. CSS custom properties for theme colors (--background, --foreground) with dark mode support via `prefers-color-scheme` media query.

---

*Architecture analysis: 2026-01-28*
