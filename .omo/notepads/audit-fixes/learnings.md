# Learnings — audit-fixes

## Project Conventions
- React 19 + TypeScript + Vite 6
- Tailwind v4 with design tokens in `src/styles/tokens.css`
- State via custom hooks in `src/hooks/`
- API routes use ES modules in `api/`
- Auth hybrid: Supabase Auth + legacy password

## Key Gotchas
- `tsconfig.json` excludes test files from typecheck: `"exclude": ["src/**/*.test.ts", "src/**/*.test.tsx"]`
- `skipLibCheck: true` — external types not validated
- React Router v7 — updating may break routes

## Patterns Observed
- Lazy loading for heavy components (CommunityLandingPage, Gallery, Album)
- Manual code splitting in vite.config.ts
- Dark mode support with CSS class switching
