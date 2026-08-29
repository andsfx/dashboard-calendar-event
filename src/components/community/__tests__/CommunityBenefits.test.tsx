import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MemoryRouter } from 'react-router-dom'
import { CommunityBenefits } from '../CommunityBenefits'

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <CommunityBenefits />
    </MemoryRouter>,
  )
}

describe('CommunityBenefits', () => {
  it('renders section heading', () => {
    renderWithRouter()
    expect(screen.getByText('Bukan cuma dikasih tempat.')).toBeInTheDocument()
  })

  it('renders all benefit cards', () => {
    renderWithRouter()
    expect(screen.getByText('Promosi & Marketing')).toBeInTheDocument()
    expect(screen.getByText('Kembangkan Komunitas')).toBeInTheDocument()
    expect(screen.getByText('Venue & Peralatan Gratis')).toBeInTheDocument()
  })

  it('renders benefit descriptions', () => {
    renderWithRouter()
    expect(screen.getByText(/Event kamu kami promosiin/)).toBeInTheDocument()
  })

  it('renders support copy', () => {
    renderWithRouter()
    expect(screen.getByText(/didukung buat berkembang/)).toBeInTheDocument()
  })

  it('renders sponsorship CTA card with link to /sponsor', () => {
    renderWithRouter()
    expect(screen.getByText('Dukungan Sponsorship')).toBeInTheDocument()
    expect(screen.getByText(/Dapatkan dukungan sponsorship/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Lihat Peluang Sponsor/ })
    expect(link).toHaveAttribute('href', '/sponsor')
  })
})