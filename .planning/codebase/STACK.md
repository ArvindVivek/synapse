# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.x - Full codebase (strict mode enabled)
- JavaScript - Configuration files (ESLint, PostCSS, Next.js config)

**Secondary:**
- CSS - Styling with Tailwind CSS utilities

## Runtime

**Environment:**
- Node.js (version specified in package.json, no explicit version lock file)

**Package Manager:**
- npm - Used for dependency management
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.6 - Full-stack React framework with App Router
- React 19.2.3 - UI library
- React DOM 19.2.3 - DOM rendering

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- PostCSS 4.x - CSS transformation pipeline

**Build/Dev:**
- Next.js built-in dev server (dev: `next dev`)
- Next.js production build (build: `next build`)
- Next.js production server (start: `next start`)

## Key Dependencies

**Critical:**
- next (16.1.6) - React framework with server-side rendering, API routes, and App Router
- react (19.2.3) - React library for component-based UI
- react-dom (19.2.3) - React rendering library for web

**Styling & CSS:**
- tailwindcss (4.x) - Utility-first CSS framework
- @tailwindcss/postcss (4.x) - Tailwind CSS PostCSS plugin

**Development:**
- typescript (5.x) - TypeScript compiler and type checking
- eslint (9.x) - Code linting
- eslint-config-next (16.1.6) - Next.js ESLint configuration with web vitals and TypeScript support
- @types/node (20.x) - Node.js type definitions
- @types/react (19.x) - React type definitions
- @types/react-dom (19.x) - React DOM type definitions

## Configuration

**Environment:**
- No `.env` or `.env.local` files present
- Tailwind CSS configured via PostCSS plugin in `postcss.config.mjs`
- No runtime environment variables currently configured

**Build:**
- TypeScript configuration: `tsconfig.json` (strict mode, ES2017 target, bundle module resolution)
- ESLint configuration: `eslint.config.mjs` (Next.js core web vitals + TypeScript support)
- PostCSS configuration: `postcss.config.mjs` (Tailwind CSS plugin)
- Next.js configuration: `next.config.ts` (minimal, no custom configuration)

**TypeScript Path Aliases:**
- `@/*` → maps to root directory (allows `@/app/...` imports)

## Platform Requirements

**Development:**
- Node.js runtime
- npm package manager
- Modern browser for development (Next.js dev server at localhost:3000)

**Production:**
- Node.js runtime (for Next.js server)
- Deployment target: Vercel (recommended in README) or any Node.js hosting

---

*Stack analysis: 2026-01-28*
