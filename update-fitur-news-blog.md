# Update Fitur: News / Blog (Berita) — Rencana Implementasi

Status: RENCANA (belum dieksekusi) · Repo: schedule-event-v2 · 2026-08-26

## 1. Ringkasan

Tambah fitur Berita (artikel) untuk Metropolitan Mall Bekasi:

- **Admin**: CRUD artikel via modal di grup navigasi **Konten** (callback, pola `AlbumManagerModal`).
- **Publik**: section "Berita" di Community Landing (`#news`) + halaman `/news` (index) dan `/news/:slug` (detail).
- **Data**: tabel Supabase `news_articles` + RLS — publik baca hanya `published`; semua write lewat server proxy service-role (`api/supabase-admin.js`).

Non-goal: komentar publik, kategori/tag, markdown editor, RSS, pagination server. Konten artikel = teks biasa multi-baris (render `whitespace-pre-wrap`), tanpa dependency baru.

## 2. Keputusan desain

| # | Keputusan |
|---|---|
| D1 | Tabel `news_articles`; kolom snake_case; id `news_<uuid>` (pola `alb_` di `photo_albums`). |
| D2 | Status string `draft` \| `published`; default `draft`. |
| D3 | RLS: `SELECT` publik hanya `status = 'published'`; write hanya via `api/supabase-admin.js` (auth superadmin/admin + service role). |
| D4 | Transisi ke `published` → server set `published_at = NOW()` (overwrite; re-publish = timestamp baru). Unpublish tidak menghapus `published_at`. |
| D5 | Slug dari judul via `slugify()` (`src/utils/api/_shared.ts`), fallback `berita-<Date.now()>`; kolom UNIQUE. |
| D6 | Cover upload ke R2 folder `news/` via `uploadToR2(file, 'news/')`; hapus file R2 saat artikel dihapus. |
| D7 | List admin (semua status) lewat action `listNewsArticles` (service role); list publik lewat anon client filtered `published`. |
| D8 | Section publik `CommunityNews` self-contained fetch (pola `GalleryIndexPage` / fetch Instagram di `CommunityLandingPage`), TIDAK menambah wiring App. |
| D9 | `author` diisi admin; placeholder "Marcomm Metropolitan Mall Bekasi". |
| D10 | Konten artikel plain text; render `whitespace-pre-wrap`. |

## 3. Database — file baru `migrate/news-articles.sql`

Pola: `migrate/photo-albums.sql` (idempotent, RLS, index). JANGAN tambah ke `supabase_realtime`.

```sql
CREATE TABLE IF NOT EXISTS news_articles (
  id TEXT PRIMARY KEY DEFAULT ('news_' || replace(gen_random_uuid()::text, '-', '')),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT DEFAULT '',
  content TEXT DEFAULT '',
  cover_image_url TEXT DEFAULT '',
  author TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read published news" ON news_articles;
CREATE POLICY "Public can read published news" ON news_articles FOR SELECT USING (status = 'published');

CREATE INDEX IF NOT EXISTS idx_news_articles_slug ON news_articles (slug);
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles (published_at DESC);
```

## 4. Server API

### 4.1 `api/supabase-admin.js` — tambah case di switch (setelah blok Photo Albums, sebelum Community Registrations)

- `listNewsArticles`: `sb.from('news_articles').select('*').order('created_at', { ascending: false })` → `result = { success: true, data }`.
- `createNewsArticle`: `sb.from('news_articles').insert(req.body.data).select('id').single()` → `{ success: true, id }`; `logActivity(authInfo, 'create_news', 'news', data.id, { title: req.body.data?.title }, req)`.
- `updateNewsArticle`: butuh `req.body.id`; jika `req.body.data.status === 'published'` → tambah `published_at: new Date().toISOString()` ke data update; `sb.from('news_articles').update(data).eq('id', id)`; `logActivity(authInfo, 'update_news', 'news', req.body.id, null, req)`.
- `deleteNewsArticle`: butuh `req.body.id`; baca `cover_image_url` dulu; delete row; `await deleteR2File(cover)` (helper self-catch — pola repo L275 `Promise.allSettled` / L336 `await`; aman meski gagal); `logActivity(authInfo, 'delete_news', 'news', req.body.id, null, req)`.
- Konvensi repo: caller `deleteR2File` selalu `await` (L275 `Promise.allSettled(...)`, L336 `await deleteR2File`). Helper sudah self-catch (`try/catch` L17-29), jadi `await` tidak pernah throw.

