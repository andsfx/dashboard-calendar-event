# CTA solid: latar hover pindah dari `--wf-page` ke `--wf-accent-hover`

Written against: 191073d

## Evidence chain

- Surface: 20 CTA berisi teks pada 13 file, semuanya berpola "fill + tinta" yang sama: `bg-[var(--wf-accent)]` (kadang `!`) + `text-[var(--wf-accent-ink)]` (kadang `!`) + latar hover `hover:bg-[var(--wf-page)]` (`!` atau tidak; 2 elemen memakai `dark:hover:bg-[var(--wf-page)]!`, 1 elemen memakai `group-hover:`). Lokasi persis ada di `## Changes`.
- Problem: hover memindahkan latar ke `--wf-page` sementara tintanya tetap `--wf-accent-ink`, jadi pasangan teks/latar berhenti menjadi pasangan yang dirancang. Light: `#ffffff` di atas `#f8f7f0` = **1.07:1**. Dark: `#06120f` di atas `#0e1612` = **1.04:1**. Keduanya bukan sekadar gagal AA — label praktis hilang, dan aturan kontras `DESIGN.md:70-74` menyatakan aturan itu berlaku mutlak termasuk untuk setiap varian `hover:` / `active:` / `focus:` / `dark:` / `group-hover:`.
- Design evidence:
  - Kontrak: `DESIGN.md:70-74` — setiap permukaan berteks (button solid, chip aktif, badge, skip-link, CTA) **WAJIB** memakai `--brand-tosca-600` / `brand-primary-600`, dan aturan itu eksplisit mencakup varian `hover:` / `active:` / `focus:` / `dark:` / `group-hover:`.
  - Token: `src/styles/dashboard-wayfinding.css:33` `--wf-page: #f8f7f0`; `:42` `--wf-accent: #00706e`; `:43` `--wf-accent-hover: #005f5e`; `:44` `--wf-accent-ink: #ffffff`. Blok `.dark` mulai `:56`: `:57` `--wf-page: #0e1612`; `:64` `--wf-accent: #33bfbc`; `:65` `--wf-accent-hover: #66cfcd`; `:69` `--wf-accent-ink: #06120f`. Kedua token latar hover sudah didefinisikan per tema — tidak ada token baru yang dibutuhkan.
  - Pola kanonik sistem: `.wf-btn--primary:hover { background: var(--wf-accent-hover); }` di `src/styles/dashboard-wayfinding.css:637-639` (dasar `.wf-btn--primary` di `:632-635`). Varian quiet memakai aturan terpisah `.wf-btn--quiet:hover { background: var(--wf-board-2); }` (`:647-649`) — dua keluarga ini memang tidak boleh disatukan.
  - Rasio hasil (diukur, bukan ditaksir): light `#ffffff` / `#005f5e` = **7.5:1**; dark `#06120f` / `#66cfcd` = **10.33:1**. Keduanya lolos AA (4.5:1) dan AAA (7:1) untuk teks normal. Basis non-hover juga lolos: `#ffffff`/`#00706e` = 5.93:1, `#06120f`/`#33bfbc` = 8.46:1.
- Owner: kelas literal per call site di 13 file TSX (tidak ada primitif bersama yang bisa diperbaiki sekali). Dua elemen memakai `<Button>` shadcn dengan `variant="ghost"`/`"default"` yang seluruh tampilannya ditimpa kelas literal, jadi perubahan tetap milik call site, bukan `src/components/ui/button.tsx`.
- Scope and affected surfaces: 20 CTA di 13 file — `src/pages/EventsLandingPage.tsx` (3), `EventSubmissionPage.tsx` (2), `ExhibitionsLandingPage.tsx` (2), `SponsorLandingPage.tsx` (2), `CommunityLandingPage.tsx` (2), `TenantCollaborationPage.tsx` (1), `TenantParticipationPage.tsx` (1), `NotFoundPage.tsx` (1); `src/components/events/EventPhotoGallery.tsx` (1); `src/components/community/CommunityBenefits.tsx` (1), `CommunityHero.tsx` (1), `CommunityRegistrationForm.tsx` (1), `CommunityUpcomingEvents.tsx` (2). Tiga kemunculan `hover:bg-[var(--wf-page)]` **tidak** termasuk (lihat `## Scope → Exclude`). Tidak menyentuh token, stylesheet, komponen UI bersama, atau jalur `ui-btn-primary`.
- Uncertainty: (a) komentar rasio di `dashboard-wayfinding.css:43-44` dan `:64-69` adalah angka lama/tertaksir yang berbeda tipis dari hasil ukur (mis. komentar menyebut 5.85:1 untuk `--wf-accent-ink` di atas `--wf-accent`, hasil ukur 5.93:1); komentar itu **tidak** diubah oleh plan ini karena bukan bagian dari masalah dan keduanya lolos AA. (b) `PublicLetterViewer.tsx:119,188` memakai `hover:bg-[var(--wf-page)]` tanpa `!` di elemen yang juga memakai `.ui-btn-primary`; karena `src/styles/utilities.css` diimpor tanpa pembungkus `@layer` (`src/index.css:10`), `.ui-btn-primary:hover` (`src/styles/utilities.css:91-93`, latar `--brand-tosca-dark` `#00554c`) mengalahkan utilitas Tailwind yang berlapis, sehingga hover latar di sana memang tidak aktif dan pasangan `text-white`/`#00554c` = 8.74:1 tetap lolos. Elemen itu bukan anggota keluarga yang diperbaiki di sini.

