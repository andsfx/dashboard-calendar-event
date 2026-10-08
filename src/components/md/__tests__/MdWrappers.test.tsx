import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useState } from 'react';
import { MdTextField } from '../MdTextField';
import { MdSelect } from '../MdSelect';
import { MdButton } from '../MdButton';
import { MdCheckbox } from '../MdCheckbox';
import { MdSwitch } from '../MdSwitch';
import { MdDialog } from '../MdDialog';

function Controlled() {
  const [value, setValue] = useState('awal');
  return <MdTextField value={value} onChange={setValue} label="Nama" />;
}

describe('md wrapper mocks', () => {
  it('MdTextField: label terpasang, input meneruskan perubahan', () => {
    const onChange = vi.fn();
    render(<MdTextField value="awal" onChange={onChange} label="Nama Acara" />);
    const input = screen.getByLabelText('Nama Acara');
    expect(input).toHaveValue('awal');
    fireEvent.input(input, { target: { value: 'baru' } });
    expect(onChange).toHaveBeenCalledWith('baru');
  });

  it('MdTextField: mengetik tidak mereset nilai (controlled)', () => {
    render(<Controlled />);
    const input = screen.getByLabelText('Nama');
    fireEvent.input(input, { target: { value: 'awal2' } });
    expect(input).toHaveValue('awal2');
  });

  it('MdTextField: error text tampil saat error', () => {
    render(<MdTextField value="" onChange={() => {}} label="Nominal" error errorText="Nominal wajib diisi" />);
    expect(screen.getByText('Nominal wajib diisi')).toBeInTheDocument();
  });

  it('MdSelect: opsi dirender dan change diteruskan', () => {
    const onChange = vi.fn();
    render(
      <MdSelect
        value=""
        onChange={onChange}
        label="Model Event"
        options={[
          { value: '', label: 'Pilih model' },
          { value: 'bayar', label: 'Bayar' },
        ]}
      />,
    );
    const select = screen.getByLabelText('Model Event');
    fireEvent.change(select, { target: { value: 'bayar' } });
    expect(onChange).toHaveBeenCalledWith('bayar');
  });

  it('MdButton: klik diteruskan, disabled memblokir', () => {
    const onClick = vi.fn();
    const { rerender } = render(<MdButton onClick={onClick}>Simpan</MdButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(<MdButton onClick={onClick} disabled>Simpan</MdButton>);
    fireEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('MdCheckbox & MdSwitch: state dan change', () => {
    const onCheck = vi.fn();
    const onSwitch = vi.fn();
    render(
      <>
        <MdCheckbox checked={false} onChange={onCheck} ariaLabel="Setuju" />
        <MdSwitch selected={false} onChange={onSwitch} ariaLabel="Tampilkan di halaman publik" />
      </>,
    );
    fireEvent.click(screen.getByLabelText('Setuju'));
    expect(onCheck).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole('switch', { name: 'Tampilkan di halaman publik' }));
    expect(onSwitch).toHaveBeenCalledWith(true);
  });

  it('MdDialog: hanya menutup sekali dan hanya dialog teratas yang menangkap Escape', async () => {
    const onOuterClose = vi.fn();
    const onInnerClose = vi.fn();
    render(
      <>
        <MdDialog open onClose={onOuterClose} ariaLabel="Luar">
          <p>Isi luar</p>
        </MdDialog>
        <MdDialog open onClose={onInnerClose} ariaLabel="Dalam">
          <p>Isi dalam</p>
        </MdDialog>
      </>,
    );
    expect(screen.getByText('Isi luar')).toBeVisible();
    fireEvent.keyDown(document, { key: 'Escape' });
    await vi.waitFor(() => expect(onInnerClose).toHaveBeenCalledTimes(1));
    expect(onOuterClose).not.toHaveBeenCalled();
  });
});
