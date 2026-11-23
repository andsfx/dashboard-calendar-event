import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  /** Isi markdown mentah (dari kolom `content` berita, dsb.). */
  content: string;
  className?: string;
}

/*
  Renderer markdown untuk konten panjang (berita). Memakai token `--wf-*` agar
  tipografi mengikuti tema terang/gelap. Elemen Blok diberi ritme vertikal lewat
  `space-y` pada wrapper, jadi setiap elemen tidak perlu margin atas sendiri.
*/
const components: Components = {
  h1: ({ children }) => <h2 className="text-2xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-3xl">{children}</h2>,
  h2: ({ children }) => <h2 className="text-xl font-bold tracking-tight text-[var(--wf-ink)] sm:text-2xl">{children}</h2>,
  h3: ({ children }) => <h3 className="text-lg font-semibold text-[var(--wf-ink)]">{children}</h3>,
  h4: ({ children }) => <h4 className="text-base font-semibold text-[var(--wf-ink)]">{children}</h4>,
  p: ({ children }) => <p className="leading-relaxed text-[var(--wf-ink-muted)]">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-[var(--wf-ink)]">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-[var(--wf-accent)] underline decoration-[var(--wf-accent)]/40 underline-offset-2 transition hover:text-[var(--wf-accent-hover)]"
      {...(href && /^https?:\/\//.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc space-y-1.5 pl-5 text-[var(--wf-ink-muted)] marker:text-[var(--wf-accent)]">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1.5 pl-5 text-[var(--wf-ink-muted)] marker:text-[var(--wf-accent)]">{children}</ol>,
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[var(--wf-accent)]/50 pl-4 italic text-[var(--wf-ink-muted)]">{children}</blockquote>
  ),
  hr: () => <hr className="border-t border-[var(--wf-rule)]" />,
  code: ({ children, className }) => {
    // Blok kode (dari ``` ) dibungkus <pre>; inline code tidak punya bahasa.
    const isBlock = typeof className === 'string' && className.startsWith('language-');
    if (isBlock) {
      return <code className={`${className} font-[var(--font-family-mono,monospace)] text-sm`}>{children}</code>;
    }
    return (
      <code className="rounded bg-[var(--wf-board-2)] px-1.5 py-0.5 font-[var(--font-family-mono,monospace)] text-[0.9em] text-[var(--wf-ink)]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-xl border border-[var(--wf-rule)] bg-[var(--wf-board-2)] p-4 text-sm leading-relaxed">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-[var(--wf-rule-strong)]">{children}</thead>,
  th: ({ children }) => <th className="px-3 py-2 text-left font-semibold text-[var(--wf-ink)]">{children}</th>,
  td: ({ children }) => <td className="border-b border-[var(--wf-rule)] px-3 py-2 align-top text-[var(--wf-ink-muted)]">{children}</td>,
};

export function MarkdownBody({ content, className }: Props) {
  if (!content) return null;
  return (
    <div className={`space-y-4 text-base ${className ?? ''}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
