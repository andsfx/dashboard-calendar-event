import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunitySocialProof } from '../CommunitySocialProof'

describe('CommunitySocialProof', () => {
  it('renders live numbers with a "+" suffix', () => {
    render(<CommunitySocialProof totalCompleted={12} totalOrganizers={34} totalEvents={56} />)
    expect(screen.getByText('12+')).toBeInTheDocument()
    expect(screen.getByText('34+')).toBeInTheDocument()
    expect(screen.getByText('56+')).toBeInTheDocument()
  })

  it('formats thousands with id-ID grouping and "+" suffix', () => {
    render(<CommunitySocialProof totalEvents={1234} />)
    expect(screen.getByText('1.234+')).toBeInTheDocument()
  })

  it('renders "—" when completed is zero', () => {
    render(<CommunitySocialProof totalCompleted={0} totalOrganizers={0} totalEvents={0} />)
    expect(screen.getAllByText('—')).toHaveLength(3)
  })

  it('shows a skeleton instead of numbers while loading', () => {
    render(<CommunitySocialProof totalCompleted={0} totalOrganizers={0} totalEvents={0} isLoading />)
    expect(screen.getByText('Event Terlaksana')).toBeInTheDocument()
    expect(screen.queryByText('0+ Event Terlaksana')).not.toBeInTheDocument()
  })
})
