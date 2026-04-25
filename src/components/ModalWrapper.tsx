import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
  ariaLabelledBy?: string;
}

/**
 * Reusable modal container with:
 * - Backdrop fade animation + panel exit animation
 * - Escape key close
 * - Focus trap (cycles Tab/Shift+Tab within modal)
 * - Scroll lock
 * - Proper ARIA dialog role on panel
 */
export function ModalWrapper({ isOpen, onClose, children, maxWidth = 'max-w-lg', className = '', ariaLabelledBy }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle open/close with exit animation
  useEffect(() => {
    if (isOpen) {
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

  // Escape key handler
  useEffect(() => {
    if (!shouldRender || isClosing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shouldRender, isClosing, handleClose]);

  // Scroll lock
  useEffect(() => {
    if (shouldRender) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [shouldRender]);

  // Focus trap: cycle Tab/Shift+Tab within modal
  useEffect(() => {
    if (!shouldRender || isClosing || !panelRef.current) return;

    const panel = panelRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    // Auto-focus first focusable element
    const firstFocusable = panel.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusableElements.length === 0) return;

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
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
      >
        {children}
      </div>
    </div>
  );
}
