import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatCard } from '../StatCard'

describe('StatCard', () => {
  it('renders with label and value', () => {
    render(
      <StatCard
        label="Total Events"
        value={42}
        icon={<div>📅</div>}
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      />
    )
    
    expect(screen.getByText('Total Events')).toBeInTheDocument()
    // Value starts at 0 due to count-up animation
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('displays icon when provided', () => {
    render(
      <StatCard
        label="Active Users"
        value={100}
        icon={<div data-testid="stat-icon">👤</div>}
        gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
      />
    )
    
    expect(screen.getByTestId('stat-icon')).toBeInTheDocument()
  })

  it('renders subtitle when provided', () => {
    render(
      <StatCard
        label="Revenue"
        value={5000}
        subtitle="This month"
        icon={<div>💰</div>}
        gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
      />
    )
    
    expect(screen.getByText('This month')).toBeInTheDocument()
  })
})
