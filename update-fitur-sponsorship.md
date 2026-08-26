# Update Fitur: Sponsorship / Akuisisi Sponsor — Rencana Implementasi

Status: RENCANA (belum dieksekusi) · Repo: schedule-event-v2 · 2026-08-26
Sumber domain: `CONTEXT.md` (Akuisisi Sponsor) · Menindaklanjuti: `draft-voucher-tenant.md` (program voucher tenant, terpisah)

## 1. Ringkasan

Kondisi saat ini: fitur sponsorship **hanya statis** — kartu "Cari Sponsor atau Dukungan" di `CommunityUpcomingEvents` (link WhatsApp hardcoded `6281318534823`), kartu benefit "Dukungan Sponsorship" di `CommunityBenefits`, dan tab sponsor di `prototype-landing-metmal-v1` (belum berfungsi, `window.alert`). **Tidak ada** tabel `event_proposals` / `sponsor_leads` di Supabase (terverifikasi), tidak ada landing sponsor, tidak ada form, tidak ada admin review.

Target: implementasi penuh domain **Akuisisi Sponsor** sesuai `CONTEXT.md`:

- **Proposal Event** — 1 file (PDF/gambar/DOCX) per Event, tabel `event_proposals` (1-to-1 via FK `event_id`).
- **Landing Sponsor** — halaman publik no-login `/sponsor`: daftar Event yang punya Proposal + form "Saya tertarik support".
- **Minat Support** — submit publik non-login: pilih Event + data kontak + pesan → tercatat sebagai Lead Sponsor.
- **Lead Sponsor** — status review `pending` → `contacted` → `agreed` / `declined`, dikelola di dashboard admin.

Non-goal: kode unik verifikasi pemakaian, laporan real-time, kanal media sosial, integrasi WhatsApp otomatis, portal login sponsor. Verifikasi tetap manual oleh Marcomm via data kontak lead.

## 2. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | Tabel `event_proposals`: kolom snake_case; id `prp_<uuid>`; `event_id TEXT UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE` → 1 Event maksimal 1 proposal (1-to-1). |
| D2 | Tabel `sponsor_leads`: id `sld_<uuid>`; `event_id` FK ke `events`; status string `pending` \| `contacted` \| `agreed` \| `declined`, default `pending`; kolom `internal_notes` untuk catatan Marcomm. |
| D3 | RLS: `event_proposals` SELECT publik `USING (true)` (file R2 public; landing butuh daftar event ber-proposal). `sponsor_leads`: **INSERT publik** `WITH CHECK (true)` (form no-login), **tidak ada SELECT publik** — semua read/write leads lewat `api/supabase-admin.js` (auth superadmin/admin + service role). |
| D4 | Upload proposal file → R2 folder `proposals/` via `uploadToR2(file, 'proposals/')`; simpan `file_url, file_name, mime_type` di `event_proposals` (upsert per event). Hapus file R2 saat proposal dihapus (`deleteFromR2`). |
| D5 | Landing Sponsor publik `GET` daftar event ber-proposal via **anon client** (RLS sudah cukup; `events` + `event_proposals` inner join) — tanpa server proxy untuk baca publik (pola `fetchNewsArticles`). |
| D6 | Server proxy hanya untuk: leads (list/update status/hapus) + proposal (set/delete) — auth gate `['superadmin','admin']` yang sudah ada (L33). |
| D7 | Admin UI = satu modal `SponsorManagerModal` dengan 2 tab: **Proposal Event** (pilih event → upload/ganti/hapus file) dan **Lead Sponsor** (list + ubah status + catatan internal + hapus). Grup navigasi **Interaksi**, item "Sponsorship", icon `Handshake`. |
| D8 | Form Minat Support: event (wajib, dropdown dari event ber-proposal), nama brand/perusahaan (wajib), PIC/kontak (wajib), WhatsApp (wajib, validasi `validatePhone`), email (opsional, `validateEmail`), pesan (opsional). |
| D9 | Kartu "Cari Sponsor atau Dukungan" di `CommunityUpcomingEvents` diganti CTA-nya: dari link WhatsApp hardcoded → `Link to="/sponsor"` "Lihat Peluang Sponsor". `CommunityBenefits` tidak diubah (teks umum). |
| D10 | Semua mutasi admin dicatat `activity_logs` via `logActivity` (pola news): `set_event_proposal`, `delete_event_proposal`, `update_sponsor_lead`, `delete_sponsor_lead`. Submit publik (anon) tidak dicatat (pola `community_registrations`). |

