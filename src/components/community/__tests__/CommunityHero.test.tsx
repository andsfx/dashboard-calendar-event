import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityHero } from '../CommunityHero'

describe('CommunityHero', () => {
  it('renders main heading with the highlighted "Gratis"', () => {
    render(<CommunityHero />)
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toHaveTextContent('Panggung Gratis untuk Komunitas Bekasi')
    const highlight = screen.getByText('Gratis')
    expect(highlight).toHaveClass('text-brand-primary-300')
  })

  it('renders CTA buttons', () => {
    render(<CommunityHero />)
    expect(screen.getByText('Daftar Sekarang')).toBeInTheDocument()
    expect(screen.getByText('Isi Form di Halaman Ini')).toBeInTheDocument()
  })

  it('renders quick stats', () => {
    render(<CommunityHero />)
    expect(screen.getByText('100% Gratis')).toBeInTheDocument()
    expect(screen.getByText('Sound 10K Watt')).toBeInTheDocument()
  })

  it('renders hero image when provided', () => {
    const { container } = render(<CommunityHero heroImageUrl="https://example.com/hero.jpg" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://example.com/hero.jpg')
  })

  it('renders live completed count in the badge with a "+" suffix', () => {
    render(<CommunityHero stats={{ completed: 1234 }} />)
    expect(screen.getByText('1.234+ Event Sudah Terlaksana')).toBeInTheDocument()
  })

  it('shows a skeleton instead of "0 Event" while loading', () => {
    render(<CommunityHero stats={{ completed: 0 }} isLoading />)
    expect(screen.queryByText(/0 Event/)).not.toBeInTheDocument()
    expect(screen.queryByText(/100\+ Event/)).not.toBeInTheDocument()
  })
})
