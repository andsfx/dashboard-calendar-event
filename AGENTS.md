# AGENTS.md

Project: Dashboard Calendar Event
Path: /home/ubuntu/dashboard-calendar-event
Type: React 19 + TypeScript + Vite + Tailwind dashboard for Metropolitan Mall Bekasi event management
Remote: https://github.com/andsfx/dashboard-calendar-event.git

Facts verified from files:
- package.json name: dashboard-calendar-event
- README says app manages and monitors event schedules for Metropolitan Mall Bekasi
- Tech stack in README: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide React, date-fns, Google Apps Script
- Env template includes ADMIN_PASSWORD, Supabase keys, R2 storage, Apps Script URL
- Vercel config exists: vercel.json and .vercel/

Commands from package.json:
- Dev: npm run dev
- Build: npm run build
- Unit test: npm run test:unit
- E2E: npm run test:e2e
- Visual test: npm run test:visual
- All main tests: npm run test:all

Project conventions:
- UI preference: Metmal-like pastel, clean data-first dashboard, hidden/sectioned forms, list/table hybrid layouts.
- TypeScript is strict; tsconfig has noUncheckedIndexedAccess and noImplicitReturns.
- Do not expose Supabase service role, R2 keys, admin password/token, or Apps Script token.
- Remote URL may contain credential in local git config; never copy credential into docs or output.
- improve/ is separate prototype folder; use improve/AGENTS.md there.

Verification:
- For code changes, prefer npm run build plus targeted tests.
- For UI changes, consider Playwright/visual tests if affected surface is visual.

General agent rules:
- Respond in Indonesian by default for Andy.
- Be terse for status updates; keep exact paths, commands, errors, and URLs.
- Inspect files before editing. Prefer targeted patches.
- Never commit secrets from .env or credential files.
- Verify with project scripts when feasible.

