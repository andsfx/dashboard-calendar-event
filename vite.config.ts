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
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          // More specific matches first
          if (id.includes("@supabase/supabase-js")) return "supabase";
          if (id.includes("@aws-sdk")) return "aws-sdk";
          if (id.includes("react-router")) return "router";
          if (id.includes("jspdf")) return "pdf"; // jspdf + jspdf-autotable
          // Deps jspdf lainnya (fflate, fast-png, @babel/runtime) — chunk pdf
          // lazy, bukan vendor eager.
          if (id.includes("fflate") || id.includes("fast-png") || id.includes("@babel/runtime")) return "pdf";
          if (id.includes("@vercel/analytics") || id.includes("@vercel/speed-insights")) return "vercel";
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "editor";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("date-fns")) return "dates";
          if (id.includes("qrcode")) return "qrcode";
          if (id.includes("react-dom") || id.includes("scheduler/tracing")) return "react-dom";
          if (id.includes("react")) return "react-core";
          return "vendor";
        },
      },
    },
    minify: 'terser',
    terserOptions: {
      compress: { passes: 3, booleans_as_integers: true, pure_getters: true },
      format: { comments: false, semicolons: false },
    },
  },
});
