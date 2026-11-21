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
    expect(screen.getByText('Dukungan promosi sampai Lead Sponsor.')).toBeInTheDocument()
  })

  it('renders all benefit cards', () => {
    renderWithRouter()
    expect(screen.getByText('Dukungan promosi')).toBeInTheDocument()
    expect(screen.getByText('Jejaring antarpenyelenggara')).toBeInTheDocument()
    expect(screen.getByText('Venue dan peralatan tanpa biaya sewa')).toBeInTheDocument()
  })

  it('renders benefit descriptions', () => {
    renderWithRouter()
    expect(screen.getByText(/Acara kamu dipromosikan lewat media sosial/)).toBeInTheDocument()
  })

  it('renders support copy', () => {
    renderWithRouter()
    expect(screen.getByText(/Selain venue, acara kamu juga dibantu promosi/)).toBeInTheDocument()
  })

  it('renders sponsorship CTA card with link to /sponsor', () => {
    renderWithRouter()
    expect(screen.getByText('Peluang Lead Sponsor')).toBeInTheDocument()
    expect(screen.getByText(/Kami bantu menghubungkan acara kamu/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Lihat peluang Lead Sponsor/ })
    expect(link).toHaveAttribute('href', '/sponsor')
  })
})