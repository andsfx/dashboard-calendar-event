import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityBenefits } from '../CommunityBenefits'

describe('CommunityBenefits', () => {
  it('renders section heading', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText('Bukan cuma dikasih space.')).toBeInTheDocument()
  })

  it('renders all benefit cards', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText('Dukungan Sponsorship')).toBeInTheDocument()
    expect(screen.getByText('Promosi & Marketing')).toBeInTheDocument()
  })

  it('renders benefit descriptions', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText(/Dapatkan dukungan sponsorship/)).toBeInTheDocument()
    expect(screen.getByText(/Tim marketing kami bantu promosikan/)).toBeInTheDocument()
  })

  it('renders support copy', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText(/didukung untuk berkembang/)).toBeInTheDocument()
  })
})
