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

  it('label prioritas terbaca sebagai teks, bukan aria-label pada span generic', () => {
    // axe aria-prohibited-attr: aria-label dilarang pada elemen generic
    // (Badge merender <span>). Label kini bagian konten teks badge.
    render(<PriorityBadge priority="high" />)
    const badge = screen.getByText('Prioritas Tinggi').closest('span')
    expect(badge).not.toHaveAttribute('aria-label')
    expect(badge).toHaveTextContent('Prioritas Tinggi')
  })

  it('applies correct styling classes', () => {
    const { container } = render(<PriorityBadge priority="medium" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md')
  })
})
