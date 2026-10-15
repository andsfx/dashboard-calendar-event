import { useEffect, useState } from 'react';
import type { ExhibitionLead, TenantEventProposal, TenantEventSurvey, TenantParticipation } from '../types';
import { fetchTenantSurveys } from '../utils/api/surveysApi';
import { fetchExhibitionLeads } from '../utils/api/exhibitionsApi';
import { fetchTenantEventProposals } from '../utils/api/tenantEventProposalsApi';
import { fetchTenantParticipations } from '../utils/api/tenantParticipationsApi';

export interface InsightContextOptions {
  /** Muat survey kepuasan tenant (butuh izin lihat evaluasi tenant). */
  surveys?: boolean;
  /** Muat pengajuan kolaborasi pameran (butuh izin lihat pameran). */
  exhibitionLeads?: boolean;
  /** Muat pengajuan kolaborasi tenant (butuh izin lihat kolaborasi tenant). */
  tenantProposals?: boolean;
  /** Muat pengajuan partisipasi tenant (butuh izin lihat partisipasi tenant). */
  tenantParticipations?: boolean;
}

export interface InsightContext {
  surveys: TenantEventSurvey[];
  exhibitionLeads: ExhibitionLead[];
  tenantProposals: TenantEventProposal[];
  tenantParticipations: TenantParticipation[];
}

/**
 * Data lintas-modul untuk panel Insight Cerdas: survey kepuasan tenant,
 * pengajuan pameran, dan pengajuan kolaborasi tenant. Semuanya dimuat **sekali**
 * saat panel aktif (bukan ikut polling event) dan **gagal senyap** — kegagalan
 * satu sumber tidak boleh menjatuhkan panel, apalagi halaman. Yang gagal cukup
 * dikosongkan sehingga mesin insight tidak menghasilkan insight dari sumber itu.
 *
 * Izin tetap ditegakkan pemanggil (`permissions.*`): hook ini hanya tahu
 * "muat atau tidak", bukan siapa yang boleh melihat.
 */
export function useInsightContext({
  surveys = false,
  exhibitionLeads = false,
  tenantProposals = false,
  tenantParticipations = false,
}: InsightContextOptions): InsightContext {
  const [surveyRows, setSurveyRows] = useState<TenantEventSurvey[]>([]);
  const [leadRows, setLeadRows] = useState<ExhibitionLead[]>([]);
  const [proposalRows, setProposalRows] = useState<TenantEventProposal[]>([]);
  const [participationRows, setParticipationRows] = useState<TenantParticipation[]>([]);

  useEffect(() => {
    if (!surveys && !exhibitionLeads && !tenantProposals && !tenantParticipations) return;
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
    if (tenantProposals) {
      tasks.push(
        fetchTenantEventProposals()
          .then((rows) => { if (!cancelled) setProposalRows(rows); })
          .catch(() => { if (!cancelled) setProposalRows([]); }),
      );
    }
    if (tenantParticipations) {
      tasks.push(
        fetchTenantParticipations()
          .then((rows) => { if (!cancelled) setParticipationRows(rows); })
          .catch(() => { if (!cancelled) setParticipationRows([]); }),
      );
    }
    void Promise.all(tasks);

    return () => { cancelled = true; };
  }, [surveys, exhibitionLeads, tenantProposals, tenantParticipations]);

  return {
    surveys: surveyRows,
    exhibitionLeads: leadRows,
    tenantProposals: proposalRows,
    tenantParticipations: participationRows,
  };
}