## Design decision

Untuk setiap CTA solid, latar hover menjadi `var(--wf-accent-hover)`, yaitu pasangan hover resmi dari `--wf-accent`, sehingga tinta `--wf-accent-ink` tetap menjadi tinta yang benar dan keduanya berganti bersama saat tema berganti. Kelas tinta hover diperlakukan **bersyarat**, bukan dibuang membabi buta. Pada `<a>`/`<Link>`/`<span>`, `text-[var(--wf-accent-ink)]` di basis sudah cukup sehingga `hover:text-[var(--wf-accent-ink)]!` memang mubazir dan dihapus. Pada primitive yang memasang hover text sendiri — `src/components/shadcn/button.tsx` `buttonVariants`, `ghost: "hover:bg-muted hover:text-foreground …"` — kelas itu **WAJIB dipertahankan**: `cn()` tidak mendedupe-nya, sehingga `hover:text-foreground` tetap hidup dan menang lewat urutan CSS, dan label berakhir `--foreground` di atas `--wf-accent-hover` = **2.21:1 terang / 1.63:1 gelap** (gagal AA). Mekanisme `cn()` di `src/utils/cn.ts` (prefix-based, tanpa tailwind-merge) tidak bisa dipakai sebagai jaminan untuk kelas arbitrary-variable: `conflictKey()` membuang scope `dark:`, mengambil segmen setelah `:` terakhir, lalu memotong di tanda hubung **terakhir** pada segmen itu — `conflictKey('hover:bg-[var(--wf-page)]!')` = `hover:bg-[var(--wf` sedangkan `conflictKey('hover:bg-[var(--wf-accent-hover)]!')` = `hover:bg-[var(--wf-accent`, jadi bila keduanya masuk satu panggilan `cn(...)` sebagai argumen berbeda, keduanya **bertahan berdampingan** alih-alih saling menimpa (kelas terakhir-menang hanya berlaku untuk kunci yang identik). Lebih jauh, seluruh kelas di `## Changes` ada di dalam **satu** string literal `className`, jadi `cn()` tidak menyentuh isi literal itu sama sekali; bila dua kelas latar hover berdampingan di sana, pemenangnya ditentukan urutan aturan di CSS hasil build — tidak deterministik dari sisi pembaca kode. Karena itu kelas lama WAJIB dihapus secara tekstual. `dark:hover:bg-[var(--wf-page)]!` juga dihapus (bukan diganti `dark:hover:bg-[var(--wf-accent-hover)]!`) karena `--wf-accent-hover` sudah punya nilai berbeda di blok `.dark` (`dashboard-wayfinding.css:65`) — satu token per peran, sesuai `DESIGN.md` §"Aturan satu token per peran".

Tidak ada token baru, tidak ada primitif baru, tidak ada perubahan `DESIGN.md` di dalam pekerjaan ini (lihat `## Design documentation`).

## Reuse

- `var(--wf-accent-hover)` apa adanya dari `src/styles/dashboard-wayfinding.css:43` dan `:65`; nilainya sudah diverifikasi terhadap `--wf-accent-ink` di kedua tema (7.5:1 / 10.33:1).
- Pola hover kanonik `.wf-btn--primary:hover` (`dashboard-wayfinding.css:637-639`) sebagai acuan bentuk: hanya `background` yang berubah, tinta tidak disentuh.
- `ui-focus-ring` (`src/styles/utilities.css:1-6`) dan cincin focus inline (`focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] focus-visible:ring-offset-2` di `CommunityBenefits.tsx:56`) dipertahankan apa adanya.
- Bentuk pill/padat yang sudah ada: `rounded-full`, `min-h-11`/`h-auto`, `px-* py-*`, `shadow-sm`/`shadow-lg`, `font-bold`/`font-semibold` — tidak diubah.
- Tidak ada kelas baru di luar satu nilai latar yang sudah ada di sistem.

## Changes

Aturan penggantian untuk semua entri: ganti **teks latar hover** pada string kelas, lalu **hapus** kelas tinta hover yang mubazir. Jangan menambah `dark:hover:bg-[var(--wf-accent-hover)]!` — token sudah flip sendiri. Semua nomor baris di bawah masih menunjuk elemen yang benar pada 191073d (tidak ada drift; verifikasi ulang dengan `grep -n "hover:bg-\[var(--wf-page)\]" <file>`).

