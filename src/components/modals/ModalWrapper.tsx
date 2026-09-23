import { useCallback, useEffect, useRef, useState } from 'react';

// Stack modul-level modals yang terbuka — Escape/Tab hanya ditangani modal
// teratas, sehingga dialog konfirmasi bersarang (mis. ConfirmDialog di dalam
// AlbumManagerModal) tidak menutup modal parent saat Escape ditekan.
let openModalStack: symbol[] = [];
interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  ariaLabelledBy?: string;
  ariaLabel?: string;
}

/**
 * Reusable modal container with:
 * - Backdrop fade animation + panel exit animation
 * - Escape key close
 * - Focus trap (cycles Tab/Shift+Tab within modal)
 * - Scroll lock
 * - Proper ARIA dialog role on panel
 */
export function ModalWrapper({ isOpen, onClose, children, maxWidth = 'max-w-lg', className = '', ariaLabelledBy, ariaLabel = 'Dialog' }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  // Identitas instance untuk stack modal teratas
  const instanceId = useRef<symbol>(Symbol('modal'));

  // Handle open/close with exit animation
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setShouldRender(true);
      return;
    } else if (shouldRender && !isClosing) {
      // Parent set isOpen=false (e.g. after successful login) — trigger exit animation
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsClosing(false);
        setShouldRender(false);
      }, 200);
      return () => clearTimeout(timer);
    }
    return;
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    const timer = setTimeout(() => {
      setIsClosing(false);
      setShouldRender(false);
      onClose();
    }, 200); // match modal-panel-out duration
    return () => clearTimeout(timer);
  }, [onClose, isClosing]);

  // Return focus to opener after close
  useEffect(() => {
    if (shouldRender || !triggerRef.current) return;
    const target = triggerRef.current;
    triggerRef.current = null;
    // Defer focus restoration so it runs after the DOM settles post-animation.
    // Skip restoration when another dialog took focus in the meantime (modal chain:
    // detail → edit/delete opens a new modal; its auto-focus already owns the user).
    requestAnimationFrame(() => {
      const current = document.activeElement;
      const focusTaken = current instanceof HTMLElement && current.closest('[role="dialog"]');
      if (focusTaken) return;
      if (document.contains(target)) target.focus();
    });
  }, [shouldRender]);

  // Scroll lock + pendaftaran stack modal teratas
  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
      openModalStack.push(instanceId.current);
    }
    return () => {
      document.body.style.overflow = '';
      openModalStack = openModalStack.filter(id => id !== instanceId.current);
    };
  }, [shouldRender]);

  // Escape key handler — hanya modal teratas yang menutup
  useEffect(() => {
    if (!shouldRender || isClosing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openModalStack[openModalStack.length - 1] !== instanceId.current) return;
      handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shouldRender, isClosing, handleClose]);

  // Focus trap: cycle Tab/Shift+Tab within modal
  useEffect(() => {
    if (!shouldRender || isClosing || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Focus the dialog panel itself (tabIndex=-1) so screen readers announce the
    // dialog's accessible name first, then the first focusable control.
    panel.focus();
    const firstFocusable = panel.querySelector<HTMLElement>(focusableSelector);
    if (document.activeElement === panel && firstFocusable) {
      firstFocusable.focus({ preventScroll: true });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      // Nested modal terbuka (mis. ConfirmDialog) → biarkan trap-nya yang handle
      if (openModalStack[openModalStack.length - 1] !== instanceId.current) return;


      // Re-query focusable elements on every Tab press to handle dynamic content (e.g., upload buttons added after modal opens)
      const focusableElements = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (first && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (last && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shouldRender, isClosing]);

  if (!shouldRender) return null;

  return (
    <div
      className={`modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 ${isClosing ? 'modal-backdrop-out' : ''}`}
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        className={`modal-panel w-full ${maxWidth} ${className} ${isClosing ? 'modal-panel-out' : ''}`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        aria-label={ariaLabelledBy ? undefined : ariaLabel}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}
