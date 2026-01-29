# Codebase Structure

**Analysis Date:** 2026-01-28

## Directory Layout

```
synapse/
├── app/                        # Next.js App Router (primary code location)
│   ├── layout.tsx              # Root layout wrapper
│   ├── page.tsx                # Home page (placeholder)
│   ├── globals.css             # Global styling with TailwindCSS
│   ├── favicon.ico             # Brand icon
│   └── (api)/                  # API routes (to be created)
│
├── public/                     # Static assets
│   ├── next.svg                # Next.js logo
│   └── vercel.svg              # Vercel logo
│
├── .planning/                  # GSD planning documents (auto-generated)
│   └── codebase/               # Codebase analysis (this directory)
│       ├── ARCHITECTURE.md     # Architecture overview
│       ├── STRUCTURE.md        # File structure guide
│       └── (other analysis docs)
│
├── docs/                       # Project documentation
│   └── synapse_brd.md          # Business Requirements Document (comprehensive)
│
├── package.json                # Node.js dependencies and scripts
├── package-lock.json           # Dependency lock file
├── tsconfig.json               # TypeScript configuration
├── next.config.ts              # Next.js configuration
├── eslint.config.mjs           # ESLint rules (ESM format)
├── postcss.config.mjs          # PostCSS/TailwindCSS pipeline
├── .gitignore                  # Git exclusions
└── README.md                   # Project readme

Backend (not yet created):
backend/
├── main.py                     # FastAPI application entry
├── requirements.txt            # Python dependencies
├── models/                     # Trained ML models
├── analytics/                  # Intelligence engine modules
├── etl/                        # GRID API ETL pipeline
└── docker/                     # Container configuration
```

## Directory Purposes

**app/:**
- Purpose: Next.js App Router - all page routes, components, and API routes live here
- Contains: React components, page.tsx files, API route handlers (api/ subdirectory)
- Key files: `layout.tsx` (root wrapper), `page.tsx` (home page), `globals.css` (styles)

**public/:**
- Purpose: Static files served by Next.js without processing
- Contains: Images, logos, favicon, manifests
- Key files: `next.svg`, `vercel.svg` (example assets)

**.planning/codebase/:**
- Purpose: GSD-generated codebase analysis documents (not committed during development)
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, etc.
- Key files: Markdown analysis documents

**docs/:**
- Purpose: Project-specific documentation
- Contains: Business requirements, implementation plans, API specifications
- Key files: `synapse_brd.md` (complete 2400+ line specification document)

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root Next.js layout with metadata and font configuration
- `app/page.tsx`: Home page (currently placeholder, will be replaced with `/draft-simulator`)
- `next.config.ts`: Next.js configuration (currently empty, ready for extensions)

**Configuration:**
- `tsconfig.json`: TypeScript with path aliases (`@/*` → root directory)
- `package.json`: Dependencies (Next.js 16, React 19, TailwindCSS 4, ESLint 9)
- `postcss.config.mjs`: PostCSS plugins (TailwindCSS v4 integration)
- `eslint.config.mjs`: ESLint configuration (Next.js core rules + TypeScript rules)

**Core Logic:**
- None yet in frontend - architecture is in `docs/synapse_brd.md`
- Planned locations: `app/(components)/` for draft simulator, `app/api/` for server routes

**Styling:**
- `app/globals.css`: Global styles with TailwindCSS @import and theme variables
- CSS variables: `--background`, `--foreground` (light/dark mode support)
- Font variables: `--font-geist-sans`, `--font-geist-mono` (Google Fonts)

**Testing:**
- Not yet configured (to be added)
- Planned: Jest or Vitest in `__tests__/` subdirectories

## Naming Conventions

**Files:**
- React components: `PascalCase.tsx` (e.g., `DraftSimulator.tsx`, `ChampionPoolAnalyzer.tsx`)
- Pages: lowercase with hyphen-separated routes (e.g., `app/draft-simulator/page.tsx`)
- Utilities: `camelCase.ts` (e.g., `calculateSynergy.ts`, `predictOpponentPick.ts`)
- API routes: `/api/[feature]/[action]` pattern (e.g., `/api/draft/recommend-pick`)