1. `src/pages/EventsLandingPage.tsx:376` — tombol "Lihat detail event" (kartu event).
   - Change: dari
     `group inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-page)]! ui-focus-ring h-auto border-0 rounded-full! font-bold! active:translate-y-0! hover:text-[var(--wf-accent-ink)]!`
     menjadi
     `group inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! ui-focus-ring h-auto border-0 rounded-full! font-bold! active:translate-y-0!`
     (satu perubahan: `hover:bg-[var(--wf-page)]!` → `hover:bg-[var(--wf-accent-hover)]!`. `hover:text-[var(--wf-accent-ink)]!` **dipertahankan** — elemen ini `<Button variant="ghost">`, yang membawa `hover:text-foreground` dari `buttonVariants`.)
   - Preserve: `group`, animasi `group-hover:translate-x-0.5` pada `ArrowRight` beserta `motion-reduce:transform-none`; `ui-focus-ring`; `h-auto border-0 rounded-full! font-bold!` (penimpa gaya shadcn `Button`); `active:translate-y-0!`.
   - Verify: tidak ada lagi `hover:bg-[var(--wf-page)]` di baris `:376`; `grep -n "hover:text-\[var(--wf-accent-ink)\]" src/pages/EventsLandingPage.tsx` **tetap** memuat baris `:376` (override tinta dipertahankan).

2. `src/pages/EventsLandingPage.tsx:505` — tombol "Coba lagi" (galeri error).
   - Change: dari
     `mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-page)]! ui-focus-ring h-auto border-0 rounded-full! font-bold! active:translate-y-0! hover:text-[var(--wf-accent-ink)]!`
     menjadi
     `mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] shadow-sm transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! ui-focus-ring h-auto border-0 rounded-full! font-bold! active:translate-y-0!`.
   - Preserve: ikon `RefreshCw`, `ui-focus-ring`, `active:translate-y-0!`, bentuk pill.
   - Verify: hover light/dark label "Coba lagi" terbaca; baris :505 **tetap** memuat `hover:text-[var(--wf-accent-ink)]!` sebagai penimpa `hover:text-foreground`.

3. `src/pages/EventsLandingPage.tsx:1135` — Link "Daftar event" di band CTA bawah.
   - Change: dari
     `inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-7 py-3.5 text-sm font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-page)] ui-focus-ring`
     menjadi
     `inline-flex shrink-0 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-7 py-3.5 text-sm font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-accent-hover)] ui-focus-ring`.
   - Preserve: elemen tetap `Link to="/daftar"`, `shadow-lg`, `ui-focus-ring`, ikon `ArrowRight`.
   - Verify: hover band CTA di `/events` (light & dark) label putih/gelap tetap terbaca.
     ⚠️ **Jangan sentuh** `:788` (varian quiet, lihat `## Scope → Exclude`).

4. `src/pages/EventSubmissionPage.tsx:190` — tombol "Ajukan event lain" (state sukses).
   - Change: dari
     `h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-5 py-2.5 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! ui-focus-ring`
     menjadi
     `h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-5 py-2.5 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! ui-focus-ring`.
   - Preserve: `<Button type="button" variant="ghost" onClick={handleReset}>`, `bg-[var(--wf-accent)]!` (tetap), `active:translate-y-0!`, `ui-focus-ring`, ikon `CalendarPlus`.
   - Verify: pada state sukses `/ajukan-event`, hover tombol tidak membuat label hilang di kedua tema.

5. `src/pages/EventSubmissionPage.tsx:404` — tombol submit "Kirim pengajuan".
   - Change: dari
     `mt-6 h-auto w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60 ui-focus-ring`
     menjadi
     `mt-6 h-auto w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60 ui-focus-ring`.
   - Preserve: `disabled={isSubmitting}` dan `disabled:opacity-60`; konten kondisional spinner/"Mengirim…"; `ui-focus-ring`.
   - Verify: hover pada state idle terbaca di light & dark; saat `disabled` latar tetap `--wf-accent` dengan opasitas 60%.

6. `src/pages/ExhibitionsLandingPage.tsx:157` — Link "Ajukan kolaborasi"/"Lihat detail" di kartu pameran.
   - Change: dari
     `mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]`
     menjadi
     `mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]`.
   - Preserve: `Link to={`/pameran/${item.id}`}` tidak berubah (tujuan tidak boleh ikut berubah saat label berganti); ikon `Handshake`.
   - Verify: hover kartu pameran di `/pameran`, dua tema, label tetap terbaca.

