import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DraftProgressBadge } from '../DraftProgressBadge'

describe('DraftProgressBadge', () => {
  it('renders draft progress', () => {
    render(<DraftProgressBadge progress="draft" />)
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('renders confirm progress', () => {
    render(<DraftProgressBadge progress="confirm" />)
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })

  it('renders cancel progress', () => {
    render(<DraftProgressBadge progress="cancel" />)
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })
})
