import { useCallback, useEffect, useState } from 'react';
import {
  fetchTenantEventProposals, updateTenantEventProposal, deleteTenantEventProposal,
} from '../utils/api/tenantEventProposalsApi';
import type { TenantEventProposal, TenantEventProposalStatus } from '../types';

/**
 * State pengajuan kolaborasi tenant untuk dashboard admin.
 *
 * Mutasi tidak optimistic: ubah status dan hapus keduanya bergantung pada
 * keputusan server (baris bisa saja sudah hilang), jadi UI menampilkan hasil
 * setelah server sukses — pola yang sama dengan useExhibitions.
 */
export function useTenantEventProposals(enabled: boolean) {
  const [proposals, setProposals] = useState<TenantEventProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setProposals(await fetchTenantEventProposals());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengajuan kolaborasi tenant');
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
      await reload();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan');
      return false;
    }
  }, [reload]);

  const reviewProposal = useCallback(
    (id: string, status: TenantEventProposalStatus, internalNotes?: string) =>
      runMutation(() => updateTenantEventProposal(id, {
        status,
        ...(internalNotes !== undefined ? { internalNotes } : {}),
      })),
    [runMutation],
  );

  const saveNotes = useCallback(
    (id: string, internalNotes: string) => runMutation(() => updateTenantEventProposal(id, { internalNotes })),
    [runMutation],
  );

  const removeProposal = useCallback(
    (id: string) => runMutation(() => deleteTenantEventProposal(id)),
    [runMutation],
  );

  return { proposals, isLoading, error, reload, reviewProposal, saveNotes, removeProposal };
}