7. `src/pages/ExhibitionsLandingPage.tsx:296` — tombol submit "Kirim pengajuan".
   - Change: dari
     `h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`
     menjadi
     `h-auto items-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`.
   - Preserve: `<Button variant="ghost" disabled={submitting}>`, label kondisional, `active:translate-y-0!`. Elemen ini juga `<Button variant="ghost">`, jadi `hover:text-[var(--wf-accent-ink)]!` wajib ada di hasil akhir walau tidak masuk daftar awal delapan tombol.
   - Verify: baris :296 **tetap** memuat `hover:text-[var(--wf-accent-ink)]!`; hover terbaca di dua tema.

8. `src/pages/SponsorLandingPage.tsx:220` — anchor "Saya tertarik mendukung event".
   - Change: dari
     `mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)] px-4 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]`
     menjadi
     `mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)] px-4 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]`.
   - Preserve: `href="#sponsor-form"`, `onClick={() => setField('eventId', event.id)}`, ikon `Handshake`; tombol sebelah "Lihat proposal" (`:212`) yang bergaya outline `hover:bg-[var(--wf-board-2)]` tidak diubah.
   - Verify: hover di `/sponsor` (light & dark) label "Saya tertarik mendukung event" terbaca; pasangan outline/solid di kartu yang sama tetap berbeda bobot.

9. `src/pages/SponsorLandingPage.tsx:375` — tombol submit form sponsor.
   - Change: dari
     `h-auto w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`
     menjadi
     `h-auto w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)]! px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`.
   - Preserve: `disabled={submitting}`, spinner kondisional, `active:translate-y-0!`.
   - Verify: hover state idle terbaca; `disabled` tetap opasitas 60%.

10. `src/pages/TenantCollaborationPage.tsx:613` — tombol submit "Kirim pengajuan" (template literal `${focusRing}`).
    - Change: dari
      `${focusRing} inline-flex h-auto items-center gap-2 whitespace-normal! rounded-full! bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! hover:text-[var(--wf-accent-ink)]! dark:hover:bg-[var(--wf-page)]! dark:hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`
      menjadi
      `${focusRing} inline-flex h-auto items-center gap-2 whitespace-normal! rounded-full! bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`.
      (tiga perubahan: latar hover light; **hapus** `dark:hover:bg-[var(--wf-page)]!` dan `dark:hover:text-[var(--wf-accent-ink)]!`; `hover:text-[var(--wf-accent-ink)]!` **dipertahankan** karena `<Button variant="ghost">` membawa `hover:text-foreground`.)
    - Preserve: interpolasi `${focusRing}` (variabel lokal di file ini, jangan diubah), `whitespace-normal! rounded-full!`, `disabled={submitting}`, ikon kondisional `Send`/`Handshake`.
    - Verify: hover di `/kolaborasi-tenant` (light & dark) label "Kirim pengajuan" terbaca; `grep -n "dark:hover:bg-\[var(--wf-page)\]" src` mengembalikan nol hasil setelah kedua file tenant selesai.

11. `src/pages/TenantParticipationPage.tsx:924` — tombol submit "Kirim pengajuan" (template literal `${focusRing}`).
    - Change: dari
      `${focusRing} inline-flex h-auto items-center gap-2 whitespace-normal! rounded-full! bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! hover:text-[var(--wf-accent-ink)]! dark:hover:bg-[var(--wf-page)]! dark:hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`
      menjadi
      `${focusRing} inline-flex h-auto items-center gap-2 whitespace-normal! rounded-full! bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! active:translate-y-0! disabled:opacity-60`.
    - Preserve: `${focusRing}`, `disabled={submitting || events.length === 0}`, `disabled:opacity-60`, ikon `Send`, label kondisional.
    - Verify: hover di `/partisipasi-tenant` dua tema; state disabled (tidak ada event) tetap terbedakan.

12. `src/pages/NotFoundPage.tsx:22` — tombol "Kembali ke beranda".
    - Change: dari
      `ui-focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-page)]! h-auto border-0 rounded-full! font-bold! active:translate-y-0! hover:text-[var(--wf-accent-ink)]!`
      menjadi
      `ui-focus-ring mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-accent-hover)]! hover:text-[var(--wf-accent-ink)]! h-auto border-0 rounded-full! font-bold! active:translate-y-0!`.
    - Preserve: `<Button type="button" variant="ghost" onClick={() => navigate('/')}>`, `shadow-lg`, `h-auto border-0 rounded-full! font-bold!`, ikon `ArrowLeft`.
    - Verify: halaman 404 (mis. `/halaman-tidak-ada`) hover terbaca di dua tema.

