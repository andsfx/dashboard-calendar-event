import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityHero } from '../CommunityHero'

describe('CommunityHero', () => {
  it('renders main heading', () => {
    render(<CommunityHero />)
    expect(screen.getByText(/Panggung Gratis/)).toBeInTheDocument()
  })

  it('renders CTA buttons', () => {
    render(<CommunityHero />)
    expect(screen.getByText('Daftar Sekarang')).toBeInTheDocument()
    expect(screen.getByText('Lihat Keuntungan')).toBeInTheDocument()
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
})
