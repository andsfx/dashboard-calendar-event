import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { CommunityRegistrationForm } from '../CommunityRegistrationForm'
import * as domainApi from '../../../utils/domainApi'
import { ApiError } from '../../../lib/rest'

vi.mock('../../../utils/domainApi', () => ({
  submitCommunityRegistration: vi.fn(),
  uploadRegistrationAttachment: vi.fn(),
}))

describe('CommunityRegistrationForm', () => {
  it('renders form heading', () => {
    render(<CommunityRegistrationForm />)
    expect(screen.getByText('Daftarkan komunitas kamu')).toBeInTheDocument()
  })

  function clickCommunityType() {
    // Step 1: click community type button
    fireEvent.click(screen.getByText('Komunitas'))
  }

  /** Fills the required type-specific field ("Tipe Komunitas") for the community type. */
  async function fillCommunityType() {
    fireEvent.change(await screen.findByLabelText(/Tipe komunitas/), { target: { value: 'Musik' } })
  }

  it('renders all required form fields after type selection', () => {
    render(<CommunityRegistrationForm />)
    clickCommunityType()
    expect(screen.getByLabelText(/Nama komunitas/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nama PIC/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Nomor WhatsApp/)).toBeInTheDocument()
  })

  it('renders form with required fields', () => {
    render(<CommunityRegistrationForm />)
    expect(screen.getByText('Daftarkan komunitas kamu')).toBeInTheDocument()
    expect(screen.getByText('Kirim pendaftaran')).toBeInTheDocument()
  })

  it('does not submit when a required type-specific field is empty', async () => {
    // Regression: `noValidate` on the form plus a validator that never read
    // typeSpecificData let the request go out with community_type:"" while
    // "Tipe Komunitas *" sat empty in the UI.
    render(<CommunityRegistrationForm />)
    clickCommunityType()

    fireEvent.change(await screen.findByLabelText(/Nama komunitas/), { target: { value: 'Test Community' } })
    fireEvent.change(screen.getByLabelText(/Nama PIC/), { target: { value: 'John Doe' } })
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/), { target: { value: '08123456789' } })
    // "Tipe Komunitas" intentionally left empty.

    fireEvent.submit(screen.getByText('Kirim pendaftaran').closest('form')!)

    expect(await screen.findByText('Tipe komunitas wajib diisi.')).toBeInTheDocument()
    expect(domainApi.submitCommunityRegistration).not.toHaveBeenCalled()
    expect(screen.queryByText('Pendaftaran terkirim!')).not.toBeInTheDocument()
  })

  it('submits form successfully', async () => {
    vi.mocked(domainApi.submitCommunityRegistration).mockResolvedValue({ id: '1' })
    render(<CommunityRegistrationForm />)
    clickCommunityType()

    // Wait for form fields to render
    const nameInput = await screen.findByLabelText(/Nama komunitas/)
    fireEvent.change(nameInput, { target: { value: 'Test Community' } })
    await fillCommunityType()
    fireEvent.change(screen.getByLabelText(/Nama PIC/), { target: { value: 'John Doe' } })
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/), { target: { value: '08123456789' } })

    fireEvent.submit(screen.getByText('Kirim pendaftaran').closest('form')!)

    await waitFor(() => {
      expect(screen.getByText('Pendaftaran terkirim!')).toBeInTheDocument()
    })
  })

  it('shows a recovery message naming the problem on network failure', async () => {
    vi.mocked(domainApi.submitCommunityRegistration).mockRejectedValue(new Error('Network error'))
    render(<CommunityRegistrationForm />)
    clickCommunityType()

    const nameInput = await screen.findByLabelText(/Nama komunitas/)
    fireEvent.change(nameInput, { target: { value: 'Test' } })
    await fillCommunityType()
    fireEvent.change(screen.getByLabelText(/Nama PIC/), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/), { target: { value: '08123456789' } })

    fireEvent.submit(screen.getByText('Kirim pendaftaran').closest('form')!)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Koneksi terputus/)
    })
    // Retry affordance: the submit button stays usable and data is preserved.
    expect(screen.getByText('Kirim pendaftaran')).toBeEnabled()
    expect(screen.getByLabelText(/Nama komunitas/)).toHaveValue('Test')
  })

  it('names an already-submitted conflict instead of a generic failure', async () => {
    vi.mocked(domainApi.submitCommunityRegistration).mockRejectedValue(
      new ApiError('conflict', '409'),
    )
    render(<CommunityRegistrationForm />)
    clickCommunityType()

    fireEvent.change(await screen.findByLabelText(/Nama komunitas/), { target: { value: 'Test' } })
    await fillCommunityType()
    fireEvent.change(screen.getByLabelText(/Nama PIC/), { target: { value: 'John' } })
    fireEvent.change(screen.getByLabelText(/Nomor WhatsApp/), { target: { value: '08123456789' } })

    fireEvent.submit(screen.getByText('Kirim pendaftaran').closest('form')!)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/sudah terkirim/)
    })
  })
})