13. `src/components/events/EventPhotoGallery.tsx:68` — tombol "Coba lagi" pada `GalleryErrorState`.
    - Change: dari
      `mt-3 h-auto! min-h-11 gap-2 rounded-full border-0 bg-[var(--wf-accent)] px-5 py-2.5 text-xs font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)]! active:translate-y-0! focus-visible:ring-0 ui-focus-ring`
      menjadi
      `mt-3 h-auto! min-h-11 gap-2 rounded-full border-0 bg-[var(--wf-accent)] px-5 py-2.5 text-xs font-bold! text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)]! active:translate-y-0! focus-visible:ring-0 ui-focus-ring`.
    - Preserve: `<Button variant="default">`, `text-xs`, `border-0`, `focus-visible:ring-0 ui-focus-ring`, `active:translate-y-0!`, ikon `RefreshCw`.
    - Verify: putuskan jaringan saat membuka halaman detail event lalu hover "Coba lagi" pada panel error `role="alert"` (latar panel merah muda) di dua tema.

14. `src/components/community/CommunityBenefits.tsx:56` — Link "Lihat peluang sponsor".
    - Change: dari
      `mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-page)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] focus-visible:ring-offset-2`
      menjadi
      `mt-5 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-tosca)] focus-visible:ring-offset-2`.
    - Preserve: `Link to="/sponsor"`, `w-fit`, `min-h-11`, dan **seluruh** kelas `focus-visible:ring-*` (elemen ini tidak memakai `ui-focus-ring`, jadi cincin focus inline adalah satu-satunya indikator focus).
    - Verify: hover di kartu benefit pada `/` (light & dark) label terbaca; Tab ke elemen masih menampilkan cincin tosca.

15. `src/components/community/CommunityHero.tsx:155` — Link "Daftar event" di hero komunitas.
    - Change: dari
      `group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)] px-8 py-4 text-base font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-page)] active:scale-[0.98] motion-reduce:active:scale-100 ${focusRing}`
      menjadi
      `group inline-flex items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)] px-8 py-4 text-base font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-accent-hover)] active:scale-[0.98] motion-reduce:active:scale-100 ${focusRing}`.
    - Preserve: `${focusRing}`, `active:scale-[0.98] motion-reduce:active:scale-100`, `shadow-lg`, dan animasi `group-hover:translate-x-0.5 motion-reduce:transform-none` pada ikon `ArrowRight` (jangan hapus `group`).
    - Verify: hover di hero `/` dua tema label "Daftar event" terbaca; klik/tekan tetap memberi skala 0.98; `prefers-reduced-motion` tetap mematikan skala.

16. `src/components/community/CommunityRegistrationForm.tsx:496` — tombol "Kirim pendaftaran".
    - Change: dari
      `inline-flex h-auto items-center justify-center gap-2 whitespace-normal rounded-full bg-[var(--wf-accent)] px-7 py-3.5 text-sm font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-page)] disabled:opacity-60 motion-reduce:transition-none active:translate-y-0 ${focusRing} focus-visible:ring-0`
      menjadi
      `inline-flex h-auto items-center justify-center gap-2 whitespace-normal rounded-full bg-[var(--wf-accent)] px-7 py-3.5 text-sm font-bold text-[var(--wf-accent-ink)] shadow-lg transition hover:bg-[var(--wf-accent-hover)] disabled:opacity-60 motion-reduce:transition-none active:translate-y-0 ${focusRing} focus-visible:ring-0`.
    - Preserve: `h-auto`, `whitespace-normal`, `disabled:opacity-60`, `motion-reduce:transition-none`, `${focusRing}`, `focus-visible:ring-0`, ikon `Send`, label kondisional `Mengirim…`.
    - Verify: hover tombol di form pendaftaran (`/daftar` dan panel komunitas) dua tema terbaca; saat `submitting` opasitas 60% tetap berlaku.

17. `src/components/community/CommunityUpcomingEvents.tsx:22` — anchor "Hubungi kami".
    - Change: dari
      `mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-page)]`
      menjadi
      `mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--wf-accent-ink)] transition-colors hover:bg-[var(--wf-accent-hover)]`.
    - Preserve: `href="#contact"`, `min-h-11`, `font-semibold`, ikon `ArrowRight`.
    - Verify: hover anchor di blok upcoming events dua tema; label "Hubungi kami" terbaca.

18. `src/components/community/CommunityUpcomingEvents.tsx:203` — `<span>` "Lihat detail event" di dalam kartu yang bisa diklik (`group`).
    - Change: dari
      `mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold text-[var(--wf-accent-ink)] transition-colors group-hover:bg-[var(--wf-page)]`
      menjadi
      `mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold text-[var(--wf-accent-ink)] transition-colors group-hover:bg-[var(--wf-accent-hover)]`.
      (`group-hover:bg-…` tetap `group-hover:`, **jangan** diubah menjadi `hover:` — pemicu hover ada di kartu induk.)
    - Preserve: elemen tetap `<span>` non-interaktif di dalam `Button` kartu; afinitas `group-hover` ke induk; ikon `ArrowRight size-4`.
    - Verify: hover di mana pun pada kartu upcoming event membuat pil "Lihat detail event" berubah ke `--wf-accent-hover` dan label tetap terbaca, dua tema.

