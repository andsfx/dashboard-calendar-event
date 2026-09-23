import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SearchBar } from '../SearchBar'

describe('SearchBar', () => {
  it('renders search input', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    expect(screen.getByLabelText('Cari acara')).toBeInTheDocument()
  })

  it('displays current value', () => {
    const onChange = vi.fn()
    render(<SearchBar value="test query" onChange={onChange} />)
    expect(screen.getByDisplayValue('test query')).toBeInTheDocument()
  })

  it('calls onChange when typing', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    const input = screen.getByLabelText('Cari acara')
    fireEvent.change(input, { target: { value: 'new search' } })
    expect(onChange).toHaveBeenCalledWith('new search')
  })

  it('shows clear button when value is not empty', () => {
    const onChange = vi.fn()
    render(<SearchBar value="test" onChange={onChange} />)
    expect(screen.getByLabelText('Hapus pencarian')).toBeInTheDocument()
  })

  it('hides clear button when value is empty', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} />)
    expect(screen.queryByLabelText('Hapus pencarian')).not.toBeInTheDocument()
  })

  it('clears value when clear button clicked', () => {
    const onChange = vi.fn()
    render(<SearchBar value="test" onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Hapus pencarian'))
    expect(onChange).toHaveBeenCalledWith('')
  })

  it('uses custom placeholder', () => {
    const onChange = vi.fn()
    render(<SearchBar value="" onChange={onChange} placeholder="Custom placeholder" />)
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument()
  })
})
