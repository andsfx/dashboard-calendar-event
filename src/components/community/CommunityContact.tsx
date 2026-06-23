import { Mail, Phone } from 'lucide-react';
import { RevealSection } from './CommunityRevealPrimitives';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950';

export function CommunityContact() {
  return (
    <RevealSection id="contact" className="border-y border-black/5 bg-neutral-50 px-4 py-16 dark:bg-neutral-900 dark:border-neutral-800 sm:px-6 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <h2 className="text-4xl font-bold leading-tight text-neutral-950 dark:text-white sm:text-5xl">
            Ada pertanyaan? Hubungi kami!
          </h2>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          <a
            href="https://wa.me/6281318534823"
            target="_blank"
            rel="noopener noreferrer"
            className={`group rounded-3xl border bg-neutral-100 border-black/[0.06] dark:bg-neutral-800 dark:border-neutral-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${focusRing}`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary-100 text-brand-primary-600 dark:bg-brand-primary-900/30 dark:text-brand-primary-400">
              <Phone className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-white">WhatsApp Andy</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">0813-1853-4823</p>
          </a>

          <a
            href="https://wa.me/6281908142555"
            target="_blank"
            rel="noopener noreferrer"
            className={`group rounded-3xl border bg-neutral-100 border-black/[0.06] dark:bg-neutral-800 dark:border-neutral-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${focusRing}`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary-100 text-brand-primary-600 dark:bg-brand-primary-900/30 dark:text-brand-primary-400">
              <Phone className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-white">WhatsApp Uca</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">0819-0814-2555</p>
          </a>

          <a
            href="mailto:marketing@malmetropolitan.com"
            className={`group rounded-3xl border bg-neutral-100 border-black/[0.06] dark:bg-neutral-800 dark:border-neutral-700 p-6 text-center shadow-[0_12px_28px_rgba(15,23,42,0.04)] transition hover:shadow-[0_16px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${focusRing}`}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-primary-100 text-brand-primary-600 dark:bg-brand-primary-900/30 dark:text-brand-primary-400">
              <Mail className="h-7 w-7" aria-hidden="true" />
            </div>
            <h3 className="mt-4 text-base font-bold text-neutral-900 dark:text-white">Email</h3>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">marketing@malmetropolitan.com</p>
          </a>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Telepon kantor: <strong>021-8855555 ext 214</strong> (Senin - Jumat, jam kerja)
          </p>
        </div>
      </div>
    </RevealSection>
  );
}