19. `src/pages/CommunityLandingPage.tsx:146` — Link "Ajukan event" di header section.
    - Change: dari
      `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-page)] ui-focus-ring`
      menjadi
      `inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-[var(--wf-accent)] px-5 py-2.5 text-sm font-bold text-[var(--wf-accent-ink)] transition hover:bg-[var(--wf-accent-hover)] ui-focus-ring`.
    - Preserve: `to="/ajukan-event"`, `shrink-0`, `min-h-11`, `ui-focus-ring`.
    - Verify: hover di `/` dua tema; label "Ajukan event" terbaca.

20. `src/pages/CommunityLandingPage.tsx:161` — Link "Daftar event" (blok CTA komunitas).
    - Change: dari
      `flex w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold whitespace-nowrap text-[var(--wf-accent-ink)] shadow-lg hover:bg-[var(--wf-page)]`
      menjadi
      `flex w-full items-center justify-center gap-2 rounded-full bg-[var(--wf-accent)] px-6 py-3 text-sm font-bold whitespace-nowrap text-[var(--wf-accent-ink)] shadow-lg hover:bg-[var(--wf-accent-hover)]`.
    - Preserve: `w-full`, `whitespace-nowrap`, `shadow-lg`, `to="/daftar"`. Catatan: elemen ini tidak punya `transition` dan plan ini **tidak** menambahkannya (di luar lingkup kontras).
    - Verify: hover di `/` dua tema; label "Daftar event" terbaca.

### Aturan penggantian (berlaku untuk semua entri)

- Ganti **hanya** token latar hover: `hover:bg-[var(--wf-page)]` / `hover:bg-[var(--wf-page)]!` → `hover:bg-[var(--wf-accent-hover)]` / `hover:bg-[var(--wf-accent-hover)]!`. Pertahankan ada/tidaknya `!` persis seperti aslinya.
- `group-hover:bg-[var(--wf-page)]` → `group-hover:bg-[var(--wf-accent-hover)]` (tetap `group-hover:`).
- **Hapus** `hover:text-[var(--wf-accent-ink)]!` **hanya** bila elemennya bukan primitive yang memasang hover text sendiri. Periksa dulu `src/components/shadcn/button.tsx`: `ghost` membawa `hover:text-foreground`, jadi pada `<Button variant="ghost">` kelas `hover:text-[var(--wf-accent-ink)]!` **dipertahankan** (tanpa itu label 2.21:1 terang / 1.63:1 gelap). `dark:hover:text-[var(--wf-accent-ink)]!` tetap dihapus di mana pun: tidak ada varian `dark:hover:text-*` di `buttonVariants`, dan `--wf-accent-ink` sudah flip per tema. Jangan mengandalkan `cn()` atau urutan kelas: resolver `src/utils/cn.ts` tidak mendedupe kelas arbitrary seperti ini.
- **Hapus** `dark:hover:bg-[var(--wf-page)]!`. Jangan diganti `dark:hover:bg-[var(--wf-accent-hover)]!` — token `--wf-accent-hover` sudah berbeda nilainya di `.dark` (`dashboard-wayfinding.css:65`), dan aturan satu token per peran melarang kelas dark yang menduplikasi peran token yang sudah flip.
- Jangan menyentuh `bg-[var(--wf-accent)]`, `text-[var(--wf-accent-ink)]`, `active:translate-y-0!`, `active:scale-[0.98]`, `${focusRing}`, `ui-focus-ring`, `shadow-*`, radius, padding, atau teks/ikon/label.

## Scope

