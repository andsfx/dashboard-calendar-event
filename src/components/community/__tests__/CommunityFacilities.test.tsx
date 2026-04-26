import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityFacilities } from '../CommunityFacilities'

describe('CommunityFacilities', () => {
  it('renders section heading', () => {
    render(<CommunityFacilities />)
    expect(screen.getByText('Semua udah disiapin.')).toBeInTheDocument()
  })

  it('renders all 6 facility cards', () => {
    render(<CommunityFacilities />)
    expect(screen.getByText('Panggung & Backdrop')).toBeInTheDocument()
    expect(screen.getByText('Sound System 10K Watt')).toBeInTheDocument()
    expect(screen.getByText('Lighting System')).toBeInTheDocument()
    expect(screen.getByText('50 Kursi Penonton')).toBeInTheDocument()
    expect(screen.getByText('Area Lantai 3')).toBeInTheDocument()
    expect(screen.getByText('Meja Juri')).toBeInTheDocument()
  })

  it('renders facility details', () => {
    render(<CommunityFacilities />)
    expect(screen.getByText(/Sound system profesional 10.000 watt/)).toBeInTheDocument()
    expect(screen.getByText(/Lighting profesional yang bikin panggung/)).toBeInTheDocument()
  })

  it('renders eyebrow label', () => {
    render(<CommunityFacilities />)
    expect(screen.getByText('Fasilitas')).toBeInTheDocument()
  })
})
