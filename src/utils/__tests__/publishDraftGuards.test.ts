import { describe, expect, it } from 'vitest';
import { canPublishDraft } from '../draftUtils';

describe('canPublishDraft (T-002 / shared guard)', () => {
  it('allows confirm + not published + not deleted', () => {
    expect(canPublishDraft({ progress: 'confirm', published: false, deleted: false })).toBe(true);
  });

  it('forbids re-publish', () => {
    expect(canPublishDraft({ progress: 'confirm', published: true, deleted: false })).toBe(false);
  });

  it('forbids progress draft', () => {
    expect(canPublishDraft({ progress: 'draft', published: false, deleted: false })).toBe(false);
  });

  it('forbids cancel / deleted', () => {
    expect(canPublishDraft({ progress: 'confirm', published: false, deleted: true })).toBe(false);
    expect(canPublishDraft({ progress: 'cancel', published: false, deleted: false })).toBe(false);
  });
});
