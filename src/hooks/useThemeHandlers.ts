import { useState, useCallback } from 'react';
import { AnnualTheme, ToastMessage } from '../types';
import type { ConfirmOptions } from '../components/ConfirmDialog';

type ShowToast = (type: ToastMessage['type'], title: string, message: string) => void;

export type ThemeHandlersDeps = {
  showToast: ShowToast;
  addTheme: (theme: AnnualTheme) => Promise<boolean>;
  updateTheme: (theme: AnnualTheme) => Promise<boolean>;
  deleteTheme: (id: string) => Promise<boolean>;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

export interface ThemeHandlersResult {
  showThemeModal: boolean;
  setShowThemeModal: (v: boolean) => void;
  editingTheme: AnnualTheme | null;
  setEditingTheme: (v: AnnualTheme | null) => void;
  handleAddTheme: () => void;
  handleEditTheme: (theme: AnnualTheme) => void;
  handleSaveTheme: (theme: AnnualTheme) => Promise<boolean>;
  handleDeleteTheme: (theme: AnnualTheme) => void;
}

export function useThemeHandlers(deps: ThemeHandlersDeps): ThemeHandlersResult {
  const { showToast, addTheme, updateTheme, deleteTheme, confirm } = deps;

  const [showThemeModal, setShowThemeModal] = useState(false);
  const [editingTheme, setEditingTheme] = useState<AnnualTheme | null>(null);

  const handleAddTheme = useCallback(() => {
    setEditingTheme(null);
    setShowThemeModal(true);
  }, []);

  const handleEditTheme = useCallback((theme: AnnualTheme) => {
    setEditingTheme(theme);
    setShowThemeModal(true);
  }, []);

  const handleSaveTheme = useCallback(async (theme: AnnualTheme) => {
    const success = theme.sheetRow ? await updateTheme(theme) : await addTheme(theme);
    if (success) {
      setShowThemeModal(false);
      setEditingTheme(null);
      showToast('success', theme.sheetRow ? 'Tema diperbarui' : 'Tema ditambahkan', 'Perubahan tema tahunan sudah tersimpan.');
      return true;
    }
    showToast('error', 'Gagal menyimpan tema', 'Perubahan tema tahunan belum berhasil disimpan.');
    return false;
  }, [addTheme, updateTheme, showToast]);

  const handleDeleteTheme = useCallback(async (theme: AnnualTheme) => {
    if (!theme.id) return;
    const ok = await confirm({
      title: 'Hapus tema tahunan?',
      message: 'Tema akan dihapus dari daftar.',
      subject: theme.name,
    });
    if (!ok) return;
    const success = await deleteTheme(theme.id);
    if (success) showToast('success', 'Tema dihapus', `"${theme.name}" telah dihapus.`);
    else showToast('error', 'Gagal menghapus tema', 'Tema tahunan belum berhasil dihapus.');
  }, [confirm, deleteTheme, showToast]);

  return {
    showThemeModal, setShowThemeModal,
    editingTheme, setEditingTheme,
    handleAddTheme, handleEditTheme,
    handleSaveTheme, handleDeleteTheme,
  };
}