**Directories:**
- Feature directories: lowercase hyphenated (e.g., `draft-simulator/`, `champion-pool-analyzer/`)
- Shared utilities: `utils/`, `lib/`, `services/`
- Component directories: `components/` with PascalCase subdirectories

**Variables/Functions:**
- camelCase for variables and functions (TypeScript standard)
- UPPER_SNAKE_CASE for constants (e.g., `DRAFT_PHASES`, `CHAMPION_POOL_SIZE`)
- PascalCase for types and interfaces

**Types:**
- Suffix with `Type` or `Props` (e.g., `DraftStateType`, `RecommendationProps`)
- Interface names start with `I` if needed for distinction (e.g., `IDraftState`)

## Where to Add New Code

**New Feature - Draft Simulator:**
- Primary code: `app/(components)/draft-simulator/` directory
  - `DraftSimulator.tsx` - Main container component
  - `DraftBoard.tsx` - Pick/ban phase display
  - `RecommendationPanel.tsx` - Suggestions and predictions
  - `WinRateGauge.tsx` - Live win-rate visualization
- Tests: `app/(components)/draft-simulator/__tests__/`
- API handlers: `app/api/draft/` subdirectory

**New Component/Module:**
- Implementation: `app/(components)/[feature-name]/[ComponentName].tsx`
- Styling: Co-located with component or in `app/styles/` directory
- Type definitions: Co-located as `[ComponentName].types.ts`

**Utilities:**
- Shared helpers: `app/lib/utils/` directory
- Calculation functions: `app/lib/analytics/` (synergy, win-rate, predictions)
- API client: `app/lib/api/` (fetch wrappers, WebSocket client)

**Styling:**
- Global styles: `app/globals.css` (already established)
- Component styles: Tailwind classes inline or co-located `.module.css`
- Theme variables: Define in `app/globals.css` CSS variables (dark mode support ready)

## Special Directories

**node_modules/:**
- Purpose: Third-party dependencies (auto-generated)
- Generated: Yes
- Committed: No (in .gitignore)

**.next/:**
- Purpose: Build output and Next.js cache
- Generated: Yes (during `npm run build`)
- Committed: No (in .gitignore)

**.planning/:**
- Purpose: GSD planning artifacts and codebase analysis
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: No (in .gitignore)

**public/:**
- Purpose: Static assets served directly by Next.js
- Generated: No
- Committed: Yes (user-provided assets)

## Import Path Aliases

**Configured in tsconfig.json:**
- `@/*` maps to project root

**Usage Examples:**
```typescript
// Instead of:
import { DraftSimulator } from '../../../components/draft-simulator'

// Use:
import { DraftSimulator } from '@/app/components/draft-simulator'
```

## Dependency Management

**Production Dependencies:**
- `next@16.1.6` - React framework with App Router
- `react@19.2.3` - UI library
- `react-dom@19.2.3` - React DOM rendering

**Development Dependencies:**
- `typescript@^5` - Type checking
- `@types/react@^19`, `@types/react-dom@^19`, `@types/node@^20` - Type definitions
- `tailwindcss@^4` - Utility-first CSS framework
- `@tailwindcss/postcss@^4` - PostCSS plugin for Tailwind
- `eslint@^9`, `eslint-config-next@16.1.6` - Code linting

**Planned Additions (for implementation):**
- `zustand` - State management (draft state)
- `socket.io-client` - WebSocket client (real-time updates)
- `recharts` - Data visualization (win-rate gauge)
- `axios` or `fetch` wrapper - HTTP client (API calls)

## Scripts

**Available in package.json:**
- `npm run dev` - Start development server (hot reload on `localhost:3000`)
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm run lint` - Run ESLint validation

---

*Structure analysis: 2026-01-28*
