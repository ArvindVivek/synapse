# Coding Conventions

**Analysis Date:** 2026-01-28

## Naming Patterns

**Files:**
- Components: PascalCase (e.g., `layout.tsx`, `page.tsx`)
- TypeScript files: camelCase or PascalCase depending on component/utility role
- Configuration files: kebab-case or camelCase (e.g., `next.config.ts`, `eslint.config.mjs`)

**Functions:**
- React component functions: PascalCase (e.g., `RootLayout`, `Home`)
- Regular functions: camelCase
- Export default used for page components in Next.js App Router

**Variables:**
- Constants: camelCase or UPPER_SNAKE_CASE for CSS variables
- Local variables: camelCase
- CSS custom properties: kebab-case with `--` prefix (e.g., `--font-geist-sans`, `--background`)

**Types:**
- TypeScript types and interfaces: PascalCase
- Type imports use `type` keyword (e.g., `import type { Metadata } from "next"`)
- Read-only types marked with `Readonly` (e.g., `Readonly<{ children: React.ReactNode }>`)

## Code Style

**Formatting:**
- No explicit Prettier configuration file present
- Relies on ESLint for linting with Next.js configuration
- 2-space indentation (standard JavaScript/TypeScript default)
- Quote style: double quotes for JSX attributes and imports

**Linting:**
- ESLint v9 with flat config format (`eslint.config.mjs`)
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Configuration location: `/Users/arvind/Documents/Hackathons/Cloud9 x JetBrains 2026/synapse/eslint.config.mjs`
- Ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`

## Import Organization

**Order:**
1. External dependencies (`next`, `react`)
2. Type imports (marked with `type` keyword)
3. Internal modules and components
4. Stylesheets (e.g., `./globals.css`)

**Path Aliases:**
- Configured in `tsconfig.json`: `@/*` maps to project root
- Used to reference files from root: `@/...` prefix available but not actively used in current codebase

**Example from codebase:**
```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
```

## Error Handling

**Patterns:**
- No explicit error handling patterns detected in minimal codebase
- React components export error boundary compatible structures
- TypeScript strict mode enabled for compile-time type safety

## Logging

**Framework:** Not configured
- No logging framework present (console not used in current code)
- Standard approach would be console methods if needed

## Comments

**When to Comment:**
- Minimal use in current codebase
- Comments appear only in configuration files for clarity
- Focus on self-documenting code with clear naming

**JSDoc/TSDoc:**
- Not actively used in current codebase
- TypeScript types provide inline documentation

## Function Design

**Size:** Small, focused functions
- React components: Single responsibility principle
- Example: `RootLayout` provides layout wrapper, `Home` provides page content

**Parameters:**
- Destructured props used in React components
- Type annotations for all parameters and returns
- Example: `{ children }: Readonly<{ children: React.ReactNode }>`

**Return Values:**
- Components return JSX elements
- Explicit return types for all functions

## Module Design

**Exports:**
- Default exports for Next.js page components
- Named exports for utility components and types
- Type exports marked explicitly with `export type`

**Barrel Files:**
- Not used in current minimal codebase
- Not necessary for two-page application

## TypeScript Configuration

**Strict Mode:** Enabled
- Location: `tsconfig.json`
- Options enforced:
  - `strict: true` - Enables all strict type checking options
  - `noEmit: true` - No JavaScript output
  - `skipLibCheck: true` - Skip type checking of declaration files
  - `isolatedModules: true` - Ensures each file can be safely transpiled
  - `esModuleInterop: true` - Better interop between modules
  - `jsx: "react-jsx"` - Modern JSX transform

**Module Resolution:**
- `moduleResolution: bundler` - Uses bundler-style module resolution
- Target: ES2017 with esnext module system

---

*Convention analysis: 2026-01-28*
