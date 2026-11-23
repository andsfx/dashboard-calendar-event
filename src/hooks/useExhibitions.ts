import { useCallback, useEffect, useState } from 'react';
import {
  fetchExhibitions, createExhibition, updateExhibition, deleteExhibition,
  fetchExhibitionLeads, updateExhibitionLead, fetchExhibitionActivations,
  fetchExhibitionSlots, createExhibitionSlot, updateExhibitionSlot, deleteExhibitionSlot,
  generateExhibitionSlots, publishCollaborationToEvent,
  linkExhibitionActivation, unlinkExhibitionActivation,
  type AdminExhibition, type CollaborationReviewPatch, type ExhibitionSlotInput,
} from '../utils/api/exhibitionsApi';
import type { ExhibitionActivation, ExhibitionInput, ExhibitionLead, ExhibitionSlot } from '../types';

/**
 * State pameran/kolaborasi untuk dashboard admin.
 *
 * Mutasi tidak optimistic: create/link membutuhkan ID + validasi server
 * (periode aktivasi, kapasitas slot), jadi UI hanya menampilkan hasil setelah
 * server sukses.
 */
export function useExhibitions(enabled: boolean) {
  const [exhibitions, setExhibitions] = useState<AdminExhibition[]>([]);
  const [leads, setLeads] = useState<ExhibitionLead[]>([]);
  const [activations, setActivations] = useState<ExhibitionActivation[]>([]);
  const [slots, setSlots] = useState<ExhibitionSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [nextExhibitions, nextLeads, nextActivations, nextSlots] = await Promise.all([
        fetchExhibitions(), fetchExhibitionLeads(), fetchExhibitionActivations(), fetchExhibitionSlots(),
      ]);
      setExhibitions(nextExhibitions);
      setLeads(nextLeads);
      setActivations(nextActivations);
      setSlots(nextSlots);
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
    (id: string, patch: CollaborationReviewPatch) =>
      runMutation(() => updateExhibitionLead(id, patch)),
    [runMutation],
  );

  const publishLead = useCallback(
    (id: string) => runMutation(async () => { await publishCollaborationToEvent(id); }),
    [runMutation],
  );

  const saveSlot = useCallback(
    (exhibitionId: string, input: ExhibitionSlotInput, id?: string) => runMutation(async () => {
      if (id) await updateExhibitionSlot(id, input);
      else await createExhibitionSlot(exhibitionId, input);
    }),
    [runMutation],
  );

  const removeSlot = useCallback(
    (id: string) => runMutation(() => deleteExhibitionSlot(id)),
    [runMutation],
  );

  const generateSlots = useCallback(
    (exhibitionId: string, options: Pick<ExhibitionSlotInput, 'startTime' | 'endTime' | 'zoneName' | 'capacity'>) =>
      runMutation(async () => { await generateExhibitionSlots(exhibitionId, options); }),
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
    exhibitions, leads, activations, slots, isLoading, error,
    reload, saveExhibition, removeExhibition, reviewLead, publishLead,
    saveSlot, removeSlot, generateSlots, linkActivation, unlinkActivation,
  };
}
