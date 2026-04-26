import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CategoryBadge } from '../CategoryBadge'

describe('CategoryBadge', () => {
  it('renders category name', () => {
    render(<CategoryBadge category="Bazaar" />)
    expect(screen.getByText('Bazaar')).toBeInTheDocument()
  })

  it('applies background color from category colors', () => {
    const { container } = render(<CategoryBadge category="Festival" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveStyle({ backgroundColor: expect.any(String) })
  })

  it('uses dark text for light background categories', () => {
    const { container } = render(<CategoryBadge category="Festival" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('text-slate-900')
  })

  it('uses white text for dark background categories', () => {
    const { container } = render(<CategoryBadge category="Bazaar" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('text-white')
  })

  it('handles unknown categories with default color', () => {
    render(<CategoryBadge category="Unknown Category" />)
    expect(screen.getByText('Unknown Category')).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    const { container } = render(<CategoryBadge category="Workshop" />)
    const badge = container.querySelector('span')
    expect(badge).toHaveClass('inline-flex', 'items-center', 'rounded-md')
  })
})
