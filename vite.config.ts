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
          if (id.includes("@react-pdf") || id.includes("pdfkit") || id.includes("fontkit") || id.includes("yoga-layout") || id.includes("linebreak") || id.includes("unicode-properties")) return "pdf";
          if (id.includes("@vercel/analytics") || id.includes("@vercel/speed-insights")) return "vercel";
          if (id.includes("@tiptap") || id.includes("prosemirror")) return "editor";
          if (id.includes("lucide-react")) return "icons";
          if (id.includes("date-fns")) return "dates";
          if (id.includes("qrcode")) return "qrcode";
          // Core framework
          if (id.includes("react-dom") || id.includes("scheduler/tracing")) return "react-dom";
          if (id.includes("react")) return "react-core";
          return "vendor";
        },
      },
    },
    minify: 'esbuild',
  },
});
