# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
synapse/
├── app/                    # Next.js App Router - all application code
│   ├── layout.tsx         # Root layout wrapper for all routes
│   ├── page.tsx           # Home page component (/ route)
│   ├── globals.css        # Global styles and CSS variables
│   └── favicon.ico        # Browser favicon
├── public/                # Static assets served directly
│   ├── next.svg          # Next.js branding
│   ├── vercel.svg        # Vercel branding
│   ├── file.svg          # Icon assets
│   ├── globe.svg         # Icon assets
│   └── window.svg        # Icon assets
├── docs/                  # Project documentation (tracked)
├── .planning/             # GSD planning documents
│   └── codebase/         # Architecture and codebase analysis
├── node_modules/          # Dependencies (not tracked)
├── .next/                 # Next.js build output (not tracked)
├── package.json           # Project dependencies and scripts
├── package-lock.json      # Dependency lock file
├── tsconfig.json          # TypeScript configuration
├── next.config.ts         # Next.js build configuration
├── eslint.config.mjs      # ESLint linting rules
├── postcss.config.mjs     # PostCSS/Tailwind configuration
├── .gitignore            # Git exclusion rules
└── README.md             # Project setup documentation
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router application code (all routes, layouts, pages)
- Contains: Route handlers, Server Components, layout components, CSS
- Key files: `layout.tsx`, `page.tsx`, `globals.css`
- Gitignore strategy: Not ignored; all committed

**`public/`:**
- Purpose: Static assets served directly without processing
- Contains: SVG icons, images, favicons
- Key files: `next.svg`, `vercel.svg`, various icon assets
- Gitignore strategy: Not ignored; all committed

**`docs/`:**
- Purpose: Project documentation directory
- Contains: Markdown or other documentation files
- Key files: Varies by documentation type
- Gitignore strategy: Not ignored; tracked in git

**`.planning/`:**
- Purpose: GSD planning and analysis documents
- Contains: Architecture, structure, testing, and concerns analysis
- Key files: `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md`
- Gitignore strategy: Typically not ignored; useful for team reference

**`.next/`:**
- Purpose: Build output and cache
- Contains: Compiled code, static exports, optimization cache
- Gitignore strategy: Ignored (entry in `.gitignore`)

**`node_modules/`:**
- Purpose: Installed npm dependencies
- Contains: All third-party packages and their dependencies
- Gitignore strategy: Ignored (standard practice)

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root HTML structure, global providers, font setup
- `app/page.tsx`: Home page component (root `/` route)

**Configuration:**
- `tsconfig.json`: TypeScript compiler configuration with strict mode
- `next.config.ts`: Next.js build and runtime options
- `postcss.config.mjs`: PostCSS/Tailwind CSS pipeline
- `eslint.config.mjs`: Linting rules and defaults
- `package.json`: Dependencies, scripts, project metadata

**Styling:**
- `app/globals.css`: Global styles, CSS variables, theme definitions
- Inline: Tailwind CSS classes in `.tsx` files

**Assets:**
- `app/favicon.ico`: Browser tab icon
- `public/`: SVG assets for branding and icons

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention for route files)
- Layout components: `layout.tsx` (Next.js convention for layout files)
- Styles: `globals.css` (global scope), inline Tailwind classes (component scope)
- Config files: kebab-case or camelCase (e.g., `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`)

**Directories:**
- lowercase: `app/`, `public/`, `docs/`, `node_modules/`
- Hidden with leading dot: `.git/`, `.next/`, `.planning/`, `.gitignore`

**Variables/Exports:**
- PascalCase for React components: `Home`, `RootLayout`
- camelCase for functions/utilities: `geistSans`, `geistMono`
- CONSTANT_CASE for CSS variables (with custom property syntax): `--background`, `--foreground`

## Where to Add New Code

**New Feature/Page:**
- Primary code: `app/[route-name]/page.tsx` (create new directory per route)
- Shared layout: Update or create `app/[route-name]/layout.tsx` if route-specific styling needed
- Styles: Use Tailwind utility classes in component `className` attributes
- Example structure for `/about` route:
  ```
  app/
  └── about/
      └── page.tsx          # Component for /about
  ```

**New Component/Module:**
- Implementation: Create `app/components/` directory for reusable components
- Example:
  ```
  app/
  └── components/
      └── Header.tsx        # Reusable header component
  ```

**Utilities/Helpers:**
- Shared helpers: Create `app/lib/` directory for utility functions
- Example:
  ```
  app/
  └── lib/
      └── utils.ts         # Shared utility functions
  ```

**Styling:**
- Global styles: Add to `app/globals.css`
- Component-level: Use Tailwind utility classes in `className` attributes
- Custom CSS: Create `app/styles/` directory if needed for module-specific CSS files

**Types/Interfaces:**
- Shared types: Create `app/types/` directory
- Example:
  ```
  app/
  └── types/
      └── index.ts         # Shared TypeScript types
  ```

## Special Directories

**`.next/`:**
- Purpose: Next.js build artifact and cache
- Generated: Yes (by `npm run build` and dev server)
- Committed: No (in `.gitignore`)
- Safety: Safe to delete; will be regenerated on next build

**`node_modules/`:**
- Purpose: Installed npm packages from `package.json`
- Generated: Yes (by `npm install`)
- Committed: No (in `.gitignore`)
- Safety: Safe to delete; reinstall with `npm install`

---

*Structure analysis: 2026-01-28*
