import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CategoryBadges } from '../CategoryBadges'

describe('CategoryBadges', () => {
  it('renders multiple category badges', () => {
    render(<CategoryBadges categories={['Bazaar', 'Festival', 'Workshop']} />)
    expect(screen.getByText('Bazaar')).toBeInTheDocument()
    expect(screen.getByText('Festival')).toBeInTheDocument()
    expect(screen.getByText('Workshop')).toBeInTheDocument()
  })

  it('renders nothing when categories array is empty', () => {
    const { container } = render(<CategoryBadges categories={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('limits display to maxVisible prop', () => {
    render(<CategoryBadges categories={['A', 'B', 'C', 'D']} maxVisible={2} />)
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('+2')).toBeInTheDocument()
  })
})
