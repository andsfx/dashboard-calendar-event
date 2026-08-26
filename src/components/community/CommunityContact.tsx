import { Mail, Phone } from 'lucide-react';
import { RevealSection } from './CommunityRevealPrimitives';

const focusRing = 'ui-focus-ring';

const CONTACTS = [
  {
    href: 'https://wa.me/6281318534823',
    title: 'WhatsApp Andy',
    detail: '0813-1853-4823',
    external: true,
    icon: Phone,
  },
  {
    href: 'https://wa.me/6281908142555',
    title: 'WhatsApp Uca',
    detail: '0819-0814-2555',
    external: true,
    icon: Phone,
  },
  {
    href: 'mailto:marketing@malmetropolitan.com',
    title: 'Email',
    detail: 'marketing@malmetropolitan.com',
    external: false,
    icon: Mail,
  },
] as const;

export function CommunityContact() {
  return (
    <RevealSection id="contact" variant="dark-tosca" className="px-4 py-16 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="max-w-xl text-4xl font-bold leading-tight text-white sm:text-5xl">
            Ada pertanyaan? Hubungi kami!
          </h2>
          <p className="max-w-sm text-sm leading-7 text-white/80">
            Telepon kantor: <strong className="text-white">021-8855555 ext 214</strong>
            <span className="block text-white/70">Senin – Jumat, jam kerja</span>
          </p>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          {CONTACTS.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.href}
                href={c.href}
                {...(c.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`group flex items-center gap-4 rounded-2xl border border-[var(--border-subtle)] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.03)] transition hover:border-[color-mix(in_srgb,var(--brand-tosca)_35%,transparent)] hover:shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-800 ${focusRing}`}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--brand-tosca)_12%,white)] text-[var(--brand-tosca-dark)] dark:bg-[color-mix(in_srgb,var(--brand-tosca)_25%,black)] dark:text-[var(--brand-tosca-soft)]">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 text-left">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</h3>
                  <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400">{c.detail}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}
