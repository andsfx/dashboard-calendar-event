import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

describe('useCountUp', () => {
  it('mengikuti target terbaru sebelum reveal tanpa memulai animasi', () => {
    const { result, rerender } = renderHook(
      ({ target, start }: { target: number; start: boolean }) => useCountUp(target, start),
      { initialProps: { target: 0, start: false } },
    );

    expect(result.current).toBe(0);

    rerender({ target: 12, start: false });

    expect(result.current).toBe(12);
  });

  it('tidak memutar ulang hitungan dari nol saat target berubah setelah reveal', async () => {
    const { result, rerender } = renderHook(
      ({ target, start }: { target: number; start: boolean }) => useCountUp(target, start),
      { initialProps: { target: 10, start: true } },
    );

    // Animasi pertama tuntas.
    await waitFor(() => expect(result.current).toBe(10), { timeout: 3000 });

    // Statistik polling mengirim angka baru: nilai harus langsung mengikuti,
    // bukan kembali ke 0 lalu menghitung ulang.
    rerender({ target: 42, start: true });

    expect(result.current).toBe(42);
  });
});
