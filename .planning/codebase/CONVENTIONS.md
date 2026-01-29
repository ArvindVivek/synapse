# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `layout.tsx`, `page.tsx`)
- Configuration files: lowercase with extension (e.g., `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`)

**Functions:**
- Functional components: PascalCase (e.g., `Home`, `RootLayout`)
- Exported functions: camelCase (e.g., `default` for functional components)
- Constants: camelCase (e.g., `geistSans`, `geistMono`, `nextConfig`)

**Variables:**
- Local constants: camelCase (e.g., `geistSans`, `geistMono`)
- React props: destructured with camelCase names
- Component props interfaces: Readonly pattern with explicit type unions

**Types:**
- Metadata type: `Metadata` imported from Next.js typing (`import type { Metadata }`)
- Type imports: prefixed with `type` keyword to ensure tree-shaking

## Code Style

**Formatting:**
- File: `eslint.config.mjs` configuration
- Uses Tailwind CSS for styling with utility classes
- JSX attributes use double quotes for strings, template literals for dynamic values
- Import organization and ordering handled by ESLint config

**Linting:**
- Tool: ESLint v9 (flat config format)
- Configuration: `eslint.config.mjs` (uses flat config, not legacy `.eslintrc`)
- Rules: Extends `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Global ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

## Import Organization

**Order:**
1. External packages (Next.js, React, third-party)
2. Internal modules and stylesheets
3. Type imports prefixed with `type` keyword

**Path Aliases:**
- Configured in `tsconfig.json`
- Alias: `@/*` maps to project root `./`
- Usage allows for cleaner imports across the codebase

**Examples from codebase:**
```typescript
import Image from "next/image";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
```

## Error Handling

**Patterns:**
- No explicit error handling patterns observed in current codebase
- Next.js error boundaries expected to be implemented following Next.js documentation
- Server-side errors handled through Next.js error pages or middleware

## Logging

**Framework:** Not configured
- No logging library detected in dependencies
- Logging would use native `console` methods if needed
- No structured logging framework in place

## Comments

**When to Comment:**
- Minimal commenting observed in source code
- Comments used selectively for non-obvious logic
- Code is expected to be self-documenting through clear naming

**JSDoc/TSDoc:**
- Not required in current codebase
- Type annotations preferred over JSDoc for documentation
- Next.js metadata and configuration types are well-documented in imports

## Function Design

**Size:** Functional components kept focused on single responsibility (e.g., `Home`, `RootLayout`)

**Parameters:**
- Function parameters destructured for clarity
- Props destructured in component signatures with explicit Readonly type unions
- Example from `layout.tsx`:
```typescript
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
```

**Return Values:**
- Components return JSX elements
- Explicit type annotations for metadata exports (e.g., `export const metadata: Metadata = {...}`)

## Module Design

**Exports:**
- Default exports for page components and layouts (`export default function`)
- Named exports for metadata and configuration (`export const metadata: Metadata`)
- Components follow Next.js App Router conventions

**Barrel Files:**
- Not used in current minimal codebase
- Can be employed in future multi-file directories following index pattern

## TypeScript Configuration

**Compiler Options:**
- Target: ES2017
- Strict mode enabled (`"strict": true`)
- JSX: react-jsx for modern React
- Module resolution: bundler (Next.js standard)
- Incremental builds enabled for faster development

**Key Settings:**
- `noEmit: true` - Type checking only, compilation handled by Next.js
- `isolatedModules: true` - Each file can be transpiled independently
- `allowJs: true` - JavaScript files can coexist with TypeScript

---

*Convention analysis: 2026-01-28*
