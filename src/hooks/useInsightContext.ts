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
  /** Pesan bila satu atau lebih sumber gagal dimuat; array sumber yang gagal
   *  tetap kosong agar panel tidak ikut jatuh (degradasi), tapi pengguna tahu. */
  error: string | null;
}

/**
 * Data lintas-modul untuk panel Insight Cerdas: survey kepuasan tenant,
 * pengajuan pameran, dan pengajuan kolaborasi tenant. Semuanya dimuat **sekali**
 * saat panel aktif (bukan ikut polling event) dan gagal **terisolasi** —
 * kegagalan satu sumber tidak boleh menjatuhkan panel, apalagi halaman. Sumber
 * yang gagal dikosongkan (mesin insight tidak menghasilkan insight darinya),
 * tetapi kegagalannya dilaporkan lewat `error` supaya UI tidak tampak normal.
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!surveys && !exhibitionLeads && !tenantProposals && !tenantParticipations) return;
    let cancelled = false;
    const failures: string[] = [];

    const fail = (source: string, err: unknown) => {
      if (cancelled) return;
      console.error(`Insight context gagal memuat ${source}:`, err);
      failures.push(source);
      setError(`Sebagian data insight gagal dimuat (${failures.join(', ')}). Insight mungkin belum lengkap.`);
    };

    const tasks: Promise<void>[] = [];
    if (surveys) {
      tasks.push(
        fetchTenantSurveys()
          .then((rows) => { if (!cancelled) setSurveyRows(rows); })
          .catch((err) => { if (!cancelled) setSurveyRows([]); fail('survey tenant', err); }),
      );
    }
    if (exhibitionLeads) {
      tasks.push(
        fetchExhibitionLeads()
          .then((rows) => { if (!cancelled) setLeadRows(rows); })
          .catch((err) => { if (!cancelled) setLeadRows([]); fail('pengajuan pameran', err); }),
      );
    }
    if (tenantProposals) {
      tasks.push(
        fetchTenantEventProposals()
          .then((rows) => { if (!cancelled) setProposalRows(rows); })
          .catch((err) => { if (!cancelled) setProposalRows([]); fail('pengajuan kolaborasi', err); }),
      );
    }
    if (tenantParticipations) {
      tasks.push(
        fetchTenantParticipations()
          .then((rows) => { if (!cancelled) setParticipationRows(rows); })
          .catch((err) => { if (!cancelled) setParticipationRows([]); fail('pengajuan partisipasi', err); }),
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
    error,
  };
}
