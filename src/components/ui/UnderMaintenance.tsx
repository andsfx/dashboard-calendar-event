import type { ReactNode } from 'react';
import { Wrench } from 'lucide-react';

interface UnderMaintenanceProps {
  /** Judul modul, mis. "Buat Surat". */
  title: string;
  /** Satu kalimat: mengapa ditutup sementara. */
  reason: string;
  /** Langkah berikutnya untuk pengguna (opsional). */
  next?: ReactNode;
  className?: string;
}

/**
 * Placeholder untuk fitur yang sengaja ditutup sementara. Dipakai sebagai isi
 * halaman modul dan sebagai penanda baris di rail, supaya keduanya tidak bisa
 * berbeda cerita. Status memakai `--wf-action` (amber): bukan bahaya, bukan
 * juga berjalan — sama seperti status "menunggu" di seluruh papan.
 */
export function UnderMaintenance({ title, reason, next, className = '' }: UnderMaintenanceProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center rounded-[var(--wf-radius-board)] border border-dashed border-[var(--wf-rule-strong)] bg-[var(--wf-board)] px-6 py-12 text-center ${className}`}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--wf-action)]/12 text-[var(--wf-action)]">
        <Wrench className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="wf-key wf-key--action mt-4">Sedang Diperbaiki</p>
      <h2 className="mt-2 font-display text-xl font-bold text-[var(--wf-ink)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--wf-ink-muted)]">{reason}</p>
      {next ? <div className="mt-5 text-sm text-[var(--wf-ink-muted)]">{next}</div> : null}
    </div>
  );
}
