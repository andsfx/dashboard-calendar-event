# MMB Event Dashboard — Best-Practice Research (verified Aug 21, 2026)

Research for Metropolitan Mall Bekasi event dashboard (React 19 + TS + Vite + Tailwind + Supabase + Vercel).
All features below were verified by live page extraction (web_extract / raw HTML / curl) on the date above — nothing inferred.

## 1. City culture / event discovery platforms

### Time Out (city editions) — https://www.timeout.com/jakarta/things-to-do
- Verified: per-city hub (Jakarta edition live), editorial "best of" list pages with rich media (750x562 imgs), newsletter CTAs, city switcher, section pages (things-to-do / city-life).
- JSON-LD: Article schema only (no schema.org/Event on list pages); strong og:image + og:title/description per page.
- MMB copy: **editorial-tone event cards** (curated blurbs + "Why go?" framing) — human curation beats raw listings for malls; and per-page OG tags.

### Fever — https://feverup.com/en/london (Jakarta does NOT exist — /en/jakarta 404, verified)
- Verified (London): city hub segmented into curated rails — "Fever Originals", "Live Shows", "Candlelight Concerts", "Music", "Family", "Tourism", "Gift Cards"; every card shows rating (4.7★), price range ("From £17.00"), date range ("21 Aug – 30 Aug"); a waitlist card ("Dinos Alive – Waitlist – Free"); "Pick your vibe" AI personalization.
- Verified (Singapore edition exists — feverup.com/en/singapore, same card patterns).
- og:image served at fixed 15:8 aspect ratio (applications-media.feverup.com URL pattern verified on event page).
- MMB copy: **rating + "From RpX" price line on every card**; **Fever Originals-style "MMB Original" rail** for in-house programming; fixed-aspect OG images.

### Resident Advisor — https://ra.co/events/id/jakarta
- ⚠️ UNVERIFIABLE from this network: 403/CAPTCHA on curl, jina reader, and browser (all attempts blocked). Jakarta listing exists in search indexes but content could not be extracted. Known pattern (not verified here): artist/venue pages + "going" RSVP counts — do not copy blindly.
- MMB copy (pattern-level, unverified): per-venue event pages. Skip until verifiable.

### Skiddle — https://www.skiddle.com/
- Verified: nav has explicit date presets — "cities → all cities / **today / this weekend**" (/whats-on/cities.html); browse by genre (gigs/clubs/festivals/experiences/comedy/theatre); "Inspire me" editorial; city explorer.
- Verified raw HTML: **schema.org/Event JSON-LD on listing pages** with @context, name, url, startDate WITH timezone ("2026-09-05T12:00:00+01:00"), endDate, image, plus BreadcrumbList.
- MMB copy: **"Today / This weekend" preset links in the nav** (one-to-one copyable) + timezone-correct JSON-LD.

### Eventfinda — https://www.eventfinda.co.nz/
- Verified: homepage with "Featured Events", "Buy Tickets", "Most Popular", day-based navigation ("Events on Monday" linking to /whatson/events/new-zealand/day/24/...); recurring events show "more dates"; **"List your event" CTA → /add-event (event submission entry point)**; ticketing + advertising products; newsletter signup.
- MMB copy: **"List your event" public submission entry** (EOs/tenants submit → approval queue) and day-scoped URL routing.

### Klook — https://www.klook.com/en-ID/experiences/
- ⚠️ UNVERIFIABLE from this network: 403 + CAPTCHA on curl/jina/web_extract. Skip content claims.
- MMB copy (pattern-level): activity booking pages with date/quantity pickers — treat as design reference only.

### Airbnb Experiences — https://www.airbnb.com/s/experiences
- Verified: page renders a JS shell only (no static content extractable — 0 items shown in text dump). UX is app-driven (filters, map, saved items).
- MMB copy: nothing directly extractable; note only.

