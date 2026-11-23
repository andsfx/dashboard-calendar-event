import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import type { EventItem, ExhibitionSlot } from '../../../types';
import type { AdminExhibition } from '../../../utils/api/exhibitionsApi';
import { ExhibitionManager } from '../ExhibitionManager';

function makeExhibition(overrides: Partial<AdminExhibition> = {}): AdminExhibition {
  return {
    id: 'exh-1', slug: 'beauty-fair', title: 'Beauty Fair', subtitle: '',
    programType: 'pameran', theme: 'Kecantikan', description: 'Pameran kecantikan',
    location: 'Atrium', dateStart: '2026-10-01', dateEnd: '2026-10-05',
    scheduleNote: '', targetAudience: 'Umum', collaborationBrief: 'Butuh brand',
    lookingForSummary: '', lookingForTags: [], benefits: [], coverImageUrl: '',
    leasingPic: 'Casual', marcommPic: 'Marcomm', publication: 'published', status: 'open',
    isFeatured: false, acceptingApplications: true, defaultOrganizationType: 'komunitas',
    formConfig: {}, createdAt: '2026-09-01', activationCount: 1,
    ...overrides,
  };
}

const SLOT: ExhibitionSlot = {
  id: 'slot-1', exhibitionId: 'exh-1', slotDate: '2026-10-02', startTime: '06:30',
  endTime: '10:00', zoneName: 'Atrium', capacity: 3, slotStatus: 'open', publicNote: '',
};

const props = {
  exhibitions: [makeExhibition()],
  leads: [{
    id: 'lead-1', exhibitionId: 'exh-1', referenceCode: 'KOL-2610-A4F2',
    slotId: 'slot-1', organizationName: 'Brand A', organizationType: 'umkm_brand' as const,
    participation: 'both' as const, contributionType: 'booth_umkm' as const,
    socialMediaHandle: '@branda', preferredDateNote: '', estimatedParticipants: '15_to_30' as const,
    technicalNeeds: ['listrik' as const], technicalNeedsNote: '', contactName: 'Rani',
    phone: '628123456789', email: '', proposal: 'Booth kopi pagi', status: 'submitted' as const,
    publicActivityTitle: '', publicActivitySummary: '', isPublicAgenda: false,
    syncedEventId: '', internalNotes: '', reviewedAt: '', createdAt: '2026-09-02',
  }],
  activations: [{
    eventId: 'ev-1', exhibitionId: 'exh-1', title: 'Beauty Class',
    dateStart: '2026-10-02', dateEnd: '2026-10-02', time: '14:00', location: 'Atrium', organizer: 'Brand A',
  }],
  slots: [SLOT],
  events: [] as EventItem[],
  isLoading: false,
  error: '',
  canDelete: true,
  onSave: vi.fn(async () => true),
  onDelete: vi.fn(async () => true),
  onReviewLead: vi.fn(async () => true),
  onPublishLead: vi.fn(async () => true),
  onSaveSlot: vi.fn(async () => true),
  onDeleteSlot: vi.fn(async () => true),
  onGenerateSlots: vi.fn(async () => true),
  onLinkActivation: vi.fn(async () => true),
  onUnlinkActivation: vi.fn(async () => true),
  onConfirm: vi.fn(async () => false),
};

describe('ExhibitionManager', () => {
  it('menampilkan daftar program dan jumlah pengajuan', () => {
    render(<ExhibitionManager {...props} />);
    expect(screen.getByText('Beauty Fair')).toBeInTheDocument();
    expect(screen.getByText('1 pengajuan')).toBeInTheDocument();
  });

  it('menampilkan slot, pengajuan, dan aktivasi setelah dikelola', async () => {
    const user = userEvent.setup();
    render(<ExhibitionManager {...props} />);
    await user.click(screen.getByRole('button', { name: 'Kelola' }));
    expect(screen.getByText('Brand A')).toBeInTheDocument();
    expect(screen.getByText(/Beauty Class/)).toBeInTheDocument();
    expect(screen.getByText(/2026-10-02 · 06:30 - 10:00 · Atrium/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chat PIC via WhatsApp/ })).toHaveAttribute(
      'href', expect.stringContaining('https://wa.me/628123456789'),
    );
  });

  it('menyimpan status kurasi tanpa membuat event otomatis', async () => {
    const user = userEvent.setup();
    render(<ExhibitionManager {...props} />);
    await user.click(screen.getByRole('button', { name: 'Kelola' }));
    await user.selectOptions(screen.getByLabelText('Status pengajuan'), 'approved');
    await user.click(screen.getByRole('button', { name: /Simpan kurasi/ }));
    expect(props.onReviewLead).toHaveBeenCalledWith('lead-1', expect.objectContaining({
      status: 'approved',
    }));
    expect(props.onPublishLead).not.toHaveBeenCalled();
  });
});
