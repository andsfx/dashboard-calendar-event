// TypeScript · Zod schema for one local saved letter PAIR (SKE + SIK).

import { z } from 'zod';

export const LetterPairSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().optional(),
  title: z.string().default(''),
  ske: z.record(z.string(), z.unknown()).default({}),
  sik: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(['draft', 'published']).default('draft'),
  createdAt: z.string().default(() => new Date().toISOString()),
  updatedAt: z.string().default(() => new Date().toISOString()),
  publishedIds: z.object({ ske: z.string().optional(), sik: z.string().optional() }).optional(),
});

export type LetterPair = z.infer<typeof LetterPairSchema>;

export function parsePair(value: unknown): LetterPair | null {
  const result = LetterPairSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parsePairs(value: unknown): LetterPair[] {
  if (!Array.isArray(value)) return [];
  const out: LetterPair[] = [];
  for (const item of value) {
    const parsed = parsePair(item);
    if (parsed) out.push(parsed);
  }
  return out;
}
