import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatusBadge } from '../StatusBadge'

describe('StatusBadge', () => {
  it('renders draft status', () => {
    render(<StatusBadge status="draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('renders ongoing status', () => {
    render(<StatusBadge status="ongoing" />)
    expect(screen.getByText('Berlangsung')).toBeInTheDocument()
  })

  it('renders upcoming status', () => {
    render(<StatusBadge status="upcoming" />)
    expect(screen.getByText('Mendatang')).toBeInTheDocument()
  })

  it('renders past status', () => {
    render(<StatusBadge status="past" />)
    expect(screen.getByText('Selesai')).toBeInTheDocument()
  })

  it('applies small size class', () => {
    const { container } = render(<StatusBadge status="upcoming" size="sm" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs')
  })

  it('applies medium size class by default', () => {
    const { container } = render(<StatusBadge status="upcoming" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('px-2.5', 'py-1', 'text-xs')
  })

  it('has aria-label for accessibility', () => {
    render(<StatusBadge status="ongoing" />)
    expect(screen.getByLabelText('Berlangsung')).toBeInTheDocument()
  })
})
