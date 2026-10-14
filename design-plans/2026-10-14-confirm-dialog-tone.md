# Dialog konfirmasi keputusan tidak lagi memakai bahasa destruktif

Written against: 4d167dd

## Evidence chain
- Surface: `src/components/modals/ConfirmDialog.tsx`, dialog konfirmasi generik yang dirender via `LazyConfirmDialog` (`src/components/modals/useConfirmDialog.tsx:21-23`, dirender pada baris 58-68) dan dipakai seluruh dashboard admin, termasuk antrean pengajuan tenant.
- Problem: dialog merender perlakuan destruktif secara tanpa syarat: bar atas `h-1.5 w-full bg-red-600` (baris 50), tile ikon `bg-red-100 dark:bg-red-900/30` dengan `AlertTriangle` `text-red-600 dark:text-red-400` (baris 54-56), kartu subjek merah `border-red-100 bg-red-50 ... dark:bg-red-900/10` (baris 65-68), dan tombol konfirmasi `MdButton variant="filled" danger` (baris 77). JSDoc-nya sendiri (baris 26-28) hanya berkata "Gaya konsisten dengan DeleteConfirmModal: aksen merah", yaitu pewarisan dari dialog hapus, bukan keputusan desain yang terdokumentasi. Akibatnya keputusan konsekuensial yang bukan destruktif, yaitu menyetujui atau menolak pengajuan tenant, tampil sebagai peringatan merah.
- Design evidence:
  - DESIGN.md, bagian "Product/Admin UI" (bullet Modals, baris 163): "Modals: `ui-btn-primary` (solid tosca) for confirm; ghost/outline for cancel. No orange→violet or multi-stop brand gradients on admin chrome."
  - DESIGN.md, bagian "Color System" › "Status / Semantic" (baris 80-90): "Error: rose/red" dan "Error/required markers use rose, never brand-primary." Merah hanya untuk error/destruktif; tosca adalah aksen brand untuk aksi konfirmasi.
  - Rantai panggilan yang terdampak: `TenantProposalManager.onConfirm` (`src/components/admin/TenantProposalManager.tsx:157`, `handleReview` baris 153-161) → `modalState.openConfirm` (hook `useConfirmDialog.confirm` di `App.tsx`) → `LazyConfirmDialog`. Hook saat ini hanya meneruskan `title`, `message`, `subject`, `confirmLabel` (`src/components/modals/useConfirmDialog.tsx:59-66`) sehingga opsi apa pun yang baru harus diteruskan secara eksplisit.
  - Audit desain yang diterima: tambahkan opsi tone; tone netral = konfirmasi tosca (default terdokumentasi), tone danger = merah hari ini (semua pemanggil lama tidak berubah piksel).
- Owner: tim frontend (komponen modals + admin queue).
- Scope and affected surfaces: `ConfirmDialog.tsx` (satu cabang visual tiga titik), `useConfirmDialog.tsx` (penerusan prop), `TenantProposalManager.tsx` (dua entri STATUS_CONFIRM), plus dua berkas uji. Pemanggil lain (hapus event/draft/exhibition/album/news/surat, detail register) mewarisi tone default dan tidak berubah piksel.
- Uncertainty: tidak ada. Token `--wf-accent`, `--wf-accent-soft`, `--wf-board-2`, `--wf-rule` sudah terdefinisi untuk tema terang dan gelap di `src/styles/dashboard-wayfinding.css` (baris 34-44 terang, 55-64 gelap), dan `MdButton` filled tanpa `danger` sudah merender tosca via `--md-sys-color-primary: var(--wf-accent)` di `src/styles/material-theme.css:5`.

## Design decision
`ConfirmOptions` mendapat field opsional `tone?: 'danger' | 'neutral'` dengan default `'danger'`. Tiga titik visual bercabang berdasarkan tone:
- Bar atas: danger `h-1.5 w-full bg-red-600`; netral `h-1.5 w-full bg-[var(--wf-accent)]`.
- Tile ikon: danger `bg-red-100 dark:bg-red-900/30` dengan `AlertTriangle text-red-600 dark:text-red-400`; netral `bg-[var(--wf-accent-soft)]` dengan `Handshake text-[var(--wf-accent)]`.
- Kartu subjek: danger `border-red-100 bg-red-50 ... dark:bg-red-900/10` dengan teks subjek merah; netral `border-[var(--wf-rule)] bg-[var(--wf-board-2)]` dengan teks subjek `text-[var(--wf-ink)]` (ukuran font, weight, dan line-clamp tetap sama).
- Tombol konfirmasi: `MdButton variant="filled"` kehilangan flag `danger` hanya saat `tone === 'neutral'`; tanpa flag, filled merender tosca (`--md-sys-color-primary = --wf-accent`). Label "Hapus" default hanya masuk akal untuk danger, tapi label selalu bisa dikustomisasi dan TenantProposalManager sudah mengirim `confirmLabel` eksplisit, jadi default label tidak diubah.
- Ikon submit: `Trash2` hanya saat `tone === 'danger'`; tone netral memakai ikon netral yang sama (kecil, `h-3.5 w-3.5`, `aria-hidden` seperti hari ini).

Ikon netral yang dipilih: `Handshake` dari lucide-react. Alasan: sudah dipakai di kodebase untuk modul ini tepat (`src/components/dashboard/dashboardNavigation.tsx:9` impor, baris 156 untuk rute `/dashboard/tenant-proposals` "Kolaborasi Tenant"), dan membaca sebagai keputusan/kolaborasi, bukan peringatan. `CheckCircle2` juga sudah ada di kodebase tapi membaca sebagai "sudah selesai", kurang pas untuk dialog yang meminta keputusan.

