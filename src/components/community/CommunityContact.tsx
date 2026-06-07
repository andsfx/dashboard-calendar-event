import { Mail, Phone } from 'lucide-react';
import { CommunityEyebrow, RevealSection } from './CommunityRevealPrimitives';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950';

export function CommunityContact() {
  return (
    <RevealSection id="contact" className="border-y border-black/5 bg-[#f4efe8] px-4 py-16 dark:bg-slate-900 dark:border-slate-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <CommunityEyebrow className="text-xs">Kontak</CommunityEyebrow>
          <h2 className="mt-3 text-4xl font-bold leading-tight text-slate-950 dark:text-white sm:text-5xl">
            Ada pertanyaan? Hubungi kami!
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          <a
            href="https://wa.me/6281318534823"
            target="_blank"
            rel="noopener noreferrer"
            className={`group rounded-[2rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 ${focusRing}`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Phone className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">WhatsApp Andy</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">0813-1853-4823</p>
          </a>

          <a
            href="https://wa.me/6281908142555"
            target="_blank"
            rel="noopener noreferrer"
            className={`group rounded-[2rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 ${focusRing}`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
              <Phone className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">WhatsApp Uca</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">0819-0814-2555</p>
          </a>

          <a
            href="mailto:marketing@malmetropolitan.com"
            className={`group rounded-[2rem] border bg-[#faf6ef] border-black/[0.06] dark:bg-slate-800 dark:border-slate-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 ${focusRing}`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
              <Mail className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">Email</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">marketing@malmetropolitan.com</p>
          </a>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Telepon kantor: <strong>021-8855555 ext 214</strong> (Senin - Jumat, jam kerja)
          </p>
        </div>
      </div>
    </RevealSection>
  );
}
