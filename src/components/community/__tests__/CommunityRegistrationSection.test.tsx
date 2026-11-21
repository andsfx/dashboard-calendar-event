/**
 * Tindak lanjut per Community Registration: registrasi `approved` belum tentu
 * sudah dijadwalkan (ADR 003). Seksi harus membedakan:
 *
 *   - belum ada Draft/event  → badge "Belum dijadwalkan" + aksi "Buat Draft"
 *   - Draft tertaut           → "Draft · <progress>", aksi disembunyikan
 *   - event tertaut / Draft sudah terbit → "Sudah dijadwalkan"
 *
 * Relasi dibaca dari `draftEvents[].organizationId` dan `events[].organizationId`
 * (kolom yang kini juga ditulis `publishDraft`).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CommunityRegistrationSection } from '../CommunityRegistrationSection';
import type { CommunityRegistration, DraftEventItem, EventItem } from '../../../types';

function makeRegistration(overrides: Partial<CommunityRegistration> = {}): CommunityRegistration {
  return {
    id: 'reg_1',
    communityName: '',
    communityType: '',
    pic: 'Andi',
    phone: '081200000000',
    email: 'andi@example.com',
    instagram: '',
    description: '',
    preferredDate: '',
    status: 'approved',
    adminNote: '',
    createdAt: '2026-11-01T00:00:00.000Z',
    organizationType: 'community',
    organizationName: 'Kopi Senja',
    typeSpecificData: {},
    proposalFileUrl: '',
    proposalFileName: '',
    proposalFileSize: 0,
    ...overrides,
  };
}

function makeDraft(overrides: Partial<DraftEventItem> = {}): DraftEventItem {
  return {
    id: 'drf_1',
    rowIndex: 0,
    dateStr: '2026-12-01',
    day: 'Selasa',
    jam: '10:00',
    acara: 'Bazar Kopi Senja',
    lokasi: 'Atrium Lt.1',
    eo: 'Kopi Senja',
    pic: 'Andi',
    phone: '081200000000',
    keterangan: '',
    month: 'Desember',
    category: 'Umum',
    categories: ['Umum'],
    priority: 'medium',
    eventModel: 'free',
    eventNominal: '',
    eventModelNotes: '',
    progress: 'confirm',
    published: false,
    deleted: false,
    tanggal: '1 Desember 2026',
    internalNote: '',
    organizationId: 'reg_1',
    ...overrides,
  };
}

function makeEvent(overrides: Partial<EventItem> = {}): EventItem {
  return {
    id: 'evt_1',
    rowIndex: 0,
    status: 'upcoming',
    tanggal: '1 Desember 2026',
    dateStr: '2026-12-01',
    day: 'Selasa',
    jam: '10:00',
    acara: 'Bazar Kopi Senja',
    lokasi: 'Atrium Lt.1',
    eo: 'Kopi Senja',
    pic: 'Andi',
    phone: '081200000000',
    keterangan: '',
    month: 'Desember',
    category: 'Umum',
    categories: ['Umum'],
    priority: 'medium',
    eventModel: 'free',
    eventNominal: '',
    eventModelNotes: '',
    organizationId: 'reg_1',
    ...overrides,
  };
}

describe('CommunityRegistrationSection — tindak lanjut', () => {
  it('approved tanpa Draft/event menandai "Belum dijadwalkan" dan menawarkan Buat Draft', () => {
    const onCreateDraft = vi.fn();
    render(
      <CommunityRegistrationSection
        registrations={[makeRegistration()]}
        isLoading={false}
        onDetail={vi.fn()}
        onCreateDraft={onCreateDraft}
      />,
    );

    expect(screen.getAllByText('Belum dijadwalkan').length).toBeGreaterThan(0);
    const button = screen.getByRole('button', { name: /Buat draft dari pendaftaran Kopi Senja/i });
    fireEvent.click(button);
    expect(onCreateDraft).toHaveBeenCalledWith(expect.objectContaining({ id: 'reg_1' }));
  });

  it('Draft tertaut menampilkan progres Draft dan menyembunyikan aksi Buat Draft', () => {
    render(
      <CommunityRegistrationSection
        registrations={[makeRegistration()]}
        isLoading={false}
        onDetail={vi.fn()}
        draftEvents={[makeDraft()]}
        onCreateDraft={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Draft · Konfirmasi').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Buat draft dari pendaftaran/i })).toBeNull();
    expect(screen.queryByText('Belum dijadwalkan')).toBeNull();
  });

  it('event tertaut menandai "Sudah dijadwalkan"', () => {
    render(
      <CommunityRegistrationSection
        registrations={[makeRegistration()]}
        isLoading={false}
        onDetail={vi.fn()}
        events={[makeEvent()]}
        onCreateDraft={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Sudah dijadwalkan').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Buat draft dari pendaftaran/i })).toBeNull();
  });

  it('Draft berstatus Batal tidak memblokir pembuatan Draft pengganti', () => {
    render(
      <CommunityRegistrationSection
        registrations={[makeRegistration()]}
        isLoading={false}
        onDetail={vi.fn()}
        draftEvents={[makeDraft({ progress: 'cancel' })]}
        onCreateDraft={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Belum dijadwalkan').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Buat draft dari pendaftaran Kopi Senja/i })).toBeInTheDocument();
  });

  it('Draft yang sudah terbit dihitung sebagai sudah dijadwalkan meski event belum termuat', () => {
    render(
      <CommunityRegistrationSection
        registrations={[makeRegistration()]}
        isLoading={false}
        onDetail={vi.fn()}
        draftEvents={[makeDraft({ published: true })]}
        onCreateDraft={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Sudah dijadwalkan').length).toBeGreaterThan(0);
  });

  it('akun demo (readOnly) tidak diberi aksi Buat Draft', () => {
    render(
      <CommunityRegistrationSection
        registrations={[makeRegistration()]}
        isLoading={false}
        onDetail={vi.fn()}
        onCreateDraft={vi.fn()}
        readOnly
      />,
    );

    expect(screen.getAllByText('Belum dijadwalkan').length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Buat draft dari pendaftaran/i })).toBeNull();
  });

  it('status selain approved tidak ditandai belum dijadwalkan', () => {
    render(
      <CommunityRegistrationSection
        registrations={[makeRegistration({ status: 'pending' })]}
        isLoading={false}
        onDetail={vi.fn()}
        onCreateDraft={vi.fn()}
      />,
    );

    expect(screen.queryByText('Belum dijadwalkan')).toBeNull();
    expect(screen.queryByRole('button', { name: /Buat draft dari pendaftaran/i })).toBeNull();
  });
});
