import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import type { EventItem } from '../../types';
import type { AdminExhibition } from '../../utils/api/exhibitionsApi';
import { ExhibitionManager } from '../ExhibitionManager';

function makeExhibition(overrides: Partial<AdminExhibition> = {}): AdminExhibition {
  return {
    id: 'exh-1', title: 'Beauty Fair', theme: 'Kecantikan', description: 'Pameran kecantikan',
    location: 'Atrium', dateStart: '2026-10-01', dateEnd: '2026-10-05',
    collaborationBrief: 'Butuh brand', leasingPic: 'Casual', marcommPic: 'Marcomm',
    publication: 'published', acceptingApplications: true, createdAt: '2026-09-01', activationCount: 1,
    ...overrides,
  };
}

const props = {
  exhibitions: [makeExhibition()],
  leads: [{
    id: 'lead-1', exhibitionId: 'exh-1', organizationName: 'Brand A', organizationType: 'brand' as const,
    participation: 'activation' as const, contactName: 'Rani', phone: '08123456789',
    email: '', proposal: 'Beauty class', status: 'pending' as const, internalNotes: '', createdAt: '2026-09-02',
  }],
  activations: [{
    eventId: 'ev-1', exhibitionId: 'exh-1', title: 'Beauty Class',
    dateStart: '2026-10-02', dateEnd: '2026-10-02', time: '14:00', location: 'Atrium', organizer: 'Brand A',
  }],
  events: [] as EventItem[],
  isLoading: false,
  error: '',
  canDelete: true,
  onSave: vi.fn(async () => true),
  onDelete: vi.fn(async () => true),
  onReviewLead: vi.fn(async () => true),
  onLinkActivation: vi.fn(async () => true),
  onUnlinkActivation: vi.fn(async () => true),
  onConfirm: vi.fn(async () => false),
};

describe('ExhibitionManager', () => {
  it('menampilkan daftar pameran beserta status aktivasi', () => {
    render(<ExhibitionManager {...props} />);
    expect(screen.getByText('Beauty Fair')).toBeInTheDocument();
    expect(screen.getByText('1 event aktivasi')).toBeInTheDocument();
  });

  it('menampilkan pengajuan dan aktivasi setelah dikelola', async () => {
    const user = userEvent.setup();
    render(<ExhibitionManager {...props} />);
    await user.click(screen.getByRole('button', { name: 'Kelola' }));
    expect(screen.getByText('Brand A')).toBeInTheDocument();
    expect(screen.getByText(/Beauty Class/)).toBeInTheDocument();
  });

  it('menawarkan status review lain tanpa auto-event', async () => {
    const user = userEvent.setup();
    render(<ExhibitionManager {...props} />);
    await user.click(screen.getByRole('button', { name: 'Kelola' }));
    fireEvent.click(screen.getByRole('button', { name: 'Disetujui' }));
    expect(props.onReviewLead).toHaveBeenCalledWith('lead-1', 'approved');
  });
});
