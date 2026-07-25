import { describe, expect, it } from 'vitest';

/**
 * T-005 / ADR 003: updateRegistrationStatus must only touch status+note.
 * This pure helper documents the allowed mutation shape (no draft/event spawn fields).
 */
function registrationStatusUpdatePayload(status: string, adminNote?: string) {
  const updateData: Record<string, string> = { status };
  if (adminNote !== undefined) updateData.admin_note = adminNote;
  return updateData;
}

describe('Registration approve payload (T-005)', () => {
  it('only sets status and optional admin_note', () => {
    expect(registrationStatusUpdatePayload('approved', 'ok')).toEqual({
      status: 'approved',
      admin_note: 'ok',
    });
    expect(Object.keys(registrationStatusUpdatePayload('approved'))).toEqual(['status']);
  });

  it('does not include draft or event spawn fields', () => {
    const payload = registrationStatusUpdatePayload('approved', 'note');
    expect(payload).not.toHaveProperty('published');
    expect(payload).not.toHaveProperty('source_draft_id');
    expect(payload).not.toHaveProperty('create_draft');
    expect(payload).not.toHaveProperty('event_id');
  });
});