## 3. Database — file baru `migrate/sponsorship.sql`

Pola: `migrate/news-articles.sql` + `migrate/community-registrations.sql` (idempotent, RLS, index). JANGAN tambah ke `supabase_realtime`.

```sql
CREATE TABLE IF NOT EXISTS event_proposals (
  id TEXT PRIMARY KEY DEFAULT ('prp_' || replace(gen_random_uuid()::text, '-', '')),
  event_id TEXT UNIQUE NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sponsor_leads (
  id TEXT PRIMARY KEY DEFAULT ('sld_' || replace(gen_random_uuid()::text, '-', '')),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','agreed','declined')),
  internal_notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read event proposals" ON event_proposals;
CREATE POLICY "Public can read event proposals" ON event_proposals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert sponsor leads" ON sponsor_leads;
CREATE POLICY "Public can insert sponsor leads" ON sponsor_leads FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_event_proposals_event_id ON event_proposals (event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_leads_event_id ON sponsor_leads (event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_leads_status ON sponsor_leads (status);
```

## 4. Server API

### 4.1 `api/supabase-admin.js` — tambah case di switch (setelah blok News L304-340, sebelum Community Registrations L343)

- `setEventProposal`: butuh `req.body.eventId`, `req.body.fileUrl`; upsert `{ event_id, file_url, file_name, mime_type }` `.upsert(..., { onConflict: 'event_id' })`; `logActivity(authInfo, 'set_event_proposal', 'event', eventId, { file_name }, req)`.
- `deleteEventProposal`: butuh `req.body.eventId`; baca `file_url` dulu; delete row; `deleteR2File(cover)` fire-and-forget; `logActivity(..., 'delete_event_proposal', ...)`.
- `listSponsorLeads`: `sb.from('sponsor_leads').select('*, events(acara, date_str)').order('created_at', { ascending: false })` → `{ success: true, data }`.
- `updateSponsorLeadStatus`: butuh `req.body.id`; data `{ status, internal_notes? }`; `.update(...).eq('id', id)`; `logActivity(..., 'update_sponsor_lead', ...)`.
- `deleteSponsorLead`: butuh `req.body.id`; delete row; `logActivity(..., 'delete_sponsor_lead', ...)`.

### 4.2 `api/_lib/schemas.js` — tambah ke `ACTION_SCHEMAS` (pola news L85-90)

```js
setEventProposal: z.object({ action: z.literal('setEventProposal'), eventId: z.string().min(1), fileUrl: z.string().min(1), fileName: z.string().optional(), mimeType: z.string().optional() }),
deleteEventProposal: z.object({ action: z.literal('deleteEventProposal'), eventId: z.string().min(1) }),
listSponsorLeads: z.object({ action: z.literal('listSponsorLeads') }),
updateSponsorLeadStatus: z.object({ action: z.literal('updateSponsorLeadStatus'), id: z.string().min(1), status: z.enum(['pending','contacted','agreed','declined']), internalNotes: z.string().optional() }),
deleteSponsorLead: z.object({ action: z.literal('deleteSponsorLead'), id: z.string().min(1) }),
```

## 5. Client API — file baru `src/utils/api/sponsorshipApi.ts`

Pola: `src/utils/api/newsApi.ts` (import `supabase` dari `../../lib/supabase`; `SupabaseApiError, adminAction` dari `./_shared`; `uploadToR2, deleteFromR2` dari `./albumsApi`). Ekspor:

- `fetchSponsorEventsWithProposals(): Promise<EventProposalEvent[]>` — anon: `supabase.from('events').select('id, date_str, acara, lokasi, jam, eo, event_proposals(id, file_url, file_name, mime_type)').eq('status', 'upcoming').not('event_proposals', 'is', null).order('date_str', { ascending: true }).limit(50)`; map row → `EventProposalEvent { event, proposal }`. (Catatan: `not('event_proposals','is',null)` = inner-join filter PostgREST; fallback: filter client-side.)
- `submitSponsorLead(data: SponsorLeadInput): Promise<void>` — anon: `supabase.from('sponsor_leads').insert(rowSnake(data))`; throw `SupabaseApiError` bila gagal. `SponsorLeadInput = { eventId, companyName, contactName, phone, email?, message? }` → mapper `{ event_id, company_name, contact_name, phone, email, message }`.
- `fetchAllSponsorLeads(): Promise<SponsorLead[]>` — `adminAction<{ success: boolean; data?: unknown[] }>('listSponsorLeads')` → map `data || []`.
- `updateSponsorLeadStatus(id: string, status: SponsorLeadStatus, internalNotes?: string): Promise<void>` — `adminAction('updateSponsorLeadStatus', { id, status, internalNotes })`.
- `deleteSponsorLead(id: string): Promise<void>` — `adminAction('deleteSponsorLead', { id })`.
- `setEventProposal(eventId: string, file: File): Promise<void>` — `const url = await uploadToR2(file, 'proposals/')`; `adminAction('setEventProposal', { eventId, fileUrl: url, fileName: file.name, mimeType: file.type })`.
- `deleteEventProposal(eventId: string, fileUrl: string): Promise<void>` — `adminAction('deleteEventProposal', { eventId })`; lalu `await deleteFromR2(fileUrl)` (pola `deleteAlbumPhoto`).

