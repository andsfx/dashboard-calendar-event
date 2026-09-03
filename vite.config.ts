import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
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
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // More specific matches first
          if (id.includes("jspdf")) return "pdf"; // jspdf + jspdf-autotable
          // Deps jspdf lainnya (fflate, fast-png, @babel/runtime) — chunk pdf
          // lazy, bukan vendor eager.
          if (id.includes("fflate") || id.includes("fast-png") || id.includes("@babel/runtime")) return "pdf";
          return "vendor";
        },
      },
    },
    minify: 'terser',
    modulePreload: { polyfill: false },
    terserOptions: {
      ecma: 2022,
      compress: { pure_new: true, passes: 3, booleans_as_integers: true, pure_getters: true, keep_fargs: false, unsafe: true, unsafe_methods: true, unsafe_comps: true, unsafe_Function: true, unsafe_math: true, unsafe_symbols: true, unsafe_proto: true },
      format: { comments: false, semicolons: false },
    },
  },
});
