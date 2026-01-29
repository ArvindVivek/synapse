# Technology Stack

**Analysis Date:** 2026-01-28

## Languages

**Primary:**
- TypeScript 5.x - Used throughout application code, configuration files, and type definitions

**Secondary:**
- JavaScript (ESM) - Used in configuration files (eslint.config.mjs, postcss.config.mjs)
- CSS - Application styling via Tailwind CSS

## Runtime

**Environment:**
- Node.js (version not pinned; uses system default)

**Package Manager:**
- npm (npm 10+, based on lockfileVersion 3)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 16.1.6 - React framework with App Router pattern (`app/` directory structure)
- React 19.2.3 - UI library and component framework
- React DOM 19.2.3 - React DOM rendering for web applications

**Styling:**
- Tailwind CSS 4.x - Utility-first CSS framework
- @tailwindcss/postcss 4.x - PostCSS plugin for Tailwind CSS processing

**Development/Build:**
- TypeScript 5.x - Type checking and transpilation
- ESLint 9.x - Code linting with Next.js specific rules

## Key Dependencies

**Critical:**
- next@16.1.6 - Full-stack web framework providing build optimization, routing, and deployment capabilities
- react@19.2.3 - Core UI rendering and component system
- @tailwindcss/postcss@^4 - CSS generation and optimization

**Type Safety:**
- @types/node@^20 - Node.js type definitions
- @types/react@^19 - React component type definitions
- @types/react-dom@^19 - React DOM API type definitions

**Code Quality:**
- eslint@^9 - Linting framework
- eslint-config-next@16.1.6 - Next.js specific ESLint rules and configurations

## Configuration

**TypeScript:**
- Target: ES2017
- Module: ESNext with bundler resolution
- Strict mode enabled
- Path aliases: `@/*` maps to project root
- Config file: `tsconfig.json`

**Next.js:**
- Config file: `next.config.ts`
- App Router enabled (app/ directory)
- Font optimization via next/font with Google Fonts (Geist family)

**ESLint:**
- Config file: `eslint.config.mjs`
- Uses flat config format (ESLint v9+)
- Extends: eslint-config-next/core-web-vitals and eslint-config-next/typescript

**PostCSS:**
- Config file: `postcss.config.mjs`
- Plugin: @tailwindcss/postcss

**Styling:**
- Global CSS: `app/globals.css` using @import "tailwindcss"
- Dark mode support via prefers-color-scheme media query
- CSS variables for theming: --background, --foreground

## Platform Requirements

**Development:**
- Node.js (LTS or current)
- npm 10+
- macOS, Linux, or Windows with Node.js support

**Production:**
- Deployment via Vercel (documented in README)
- Can be self-hosted on any Node.js 18+ compatible platform
- Build output: `.next/` directory

---

*Stack analysis: 2026-01-28*
