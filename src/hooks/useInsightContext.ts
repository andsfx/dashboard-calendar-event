import { useEffect, useState } from 'react';
import type { ExhibitionLead, TenantEventSurvey } from '../types';
import { fetchTenantSurveys } from '../utils/api/surveysApi';
import { fetchExhibitionLeads } from '../utils/api/exhibitionsApi';

export interface InsightContextOptions {
  /** Muat survey kepuasan tenant (butuh izin lihat evaluasi tenant). */
  surveys?: boolean;
  /** Muat pengajuan kolaborasi pameran (butuh izin lihat pameran). */
  exhibitionLeads?: boolean;
}

export interface InsightContext {
  surveys: TenantEventSurvey[];
  exhibitionLeads: ExhibitionLead[];
}

/**
 * Data lintas-modul untuk panel Insight Cerdas: survey kepuasan tenant dan
 * pengajuan pameran. Keduanya dimuat **sekali** saat panel aktif (bukan ikut
 * polling event) dan **gagal senyap** — kegagalan satu sumber tidak boleh
 * menjatuhkan panel, apalagi halaman. Yang gagal cukup dikosongkan sehingga
 * mesin insight tidak menghasilkan insight dari sumber tersebut.
 *
 * Izin tetap ditegakkan pemanggil (`permissions.*`): hook ini hanya tahu
 * "muat atau tidak", bukan siapa yang boleh melihat.
 */
export function useInsightContext({ surveys = false, exhibitionLeads = false }: InsightContextOptions): InsightContext {
  const [surveyRows, setSurveyRows] = useState<TenantEventSurvey[]>([]);
  const [leadRows, setLeadRows] = useState<ExhibitionLead[]>([]);

  useEffect(() => {
    if (!surveys && !exhibitionLeads) return;
    let cancelled = false;

    const tasks: Promise<void>[] = [];
    if (surveys) {
      tasks.push(
        fetchTenantSurveys()
          .then((rows) => { if (!cancelled) setSurveyRows(rows); })
          .catch(() => { if (!cancelled) setSurveyRows([]); }),
      );
    }
    if (exhibitionLeads) {
      tasks.push(
        fetchExhibitionLeads()
          .then((rows) => { if (!cancelled) setLeadRows(rows); })
          .catch(() => { if (!cancelled) setLeadRows([]); }),
      );
    }
    void Promise.all(tasks);

    return () => { cancelled = true; };
  }, [surveys, exhibitionLeads]);

  return { surveys: surveyRows, exhibitionLeads: leadRows };
}