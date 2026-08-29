import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityBenefits } from '../CommunityBenefits'

describe('CommunityBenefits', () => {
  it('renders section heading', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText('Bukan cuma dikasih tempat.')).toBeInTheDocument()
  })

  it('renders all benefit cards', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText('Bantuan Cari Sponsor')).toBeInTheDocument()
    expect(screen.getByText('Promosi & Marketing')).toBeInTheDocument()
  })

  it('renders benefit descriptions', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText(/Kami bantu cariin/)).toBeInTheDocument()
    expect(screen.getByText(/Event kamu kami promosiin/)).toBeInTheDocument()
  })

  it('renders support copy', () => {
    render(<CommunityBenefits />)
    expect(screen.getByText(/didukung buat berkembang/)).toBeInTheDocument()
  })
})
