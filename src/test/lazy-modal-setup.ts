/**
 * `ModalWrapper` dan `useConfirmDialog` memuat komponennya dengan `React.lazy`
 * supaya dialog tidak masuk jalur boot/publik. Di jsdom, import dinamis itu
 * resolve di microtask, sehingga kueri sinkron tepat setelah `render()` bisa
 * mendahuluinya. Modul-modul ini di-preload di sini agar promise-nya sudah
 * selesai saat tes berjalan.
 *
 * DITUNGGU (bukan `void import(...)`): preload yang masih terbang saat berkas
 * tes selesai akan resolve setelah environment jsdom dibongkar — vitest
 * melaporkannya sebagai `EnvironmentTeardownError` (unhandled rejection) dan
 * membuat gerbang CI merah meski semua tes lulus.
 *
 * Import tetap DINAMIS (bukan statis) karena modul React ini tidak boleh dimuat
 * di tes ber-environment `node` (tes server).
 */
export {};

await import('../components/modals/ConfirmDialog');
