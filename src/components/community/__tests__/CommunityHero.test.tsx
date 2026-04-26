import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityHero } from '../CommunityHero'

describe('CommunityHero', () => {
  it('renders main heading', () => {
    render(<CommunityHero />)
    expect(screen.getByText(/Calling All/)).toBeInTheDocument()
    expect(screen.getByText('Community')).toBeInTheDocument()
  })

  it('renders CTA buttons', () => {
    render(<CommunityHero />)
    expect(screen.getByText('Daftar Sekarang')).toBeInTheDocument()
    expect(screen.getByText('Lihat Benefits')).toBeInTheDocument()
  })

  it('renders quick stats', () => {
    render(<CommunityHero />)
    expect(screen.getByText('100% Gratis')).toBeInTheDocument()
    expect(screen.getByText('Sound 10K Watt')).toBeInTheDocument()
    expect(screen.getByText('Open for All')).toBeInTheDocument()
  })

  it('renders hero image when provided', () => {
    const { container } = render(<CommunityHero heroImageUrl="https://example.com/hero.jpg" />)
    const img = container.querySelector('img')
    expect(img).toHaveAttribute('src', 'https://example.com/hero.jpg')
  })

  it('renders gradient background when no image provided', () => {
    const { container } = render(<CommunityHero />)
    const gradientDiv = container.querySelector('[style*="linear-gradient"]')
    expect(gradientDiv).toBeInTheDocument()
  })
})
