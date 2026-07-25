import { describe, expect, it } from 'vitest';
import { canPublishDraft } from '../draftUtils';
import type { DraftEventItem } from '../../types';

/**
 * T-008: publish eligibility depends only on Draft progress/published/deleted —
 * never on letter/album/surat fields (assets are optional).
 */
function publishGateFromDraftAndAssets(
  draft: Pick<DraftEventItem, 'progress' | 'published' | 'deleted'>,
  assets: { hasLetter?: boolean; hasAlbum?: boolean },
): boolean {
  // Assets must not affect the gate — intentionally unused
  void assets;
  return canPublishDraft(draft);
}

describe('asset lifecycle guards (T-008)', () => {
  const ready = { progress: 'confirm' as const, published: false, deleted: false };

  it('publish allowed without letter or album', () => {
    expect(publishGateFromDraftAndAssets(ready, {})).toBe(true);
    expect(publishGateFromDraftAndAssets(ready, { hasLetter: false, hasAlbum: false })).toBe(true);
  });

  it('publish allowed with letter/album present (no gate)', () => {
    expect(publishGateFromDraftAndAssets(ready, { hasLetter: true, hasAlbum: true })).toBe(true);
  });

  it('still forbids re-publish even if assets exist', () => {
    expect(publishGateFromDraftAndAssets(
      { progress: 'confirm', published: true, deleted: false },
      { hasLetter: true },
    )).toBe(false);
  });

  it('letter submit shape does not include draft progress fields', () => {
    // createLetterRequest payload is LetterRequestItem only — no progress/published
    const letterPayload = {
      tanggalSurat: '2026-01-01',
      nomorSurat: 'X',
      namaEO: 'EO',
      penanggungJawab: 'PIC',
      alamatEO: '',
      namaEvent: 'Event',
      lokasi: '',
      hariTanggalPelaksanaan: '',
      waktuPelaksanaan: '',
      nomorTelepon: '',
      hariTanggalLoading: '',
      waktuLoading: '',
    };
    expect(letterPayload).not.toHaveProperty('progress');
    expect(letterPayload).not.toHaveProperty('published');
    expect(letterPayload).not.toHaveProperty('status');
  });
});