- Inherit: semua rute yang memuat 20 CTA di atas — `/events`, `/ajukan-event`, `/pameran`, `/sponsor`, `/` (CommunityLandingPage + CommunityHero + CommunityBenefits + CommunityUpcomingEvents + CommunityRegistrationForm), `/kolaborasi-tenant`, `/partisipasi-tenant`, `/daftar`, dan 404.
- Verify: `grep -rn "hover:bg-\[var(--wf-page)\]" src` setelah pekerjaan selesai hanya menyisakan 3 baris yang ada di daftar `Exclude` di bawah.
- Exclude #1: `src/pages/EventsLandingPage.tsx:788` — anchor `"Kalender lengkap"`. Elemen ini memang memakai `bg-[var(--wf-accent)]`, tetapi ia **link tekstual, bukan tombol primér**. Buktinya ada pada kelasnya sendiri: bobot `font-semibold` (vs `font-bold` pada CTA band bawah), ukuran `text-[13px]` (vs `text-sm`), padding `px-5 py-2.5` (vs `px-7 py-3.5`), tanpa `min-h-11`, tanpa `shadow-lg`, dan ia **menambahkan** `hover:text-[var(--wf-ink)]` sehingga hover memindahkan latar ke paper **dan** tinta ke tinta biasa — pasangan paper/ink yang dirancang untuk link. Bandingkan `:1135` di halaman yang sama: CTA primér ber-`shadow-lg`/`px-7 py-3.5` **tidak** meng-override tinta saat hover. Karena `:788` sudah memindahkan tinta bersama latar, pasangan hover-nya kontras (`--wf-ink` di atas `--wf-page`) dan tidak bermasalah; memaksakan `--wf-accent-hover` justru menghapus makna link-nya. Jangan diubah.
- Exclude #2 & #3: `src/pages/PublicLetterViewer.tsx:119` dan `:188` — tintanya `text-white` dan fill-nya berasal dari `.ui-btn-primary` (`src/styles/utilities.css:85-89`), bukan `bg-[var(--wf-accent)]`; kelas `hover:bg-[var(--wf-page)]` tanpa `!` di situ tidak pernah menang atas `.ui-btn-primary:hover` (`:91-93`) karena `utilities.css` diimpor tanpa `@layer` (`src/index.css:10`). Memindahkannya ke `--wf-accent-hover` akan mencampur dua sistem warna (tosca-600/`--brand-tosca-dark` vs `--wf-accent*`) tanpa memperbaiki apa pun. Jangan diubah; dicatat sebagai ketidaksesuaian kosmetik terpisah bila kelak `utilities.css` dipindah ke dalam `@layer`.
- Exclude tambahan (bukan keluarga kelas ini, jangan disentuh): `src/components/events/FeaturedEvents.tsx:148` (`hover:bg-transparent hover:text-[var(--wf-accent-hover)]` — varian teks/ghost untuk link aksi), seluruh `Button` ber-`variant="outline"`/`ghost` yang tidak memakai `bg-[var(--wf-accent)]`, dan `.wf-btn--*` di stylesheet.

## Validation

1. Build: `npm run build` → 0 error TypeScript dan 0 error Vite. (Skrip berisi `tsc && vite build`.)
2. Unit test: `NODE_ENV=test npx vitest run --maxWorkers=2` → tidak ada failure; baseline **161 file / 1349 tes**. Bandingkan jumlah file & tes dengan baseline; penurunan jumlah tes berarti ada file tes yang tidak ter-load, bukan "lulus".
3. Statik: `grep -rn "hover:bg-\[var(--wf-page)\]" src` → tepat 3 hasil: `EventsLandingPage.tsx:788`, `PublicLetterViewer.tsx:119`, `PublicLetterViewer.tsx:188`. `grep -rn "dark:hover:bg-\[var(--wf-page)\]" src` → 0 hasil. `grep -rn "hover:text-\[var(--wf-accent-ink)\]" src` **tidak** 0: pada 13 file yang diubah, kelas itu justru wajib tetap ada di 9 baris `<Button variant="ghost">` (`EventsLandingPage.tsx:376`, `:505`; `EventSubmissionPage.tsx:190`, `:404`; `ExhibitionsLandingPage.tsx:296`; `SponsorLandingPage.tsx:375`; `TenantCollaborationPage.tsx:613`; `TenantParticipationPage.tsx:924`; `NotFoundPage.tsx:22`) dan tidak boleh ada di `<a>`/`<Link>`/`<span>` maupun `Button` varian `default`. Selebihnya, kemunculan di file lain (mis. `CalendarView.tsx:231`, `DocsPage.tsx:196`) adalah elemen yang latar hover-nya tetap `--wf-accent` — di luar lingkup plan ini.
4. Visual hover, **dua tema** (light dan dark), minimal di `/events` (`:376`, `:505`, `:1135`), `/ajukan-event` (`:190` pada state sukses, `:404` pada form), `/pameran` (`:157`) dan `/pameran/:id` (`:296`), `/sponsor` (`:220`, `:375`). Cek dengan kursor di atas tiap CTA: label harus tetap terbaca dan latar harus terlihat lebih gelap (light) / lebih terang (dark) dari basis, bukan berubah jadi krem/hitam pekat.
5. Visual hover tambahan: `/` (hero, kartu benefit, upcoming events termasuk hover di area kartu untuk `group-hover` `:203`, form pendaftaran), `/kolaborasi-tenant`, `/partisipasi-tenant` (termasuk state disabled saat belum ada event), `/daftar`, dan satu URL 404. **Sticky CTA mobile** (`CommunityLandingPage.tsx:161`) hanya muncul di viewport kecil — ukur di 390×844, bukan di 1280.
6. Cakupan terukur (baseline audit final): **58 state PASS, 0 gagal, 20/20 CTA terukur** di dua tema. Dua CTA butuh kondisi khusus dan mudah terlewat: `ExhibitionsLandingPage.tsx:296` baru ter-mount di rute detail `/pameran/:id` (bukan daftar `/pameran`), dan `CommunityLandingPage.tsx:161` hanya tampil di sticky mobile 390×844. Keduanya berakhir 7.50:1 / 10.33:1.
7. Kontras: bila ada keraguan angka, hitung ulang pasangan `#ffffff`/`#005f5e` (harus 7.5:1) dan `#06120f`/`#66cfcd` (harus 10.33:1). Jangan menurunkan `--wf-accent-hover` atau menambahkan opasitas pada latar hover untuk "menyamakan" tampilan.

