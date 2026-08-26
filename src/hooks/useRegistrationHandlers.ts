import { useState, useCallback, useEffect } from 'react';
import { CommunityRegistration, RegistrationStatus, DraftEventItem, ToastMessage } from '../types';
import { fetchCommunityRegistrations, updateRegistrationStatus } from '../utils/supabaseApi';
import { parseDateStrLocal, MONTH_NAMES } from '../utils/eventUtils';

type ShowToast = (type: ToastMessage['type'], title: string, message: string) => void;

export type RegistrationHandlersDeps = {
  showToast: ShowToast;
  canViewRegistrations: boolean;
  dashboardPath: string;
  setEditingDraft: (v: DraftEventItem | null) => void;
  setShowDraftModal: (v: boolean) => void;
};

export interface RegistrationHandlersResult {
  communityRegistrations: CommunityRegistration[];
  isRegLoading: boolean;
  showRegDetail: boolean;
  setShowRegDetail: (v: boolean) => void;
  selectedRegistration: CommunityRegistration | null;
  setSelectedRegistration: (v: CommunityRegistration | null) => void;
  refreshRegistrations: (showError?: boolean) => Promise<void>;
  handleRegDetail: (reg: CommunityRegistration) => void;
  handleUpdateRegStatus: (id: string, status: RegistrationStatus, adminNote: string) => Promise<boolean>;
  handleCreateEventFromRegistration: (registration: CommunityRegistration) => void;
}

export function useRegistrationHandlers(deps: RegistrationHandlersDeps): RegistrationHandlersResult {
  const { showToast, canViewRegistrations, dashboardPath, setEditingDraft, setShowDraftModal } = deps;

  const [communityRegistrations, setCommunityRegistrations] = useState<CommunityRegistration[]>([]);
  const [isRegLoading, setIsRegLoading] = useState(false);
  const [showRegDetail, setShowRegDetail] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<CommunityRegistration | null>(null);

  const refreshRegistrations = useCallback(async (showError = true) => {
    if (!canViewRegistrations) return;
    setIsRegLoading(true);
    try {
      const regs = await fetchCommunityRegistrations();
      setCommunityRegistrations(regs);
      setSelectedRegistration(prev => (prev ? (regs.find((r: CommunityRegistration) => r.id === prev.id) ?? prev) : null));
    } catch {
      if (showError) showToast('error', 'Gagal memuat', 'Data pendaftaran belum berhasil dimuat. Coba refresh halaman.');
    } finally {
      setIsRegLoading(false);
    }
  }, [canViewRegistrations, showToast]);

  useEffect(() => {
    if (canViewRegistrations && dashboardPath === '/registrations') {
      refreshRegistrations();
    }
  }, [dashboardPath, canViewRegistrations, refreshRegistrations]);

  const handleRegDetail = useCallback((reg: CommunityRegistration) => {
    setSelectedRegistration(reg);
    setShowRegDetail(true);
  }, []);

  const handleUpdateRegStatus = useCallback(async (id: string, status: RegistrationStatus, adminNote: string) => {
    try {
      await updateRegistrationStatus(id, status, adminNote);
      await refreshRegistrations();
      showToast('success', 'Status diperbarui', `Pendaftaran berhasil diubah ke ${status}.`);
      return true;
    } catch {
      showToast('error', 'Gagal memperbarui', 'Status pendaftaran belum berubah.');
      return false;
    }
  }, [refreshRegistrations, showToast]);

  const handleCreateEventFromRegistration = useCallback((registration: CommunityRegistration) => {
    const dateStr = registration.preferredDate || '';
    const dateMeta = dateStr ? (() => {
      const DAY_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const d = parseDateStrLocal(dateStr);
      if (!d) return { day: '', tanggal: '', month: '' };
      return {
        day: DAY_ID[d.getDay()] || '',
        tanggal: `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
        month: MONTH_NAMES[d.getMonth()] || '',
      };
    })() : { day: '', tanggal: '', month: '' };

    const orgName = registration.organizationName || registration.communityName;
    const prefillData: Partial<DraftEventItem> = {
      acara: orgName, lokasi: '', eo: orgName,
      pic: registration.pic, phone: registration.phone,
      keterangan: registration.description || '',
      dateStr, day: dateMeta.day, tanggal: dateMeta.tanggal, month: dateMeta.month,
      jam: '', categories: [], category: 'Umum', priority: 'medium',
      eventModel: 'free', progress: 'draft',
      internalNote: `Dari pendaftaran: ${orgName} (${registration.id})`,
    };

    setEditingDraft({
      id: '', rowIndex: 0,
      tanggal: prefillData.tanggal || '', dateStr: prefillData.dateStr || '',
      day: prefillData.day || '', jam: '',
      acara: prefillData.acara || '', lokasi: '',
      eo: prefillData.eo || '', pic: prefillData.pic || '',
      phone: prefillData.phone || '', keterangan: prefillData.keterangan || '',
      internalNote: prefillData.internalNote || '',
      month: prefillData.month || '', category: 'Umum', categories: [],
      priority: 'medium', eventModel: 'free', eventNominal: '', eventModelNotes: '',
      progress: 'draft', published: false, deleted: false,
    });
    setShowDraftModal(true);
    showToast('info', 'Buat Draft dari pendaftaran', 'Form Draft diisi dari data pendaftaran. Lengkapi lalu simpan — Approve tidak membuat Draft otomatis.');
  }, [setEditingDraft, setShowDraftModal, showToast]);

  return {
    communityRegistrations, isRegLoading,
    showRegDetail, setShowRegDetail,
    selectedRegistration, setSelectedRegistration,
    refreshRegistrations,
    handleRegDetail, handleUpdateRegStatus, handleCreateEventFromRegistration,
  };
}