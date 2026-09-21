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

  it('shows the settled values directly, with no decorative count-up', () => {
    render(<DashboardStats stats={mockStats} />)
    // Values are real numbers immediately; nothing animates from 0.
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
    expect(screen.getByText('75')).toBeInTheDocument()
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