## Stop conditions

Hentikan dan laporkan (jangan memaksa) bila:

- Sebuah lokasi ternyata bukan tombol primér. Kriteria penentu adalah kombinasi ini, **bukan** sekadar fill-nya: fill `bg-[var(--wf-accent)]` + tinta `text-[var(--wf-accent-ink)]` **tanpa** override tinta saat hover + bobot/padding tombol (`font-bold`, `text-sm`, padding lebar, `min-h-11`/`shadow-lg`). Fill `--wf-accent` sendirian tidak boleh dipakai sebagai alasan pengecualian — `EventsLandingPage.tsx:788` memakai fill yang sama tetapi jelas link tekstual (`font-semibold`, `text-[13px]`, `px-5 py-2.5`, `hover:text-[var(--wf-ink)]`). Contoh yang sudah diketahui masuk `Exclude`: `EventsLandingPage.tsx:788` (link) dan `PublicLetterViewer.tsx:119/188` (`.ui-btn-primary` + `text-white`). Pindahkan ke `## Scope → Exclude`, jangan diubah.
- Sebuah lokasi ternyata `<Button>` shadcn: periksa `src/components/shadcn/button.tsx` (`buttonVariants`) untuk hover text/bg bawaan variannya **sebelum** menghapus kelas. Varian `ghost` membawa `hover:text-foreground` (harus ditimpa `hover:text-[var(--wf-accent-ink)]!`), varian `default` membawa `hover:bg-primary/80` (latar hover harus membawa `!` agar menang). Bila ragu, jangan hapus apa pun dan laporkan.
- Mengganti latar hover mengubah makna affordance: elemen yang sengaja dibuat terlihat seperti tautan (bukan tombol) atau CTA yang sedang dinonaktifkan memakai hover latar sebagai satu-satunya sinyal status.
- Menemukan CTA solid yang varian dark-nya **bukan** sekadar duplikasi tetapi sengaja memilih warna berbeda dari token (mis. latar hover dark memakai warna non-`--wf-*`); jangan hapus kelas dark itu tanpa keputusan eksplisit.
- Baris yang disebut di `## Changes` tidak lagi cocok dengan string kelas lama (drift akibat commit lain): berhenti pada file itu, laporkan selisihnya, dan jangan menebak penggantian.
- Ada file di luar 13 file yang perlu diubah untuk membuat hover terbaca (mis. token atau `.ui-btn-primary`). Itu keputusan terpisah; laporkan, jangan diperluas sendiri.

## Design documentation

Setelah plan ini diterapkan dan diverifikasi, dokumentasi berikut **sebaiknya** diperbarui (bukan bagian dari eksekusi plan ini, dan file itu tidak disentuh oleh plan ini):

- `DESIGN.md:70-74` — tambahkan satu kalimat penutup pada poin kontras permukaan berteks, persis:

  > Varian `hover:` pada CTA solid **WAJIB** memakai `--wf-accent-hover` sebagai latar (bukan `--wf-page`, `--wf-board`, atau `--wf-board-2`); tinta tidak diganti saat hover karena `--wf-accent-ink` sudah menjadi pasangan kontras dari kedua fill (`#ffffff`/`#005f5e` = 7.5:1 di terang, `#06120f`/`#66cfcd` = 10.33:1 di gelap).

- `DESIGN.md` §"Aturan satu token per peran" — catat bahwa pasangan `hover:bg-[…]` + `dark:hover:bg-[…]` untuk CTA solid dibuang varian dark-nya, karena `--wf-accent-hover` punya nilai sendiri di blok `.dark` (`src/styles/dashboard-wayfinding.css:65`).
- `docs/DESIGN-SYSTEM.md` — bila dokumen itu kelak memuat catatan hover CTA (saat ini hanya contoh `hover:` generik di `:551`), tambahkan baris bahwa latar hover CTA solid = `--wf-accent-hover` dan `--wf-page` hanya untuk varian quiet/ghost (contoh sah: `EventsLandingPage.tsx:788`).
- `CHANGELOG.md` — catat sebagai perbaikan aksesibilitas: "CTA solid: latar hover pindah ke `--wf-accent-hover`; label hover tidak lagi 1.07:1 / 1.04:1", dengan rujukan plan ini. (Jangan dikerjakan di dalam plan ini bila pengubahan `CHANGELOG.md` di luar izin tugas.)
