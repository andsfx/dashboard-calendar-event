/**
 * Nada dialog konfirmasi untuk aksi Draft yang BUKAN destruktif.
 *
 * `ConfirmDialog` memakai `tone: 'danger'` sebagai default (bar merah, ikon
 * Trash2, tombol "Hapus"). Terbitkan/Pulihkan draf sebelumnya tidak mengoper
 * `tone`, sehingga dialog "Terbitkan draf?" terbaca seperti tema hapus.
 * Kontrak: kedua aksi itu wajib `tone: 'neutral'` + label aksi yang benar.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDraftHandlers, type DraftHandlersDeps } from '../useDraftHandlers';
import type { DraftEventItem } from '../../types';

function makeDraft(overrides: Partial<DraftEventItem> = {}): DraftEventItem {
  return {
    id: 'drf_1',
    rowIndex: 0,
    tanggal: '1 Desember 2026',
    dateStr: '2026-12-01',
    day: 'Selasa',
    jam: '10:00',
    acara: 'Lomba Fashion Show',
    lokasi: 'Atrium Lt.1',
    eo: 'Internal MMB',
    pic: 'Andi',
    phone: '081200000000',
    keterangan: '',
    month: 'Desember',
    category: 'Umum',
    categories: ['Umum'],
    priority: 'medium',
    eventModel: 'free',
    eventNominal: '',
    eventModelNotes: '',
    internalNote: '',
    progress: 'confirm',
    published: false,
    deleted: false,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<DraftHandlersDeps> = {}): DraftHandlersDeps {
  return {
    showToast: vi.fn(),
    draftEventsLength: 1,
    addDraft: vi.fn().mockResolvedValue(true),
    updateDraft: vi.fn().mockResolvedValue(true),
    deleteDraft: vi.fn().mockResolvedValue(true),
    publishDraft: vi.fn().mockResolvedValue(true),
    restoreDraft: vi.fn().mockResolvedValue(true),
    confirm: vi.fn().mockResolvedValue(false),
    refreshEvents: vi.fn(),
    ...overrides,
  };
}

describe('useDraftHandlers — nada dialog konfirmasi', () => {
  it('Terbitkan memakai tone neutral dan label "Terbitkan"', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDraftHandlers(deps));

    await act(async () => { await result.current.handlePublishDraft(makeDraft()); });

    expect(deps.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Terbitkan draf?',
      confirmLabel: 'Terbitkan',
      tone: 'neutral',
      icon: 'upload',
    }));
    // Batal → tidak ada mutasi.
    expect(deps.publishDraft).not.toHaveBeenCalled();
  });

  it('Pulihkan memakai tone neutral, bukan danger', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useDraftHandlers(deps));

    await act(async () => {
      await result.current.handleRestoreDraft(makeDraft({ deleted: true }));
    });

    expect(deps.confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Pulihkan draf event?',
      confirmLabel: 'Pulihkan',
      tone: 'neutral',
      icon: 'restore',
    }));
    expect(deps.restoreDraft).not.toHaveBeenCalled();
  });
});
