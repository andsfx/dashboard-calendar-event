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
    expect(screen.getByText('Panggung dan backdrop')).toBeInTheDocument()
    expect(screen.getByText('Sound system 10.000 watt')).toBeInTheDocument()
    expect(screen.getByText('Lighting system')).toBeInTheDocument()
    expect(screen.getByText('50 kursi penonton')).toBeInTheDocument()
    expect(screen.getByText('Area lantai 3')).toBeInTheDocument()
    expect(screen.getByText('Meja juri')).toBeInTheDocument()
  })

  it('renders facility details', () => {
    render(<CommunityFacilities />)
    expect(screen.getByText(/Sound system profesional 10.000 watt/)).toBeInTheDocument()
    expect(screen.getByText(/Lighting profesional yang bikin panggung/)).toBeInTheDocument()
  })
})
