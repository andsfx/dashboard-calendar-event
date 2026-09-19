import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const focusRing = 'ui-focus-ring';
/** Hover-intent delay: menghindari hover-open ikut terpicu oleh klik/tap cepat. */
const HOVER_DELAY_MS = 120;

export interface NavDropdownItem {
  label: string;
  href: string;
  /** true → navigasi react-router `<Link>` (mis. `/tenants`), false → anchor in-page (`#...`). */
  route?: boolean;
}

export interface NavDropdownProps {
  /** Label trigger, sekaligus nama aksesibel panel. */
  label: string;
  items: readonly NavDropdownItem[];
  /** Status header: `true` = pinned (slate), `false` = transparan di atas hero (putih). */
  pinned: boolean;
  /** State terkontrol — parent memegang satu `openMenu` agar hanya satu dropdown terbuka. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dropdown navigasi header (desktop lg+).
 *
 * **Pola disclosure (APG), BUKAN menu-button.** Item di dalam panel adalah link
 * navigasi sungguhan — `role="menu"`/`role="menuitem"` sengaja TIDAK dipakai
 * karena akan membungkam semantik link (screen reader harus mengumumkan
 * "link", dan `role="menu"` mengubah ekspektasi keyboard: Enter/Space jadi
 * aktivasi menu, Tab keluar dari menu). Trigger hanya `aria-expanded` +
 * `aria-controls`; `aria-haspopup` sengaja dihilangkan (disclosure tidak
 * memakainya — halaman ini bukan menu aplikasi).
 *
 * Karena item adalah link biasa, Tab menelusuri tiap link secara alami (tidak
 * ada `tabIndex={-1}`/roving tabindex, tidak ada focus trap). ArrowDown /
 * ArrowUp / Home / End tetap disediakan sebagai *progressive enhancement* di
 * atas perilaku Tab standar.
 *
 * Buka: hover (mouse, dengan intent delay), klik, Enter/Space, ArrowDown/ArrowUp.
 * Tutup: Escape (fokus balik ke trigger), klik di luar, fokus keluar container
 * (Tab), dan setelah item dipilih.
 */
export function NavDropdown({ label, items, pinned, open, onOpenChange }: NavDropdownProps) {
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<Array<HTMLElement | null>>([]);
  const hoverTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const pendingFocus = useRef<'first' | 'last' | null>(null);
  /** Target fokus setelah panel ditutup karena item dipilih (finding 3.2). */
  const pendingAfterClose = useRef<{ targetId: string | null } | null>(null);
  // Nilai `open` terbaru — dibaca saat timer hover-close menyala, agar dropdown
  // yang sudah tersalip dropdown lain tidak menutup dropdown yang sedang aktif.
  const openRef = useRef(open);
  openRef.current = open;

  const clearHoverTimer = useCallback(() => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }, []);

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearHoverTimer();
    clearCloseTimer();
  }, [clearHoverTimer, clearCloseTimer]);

  // Fokus pindah ke item setelah panel ter-mount (perintah keyboard).
  useEffect(() => {
    if (!open) return;
    const mode = pendingFocus.current;
    pendingFocus.current = null;
    if (mode === 'first') itemRefs.current[0]?.focus();
    else if (mode === 'last') itemRefs.current[items.length - 1]?.focus();
  }, [open, items.length]);

  // Setelah panel tertutup karena item dipilih: pindahkan fokus secara sadar —
  // ke section target bila fokusable (`tabIndex` eksplisit), selain itu kembali
  // ke trigger. Fokus tidak boleh jatuh ke <body> saat panel ter-unmount.
  useEffect(() => {
    if (open) return;
    const pending = pendingAfterClose.current;
    if (!pending) return;
    pendingAfterClose.current = null;
    const target = pending.targetId ? document.getElementById(pending.targetId) : null;
    if (target && target.hasAttribute('tabindex')) {
      target.focus();
      return;
    }
    triggerRef.current?.focus();
  }, [open]);

  // Klik di luar menutup (tanpa merebut fokus).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open, onOpenChange]);

  // Fokus pindah KE LUAR container → tutup. Menangani menu yang dibuka lewat
  // hover (fokus tidak pernah masuk container, jadi `onBlur` tidak pernah
  // menyala) lalu pengguna menekan Tab — finding 1.4.
  useEffect(() => {
    if (!open) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Node | null;
      if (target && containerRef.current?.contains(target)) return;
      onOpenChange(false);
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, [open, onOpenChange]);

  // Escape saat fokus TIDAK di dalam container (mis. dibuka lewat hover).
  // Bila fokus di dalam, ditangani onKeyDown container (agar fokus balik ke trigger).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (containerRef.current?.contains(document.activeElement)) return;
      onOpenChange(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  const focusItem = (index: number) => {
    const count = items.length;
    if (count === 0) return;
    const next = ((index % count) + count) % count;
    itemRefs.current[next]?.focus();
  };

  const onContainerKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      if (!open) return;
      event.stopPropagation();
      onOpenChange(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) {
        pendingFocus.current = 'first';
        onOpenChange(true);
        return;
      }
      const current = itemRefs.current.findIndex((el) => el === document.activeElement);
      focusItem(current + 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) {
        pendingFocus.current = 'last';
        onOpenChange(true);
        return;
      }
      const current = itemRefs.current.findIndex((el) => el === document.activeElement);
      focusItem(current <= 0 ? items.length - 1 : current - 1);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      if (!open) return;
      event.preventDefault();
      focusItem(event.key === 'Home' ? 0 : items.length - 1);
    }
  };

  const onContainerBlur = (event: ReactFocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget as Node | null;
    if (next && containerRef.current?.contains(next)) return;
    if (open) onOpenChange(false);
  };

  const onContainerPointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    clearCloseTimer();
    if (open) return;
    clearHoverTimer();
    hoverTimer.current = window.setTimeout(() => onOpenChange(true), HOVER_DELAY_MS);
  };

  const onContainerPointerLeave = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return;
    clearHoverTimer();
    if (!open) return;
    clearCloseTimer();
    closeTimer.current = window.setTimeout(() => {
      // Jangan tutup bila fokus keyboard masih di dalam menu.
      if (containerRef.current?.contains(document.activeElement)) return;
      // Jangan tutup bila dropdown ini sudah tersalip dropdown lain (openRef stale).
      if (!openRef.current) return;
      onOpenChange(false);
    }, HOVER_DELAY_MS);
  };

  const onContainerPointerDown = () => {
    // Klik/tap nyata: batalkan hover-intent agar klik tidak "menutup" menu yang baru dibuka hover.
    clearHoverTimer();
  };

  const onItemActivate = (item: NavDropdownItem) => {
    if (item.route) {
      // Navigasi react-router menangani perpindahan halaman — jangan rebut fokus.
      onOpenChange(false);
      return;
    }
    const targetId = item.href.startsWith('#') ? item.href.slice(1) : null;
    pendingAfterClose.current = { targetId };
    onOpenChange(false);
  };

  const itemClass = `flex items-center rounded-xl px-3 py-2.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-[color-mix(in_srgb,var(--brand-tosca)_10%,white)] hover:text-[var(--brand-tosca-600)] focus-visible:bg-[color-mix(in_srgb,var(--brand-tosca)_10%,white)] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-[var(--brand-tosca-soft)] ${focusRing}`;

  return (
    <div
      ref={containerRef}
      className="relative"
      onKeyDown={onContainerKeyDown}
      onBlur={onContainerBlur}
      onPointerEnter={onContainerPointerEnter}
      onPointerLeave={onContainerPointerLeave}
      onPointerDown={onContainerPointerDown}
    >
      <button
        type="button"
        ref={triggerRef}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-2 transition-colors ${focusRing} ${
          pinned
            ? 'text-slate-700 hover:text-[var(--brand-tosca)] dark:text-slate-300 dark:hover:text-[var(--brand-tosca-soft)]'
            : 'text-white/90 hover:text-white'
        }${open && pinned ? ' text-[var(--brand-tosca)] dark:text-[var(--brand-tosca-soft)]' : ''}`}
      >
        {label}
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="nav-dropdown-panel absolute left-1/2 top-full z-50 mt-2 w-60 -translate-x-1/2 rounded-2xl border border-black/8 bg-white p-2 shadow-[0_18px_45px_rgba(22,33,27,0.14)] dark:border-slate-700 dark:bg-slate-900"
        >
          {items.map((item, index) =>
            item.route ? (
              <Link
                key={item.href}
                to={item.href}
                ref={(el) => { itemRefs.current[index] = el; }}
                onClick={() => onItemActivate(item)}
                className={itemClass}
              >
                {item.label}
              </Link>
            ) : (
              <a
                key={item.href}
                href={item.href}
                ref={(el) => { itemRefs.current[index] = el; }}
                onClick={() => onItemActivate(item)}
                className={itemClass}
              >
                {item.label}
              </a>
            ),
          )}
        </div>
      )}
    </div>
  );
}
