import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Penjaga build-time: entry TIDAK boleh meng-import statis apa pun selain
 * `vendor`.
 *
 * Insiden 2026-09-23: chunk `pdf` (jspdf, ~398 kB) di-import statis oleh entry,
 * sehingga (a) engine PDF ikut di jalur boot meski semua pemakaiannya dinamis,
 * dan (b) satu aset menjadi titik gagal tunggal — edge CDN menyajikan
 * `index.html` basi (MIME `text/html`) untuk path chunk itu, entry gagal
 * dimuat, dan SELURUH situs berhenti di skeleton. Kegagalan seperti ini tidak
 * terlihat dari tes unit maupun `tsc`; hanya terdeteksi saat halaman dibuka.
 * Karena itu dijaga di sini, saat build.
 */
function assertLazyEntryChunks() {
  let outDir = "dist";
  return {
    name: "assert-lazy-entry-chunks",
    apply: "build",
    configResolved(cfg) {
      outDir = cfg.build.outDir;
    },
    closeBundle() {
      const assetsDir = path.join(outDir, "assets");
      if (!fs.existsSync(assetsDir)) return;
      const entry = fs.readdirSync(assetsDir).find(f => /^index-.*\.js$/.test(f));
      if (!entry) return;
      const src = fs.readFileSync(path.join(assetsDir, entry), "utf8");
      const staticImports = [...src.matchAll(/from"\.\/([A-Za-z0-9_.-]+\.js)"/g)]
        .map(m => m[1])
        .filter(name => !name.startsWith("vendor-"));
      if (staticImports.length > 0) {
        throw new Error(
          `[assert-lazy-entry-chunks] entry ${entry} meng-import statis: ${staticImports.join(", ")}.\n` +
          "Entry hanya boleh memuat chunk `vendor`. Chunk lain harus lewat import() dinamis — " +
          "kalau tidak, aset itu menjadi titik gagal tunggal dan bisa mematikan seluruh aplikasi " +
          "saat CDN menyajikan respons basi. Periksa build.rollupOptions.output.manualChunks.",
        );
      }
      console.log(`[assert-lazy-entry-chunks] ok — ${entry} hanya memuat vendor`);
    },
  };
}

export default defineConfig({
  plugins: [react(), assertLazyEntryChunks()],
  server: {
    watch: {
      ignored: ['**/.vite-log.txt', '**/.vite-out.txt', '**/.vite-err.txt'],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // jsPDF .html()/.svg() tidak dipakai — deps render-DOM (canvg,
      // dompurify, html2canvas, ~380 kB) di-stub agar keluar dari bundle.
      "canvg": path.resolve(__dirname, "src/stubs/empty.js"),
      "dompurify": path.resolve(__dirname, "src/stubs/empty.js"),
      "html2canvas": path.resolve(__dirname, "src/stubs/empty.js"),
    },
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        experimentalMinChunkSize: 98304,
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // Engine PDF (jspdf + jspdf-autotable + fflate/fast-png/@babel/runtime)
          // SENGAJA tidak dipaksa ke chunk sendiri. Dulu ada aturan
          // `if (id.includes("jspdf")) return "pdf"`, dan itu justru membuat
          // chunk `pdf` berisi helper preload Vite; akibatnya entry
          // meng-import chunk `pdf` SECARA STATIS, sehingga seluruh engine
          // (~398 kB) ikut di jalur boot meski semua pemakaiannya sudah
          // `import()` dinamis. Lebih buruk lagi: satu aset itu menjadi titik
          // gagal tunggal — bila edge menyajikan HTML basi untuk path-nya,
          // entry ikut gagal dimuat dan SELURUH situs berhenti di skeleton.
          // Dengan dibiarkan, Rollup menempelkan engine ke chunk pengimpor
          // dinamisnya (buildLetterPdf/buildSchedulePdf/…), dan entry hanya
          // memuat `vendor`.
          if (id.includes("jspdf") || id.includes("fflate") || id.includes("fast-png") || id.includes("@babel/runtime")) return;
          return "vendor";
        },
      },
    },
    minify: 'terser',
    modulePreload: { polyfill: false },
    terserOptions: {
      ecma: 2022,
      compress: { pure_new: true, passes: 3, booleans_as_integers: false, pure_getters: true, keep_fargs: false, unsafe: true, unsafe_methods: true, unsafe_comps: true, unsafe_Function: true, unsafe_math: true, unsafe_symbols: true, unsafe_proto: true },
      format: { comments: false, semicolons: false },
    },
  },
});