### 5.2 `src/utils/supabaseApi.ts` — tambah blok re-export (pola news L79-86)

```ts
export {
  fetchSponsorEventsWithProposals,
  submitSponsorLead,
  fetchAllSponsorLeads,
  updateSponsorLeadStatus,
  deleteSponsorLead,
  setEventProposal,
  deleteEventProposal,
} from './api/sponsorshipApi';
```

## 6. Tipe — `src/types.ts` (tambah interface)

```ts
export type SponsorLeadStatus = 'pending' | 'contacted' | 'agreed' | 'declined';

export interface EventProposal {
  id: string;
  eventId: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
}

export interface EventProposalEvent {
  event: EventItem;
  proposal: EventProposal;
}

export interface SponsorLead {
  id: string;
  eventId: string;
  eventAcara?: string;
  eventDate?: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  message: string;
  status: SponsorLeadStatus;
  internalNotes: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SponsorLeadInput {
  eventId: string;
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  message?: string;
}
```

## 7. Admin UI

### 7.1 File baru `src/components/SponsorManagerModal.tsx` — pola `NewsManagerModal`

- Struktur: `ModalWrapper maxWidth="max-w-3xl"` + `ModalHeader` icon `<Handshake />` (tersedia di lucide-react), title "Sponsorship", subtitle "Proposal Event & Minat Support".
- Load saat open: `fetchSponsorEventsWithProposals()` + `fetchAllSponsorLeads()` (useEffect pada `isOpen`).
- Tab **Proposal Event**: daftar event upcoming; tiap baris: tanggal + acara; status proposal (ada: nama file + tombol buka/link; kosong: "Belum ada proposal"); tombol Upload (file input → `setEventProposal`), tombol Hapus (confirm → `deleteEventProposal`). Loading + error banner merah pola NewsManagerModal.
- Tab **Lead Sponsor**: list leads (event, perusahaan, PIC, WhatsApp, status chip: pending=amber, contacted=blue, agreed=emerald, declined=rose); aksi per baris: select ubah status, input/notes internal, tombol Hapus (confirm). Reload list setelah mutasi; toast sukses/gagal pola `useSiteSettingsHandlers`.

### 7.2 Wiring admin (semua ikuti pola NewsManagerModal)

1. `src/components/dashboard/dashboardNavigation.tsx`
   - `DashboardNavCallbacks` (L42-47): tambah `onOpenSponsorManager: () => void;`.
   - Import `Handshake` dari `lucide-react`.
   - Grup Interaksi (L96-102): tambah item `{ id: 'sponsorship', label: 'Sponsorship', icon: <Handshake className={NAV} strokeWidth={sw} />, action: 'callback' as const, callback: callbacks.onOpenSponsorManager }` — gate `permissions.canViewRegistrations`.
   - Stub `getAllowedDashboardPaths` (L124-137): tambah `onOpenSponsorManager: () => undefined,`.
2. `src/components/dashboard/AdminSidebar.tsx` — props + destructure + deps `useMemo`: tambah `onOpenSponsorManager`.
3. `src/components/dashboard/DashboardShell.tsx` — props + destructure + pass ke `AdminSidebar`.
4. `src/components/dashboard/DashboardPage.tsx` — `DashboardPageSiteSettings`: tambah `showSponsorManager; setShowSponsorManager`; pass ke `DashboardShell` (`onOpenSponsorManager={() => siteSettings.setShowSponsorManager(true)}`) dan `DashboardModals` (`showSponsorManager` + `onCloseSponsorManager`).
5. `src/components/dashboard/DashboardModals.tsx` — lazy import `SponsorManagerModal` (pola L14); tambah props; render saat `showSponsorManager`.
6. `src/hooks/useSiteSettingsHandlers.ts` — state `showSponsorManager, setShowSponsorManager` (pola `showNewsManager` L36); tambah ke interface + return.
7. `src/hooks/useDashboardHandlers.ts` — return tambah `showSponsorManager` / `setShowSponsorManager` dari `site`.
8. `src/App.tsx` — destructure dari `useDashboardHandlers`; tambah ke objek `dpSiteSettings`.

