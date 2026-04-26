import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityBenefits } from '../CommunityBenefits'

describe('CommunityBenefits', () => {
  it('renders section heading', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText('Bukan cuma dikasih space.')).toBeInTheDocument()
  })

  it('renders all 4 benefit cards', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText('Sponsorship Opportunities')).toBeInTheDocument()
    expect(screen.getByText('Marketing Support')).toBeInTheDocument()
    expect(screen.getByText('Grow Your Community')).toBeInTheDocument()
    expect(screen.getByText('Free Venue & Event Tools')).toBeInTheDocument()
  })

  it('renders benefit descriptions', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText(/Dapatkan dukungan sponsorship/)).toBeInTheDocument()
    expect(screen.getByText(/Tim marketing kami bantu promosiin/)).toBeInTheDocument()
  })

  it('renders eyebrow label', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText('Kenapa Gabung')).toBeInTheDocument()
  })
})
