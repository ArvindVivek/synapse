# External Integrations

**Analysis Date:** 2026-01-28

## APIs & External Services

**Not detected** - No external API integrations currently configured in the codebase. No API clients or SDK imports found.

## Data Storage

**Databases:**
- Not applicable - No database integration detected

**File Storage:**
- Local filesystem only - Uses Next.js public directory (`/public`) for static assets

**Caching:**
- None - No caching layer integrated

## Authentication & Identity

**Auth Provider:**
- Not applicable - No authentication system implemented

## Monitoring & Observability

**Error Tracking:**
- None - No error tracking service integrated

**Logs:**
- Console logging only - No structured logging service configured

## CI/CD & Deployment

**Hosting:**
- Recommended: Vercel (mentioned in README and ESLint config templates)
- Alternative: Any Node.js hosting environment

**CI Pipeline:**
- Not detected - No CI/CD configuration files found (no GitHub Actions, GitLab CI, Jenkins, etc.)

## Environment Configuration

**Required env vars:**
- None currently configured

**Secrets location:**
- No secrets management system configured
- `.env*` files are in `.gitignore` but no `.env` files currently exist

## Webhooks & Callbacks

**Incoming:**
- None detected - No webhook endpoints configured

**Outgoing:**
- None detected - No outbound webhook calls

## External Fonts

**Fonts:**
- Google Fonts integration via Next.js font optimization
  - Geist font family (sans-serif and monospace variants)
  - Implemented in: `app/layout.tsx`
  - Optimization: Automatic self-hosting via Next.js

## Static Assets

**CDN/Hosting:**
- Vercel public CDN (if deployed on Vercel)
- Local public directory: `/public`
  - Contains: `next.svg`, `vercel.svg`, `favicon.ico`

---

*Integration audit: 2026-01-28*
