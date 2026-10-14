import { Suspense, lazy, useCallback, useRef, useState } from 'react';

import type { ConfirmOptions } from './ConfirmDialog';

export type { ConfirmOptions };

interface ConfirmRequest extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/**
 * `ConfirmDialog` dimuat malas.
 *
 * Hook ini dipakai `App.tsx` (jalur boot). `ConfirmDialog` merender
 * `ModalWrapper` → `md-dialog` → Material Web + Lit, dan rantai impor statis
 * itu akan menyeret seluruh MD3 ke chunk entry — yang justru dilarang oleh
 * penjaga `assert-lazy-entry-chunks` (satu aset besar di jalur boot = satu titik
 * gagal tunggal). Dengan `lazy()`, MD3 hanya ikut chunk dashboard yang memang
 * membutuhkannya.
 */
const LazyConfirmDialog = lazy(() =>
  import('./ConfirmDialog').then(m => ({ default: m.ConfirmDialog })),
);

/**
 * Hook konfirmasi promise-based — drop-in untuk window.confirm().
 * const confirmDialog = useConfirmDialog(); ... if (!(await confirmDialog.confirm({...}))) return;
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const requestRef = useRef<ConfirmRequest | null>(null);
  requestRef.current = request;

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    const { promise, resolve } = Promise.withResolvers<boolean>();
    setRequest(prev => {
      // kalau masih ada dialog terbuka, tolak yang lama (anggap batal)
      if (prev) prev.resolve(false);
      return { ...options, resolve };
    });
    return promise;
  }, []);

  const close = useCallback(() => {
    const req = requestRef.current;
    if (req) req.resolve(false);
    setRequest(null);
  }, []);

  const handleConfirm = useCallback(async () => {
    const req = requestRef.current;
    if (!req) return;
    req.resolve(true);
    setRequest(null);
  }, []);

  const dialog = request ? (
    <Suspense fallback={null}>
      <LazyConfirmDialog
        isOpen
        title={request.title}
        message={request.message}
        subject={request.subject}
        confirmLabel={request.confirmLabel}
        tone={request.tone}
        onClose={close}
        onConfirm={handleConfirm}
      />
    </Suspense>
  ) : null;

  return { confirm, dialog };
}