### 4.2 `api/_lib/schemas.js` — tambah ke `ACTION_SCHEMAS`

```js
createNewsArticle: z.object({ action: z.literal('createNewsArticle'), data: z.object({ title: z.string().min(1) }).passthrough() }),
updateNewsArticle: z.object({ action: z.literal('updateNewsArticle'), id: z.string().min(1), data: z.object({}).passthrough() }),
deleteNewsArticle: z.object({ action: z.literal('deleteNewsArticle'), id: z.string().min(1) }),
listNewsArticles: z.object({ action: z.literal('listNewsArticles') }),
```

## 5. Client API — file baru `src/utils/api/newsApi.ts`

Pola: `src/utils/api/albumsApi.ts` (import `supabase` dari `../../lib/supabase`; `SupabaseApiError, adminAction, slugify` dari `./_shared`; `uploadToR2, deleteFromR2` dari `./albumsApi` — import langsung, hindari circular dengan barrel `supabaseApi.ts`).

```ts
export interface NewsArticle { /* lihat §6 */ }

function mapRow(row: Record<string, unknown>): NewsArticle {
  return {
    id: String(row.id), title: String(row.title), slug: String(row.slug),
    excerpt: String(row.excerpt || ''), content: String(row.content || ''),
    coverImageUrl: String(row.cover_image_url || ''), author: String(row.author || ''),
    status: row.status === 'published' ? 'published' : 'draft',
    publishedAt: row.published_at ? String(row.published_at) : undefined,
    createdAt: String(row.created_at), updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}
```

Ekspor fungsi:

- `fetchNewsArticles(): Promise<NewsArticle[]>` — anon: `.from('news_articles').select('*').eq('status','published').order('published_at', { ascending: false }).limit(50)`; map `mapRow`.
- `fetchNewsArticleBySlug(slug: string): Promise<NewsArticle | null>` — anon: `.eq('slug', slug).eq('status','published').single()`; null bila error/tidak ada (pola `fetchAlbumBySlug`).
- `fetchAllNewsArticles(): Promise<NewsArticle[]>` — `adminAction<{ success: boolean; data?: unknown[] }>('listNewsArticles')` → map `data || []`.
- `createNewsArticle(input: { title: string; excerpt: string; content: string; coverImageUrl: string; author: string }): Promise<NewsArticle>` — `const slg = slugify(input.title) || \`berita-${Date.now()}\``; `adminAction('createNewsArticle', { data: { ...input, slug: slg } })`; kembalikan objek lokal (id kosong boleh, reload setelah).
- `updateNewsArticle(id: string, data: Partial<NewsArticle>): Promise<void>` — `adminAction('updateNewsArticle', { id, data })`; validasi ok throw `SupabaseApiError`.
- `deleteNewsArticle(id: string, coverImageUrl?: string): Promise<void>` — `adminAction('deleteNewsArticle', { id })`; jika `coverImageUrl` → `await deleteFromR2(coverImageUrl)` (pola `deleteAlbumPhoto`).

### 5.2 `src/utils/supabaseApi.ts` — tambah blok re-export

```ts
export {
  fetchNewsArticles,
  fetchNewsArticleBySlug,
  fetchAllNewsArticles,
  createNewsArticle,
  updateNewsArticle,
  deleteNewsArticle,
} from './api/newsApi';
```

## 6. Tipe — `src/types.ts` (tambah interface)

```ts
export interface NewsArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  author: string;
  status: 'draft' | 'published';
  publishedAt?: string;
  createdAt: string;
  updatedAt?: string;
}
```

## 7. Admin UI

### 7.1 File baru `src/components/NewsManagerModal.tsx` — pola `AlbumManagerModal`

