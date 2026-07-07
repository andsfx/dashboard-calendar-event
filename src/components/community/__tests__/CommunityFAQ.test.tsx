import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityFAQ } from '../CommunityFAQ'

describe('CommunityFAQ', () => {
  it('renders section heading', () => {
    render(<CommunityFAQ />)
    expect(screen.getByText('Pertanyaan yang sering muncul.')).toBeInTheDocument()
  })

  it('renders all FAQ questions', () => {
    render(<CommunityFAQ />)
    expect(screen.getByText(/Benar gratis/)).toBeInTheDocument()
    expect(screen.getByText(/Komunitas apa saja/)).toBeInTheDocument()
    expect(screen.getByText(/Berapa lama proses review/)).toBeInTheDocument()
  })

  it('first FAQ is open by default', () => {
    render(<CommunityFAQ />)
    expect(screen.getByText(/Benar 100% gratis\./)).toBeInTheDocument()
  })

  it('toggles FAQ answer on click', () => {
    render(<CommunityFAQ />)
    const secondQuestion = screen.getByText(/Komunitas apa saja/)
    fireEvent.click(secondQuestion)
    expect(screen.getByText(/Musik, dance, seni/)).toBeInTheDocument()
  })

  it('closes open FAQ when clicking another', () => {
    render(<CommunityFAQ />)
    const firstAnswer = screen.getByText(/Benar 100% gratis\./)
    expect(firstAnswer).toBeInTheDocument()
    const secondQuestion = screen.getByText(/Komunitas apa saja/)
    fireEvent.click(secondQuestion)
    expect(screen.queryByText(/Benar 100% gratis\./)).not.toBeInTheDocument()
  })
})
