import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityRegistrationForm } from '../CommunityRegistrationForm'
import * as supabaseApi from '../../../utils/supabaseApi'

vi.mock('../../../utils/supabaseApi', () => ({
  submitCommunityRegistration: vi.fn(),
}))

describe('CommunityRegistrationForm', () => {
  it('renders form heading', () => {
    render(<CommunityRegistrationForm />)
    expect(screen.getByText('Yuk, gabung!')).toBeInTheDocument()
  })

  it('renders all required form fields', () => {
    render(<CommunityRegistrationForm />)
    expect(screen.getByLabelText(/Nama Komunitas/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Tipe Komunitas/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nama PIC/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nomor WhatsApp/)).toBeInTheDocument()
  })

  it('renders form with required fields', () => {
    render(<CommunityRegistrationForm />)
    expect(screen.getByText('Yuk, gabung!')).toBeInTheDocument()
    expect(screen.getByText('Daftar Sekarang!')).toBeInTheDocument()
  })

  it('submits form successfully', async () => {
    vi.mocked(supabaseApi.submitCommunityRegistration).mockResolvedValue(undefined)
    
    render(<CommunityRegistrationForm />)
    
    fireEvent.change(screen.getByLabelText(/Nama Komunitas/), { target: { value: 'Test Community' } })
    fireEvent.change(screen.getByLabelText(/Tipe Komunitas/), { target: { value: 'Musik' } })
    fireEvent.change(screen.getByLabelText(/Nama PIC/), { target: { value: 'John Doe' } })
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/), { target: { value: '08123456789' } })
    
    fireEvent.click(screen.getByText('Daftar Sekarang!'))
    
    await waitFor(() => {
      expect(screen.getByText('Pendaftaran Terkirim!')).toBeInTheDocument()
    })
  })

  it('shows error on submission failure', async () => {
    vi.mocked(supabaseApi.submitCommunityRegistration).mockRejectedValue(new Error('Network error'))
    
    render(<CommunityRegistrationForm />)
    
    fireEvent.change(screen.getByLabelText(/Nama Komunitas/), { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText(/Tipe Komunitas/), { target: { value: 'Musik' } })
    fireEvent.change(screen.getByLabelText(/Nama PIC/), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/), { target: { value: '08123' } })
    
    fireEvent.click(screen.getByText('Daftar Sekarang!'))
    
    await waitFor(() => {
      expect(screen.getByText(/Gagal mengirim pendaftaran/)).toBeInTheDocument()
    })
  })
})
