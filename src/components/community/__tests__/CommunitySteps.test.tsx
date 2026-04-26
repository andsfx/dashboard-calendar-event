import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunitySteps } from '../CommunitySteps'

describe('CommunitySteps', () => {
  it('renders section heading', () => {
    render(<CommunitySteps />)
    expect(screen.getByText('Gampang banget, cuma 4 langkah.')).toBeInTheDocument()
  })

  it('renders all 4 steps', () => {
    render(<CommunitySteps />)
    expect(screen.getByText('Daftar & Submit')).toBeInTheDocument()
    expect(screen.getByText('Review Tim Mall')).toBeInTheDocument()
    expect(screen.getByText('Konfirmasi & Prep')).toBeInTheDocument()
    expect(screen.getByText('Event Day!')).toBeInTheDocument()
  })

  it('renders step numbers', () => {
    render(<CommunitySteps />)
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()
    expect(screen.getByText('04')).toBeInTheDocument()
  })

  it('renders step descriptions', () => {
    render(<CommunitySteps />)
    expect(screen.getByText(/Isi form pendaftaran komunitas/)).toBeInTheDocument()
    expect(screen.getByText(/Tim kami review proposal/)).toBeInTheDocument()
  })

  it('renders eyebrow label', () => {
    render(<CommunitySteps />)
    expect(screen.getByText('Cara Daftar')).toBeInTheDocument()
  })
})
