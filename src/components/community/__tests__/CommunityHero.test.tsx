import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'
import { CommunityHero } from '../CommunityHero'
import { COMMUNITY_STAT_LABELS } from '../communityStats'

describe('CommunityHero', () => {
  it('renders main heading with the highlighted "Gratis"', () => {
    render(
      <MemoryRouter>
        <CommunityHero />
      </MemoryRouter>,
    )
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Panggung Gratis untuk Komunitas Bekasi')
    const highlight = screen.getByText('Gratis')
    expect(highlight).toHaveClass('text-brand-primary-300')
  })

  it('renders CTA buttons', () => {
    render(
      <MemoryRouter>
        <CommunityHero />
      </MemoryRouter>,
    )
    expect(screen.getByText('Daftar Event')).toBeInTheDocument()
    expect(screen.getByText('Cek Event')).toBeInTheDocument()
  })

  it('renders quick stats', () => {
    render(
      <MemoryRouter>
        <CommunityHero />
      </MemoryRouter>,
    )
    expect(screen.getByText('100% Gratis')).toBeInTheDocument()
    expect(screen.getByText('Sound 10K Watt')).toBeInTheDocument()
  })

  it('renders hero image when provided', () => {
    const { container } = render(
      <MemoryRouter>
        <CommunityHero heroImageUrl="https://example.com/hero.jpg" />
      </MemoryRouter>,
    )
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://example.com/hero.jpg')
  })

  it('renders live completed count in the badge with a "+" suffix', () => {
    render(
      <MemoryRouter>
        <CommunityHero stats={{ completed: 1234 }} />
      </MemoryRouter>,
    )
    // Label dibaca dari sumber tunggal (C2) supaya tidak bisa menyimpang dari /events.
    expect(screen.getByText(`1.234+ ${COMMUNITY_STAT_LABELS.completed}`)).toBeInTheDocument()
  })

  it('shows a skeleton instead of "0 Event" while loading', () => {
    render(
      <MemoryRouter>
        <CommunityHero stats={{ completed: 0 }} isLoading />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/0 Event/)).not.toBeInTheDocument()
    expect(screen.queryByText(/100\+ Event/)).not.toBeInTheDocument()
  })

  it('renders a plain "0", not "0+", when completed is zero', () => {
    // Konsisten dengan CommunitySocialProof: satu keadaan, satu representasi.
    render(
      <MemoryRouter>
        <CommunityHero stats={{ completed: 0 }} />
      </MemoryRouter>,
    )
    expect(screen.getByText(`0 ${COMMUNITY_STAT_LABELS.completed}`)).toBeInTheDocument()
    expect(screen.queryByText(/0\+/)).not.toBeInTheDocument()
  })
})
