import { useState } from 'react';
import type { GeneratedLetter } from '../../types';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';
import { Archive, ArchiveRestore, Copy, FileText, Search, Trash2 } from 'lucide-react';
import { DOC_TYPE_LABEL } from './letterDocuments';
import type { LetterPair } from '../../lib/letterStudio/schema';

interface LetterHistoryListProps {
  letters?: GeneratedLetter[];
  localPairs?: LetterPair[];
  isLoading: boolean;
  readOnly: boolean;
  onOpen?: (id: string) => void;
  onShare?: (id: string) => void;
  onArchive?: (id: string, target: 'active' | 'archived') => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (pair: LetterPair) => void;
  onDeletePair?: (pair: LetterPair) => void;
  onOpenPair?: (pair: LetterPair) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function LetterHistoryList({
  letters = [],
  localPairs = [],
  isLoading,
  readOnly,
  onOpen,
  onShare,
  onArchive,
  onDelete,
  onDuplicate,
  onDeletePair,
  onOpenPair,
  search = '',
  onSearchChange,
}: LetterHistoryListProps) {
  const [q, setQ] = useState(search);
  const filteredPairs = localPairs.filter((p) => {
    const hay = JSON.stringify(p).toLowerCase();
    return hay.includes(q.toLowerCase());
  });
  const filteredLetters = letters.filter((l) => {
    const hay = JSON.stringify(l).toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Memuat riwayat surat">
        <div className="h-4 w-24 animate-pulse rounded bg-[var(--wf-board-2)]" />
      </div>
    );
  }

  const handleQuery = (v: string) => {
    setQ(v);
    onSearchChange?.(v);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--wf-ink-muted)]" />
        {/*
          `h-auto` + `dark:bg-[var(--wf-board)]` menetralkan bawaan `Input`
          (`h-8`, `dark:bg-input/30`) supaya tinggi baris (py-2 ≈ 38px) dan
          latar bidang pencarian tetap sama di kedua tema. Sisa kelas bawaan
          digantikan oleh `className` ini lewat `cn` (border, bg, radius,
          padding, text-sm).
        */}
        <Input
          type="search"
          value={q}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder="Cari dokumen…"
          className="h-auto w-full rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board)] py-2 pl-9 pr-3 text-sm"
          aria-label="Cari riwayat"
        />
      </div>

      {localPairs.length > 0 && (
        <ul className="divide-y divide-[var(--wf-rule)] overflow-hidden rounded-xl border border-[var(--wf-rule)]">
          {filteredPairs.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">
                  {p.title || p.id}
                </p>
                <p className="text-xs text-[var(--wf-ink-muted)]">
                  {p.status === 'published' ? 'Terbit' : 'Draf lokal'} · {fmtDateTime(p.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {p.status === 'published' ? 'Terbit' : 'Draf lokal'}
                </span>
                <Button variant="outline" onClick={() => onOpenPair?.(p)} aria-label="Buka surat">
                  Buka
                </Button>
                {onDuplicate && (
                  <Button variant="ghost" size="icon-sm" aria-label="Duplikat" onClick={() => onDuplicate(p)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
                {onDeletePair && (
                  <Button variant="ghost" size="icon-sm" aria-label="Hapus" onClick={() => onDeletePair(p)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {letters.length > 0 && (
        <ul className="divide-y divide-[var(--wf-rule)] overflow-hidden rounded-xl border border-[var(--wf-rule)]">
          {filteredLetters.map((l) => (
            <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--wf-ink)]">{l.id}</p>
                <p className="text-xs text-[var(--wf-ink-muted)]">{DOC_TYPE_LABEL[l.docType]} · {fmtDateTime(l.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" onClick={() => onOpen?.(l.id)} aria-label="Buka surat">
                  Buka surat
                </Button>
                {onShare && <Button variant="ghost" size="icon-sm" aria-label="Salin link" onClick={() => onShare(l.id)}><Copy className="h-4 w-4" /></Button>}
                {onArchive && l.status !== 'archived' && (
                  <Button variant="ghost" size="icon-sm" aria-label="Arsipkan" onClick={() => onArchive(l.id, 'archived')}><Archive className="h-4 w-4" /></Button>
                )}
                {onArchive && l.status === 'archived' && (
                  <Button variant="outline" onClick={() => onArchive(l.id, 'active')} aria-label="Pulihkan">
                    <ArchiveRestore className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && <Button variant="ghost" size="icon-sm" aria-label="Hapus" onClick={() => onDelete(l.id)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {localPairs.length === 0 && letters.length === 0 && (
        <div className="rounded-xl border border-dashed border-[var(--wf-rule)] px-6 py-12 text-center">
          <FileText className="mx-auto mb-2 h-8 w-8 text-[var(--wf-ink-muted)]" />
          <p className="text-sm text-[var(--wf-ink-muted)]">Belum ada riwayat surat.</p>
        </div>
      )}
    </div>
  );
}
