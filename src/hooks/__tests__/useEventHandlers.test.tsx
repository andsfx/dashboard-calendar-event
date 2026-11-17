/**
 * Test toast kegagalan simpan memakai pesan server terakhir (400 bentrok area).
 *
 * Kontrak yang dijaga:
 * - `addEvent`/`updateEvent` tetap mengembalikan boolean; pesan diambil lewat
 *   getter `getLastError()` yang dibaca SETELAH mutasi gagal.
 * - Bila pesan tersedia, toast menampilkan pesan server apa adanya (bukan
 *   "periksa koneksi"); bila tidak, fallback generik lama dipakai.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEventHandlers, type EventHandlersDeps } from '../useEventHandlers';
import { AdminError } from '../../lib/adminError';

const SERVER_MESSAGE =
  'Bentrok jadwal: area Atrium sudah dipakai event lain pada rentang tanggal ini. Pindah tanggal, pindah area, atau periksa jadwal area.';

function makeDeps(overrides: Partial<EventHandlersDeps> = {}): EventHandlersDeps {
  return {
    showToast: vi.fn(),
    eventsLength: 0,
    getLastError: () => null,
    addEvent: vi.fn().mockResolvedValue(false),
    updateEvent: vi.fn().mockResolvedValue(false),
    setEventVisibility: vi.fn().mockResolvedValue(false),
    deleteEvent: vi.fn().mockResolvedValue(false),
    addRecurringEvents: vi.fn().mockResolvedValue(false),
    deleteRecurringSeries: vi.fn().mockResolvedValue(false),
    confirm: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe('useEventHandlers — pesan kegagalan simpan', () => {
  it('create gagal menampilkan pesan server bentrok area apa adanya', async () => {
    const deps = makeDeps({
      getLastError: () => new AdminError('Validation', SERVER_MESSAGE, 400),
    });
    const { result } = renderHook(() => useEventHandlers(deps));

    let ok = true;
    await act(async () => {
      ok = await result.current.handleSave({ acara: 'Bazar' });
    });

    expect(ok).toBe(false);
    expect(deps.showToast).toHaveBeenCalledWith('error', 'Gagal menambahkan', SERVER_MESSAGE);
  });

  it('update gagal menampilkan pesan server apa adanya', async () => {
    const deps = makeDeps({
      getLastError: () => new AdminError('Validation', SERVER_MESSAGE, 400),
      updateEvent: vi.fn().mockResolvedValue(false),
    });
    const { result } = renderHook(() => useEventHandlers(deps));

    act(() => {
      result.current.handleEdit({
        id: 'evt-1',
        acara: 'Bazar',
        dateStr: '2026-11-20',
      } as never);
    });
    await act(async () => {
      await result.current.handleSave({ acara: 'Bazar' });
    });

    expect(deps.showToast).toHaveBeenCalledWith('error', 'Gagal memperbarui', SERVER_MESSAGE);
  });

  it('batch gagal menampilkan pesan server apa adanya', async () => {
    const deps = makeDeps({
      getLastError: () => new AdminError('Validation', SERVER_MESSAGE, 400),
    });
    const { result } = renderHook(() => useEventHandlers(deps));

    await act(async () => {
      await result.current.handleSaveBatch([{ id: 'evt-1', acara: 'Bazar' } as never]);
    });

    expect(deps.showToast).toHaveBeenCalledWith('error', 'Gagal menambahkan', SERVER_MESSAGE);
  });

  it('tanpa pesan server tetap memakai fallback generik', async () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useEventHandlers(deps));

    await act(async () => {
      await result.current.handleSave({ acara: 'Bazar' });
    });

    expect(deps.showToast).toHaveBeenCalledWith(
      'error',
      'Gagal menambahkan',
      'Acara belum tersimpan. Silakan periksa koneksi lalu coba lagi.',
    );
  });

  it('handleSaveBatch meneruskan flag overrideConflicts ke addRecurringEvents', async () => {
    const addRecurringEvents = vi.fn().mockResolvedValue(true);
    const deps = makeDeps({ addRecurringEvents });
    const { result } = renderHook(() => useEventHandlers(deps));

    const evs = [{ id: 'evt-1', acara: 'Bazar' } as never];
    await act(async () => {
      await result.current.handleSaveBatch(evs, true);
    });

    expect(addRecurringEvents).toHaveBeenCalledWith(evs, true);
  });
});
