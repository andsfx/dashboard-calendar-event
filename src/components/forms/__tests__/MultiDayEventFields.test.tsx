import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { MultiDayEventFields } from '../MultiDayEventFields'

describe('MultiDayEventFields', () => {
  const mockProps = {
    dateEnd: '2024-01-20',
    dayTimeSlots: [
      { date: '2024-01-15', jam: '10:00' },
      { date: '2024-01-16', jam: '14:00' },
    ],
    errors: {},
    jamSuggestions: ['10:00', '14:00', '18:00'],
    jamPlaceholder: 'Contoh: 10:00 - 12:00',
    onDateEndChange: vi.fn(),
    onDayTimeSlotChange: vi.fn(),
    onCopyFromPreviousDay: vi.fn(),
  }

  it('renders end date field', () => {
    render(<MultiDayEventFields {...mockProps} />)
    expect(screen.getByText(/Tanggal Selesai/)).toBeInTheDocument()
  })

  it('displays end date value', () => {
    render(<MultiDayEventFields {...mockProps} />)
    expect(screen.getByDisplayValue('2024-01-20')).toBeInTheDocument()
  })

  it('renders time slots for each day', () => {
    render(<MultiDayEventFields {...mockProps} />)
    expect(screen.getByText(/Hari 1:/)).toBeInTheDocument()
    expect(screen.getByText(/Hari 2:/)).toBeInTheDocument()
  })

  it('displays time values for each slot', () => {
    render(<MultiDayEventFields {...mockProps} />)
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('14:00')).toBeInTheDocument()
  })

  it('calls onDateEndChange when end date changes', () => {
    const { container } = render(<MultiDayEventFields {...mockProps} />)
    const dateInput = container.querySelector('input[type="date"]')
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: '2024-01-25' } })
      expect(mockProps.onDateEndChange).toHaveBeenCalledWith('2024-01-25')
    }
  })

  it('calls onDayTimeSlotChange when time changes', () => {
    render(<MultiDayEventFields {...mockProps} />)
    const timeInputs = screen.getAllByPlaceholderText(mockProps.jamPlaceholder)
    fireEvent.change(timeInputs[0], { target: { value: '11:00' } })
    expect(mockProps.onDayTimeSlotChange).toHaveBeenCalledWith(0, '11:00')
  })

  it('shows copy button for days after first', () => {
    render(<MultiDayEventFields {...mockProps} />)
    const copyButtons = screen.getAllByTitle('Salin dari hari sebelumnya')
    expect(copyButtons).toHaveLength(1) // Only for day 2
  })

  it('calls onCopyFromPreviousDay when copy button clicked', () => {
    render(<MultiDayEventFields {...mockProps} />)
    const copyButton = screen.getByTitle('Salin dari hari sebelumnya')
    fireEvent.click(copyButton)
    expect(mockProps.onCopyFromPreviousDay).toHaveBeenCalledWith(1)
  })

  it('shows error messages', () => {
    const propsWithErrors = {
      ...mockProps,
      errors: { dateEnd: 'Tanggal selesai wajib diisi' },
    }
    render(<MultiDayEventFields {...propsWithErrors} />)
    expect(screen.getByText('Tanggal selesai wajib diisi')).toBeInTheDocument()
  })
})