## 8. Publik UI

### 8.1 File baru `src/components/SponsorLandingPage.tsx` — pola `NewsIndexPage`

- Props `{ isDark: boolean; onToggleDark: () => void }`.
- Self fetch `fetchSponsorEventsWithProposals()`; state `items, isLoading, fetchError`.
- Header inline pola halaman `/news` (App.tsx L318-327): logo `mallLogo` + label "Sponsorship" + tombol Kembali (`window.history.length > 1 ? back() : '/'`) + dark toggle.
- Hero ringkas: "Dukung Event di Metropolitan Mall Bekasi" + penjelasan 1 kalimat peluang sponsorship.
- Daftar event ber-proposal: kartu (tanggal `formatDate`, acara, lokasi) + tombol "Lihat Proposal" (link file R2, `target="_blank"`) + tombol "Saya Tertarik Support" (scroll ke form, preselect event).
- Form "Minat Support": dropdown pilih event (dari items), nama brand/perusahaan, PIC, WhatsApp, email (opsional), pesan; validasi pola `CommunityRegistrationForm`; submit → `submitSponsorLead` → state sukses (ikon centang + "Minat Support Terkirim!" + "Tim Marcomm akan menghubungi Anda."); error banner.
- Empty state: "Belum ada event dengan proposal sponsor." Footer `© {new Date().getFullYear()} Metropolitan Mall Bekasi — Metland Coloring Life`.
- Helper tanggal inline (`toLocaleDateString('id-ID', ...)`), pola `formatNewsDate`.

### 8.2 `src/components/CommunityUpcomingEvents.tsx` (L257-277)

- Ganti `<a href="wa.me/...">Hubungi Kami</a>` → `<Link to="/sponsor">Lihat Peluang Sponsor</Link>` (styling tombol tosca yang sama). Import `Link` (sudah di-import untuk L282).

### 8.3 Route — `src/App.tsx`

- Lazy import (pola L28-29): `const SponsorLandingPage = lazy(() => import('./components/SponsorLandingPage').then(m => ({ default: m.SponsorLandingPage })));`
- Tambah route setelah blok News (L318-327):

```tsx
<Route path="/sponsor" element={
  <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
    <SponsorLandingPage isDark={isDark} onToggleDark={toggleDark} />
  </Suspense>
} />
```

## 9. Verifikasi (saat eksekusi nanti)

1. `npm run build` — tsc + vite, 0 error.
2. Terapkan `migrate/sponsorship.sql` di Supabase (via `supabase db query --linked --project-ref xddqinydbuargyfseycw -f migrate/sponsorship.sql` dengan PAT) — sukses; 2 tabel + 2 policy aktif.
3. RLS test via REST: anon SELECT `sponsor_leads` → ditolak (403/0 rows); anon INSERT `sponsor_leads` → berhasil; anon SELECT `event_proposals` → berhasil.
4. Admin: login → Interaksi → Sponsorship → tab Proposal: upload file ke event (R2 `proposals/`), tampil; ganti; hapus. Tab Leads: lead baru muncul; ubah status; tambah notes; hapus. Activity Log mencatat action sponsor.
5. Publik: `/sponsor` tampil daftar event ber-proposal; form submit → sukses; lead muncul di admin. `/` kartu sponsor → tombol "Lihat Peluang Sponsor" menuju `/sponsor`.
6. Unit: `npx vitest run` dengan `NODE_ENV=test` — tidak regresi (fitur UI baru diverifikasi via browser, tidak ada unit test baru wajib).

## 10. Catatan implementasi

- `supabase-admin.js` auth gate `['superadmin','admin']` (L33) sudah ada — tidak perlu ubah.
- `uploadToR2`/`deleteFromR2` (albumsApi L113-139) — pakai ulang, tidak duplikat.
- `validatePhone`/`validateEmail` (`src/utils/validation.ts`) — pakai ulang di form publik.
- `adminAction` + `slugify` (`src/utils/api/_shared.ts`) — `slugify` tidak dibutuhkan fitur ini.
- Migrasi via `supabase db query --linked` (pola news-articles) — bukan SQL editor manual.
- R2 folder `proposals/` konsisten dengan `news/` (newsApi) dan `gallery/` (albumsApi).
