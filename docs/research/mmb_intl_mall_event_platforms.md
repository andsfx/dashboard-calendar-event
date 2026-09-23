# International Mall Event Platforms — Benchmark Research (for MMB)

Verification: entries marked ✅ were opened & read (web_extract or real browser). ⚠️ = partially verified (bot-wall/JS, page exists but content limited). No invented features.

## Middle East / UAE
- **Dubai Mall (Emaar) | UAE, Dubai | ✅** https://thedubaimall.com/en/event-schedule
  - Features: "Events Schedule" section, site-wide search, "Entertain" nav, Emaar app links. Content served from Emaar's shared mall platform (`apiUrl: mypage.emaarmalls.com/api`, Azure CDN, Emaar OneApp/UBE APIs) — i.e. an in-house CMS + API platform reused across Emaar malls.
  - Tech: custom platform (server-rendered + JS), Azure Edge CDN, GA.
- **Mall of the Emirates (Majid Al Futtaim) | UAE, Dubai | ✅** https://www.malloftheemirates.com/en/events
  - Features: "Entertainment Events & Activities" page; MAF group runs event booking through "My City Centre" app (MAF's own platform). Event list itself JS-rendered.
  - Tech: Drupal-based MAF site.
- **City Walk (Meraas) | UAE, Dubai | ✅** https://www.citywalk.ae/en/whats-on
  - Features: What's On page, **Tickit ticketing integration** (event tickets), newsletter subscribe, downloadable event assets, multi-language (EN/AR).
  - Tech: Webflow (no-code CMS), Tickit.
- **Dubai Festival City Mall (Al-Futtaim) | UAE, Dubai | ✅** https://www.dubaifestivalcitymall.com/home/whats-on/events
  - Features: Events + Offers pages, IMAGINE show page, rewards (Blue), kids club (Gen Fest), gift card.
  - Tech: IBM WebSphere portal (legacy), login with FB/Google.

## Singapore
- **ION Orchard (CapitaLand) | SG | ✅** https://www.ionorchard.com/en/events.html
  - Features: Events listing page; site is a full brand CMS. Thin features (poster-style list, no RSVP/booking seen).
  - Tech: Adobe Experience Manager (AEM).
- **Marina Bay Sands | SG | ✅** https://www.marinabaysands.com/see-and-do.html
  - Features: shows/immersive experiences/nightlife with **per-event pages and external ticketing** (bigtix.io "Buy tickets"), MBS mobile app.
  - Tech: AEM; ticketing via partner (bigtix).
- **VivoCity (Mapletree) | SG | ✅** https://www.vivocity.com.sg/whats-on/events
  - Features: What's On → Events + "Mall Happenings" pages, **Tenant Login portal** (`tenant.vivocity.com.sg`), VivoRewards app.
  - Tech: Alphapod CMS (SG mall-specific CMS vendor), Cloudinary.
- **Jewel Changi Airport | SG | ✅** https://www.jewelchangiairport.com/en/latest-news.html
  - Features: Latest News w/ event advisories, attraction ticketing page (`/en/ticketing.html`). Not an ops platform — news-driven.
  - Tech: AEM.

## Malaysia
- **Pavilion KL | MY, KL | ✅** https://www.pavilion-kl.com/events
  - Features: Events listing with per-event posts (detail pages), in-house wayfinding tool, newsletter, app.
  - Tech: WordPress.
- **Suria KLCC | MY, KL | ✅** https://www.suriaklcc.com.my/whats-hot
  - Features: "What's Hot" — blog-style campaign/promo feed. No ops features, no detail-page calendar.
  - Tech: WordPress.
- **LaLaport BBCC (Mitsui Fudosan) | MY, KL | ✅** https://mitsui-shopping-park.com.my/LaLaportBBCC/
  - Features: Latest News + per-event pages (`/Events/eventNew?id=...`), contact/ops email. Basic.
  - Tech: static-style site.

## Japan
- **Shibuya PARCO (PARCO network) | JP, Tokyo | ✅** https://en.shibuya.parco.jp/event
  - Features: "event&POPUP" pages with **category filters** (gallery / event / entertainment), shop search, per-event pages; same template across PARCO stores.
  - Tech: custom PARCO platform, EN/JP.
- **AEON MALL | JP | ✅** https://en.aeonmall.global
  - Features: mall finder, coupons, services — **no public event calendar** on global site. (JP per-mall event pages exist but unverified.)
  - Tech: Next.js.

## Korea
- **Lotte World Tower & Mall | KR, Seoul | ✅** https://www.lwt.co.kr/en/event/all.do?category=all
  - Features: events list with **category filtering via URL params** (all / main-event), EN+KR. List is JS-rendered.
  - Tech: custom portal.
- **COEX Center (adjacent to Starfield COEX Mall) | KR, Seoul | ✅** https://www.coexcenter.com/event-calendar
  - Features: Event Calendar + **venue booking inquiry** form, planner section.
  - Tech: WordPress. (Starfield itself: no clean public event platform verified; The Hyundai Seoul: social/Instagram-driven, no platform found.)

## United States
- **Mall of America | US, MN | ✅** https://www.mallofamerica.com/entertainment/events (and `/all`)
  - Features: **per-event detail pages** (`/events/view/37943`), **URL category filters** (`?filter=`), multilingual (9 langs), live parking availability, Insiders membership. Best public events site found.
  - Tech: Drupal (custom theme).
- **Simon (200+ malls) | US | ✅** https://www.simon.com/mall/<mall>/news-and-events
  - Features: per-mall "Events & News" pages across the whole portfolio, **category filters** (`?type=eventCatId&id=33`), Simon app.
  - Tech: **headless DatoCMS** (`datoassets.simon.com`).
- **American Dream | US, NJ | ⚠️** https://www.americandream.com/events/category
  - Features: events section w/ categories, attraction **ticketing ("Book Tickets")**, "Private Events", "Artists & Entertainers" booking, "Partner with us". Event list is JS-rendered/bot-walled (content not fully readable).
  - Tech: Next.js-style SPA + bot protection.
- **Tysons Corner Center (Macerich) | US, VA | ✅** https://www.tysonscornercenter.com/Events
  - Features: Events page + Directory, Movies, Happy Hour, Sales/Offers, Jobs sections — one integrated centre platform.
  - Tech: Macerich "Epicenter" platform.

## UK / Europe
- **Westfield London & Westfield World Trade Center (URW) | UK/US | ✅** https://www.westfield.com/en/united-kingdom/london/events and https://www.westfield.com/en/united-states/westfieldworldtradecenter/events
  - Features: filterable **"Events & News"** (shows counts + Filters UI), per-centre pages across the portfolio, My Account, Westfield Club + app.
  - Tech: Contentful headless CMS (`assets.westfield.com`).
- **Westfield Events (URW B2B) | US | ✅** https://events.urw.com/world-trade-center-venue.html
  - Features: venue pages for event hire with **downloadable sales deck PDFs**, specs (sq ft, viewing).
  - Tech: static site.
- **Bluewater (Landsec) | UK | ✅** https://www.bluewater.co.uk/en/whats-on
  - Features: What's On + dedicated event/offer/news **listing pages** (`/en/event-listing-page`), centre map, PLUS+ loyalty.
  - Tech: Landsec CMS.

## Australia
- **Westfield AU (Scentre Group, 42 centres) | AU | ✅** https://www.westfield.com.au/parramatta/event
  - Features: per-centre "Events"/"What's happening" pages with **per-event detail pages** (`/parramatta/news/<id>/...`), app.
  - Tech: **Contentful** + Scentre image CDN (`images.scentregroup.io`).
- **Scentre Group Marketing Hub (tenant portal) | AU | ✅** https://www.scentregroup.com/business-solutions/retail-services/marketing-hub
  - Features: **tenant portal for submitting campaigns across all digital channels and centres** ("one convenient place to submit campaigns for all digital channels and centres") — closest analogue to MMB's tenant-facing workflows.
  - Tech: Next.js site.
- **Vicinity Centres (e.g. The Glen; Chadstone) | AU | ✅/⚠️** https://www.theglen.com.au/whats-on (Chadstone: https://www.chadstone.com.au/whats-on is bot-protected; existence confirmed via search)
  - Features: per-centre "What's On" (offers, news, articles).
  - Tech: **Storyblok headless CMS** (Vicinity group standard).

## Mall event platforms built as products (SaaS)
- **Simplaq | BR/LATAM (malls) | ✅** https://simplaq.com/solutions/event-management
  - "Plan and manage events in your shopping mall: **create event schedules, manage vendor information, coordinate with staff**" — the closest off-the-shelf match to MMB's ops dashboard.
- **Trumba | US | ✅** https://trumba.com
  - Event calendar + registration SaaS: search, filter, **subscribe (ICS feeds)**, register, all embedded on client sites. Used by venues/cities; not mall-specific.
- **Localist (Concept3D) | US | ⚠️** https://www.localist.com
  - Calendar SaaS (search/filter/subscribe/register); campus/community focus.
- **Pickspace | Multi-country | ✅** https://pickspace.com/solutions/shopping-centers
  - Mall/property management suite incl. events, multi-language (EN/ES/FR/UA/HE/AR).
- **WovVTech Mall of the Future | IN | ✅** https://www.wovvtech.com/industry/mall-of-future-solution
  - AI-first mall ops/events software pitch.

## Top 5 most relevant to a mall event dashboard (MMB)
1. **Simplaq Event Management** — only verified off-the-shelf mall event *operations* product (schedules, vendor mgmt, staff coordination) — direct reference competitor to MMB's internal tool.
2. **Scentre Group Marketing Hub (Westfield AU)** — tenant campaign-submission portal at 42-centre scale; benchmark for MMB's tenant portal & submission workflow.
3. **Dubai Mall / Emaar platform** — in-house group-wide mall CMS with an event-schedule module + search, proving an in-house ops-backed event site at group level.
4. **Mall of America** — best public-facing event site: per-event detail pages, category filters, multilingual — benchmark for MMB's public event calendar layer.
5. **URW Westfield (London/WTC)** — Contentful-driven, filterable events/news across centres with accounts/apps; benchmark for CMS-managed event scheduling at portfolio scale.

## Notes
- Verified zero malls with a fully public equivalent of MMB's internal ops dashboard (draft/publish CRUD, role model, activity log, PDF generators). The ops features MMB built are ahead of what any mall exposes publicly; public sites max out at calendar + detail pages + filters + ticketing + tenant portals.
- Tenant portals with event/campaign submission found: VivoCity tenant login, Scentre Marketing Hub.
- Ticketing/RSVP integrations seen: City Walk (Tickit), MBS (bigtix), Jewel (in-house ticketing page), American Dream (partner ticketing).
- Bot-protected/unverifiable: Chadstone, American Dream event content, Lotte event list body, Starfield, The Hyundai Seoul, most Korean JP sites.
