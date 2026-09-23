import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";

/**
 * Pemulihan chunk basi.
 *
 * SPA ini memakai `lazy(() => import(...))` per rute, jadi setiap rute adalah
 * chunk terpisah dengan hash di nama file. HTML di-cache di edge; setelah
 * deploy baru, HTML basi bisa menunjuk hash aset yang sudah tidak ada sehingga
 * fetch chunk gagal dan React melempar error → layar putih.
 *
 * Vite memancarkan `vite:preloadError` untuk kasus ini. Muat ulang sekali
 * (dijaga agar tidak jadi loop) sehingga pengguna mendapat HTML + chunk baru.
 */
const RELOAD_KEY = "chunk-reload-at";

window.addEventListener("vite:preloadError", () => {
  const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? 0);
  // Hanya reload bila percobaan terakhir sudah lebih dari 10 detik lalu —
  // mencegah loop reload bila kegagalan bukan karena chunk basi.
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
    <SpeedInsights />
    <Analytics />
  </StrictMode>
);