- Struktur: `ModalWrapper` `maxWidth="max-w-3xl"` + `ModalHeader` icon `<Newspaper />` (icon tersedia di lucide-react, terverifikasi `node_modules/lucide-react/dist/esm/icons/newspaper.js`), title "Berita & Artikel", subtitle "Kelola artikel berita".
- Load saat modal open: `fetchAllNewsArticles()` (useEffect pada `isOpen`).
- List view: tombol "Buat Artikel Baru" (dashed, pola "Buat Album Baru"); tiap artikel: judul, status chip (Draft = slate, Published = tosca/brand), tanggal, tombol Edit / Publish-Unpublish / Hapus.
- Editor (view `'edit'` + state `editing`): field Judul* (input), Ringkasan (textarea), Isi Artikel (textarea rows 8), Penulis (input, placeholder "Marcomm Metropolitan Mall Bekasi"), Cover (file input → `uploadToR2(file, 'news/')` → simpan URL + preview; tombol hapus cover), tombol Simpan / Batal.
- Actions: create → `createNewsArticle`; edit → `updateNewsArticle`; toggle publish → `updateNewsArticle(id, { status })`; delete → `confirm()` lalu `deleteNewsArticle(id, coverImageUrl)`.
- Validasi: judul wajib (disable tombol Simpan bila kosong); error banner merah pola AlbumManagerModal; state `isLoading`, `isUploading`.
- Toast: ikuti pola `useSiteSettingsHandlers` (sukses/gagal) bila perlu; minimal reload list setelah mutasi.

### 7.2 Wiring admin (semua ikuti pola AlbumManagerModal)

1. `src/components/dashboard/dashboardNavigation.tsx`
   - Interface `DashboardNavCallbacks` (L41-45): tambah `onOpenNewsManager: () => void;`.
   - Import `Newspaper` dari `lucide-react`.
   - Grup Konten (L111-115, dalam gate `permissions.canManageSettings`): tambah item `{ id: 'news', label: 'Berita', icon: <Newspaper className={NAV} strokeWidth={sw} />, action: 'callback' as const, callback: callbacks.onOpenNewsManager },`.
   - Stub `getAllowedDashboardPaths` (L122-126): tambah `onOpenNewsManager: () => undefined,`.
2. `src/components/dashboard/AdminSidebar.tsx` — `AdminSidebarProps` (L26-29) + destructure + deps `useMemo` (L53-56): tambah `onOpenNewsManager`.
3. `src/components/dashboard/DashboardShell.tsx` — props (L21-24) + destructure + pass ke `AdminSidebar`.
4. `src/components/dashboard/DashboardPage.tsx`
   - `DashboardPageSiteSettings` (L155-161): tambah `showNewsManager: boolean; setShowNewsManager: (v: boolean) => void;`.
   - Pass ke `DashboardShell` (dekat L207-208): `onOpenNewsManager={() => siteSettings.setShowNewsManager(true)}`.
   - Pass ke `DashboardModals` (dekat L259-260): `showNewsManager={siteSettings.showNewsManager}` + `onCloseNewsManager={() => siteSettings.setShowNewsManager(false)}`.
5. `src/components/dashboard/DashboardModals.tsx` — lazy import `NewsManagerModal` (pola L13); tambah props `showNewsManager: boolean; onCloseNewsManager: () => void;`; render saat `showNewsManager` (pola L233-240).
6. `src/hooks/useSiteSettingsHandlers.ts` — state `showNewsManager, setShowNewsManager` (pola `showAlbumManager` L33); tambah ke interface `SiteSettingsHandlersResult` + return.
7. `src/hooks/useDashboardHandlers.ts` — return tambah `showNewsManager: site.showNewsManager, setShowNewsManager: site.setShowNewsManager` (dekat L94-95).
8. `src/App.tsx` — destructure `showNewsManager, setShowNewsManager` dari `useDashboardHandlers` (dekat L116-118); tambah ke objek `dpSiteSettings` (L244).

## 8. Publik UI

### 8.1 File baru `src/components/community/CommunityNews.tsx` — pola `CommunityGallery`

- `RevealSection id="news"` + `CommunityEyebrow` "Berita" + heading + skeleton (pola `SkeletonGalleryAlbums`).
- Self fetch: `useEffect(() => { fetchNewsArticles().then(setArticles).catch(() => setArticles([])); }, [])`.
- Grid 3 kartu artikel published terbaru: cover (`thumbUrl`, fallback icon `Newspaper`), judul (`line-clamp-1`), excerpt (`line-clamp-2`), tanggal (`formatNewsDate`), `Link to={\`/news/${a.slug}\`}` + "Baca selengkapnya".
- CTA "Lihat Semua Berita" → `/news` (pola tombol CommunityGallery L230-239).
- Empty state: teks "Belum ada berita." tanpa kartu.

