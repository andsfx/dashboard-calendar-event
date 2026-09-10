/** Helper classnames — gabung kondisional + rapikan konflik Tailwind.
 * Pengganti pola manual `.filter(Boolean).join(' ')` (tanpa tailwind-merge,
 * tanpa dependensi baru: resolusi konflik sederhana prefix-based).
 */
type ClassValue = string | false | null | undefined;

/** Ambil grup konflik Tailwind: prefix sebelum `-` terakhir pada segmen pertama. */
function conflictKey(cls: string): string | null {
  const scoped = cls.startsWith('dark:') ? cls.slice(5) : cls;
  const seg = scoped.split(':').pop() ?? scoped;
  const m = /^(p|m|px|py|pt|pb|pl|pr|mx|my|mt|mb|ml|mr|gap|text|bg|border|rounded|shadow|w|h|max-w|min-w|grid-cols)-/.exec(seg);
  if (!m) return null;
  return (cls.includes(':') ? cls.slice(0, cls.lastIndexOf(':') + 1) : '') + seg.slice(0, seg.lastIndexOf('-'));
}

/** cn('a', cond && 'b', undefined) → 'a b'. Kelas konflik terakhir menang. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const pos: Record<string, number> = {};
  for (const v of values) {
    if (!v) continue;
    for (const cls of v.split(/\s+/)) {
      if (!cls) continue;
      const key = conflictKey(cls);
      if (key === null) {
        out.push(cls);
        continue;
      }
      const prev = pos[key];
      if (prev === undefined) {
        pos[key] = out.length;
        out.push(cls);
      } else {
        out[prev] = cls;
      }
    }
  }
  return out.join(' ');
}
