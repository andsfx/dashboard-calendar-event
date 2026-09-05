import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EventFormBasicFields } from '../EventFormBasicFields'

describe('EventFormBasicFields', () => {
  const mockProps = {
    dateStr: '2024-01-15',
    dateEnd: undefined,
    editingId: undefined,
    areaId: '',
    areaOptions: [
      { id: 'era_1', name: 'Atrium Utama' },
      { id: 'era_2', name: 'Panggung Lt. 3' },
    ],
    conflictEvents: [],
    overrideAck: false,
    onOverrideAck: vi.fn(),
    onAreaChange: vi.fn(),
    jam: '10:00',
    acara: 'Test Event',
    lokasi: 'Main Hall',
    errors: {},
    jamSuggestions: ['10:00', '14:00', '18:00'],
    lokasiSuggestions: ['Main Hall', 'Atrium', 'Lantai 3'],
    jamPlaceholder: 'Contoh: 10:00 - 12:00',
    lokasiPlaceholder: 'Contoh: Atrium',
    onFieldChange: vi.fn(),
  }

  it('renders all form fields', () => {
    render(<EventFormBasicFields {...mockProps} />)
    expect(screen.getByText(/Tanggal/)).toBeInTheDocument()
    expect(screen.getByText('Jam')).toBeInTheDocument()
    expect(screen.getByText(/Nama Acara/)).toBeInTheDocument()
    expect(screen.getByText(/Lokasi/)).toBeInTheDocument()
  })

  it('displays field values', () => {
    render(<EventFormBasicFields {...mockProps} />)
    expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10:00')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Main Hall')).toBeInTheDocument()
  })

  it('calls onFieldChange when date changes', () => {
    const { container } = render(<EventFormBasicFields {...mockProps} />)
    const dateInput = container.querySelector('input[type="date"]')
    if (dateInput) {
      fireEvent.change(dateInput, { target: { value: '2024-02-01' } })
      expect(mockProps.onFieldChange).toHaveBeenCalledWith('dateStr', '2024-02-01')
    }
  })

  it('shows error messages', () => {
    const propsWithErrors = {
      ...mockProps,
      errors: { dateStr: 'Tanggal wajib diisi', acara: 'Nama acara wajib diisi' },
    }
    render(<EventFormBasicFields {...propsWithErrors} />)
    expect(screen.getByText('Tanggal wajib diisi')).toBeInTheDocument()
    expect(screen.getByText('Nama acara wajib diisi')).toBeInTheDocument()
  })

  it('renders draft mode labels', () => {
    render(<EventFormBasicFields {...mockProps} isDraft={true} />)
    expect(screen.getByText(/Nama Event/)).toBeInTheDocument()
  })

  it('memilih area memanggil onAreaChange dengan id dan nama', () => {
    render(<EventFormBasicFields {...mockProps} />)
    fireEvent.change(screen.getByLabelText(/Area \(opsional\)/), { target: { value: 'era_1' } })
    expect(mockProps.onAreaChange).toHaveBeenCalledWith('era_1', 'Atrium Utama')
  })

  it('konflik non-empty merender warning + checkbox override', () => {
    const propsWithConflict = {
      ...mockProps,
      areaId: 'era_1',
      conflictEvents: [{ id: 'evt_9', acara: 'Bazar Kuliner', dateStr: '2024-01-15', dateEnd: undefined }],
    }
    render(<EventFormBasicFields {...propsWithConflict} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/sudah dipakai 1 event/)
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })
})
