import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { PriorityBadge } from '../PriorityBadge'

describe('PriorityBadge', () => {
  it('renders high priority', () => {
    render(<PriorityBadge priority="high" />)
    expect(screen.getByText('Prioritas Tinggi')).toBeInTheDocument()
  })

  it('renders medium priority', () => {
    render(<PriorityBadge priority="medium" />)
    expect(screen.getByText('Sedang')).toBeInTheDocument()
  })

  it('renders low priority', () => {
    render(<PriorityBadge priority="low" />)
    expect(screen.getByText('Rendah')).toBeInTheDocument()
  })

  it('has aria-label for accessibility', () => {
    render(<PriorityBadge priority="high" />)
    expect(screen.getByLabelText('Prioritas Tinggi')).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<PriorityBadge priority="medium" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md')
  })
})