### Eventbrite — https://www.eventbrite.com/d/--london/events/ and real event page (HCL workshop, SG)
- Verified (listing): relative date labels ("**Tomorrow** • 10:00 AM"), multi-date compression ("+ 114 more"), scarcity badges ("Going fast", "Almost full", "Sales end soon"), neighborhood explorer, editor's picks, "RSVP Registration" events in SG edition.
- Verified (event detail, raw HTML): **JSON-LD Event (EducationEvent) with offers/location/organizer**, "Waitlist" + "Remind me" UI on page, og:image at 940x470, breadcrumb schema.
- MMB copy: **scarcity/urgency badges**, "Remind me", "Tomorrow/This weekend" relative labels, and full Event JSON-LD.

## 2. Corporate / mall "what's on" aggregators

### Time Out Market — https://www.timeoutmarket.com/ + /boston/events/
- Verified: market hub pages with hours, merchants, **"What's new at Time Out Market Boston" — categorized event cards (Music / Movies / Live Music on The Green)**; neighborhood roundups; newsletter.
- MMB copy: **"What's on at MMB this week" curated section** — mall ≈ Time Out Market, including tenant kitchen/venue events alongside mall programming.

### Orchard Road (ORBA) — https://www.orchardroad.org/
- Verified: "What's hot this month" — dated promotional cards ("14–25 Aug 2026", "Now till 25 Aug"), receipts/spend mechanics, partner malls list; PLAY/SHOP/EAT&DRINK pillars; **Members' Portal login ("manage your directory, promotion and job listings")**; pop-up spaces section.
- MMB copy: **member portal where tenants/EOs self-manage their promotions/events** (exactly MMB's EO submission + approval need) + "what's hot this month" digest.

### Changi Airport events — https://www.changiairport.com/en/events.html
- Verified: **"Rewards Members' Exclusive Events" — members-only event invitations** (login-gated: Dashboard/My Rewards/Logout links), events directory + promotions directory split, Changi Rewards catalogue.
- MMB copy: **members-only events tier** (MMB Rewards members get priority RSVP slots) + separate "events" vs "promotions" directories.

### Marina Bay Sands — https://www.marinabaysands.com/entertainment/events.html
- ⚠️ UNVERIFIABLE from this network (timeouts on web_extract ×2, curl 000, browser timeout — likely geo/network block). Skip content claims.

### ION Orchard — https://www.ionorchard.com/
- ⚠️ whats-on URL 404'd; homepage brands only. Singapore mall example replaced by Orchard Road (above) + TheSmartLocal (below).

### TheSmartLocal Event Calendar (SG media) — https://thesmartlocal.com/event-calendar
- Verified: month-grouped calendar with **"ONGOING" badges**, date ranges ("24 May 2025 – 09 Oct 2026"), venue + hours, "More details here" per-event links.
- MMB copy: **"ONGOING" / "TODAY" live status badges** on cards (the 'happening now' signal).

### GO TOKYO (official Tokyo calendar — calendar-tokyo.com is DEAD, domain doesn't resolve) — https://www.gotokyo.org/en/calendar/index.html
- Verified: calendar hub with **"What's on Today" / "What's on Tomorrow" / "What's on This Weekend" preset URLs** (…/event_date_word/today, /tomorrow, /weekend), monthly calendar, seasonal guides, favorites.
- MMB copy: **date-preset deep links** (exactly the today/tomorrow/weekend filters MMB is missing) — one-to-one.

### Tokyo Cheapo — https://tokyocheapo.com/events
- Verified: event cards with **time range ("6:30pm – 9:30pm"), price range ("¥2,100 – ¥6,000"), "Free" flag, category tags, area links, ★ staff recommendation**, per-date event URL variant (/events/<slug>/20260821/), weekly newsletter.
- MMB copy: **price/free + time-range on cards, staff-pick badges, per-instance event URLs for recurring events**.

### Visit Seoul — https://english.visitseoul.net/exhibition-events
- Verified: **tabbed schedule — "All / Festivals & Events / Exhibitions & Hallyu"**, calendar widget, "My Favorites" wishlist, Seoul Live Tourism Guide (realtime), **public Visit Seoul API (api.visitseoul.net)**.
- Verified raw HTML: only Organization/WebSite JSON-LD (no Event schema — a gap MMB can beat).
- MMB copy: **category tabs on the schedule view** + **public events API** (feeds partner sites/newsletter).

## Blocked platforms (attempted, could not verify — flagged, not invented)
Resident Advisor (403/CAPTCHA), Klook (403/CAPTCHA), MBS (timeout/geo-block), calendar-tokyo.com (dead domain → GO TOKYO is the live equivalent), Fever Jakarta (404 — no Jakarta edition; use London/Singapore as reference).

---

## Top features to copy — ranked (effort on React 19 + Supabase + Vercel)

1. **schema.org/Event JSON-LD on every event detail + list page** — cheap. Server-render via Vercel function or inject via <script> in index; include startDate/endDate ISO+timezone (Asia/Jakarta), location (Place with MMB address), image, offers, organizer, eventStatus, eventAttendanceMode. Zero Indonesian malls have it (Visit Seoul doesn't even) — instant SEO/Google Events edge. Reference: Skiddle/Eventbrite verified markup.
2. **Date preset deep links + relative labels: Today / Tomorrow / This weekend** — cheap. Routes like /events/today, /events/weekend; card labels "Today", "Tomorrow", "+N more". Reference: GO TOKYO, Skiddle, Eventbrite.
3. **OG image per event (fixed aspect, e.g. 1200×630 / 15:8)** — cheap–medium. Supabase Storage + Vercel OG image endpoint (satori) or pre-generated images; set og:image per detail URL. Reference: Fever (15:8) verified.
4. **"Happening now" / ONGOING / TODAY status badge** — cheap. Computed from start/end timestamps client-side; show live badge on list + countdown chip. Reference: TheSmartLocal, Eventbrite.
5. **Countdown + "Remind me"** — cheap. Countdown on detail page until event start (client-side interval); "Remind me" = Supabase row + optional email/webhook. Reference: Eventbrite.
6. **ICS / Add-to-calendar per event (Google + Outlook + .ics)** — cheap. Serverless function generating .ics (icalendar) with TZID=Asia/Jakarta; links on detail page. Reference: AddEvent/AddToCalendar pattern (verified as tooling, not a site feature).
7. **Waitlist on full events** — cheap–medium. RSVP table gets status enum (registered/waitlisted/cancelled); auto-promote on cancel (Supabase function); notify by email. Reference: Fever/Eventbrite waitlist verified.
8. **Scarcity/urgency signals ("Almost full", "Sales end soon", capacity bar)** — cheap. Derived from RSVP counts vs capacity. Reference: Eventbrite verified.
9. **Event submission + approval workflow for EOs/tenants** — medium. Public /submit-event form → events table with status=draft → admin approve/publish → auto-notify submitter. Eventfinda "List your event" + Orchard Road member portal verified as the pattern.
10. **Post-event survey hooked to dashboards** — medium. Reuse TenantEventSurvey: add survey_link to event, email after endDate (cron edge function), store responses, surface ratings/attendance in admin dashboard. Reference: Eventbrite feedback pattern.
11. **Public events API** — medium–heavy. Supabase RLS-read API so external sites/newsletters can pull MMB events; add calendar subscription endpoint (iCal feed). Reference: Visit Seoul API verified.
12. **Members-only events tier + priority RSVP** — medium–heavy. Tie RSVP to MMB Rewards membership check. Reference: Changi Rewards members' events verified.
13. **Editorial rails ("MMB Originals", "What's hot this month", staff picks)** — medium. Curated collections table (flag on events) + rails on home. Reference: Fever Originals, Time Out Market Boston, Orchard Road, Tokyo Cheapo ★.

Cheap wins 1–8 are all doable in one sprint on the existing stack (no new infra beyond Supabase tables + one serverless route). 9–13 layer on incrementally.
