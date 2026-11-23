import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import type { Parent, PhrasingContent, Root, Text } from 'mdast';

interface Props {
  /** Isi markdown mentah (dari kolom `content` berita, dsb.). */
  content: string;
  className?: string;
}

// Domain tanpa skema (mis. `metmalcommunityspace.web.id/daftar`) — GFM baru
// melink-kan `https://…`/`www.…`, jadi domain telanjang tetap teks biasa.
// Lookbehind mencegah match di tengah URL/email/angka.
const BARE_DOMAIN =
  /(?<![\w@./-])((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}(?:\/[^\s<>()]*)?)/gi;

function splitBareDomains(value: string): PhrasingContent[] | null {
  const parts: PhrasingContent[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  BARE_DOMAIN.lastIndex = 0;
  while ((match = BARE_DOMAIN.exec(value))) {
    const raw = match[1] ?? '';
    if (!raw) continue;
    const cleaned = raw.replace(/[.,;:!?]+$/, '');
    if (!cleaned) continue;
    const start = match.index;
    if (start > last) parts.push({ type: 'text', value: value.slice(last, start) });
    parts.push({
      type: 'link',
      url: `https://${cleaned}`,
      title: null,
      children: [{ type: 'text', value: cleaned }],
    });
    const trailing = raw.slice(cleaned.length);
    if (trailing) parts.push({ type: 'text', value: trailing });
    last = start + raw.length;
  }
  if (!parts.length) return null;
  if (last < value.length) parts.push({ type: 'text', value: value.slice(last) });
  return parts;
}

/** Link-kan URL/domain telanjang di teks, kecuali di dalam tautan/kode. */
function remarkLinkifyDomains() {
  return (tree: Root) => {
    const edits: Array<{ parent: Parent; index: number; parts: PhrasingContent[] }> = [];
    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      if (parent.type === 'link' || parent.type === 'linkReference') return;
      const parts = splitBareDomains(node.value);
      if (parts) edits.push({ parent, index, parts });
    });
    // Terapkan per parent, index menurun, agar splice tidak menggeser index lain.
    const byParent = new Map<Parent, Array<{ index: number; parts: PhrasingContent[] }>>();
    for (const edit of edits) {
      const list = byParent.get(edit.parent) ?? [];
      list.push({ index: edit.index, parts: edit.parts });
      byParent.set(edit.parent, list);
    }
    for (const [parent, list] of byParent) {
      list.sort((a, b) => b.index - a.index);
      for (const { index, parts } of list) {
        (parent.children as PhrasingContent[]).splice(index, 1, ...parts);
      }
    }
  };
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
      <Markdown remarkPlugins={[remarkGfm, remarkLinkifyDomains]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
