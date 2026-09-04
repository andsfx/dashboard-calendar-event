import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityRegistrationForm } from '../CommunityRegistrationForm'
import * as supabaseApi from '../../../utils/supabaseApi'

vi.mock('../../../utils/supabaseApi', () => ({
  submitCommunityRegistration: vi.fn(),
  uploadRegistrationAttachment: vi.fn(),
}))

describe('CommunityRegistrationForm', () => {
  it('renders form heading', () => {
    render(<CommunityRegistrationForm />)
    expect(screen.getByText('Daftarkan Komunitas Kamu')).toBeInTheDocument()
  })

  function clickCommunityType() {
    // Step 1: click community type button
    fireEvent.click(screen.getByText('Komunitas'))
  }

  it('renders all required form fields after type selection', () => {
    render(<CommunityRegistrationForm />)
    clickCommunityType()
    expect(screen.getByLabelText(/Nama Komunitas/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nama PIC/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nomor WhatsApp/)).toBeInTheDocument()
  })

  it('renders form with required fields', () => {
    render(<CommunityRegistrationForm />)
    expect(screen.getByText('Daftarkan Komunitas Kamu')).toBeInTheDocument()
    expect(screen.getByText('Kirim Pendaftaran')).toBeInTheDocument()
  })

  it('submits form successfully', async () => {
    vi.mocked(supabaseApi.submitCommunityRegistration).mockResolvedValue({ id: '1' })
    render(<CommunityRegistrationForm />)
    clickCommunityType()

    // Wait for form fields to render
    const nameInput = await screen.findByLabelText(/Nama Komunitas/)
    fireEvent.change(nameInput, { target: { value: 'Test Community' } })
    fireEvent.change(screen.getByLabelText(/Nama PIC/), { target: { value: 'John Doe' } })
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/), { target: { value: '08123456789' } })

    fireEvent.submit(screen.getByText('Kirim Pendaftaran').closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Pendaftaran Terkirim!')).toBeInTheDocument()
    })
  })

  it('shows error on submission failure', async () => {
    vi.mocked(supabaseApi.submitCommunityRegistration).mockRejectedValue(new Error('Network error'))
    render(<CommunityRegistrationForm />)
    clickCommunityType()

    const nameInput = await screen.findByLabelText(/Nama Komunitas/)
    fireEvent.change(nameInput, { target: { value: 'Test' } })
    fireEvent.change(screen.getByLabelText(/Nama PIC/), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/), { target: { value: '08123456789' } })

    fireEvent.submit(screen.getByText('Kirim Pendaftaran').closest('form')!)

    await waitFor(() => {
      expect(screen.getByText(/Gagal mengirim pendaftaran/)).toBeInTheDocument()
    })
  })
})
