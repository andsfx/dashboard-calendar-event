import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardStats } from '../DashboardStats'

describe('DashboardStats', () => {
  const mockStats = {
    total: 100,
    ongoing: 5,
    upcoming: 20,
    past: 75,
  }

  const attention = { draftCount: 2, pendingRegistrations: 1, pendingExhibitionLeads: 1, draftsError: null }

  it('renders the actionable counts plus the reference pair', () => {
    render(<DashboardStats stats={mockStats} attention={attention} />)
    expect(screen.getByText('Menunggu keputusan')).toBeInTheDocument()
    expect(screen.getByText('Sedang Berlangsung')).toBeInTheDocument()
    expect(screen.getByText('Akan Datang')).toBeInTheDocument()
    expect(screen.getByText('Total Acara')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()
  })

  it('orders the tiers: queue, then today, then the reference line', () => {
    render(<DashboardStats stats={mockStats} attention={attention} />)

    const follows = (first: HTMLElement, second: HTMLElement) =>
      Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING)

    const lead = screen.getByText('Menunggu keputusan')
    const ongoing = screen.getByText('Sedang Berlangsung')
    const upcoming = screen.getByText('Akan Datang')
    const reference = screen.getByText('Total Acara')

    expect(follows(lead, ongoing)).toBe(true)
    expect(follows(ongoing, upcoming)).toBe(true)
    expect(follows(upcoming, reference)).toBe(true)
  })

  it('sums every human queue into the lead number', () => {
    render(<DashboardStats stats={mockStats} attention={attention} />)
    // 2 draft + 1 pendaftaran + 1 pengajuan pameran
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('drops the reference pair to one quiet line, not two metric cards', () => {
    const { container } = render(<DashboardStats stats={mockStats} attention={attention} />)

    expect(container.querySelectorAll('.wf-metric')).toHaveLength(3)
    expect(container.querySelectorAll('.wf-reference')).toHaveLength(1)
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
  })

  it('does not repeat the queue breakdown sentence (that lives in the register)', () => {
    render(<DashboardStats stats={mockStats} attention={attention} />)
    expect(screen.queryByText(/draft menunggu dipublikasikan/)).not.toBeInTheDocument()
    expect(screen.queryByText(/pendaftaran komunitas menunggu review/)).not.toBeInTheDocument()
  })

  it('shows no queue tier at all when nothing is waiting', () => {
    render(<DashboardStats stats={mockStats} attention={{ draftCount: 0, pendingRegistrations: 0, pendingExhibitionLeads: 0, draftsError: null }} />)
    expect(screen.queryByText('Menunggu keputusan')).not.toBeInTheDocument()
    expect(screen.getByText('Sedang Berlangsung')).toBeInTheDocument()
  })

  it('names the cause when the draft queue fails to load', () => {
    render(<DashboardStats stats={mockStats} attention={{ draftCount: 0, pendingRegistrations: 0, pendingExhibitionLeads: 0, draftsError: 'Gagal memuat draft event.' }} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText(/Sebagian antrian gagal dimuat: Gagal memuat draft event\./)).toBeInTheDocument()
  })

  it('shows the settled values directly, with no decorative count-up', () => {
    render(<DashboardStats stats={mockStats} attention={attention} />)
    // Values are real numbers immediately; nothing animates from 0.
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })

  it('keeps the public compact summary to the two discovery counts', () => {
    render(<DashboardStats stats={mockStats} compact />)
    expect(screen.getByText('Akan Datang')).toBeInTheDocument()
    expect(screen.getByText('Sedang Berlangsung')).toBeInTheDocument()
    expect(screen.queryByText('Total Acara')).not.toBeInTheDocument()
    expect(screen.queryByText('Menunggu keputusan')).not.toBeInTheDocument()
  })
})
