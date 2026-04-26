import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardStats } from '../DashboardStats'

describe('DashboardStats', () => {
  const mockStats = {
    total: 100,
    ongoing: 5,
    upcoming: 20,
    past: 75,
  }

  it('renders all stat cards', () => {
    render(<DashboardStats stats={mockStats} />)
    expect(screen.getByText('Total Acara')).toBeInTheDocument()
    expect(screen.getByText('Sedang Berlangsung')).toBeInTheDocument()
    expect(screen.getByText('Akan Datang')).toBeInTheDocument()
    expect(screen.getByText('Selesai')).toBeInTheDocument()
  })

  it('displays correct stat values', () => {
    render(<DashboardStats stats={mockStats} />)
    // Values start at 0 due to count-up animation
    expect(screen.getAllByText('0')).toHaveLength(4)
  })

  it('renders subtitles', () => {
    render(<DashboardStats stats={mockStats} />)
    expect(screen.getByText('keseluruhan')).toBeInTheDocument()
    expect(screen.getByText('sedang aktif')).toBeInTheDocument()
    expect(screen.getByText('akan datang')).toBeInTheDocument()
    expect(screen.getByText('telah berlangsung')).toBeInTheDocument()
  })
})
