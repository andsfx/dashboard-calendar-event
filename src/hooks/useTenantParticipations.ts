import { useCallback, useEffect, useState } from 'react';
import {
  fetchTenantParticipations, updateTenantParticipation, deleteTenantParticipation,
  type TenantParticipationPatch,
} from '../utils/api/tenantParticipationsApi';
import type { TenantParticipation, TenantParticipationStatus } from '../types';

/**
 * State partisipasi tenant (open booth & voucher) untuk dashboard admin.
 *
 * Mutasi tidak optimistic: ubah status, koreksi isian, dan hapus bergantung
 * pada keputusan server (baris bisa saja sudah hilang), jadi UI menampilkan
 * hasil setelah server sukses — pola yang sama dengan useTenantEventProposals.
 */
export function useTenantParticipations(enabled: boolean) {
  const [participations, setParticipations] = useState<TenantParticipation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      setParticipations(await fetchTenantParticipations());
      setError('');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengajuan partisipasi tenant');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  const runMutation = useCallback(async (mutate: () => Promise<void>): Promise<boolean> => {
    try {
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
      return false;
    }
    // Mutasi berhasil, tapi daftar bisa gagal dimuat ulang. Melaporkan `true`
    // di sini membuat pemanggil membuang draft lokal padahal baris di layar
    // masih versi lama — jadi hasil reload yang menentukan.
    return reload();
  }, [reload]);

  const reviewParticipation = useCallback(
    (id: string, status: TenantParticipationStatus, internalNotes?: string) =>
      runMutation(() => updateTenantParticipation(id, {
        status,
        ...(internalNotes !== undefined ? { internalNotes } : {}),
      })),
    [runMutation],
  );

  const saveNotes = useCallback(
    (id: string, internalNotes: string) => runMutation(() => updateTenantParticipation(id, { internalNotes })),
    [runMutation],
  );

  /** Koreksi isian oleh Marcomm (K10) — field yang sama dengan form publik. */
  const saveCorrection = useCallback(
    (id: string, patch: TenantParticipationPatch) => runMutation(() => updateTenantParticipation(id, patch)),
    [runMutation],
  );

  const removeParticipation = useCallback(
    (id: string) => runMutation(() => deleteTenantParticipation(id)),
    [runMutation],
  );

  return {
    participations, isLoading, error, reload,
    reviewParticipation, saveNotes, saveCorrection, removeParticipation,
  };
}
