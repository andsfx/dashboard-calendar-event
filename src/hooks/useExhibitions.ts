import { useCallback, useEffect, useState } from 'react';
import {
  fetchExhibitions, createExhibition, updateExhibition, deleteExhibition,
  fetchExhibitionLeads, updateExhibitionLead, fetchExhibitionActivations,
  linkExhibitionActivation, unlinkExhibitionActivation,
  type AdminExhibition,
} from '../utils/api/exhibitionsApi';
import type { ExhibitionActivation, ExhibitionInput, ExhibitionLead } from '../types';

/**
 * State pameran untuk dashboard admin.
 *
 * Mutasi tidak optimistic: create/link membutuhkan ID + validasi server
 * (periode aktivasi), jadi UI hanya menampilkan hasil setelah server sukses.
 */
export function useExhibitions(enabled: boolean) {
  const [exhibitions, setExhibitions] = useState<AdminExhibition[]>([]);
  const [leads, setLeads] = useState<ExhibitionLead[]>([]);
  const [activations, setActivations] = useState<ExhibitionActivation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextExhibitions, nextLeads, nextActivations] = await Promise.all([
        fetchExhibitions(), fetchExhibitionLeads(), fetchExhibitionActivations(),
      ]);
      setExhibitions(nextExhibitions);
      setLeads(nextLeads);
      setActivations(nextActivations);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data pameran');
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

  const saveExhibition = useCallback(
    (input: ExhibitionInput, id?: string) => runMutation(async () => {
      if (id) await updateExhibition(id, input);
      else await createExhibition(input);
    }),
    [runMutation],
  );

  const removeExhibition = useCallback(
    (id: string) => runMutation(() => deleteExhibition(id)),
    [runMutation],
  );

  const reviewLead = useCallback(
    (id: string, status: ExhibitionLead['status'], internalNotes?: string) =>
      runMutation(() => updateExhibitionLead(id, status, internalNotes)),
    [runMutation],
  );

  const linkActivation = useCallback(
    (exhibitionId: string, eventId: string) => runMutation(() => linkExhibitionActivation(exhibitionId, eventId)),
    [runMutation],
  );

  const unlinkActivation = useCallback(
    (eventId: string) => runMutation(() => unlinkExhibitionActivation(eventId)),
    [runMutation],
  );

  return {
    exhibitions, leads, activations, isLoading, error,
    reload, saveExhibition, removeExhibition, reviewLead, linkActivation, unlinkActivation,
  };
}