## Reuse
- `MdButton` `variant="filled"` TANPA `danger` sudah merender tosca via `--md-sys-color-primary: var(--wf-accent)` di `src/styles/material-theme.css:5`; tidak ada perubahan internal MdButton.
- Token yang sudah ada: `--wf-accent` (#00706e terang / #33bfbc gelap, `src/styles/dashboard-wayfinding.css:41,61`), `--wf-accent-soft` (baris 44,64), `--wf-board-2` (baris 34,55), `--wf-rule` (baris 35,56). Tidak ada token baru.
- Ikon `Handshake` dari lucide-react, sudah diimpor di `src/components/dashboard/dashboardNavigation.tsx:9` untuk modul yang sama.
- `ModalWrapper`, `MdIconButton`, pola `isSubmitting`, dan kontrak promise `useConfirmDialog` dipakai apa adanya.
- Exemplar: `src/components/admin/TenantProposalManager.tsx` (antrean yang dilayani; STATUS_CONFIRM baris 69-82, `handleDelete` baris 172-177 yang tetap memakai default danger).

## Changes
1. `src/components/modals/ConfirmDialog.tsx` (+ permukaan tipe di `src/components/modals/useConfirmDialog.tsx`)
   - Change: tambah `tone?: 'danger' | 'neutral'` ke `ConfirmOptions` (default `'danger'` di destrukturisasi Props). Tepat tiga cabang visual berpindah: warna bar atas, tile + ikon, tint kartu subjek. Netral: bar atas `h-1.5 w-full bg-[var(--wf-accent)]`; tile `bg-[var(--wf-accent-soft)]` dengan ikon `Handshake text-[var(--wf-accent)]`; kartu subjek `border-[var(--wf-rule)] bg-[var(--wf-board-2)]` dengan teks subjek `text-[var(--wf-ink)]`. Danger mempertahankan kelas hari ini byte-identik. Tombol konfirmasi menjatuhkan flag `danger` hanya saat `tone === 'neutral'`. `Trash2` hanya untuk danger; ikon netral menggantikannya (`h-3.5 w-3.5`, aria-hidden seperti hari ini). `useConfirmDialog.tsx` meneruskan `tone` ke `LazyConfirmDialog` (baris 59-66).
   - Preserve: seluruh perilaku lama: alur onClose/onConfirm, disable saat isSubmitting, aria, penanganan Escape, kontrak ModalWrapper, semua pemanggil lama mendapat piksel identik.
   - Verify: dialog setujui merender bar tosca + tombol konfirmasi tosca; dialog hapus merender merah tidak berubah.
2. `src/components/admin/TenantProposalManager.tsx`
   - Change: entri STATUS_CONFIRM untuk `approved` dan `rejected` (baris 72-81) mengirim `tone: 'neutral'` (salinan teks byte-identik); konfirmasi hapus di `handleDelete` (baris 172-177) tetap tanpa tone (default danger). Bentuk tipe STATUS_CONFIRM diperluas dengan `tone`.
   - Preserve: logika konfirmasi hanya untuk approved/rejected di `handleReview` (baris 153-161), blok batal.
   - Verify: dialog setujui/tolak tosca; dialog hapus merah.
3. Tests: `src/components/modals/__tests__/ConfirmDialog.test.tsx` + `src/components/admin/__tests__/TenantProposalManager.test.tsx`
   - Change: tambah coverage: default (tanpa tone) merender bar merah atas; tone `'neutral'` merender bar atas tosca dan BUKAN yang merah; manager mengirim `tone: 'neutral'` di opsi konfirmasi untuk approved (assert objek opsi); delete tetap mengirim tanpa tone/default. Assertion bar atas memakai `container.querySelector` pada kelas pembedanya (`bg-red-600` vs `bg-[var(--wf-accent)]`) karena dekoratif.
   - Preserve: setiap assertion uji lama (mereka select by role/name dan harus tetap lulus tanpa diubah).
   - Verify: `NODE_ENV=test npx vitest run` pada kedua berkas.

## Scope
- Inherit: semua pemanggil ConfirmDialog yang ada (hapus events/drafts/exhibitions/albums/news/letters, detail register, dsb.): piksel tidak berubah via tone default.
- Verify: alur TenantProposalManager (approve, reject, delete), plus satu konsumen modal lain pilihan, mis. konfirmasi hapus di ExhibitionManager.
- Exclude: internal MdButton/MdChip, ModalWrapper, internal modal lain, halaman publik.

## Validation
- Product: reviewer menyetujui/menolak pengajuan tenant: dialog terbaca sebagai keputusan tosca, bukan peringatan merah.
- Interface: tema terang + gelap, 1440 + 375, alur approve/reject/delete.
- System: tanpa token baru, tanpa komponen baru; hanya `--wf-accent`/`--wf-accent-soft`/`--wf-board-2`/`--wf-rule` yang ada dan `MdButton` filled.
- Repository: `npx tsc --noEmit` menghasilkan 0 error; `npm run build` hijau; `NODE_ENV=test npx vitest run src/components/modals/__tests__/ConfirmDialog.test.tsx src/components/admin/__tests__/TenantProposalManager.test.tsx` hijau semua (suite penuh rawan flaky untuk uji modal karena race teardown yang diketahui: isolasi kegagalan sebelum menyebutnya regresi).

## Stop conditions
- Berhenti jika mengubah tone mensyaratkan mengutak-atik internal MdButton (tidak harus).
- Berhenti jika kontrak modal DESIGN.md ternyata tidak mengatur permukaan ini (mengatur: dashboard admin).

## Design documentation
- Setelah diterima dan divalidasi: tidak ada (kontrak modal DESIGN.md sudah mencakup ini; tidak perlu ubah dokumen).
