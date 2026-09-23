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

  it('picks the higher-contrast ink for light background categories', () => {
    const { container } = render(<CategoryBadge category="Festival" />)
    const badge = container.querySelector('span') as HTMLElement
    expect(badge.style.color).toBe('rgb(10, 15, 12)')
  })

  it('picks the higher-contrast ink for dark background categories', () => {
    const { container } = render(<CategoryBadge category="Umum" />)
    const badge = container.querySelector('span') as HTMLElement
    expect(badge.style.color).toBe('rgb(255, 255, 255)')
  })

  it('never renders white text on a category whose contrast fails AA', () => {
    // Bazaar (#00918e) hanya 3.86:1 dengan putih — kontrak lama salah.
    const { container } = render(<CategoryBadge category="Bazaar" />)
    const badge = container.querySelector('span') as HTMLElement
    expect(badge.style.color).not.toBe('rgb(255, 255, 255)')
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
