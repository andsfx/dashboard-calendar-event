import { useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, Moon, SunMedium, X } from 'lucide-react';
import mallLogo from '../../assets/brand/LOGOMETMAL2016-01.svg';
import { NavDropdown } from './NavDropdown';
import {
  PUBLIC_CTA,
  PUBLIC_PRIMARY_LINKS,
  PUBLIC_SECONDARY_LINKS,
  isPublicNavActive,
} from './publicNav';

const focusRing = 'ui-focus-ring';

const ACTIVE_LINK = 'text-[var(--brand-tosca-600)] dark:text-[var(--brand-tosca-soft)]';
const IDLE_LINK =
  'text-slate-600 hover:text-[var(--brand-tosca)] dark:text-slate-300 dark:hover:text-[var(--brand-tosca-soft)]';
const IDLE_PANEL_LINK =
  'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800';
const PANEL_HEADING =
  'px-3.5 pt-3 pb-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400';

export interface PublicSectionLink {
  label: string;
  href: string;
}

export interface PublicSiteHeaderProps {
  isDark: boolean;
  onToggleDark: () => void;
  /**
   * Aksi lokal halaman, dirender sebelum kontrol global (toggle tema, CTA,
   * tombol menu) agar posisi kontrol global tidak bergeser antar halaman.
   * Maksimal dua tombol pendek: anggaran lebar 1024 px menyisakan 187 px untuk
   * satu aksi dan 65 px untuk dua aksi.
   */
  actions?: ReactNode;
  /**
   * Anchor milik halaman (`#...`). Tampil di bar mulai `lg` dan sebagai
   * kelompok `Di halaman ini` di panel menu.
   */
  sectionLinks?: ReadonlyArray<PublicSectionLink>;
}

/**
 * Header publik bersama untuk seluruh halaman publik.
 *
 * Satu bar 64 px di semua lebar. Nav desktop tampil mulai `lg` (1024 px); di
 * bawahnya semua tujuan ada di panel menu, jadi tidak ada rentang lebar tanpa
 * akses navigasi. Header tidak remount antar rute, sehingga panel dan dropdown
 * ditutup sendiri saat `pathname` berubah.
 */
export function PublicSiteHeader({
  isDark,
  onToggleDark,
  actions,
  sectionLinks,
}: PublicSiteHeaderProps): JSX.Element {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  /** Label dropdown desktop yang terbuka: satu saja pada satu waktu. */
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const panelFirstLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Header bertahan antar rute: panel dan dropdown tidak boleh tertinggal terbuka.
  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);

  // Panel terbuka: fokus pindah ke link pertama, Escape menutup dan
  // mengembalikan fokus ke tombol menu.
  useEffect(() => {
    if (!mobileOpen) return;
    panelFirstLinkRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setMobileOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  const hasSectionLinks = sectionLinks !== undefined && sectionLinks.length > 0;
  // `/daftar` bukan rute beranak, jadi perbandingannya exact.
  const showCta = pathname !== PUBLIC_CTA.to;

  return (
    <header className="ui-dashboard-chrome sticky top-0 z-50 border-b">
      <div
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6"
      >
        <Link
          to="/"
          aria-label="Beranda Metropolitan Mall Bekasi"
          className={`inline-flex min-h-11 shrink-0 items-center rounded-full ${focusRing}`}
        >
          {/* alt kosong: nama aksesibel sudah dibawa aria-label pada link. */}
          <img src={mallLogo} alt="" aria-hidden="true" className="h-8 w-auto" />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden shrink-0 items-center gap-1 lg:flex">
          {PUBLIC_PRIMARY_LINKS.map((link) => {
            const active = isPublicNavActive(pathname, link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium transition-colors ${focusRing} ${
                  active ? ACTIVE_LINK : IDLE_LINK
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <NavDropdown
            label="Jelajahi"
            items={PUBLIC_SECONDARY_LINKS.map((link) => ({
              label: link.label,
              href: link.to,
              route: true,
              active: isPublicNavActive(pathname, link.to),
            }))}
            active={PUBLIC_SECONDARY_LINKS.some((link) => isPublicNavActive(pathname, link.to))}
            pinned
            open={openMenu === 'Jelajahi'}
            onOpenChange={(next) => setOpenMenu(next ? 'Jelajahi' : null)}
          />
          {hasSectionLinks && (
            <div className="flex shrink-0 items-center gap-1">
              {sectionLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-medium transition-colors ${focusRing} ${IDLE_LINK}`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {actions !== undefined && (
            <div className="flex min-w-0 items-center gap-2">{actions}</div>
          )}
          <button
            type="button"
            onClick={onToggleDark}
            aria-label={isDark ? 'Mode terang' : 'Mode gelap'}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/8 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 ${focusRing}`}
          >
            {isDark ? (
              <SunMedium className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
          {showCta && (
            <Link
              to={PUBLIC_CTA.to}
              className={`ui-btn-primary ${focusRing} hidden min-h-11 shrink-0 items-center rounded-full px-3.5 py-2.5 text-[13px] font-semibold whitespace-nowrap transition sm:inline-flex`}
            >
              {PUBLIC_CTA.label}
            </Link>
          )}
          <button
            type="button"
            ref={menuButtonRef}
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="public-site-nav"
            aria-label={mobileOpen ? 'Tutup menu' : 'Buka menu'}
            className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-black/8 px-3 py-2 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden ${focusRing}`}
          >
            {mobileOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
            <span>Menu</span>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6 lg:hidden">
          <nav
            id="public-site-nav"
            aria-label="Navigasi menu"
            className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain rounded-2xl border border-black/8 bg-white p-2 shadow-[0_18px_45px_rgba(22,33,27,0.14)] dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-col">
              {PUBLIC_PRIMARY_LINKS.map((link, index) => {
                const active = isPublicNavActive(pathname, link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    ref={index === 0 ? panelFirstLinkRef : undefined}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors ${focusRing} ${
                      active ? ACTIVE_LINK : IDLE_PANEL_LINK
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            <p className={PANEL_HEADING}>Jelajahi</p>
            <div className="flex flex-col">
              {PUBLIC_SECONDARY_LINKS.map((link) => {
                const active = isPublicNavActive(pathname, link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors ${focusRing} ${
                      active ? ACTIVE_LINK : IDLE_PANEL_LINK
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>

            {hasSectionLinks && (
              <>
                <p className={PANEL_HEADING}>Di halaman ini</p>
                <div className="flex flex-col">
                  {sectionLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors ${focusRing} ${IDLE_PANEL_LINK}`}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </>
            )}

            {showCta && (
              <div className="px-1 pt-2">
                <Link
                  to={PUBLIC_CTA.to}
                  onClick={() => setMobileOpen(false)}
                  className={`ui-btn-primary ${focusRing} flex min-h-11 items-center justify-center rounded-full px-4 text-[13px] font-semibold whitespace-nowrap`}
                >
                  {PUBLIC_CTA.label}
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