### 8.2 File baru `src/components/NewsIndexPage.tsx` — pola `GalleryIndexPage`

- Props `{ isDark: boolean; onToggleDark: () => void }`.
- Header inline TERINSPIRASI pola halaman `/tenant-survey` (App.tsx L322-347: logo L328, label L330, tombol Kembali L332-334, footer L343) — pola itu TIDAK punya dark toggle; NewsIndexPage WAJIB menambah tombol dark toggle sendiri (prop `onToggleDark` tersedia, ikuti gaya `utilityButtonClass` di CommunityLandingPage L124-126), karena halaman ini berdiri sendiri di luar landing.
- Self fetch `fetchNewsArticles()`; state `articles, isLoading, fetchError`.
- Grid kartu semua published (cover, judul, excerpt, penulis, tanggal) → `Link /news/:slug`; empty state "Belum ada berita."; footer `© {new Date().getFullYear()} Metropolitan Mall Bekasi — Metland Coloring Life`.

### 8.3 File baru `src/components/NewsArticlePage.tsx`

- Props `{ isDark: boolean; onToggleDark: () => void }`; `useParams` ambil `slug`.
- Self fetch `fetchNewsArticleBySlug(slug)`; header sama dengan NewsIndexPage.
- Render: cover besar, judul (`h1`), meta (penulis · tanggal `formatNewsDate`), konten `whitespace-pre-wrap leading-relaxed`, tombol "Kembali ke Berita" → `/news`.
- Not-found state: "Berita tidak ditemukan." + tombol ke `/news`.

### 8.4 Helper tanggal — inline di tiap file (JANGAN buat util bersama; 2 pemakaian saja)

```ts
function formatNewsDate(value?: string): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
```

### 8.5 Routes — `src/App.tsx`

- Lazy import (pola L26-27): `NewsIndexPage`, `NewsArticlePage` dari `./components/...`.
- Tambah route setelah blok Gallery (setelah L312):

```tsx
<Route path="/news" element={
  <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
    <NewsIndexPage isDark={isDark} onToggleDark={toggleDark} />
  </Suspense>
} />
<Route path="/news/:slug" element={
  <Suspense fallback={<DashboardSkeleton isAdmin={false} />}>
    <NewsArticlePage isDark={isDark} onToggleDark={toggleDark} />
  </Suspense>
} />
```

### 8.6 `src/components/CommunityLandingPage.tsx`

- `NAV_ITEMS` (L49-57): tambah `{ href: '#news', label: 'Berita' }` setelah `{ href: '#gallery', label: 'Galeri' }`.
- Render `<CommunityNews />` setelah `<CommunityGallery ... />` (L242), sebelum `<CommunityRegistrationForm />` (L243).

## 9. Verifikasi (saat eksekusi nanti)

1. `npm run build` — tsc + vite, 0 error.
2. Terapkan `migrate/news-articles.sql` di Supabase SQL editor — sukses; policy "Public can read published news" aktif.
3. Insert 2 baris via SQL (1 draft, 1 published); SELECT anon (RLS) hanya mengembalikan published.
4. Dashboard: login admin → Konten → Berita → buat draft → edit → publish → muncul; hapus → hilang. Activity Log mencatat `create_news`/`update_news`/`delete_news`.
5. Publik: landing `#news` tampil artikel published; `/news` list; `/news/:slug` detail; artikel draft TIDAK muncul.
6. `npm run test:unit` — tidak regresi (fitur UI baru diverifikasi via browser, tidak ada unit test baru).

## 10. Catatan implementasi

- `supabase_admin.js` handler sudah auth-gate `['superadmin', 'admin']` (L33) — tidak perlu ubah.
- `deleteR2File` sudah ada (L17-29) — pakai ulang, tidak duplikat.
- `thumbUrl` (src/utils/imageOptim.ts) untuk cover di kartu publik — pakai ulang.
- Perintah: `npx supabase` tidak dipakai; migrasi dijalankan manual via Supabase SQL editor / psql sesuai pola repo (`migrate/`).
