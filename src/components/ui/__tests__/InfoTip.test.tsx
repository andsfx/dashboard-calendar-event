import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { InfoTip } from '../InfoTip';

const LABEL = 'Penjelasan uji';
const CONTENT = 'Alur: tinjau isian, lalu Setujui atau Tolak.';

function renderTip() {
  render(<InfoTip label={LABEL} content={CONTENT} />);
  return screen.getByRole('button', { name: LABEL });
}

describe('InfoTip', () => {
  it('membuka gelembung saat pemicu menerima fokus keyboard', async () => {
    const user = userEvent.setup();
    const trigger = renderTip();

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    await user.tab();

    expect(trigger).toHaveFocus();
    expect(screen.getByRole('tooltip')).toHaveTextContent(CONTENT);
  });

  it('menutup gelembung saat Escape ditekan', async () => {
    const user = userEvent.setup();
    renderTip();

    await user.tab();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('toggle saat pemicu diklik', async () => {
    const user = userEvent.setup();
    const trigger = renderTip();

    await user.click(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('membuka setelah hover dan menutup saat pointer keluar', async () => {
    const user = userEvent.setup();
    const trigger = renderTip();

    await user.hover(trigger);
    await waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument());

    await user.unhover(trigger);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());
  });

  it('memasang aria-describedby hanya selama gelembung terbuka', async () => {
    const user = userEvent.setup();
    const trigger = renderTip();

    expect(trigger).not.toHaveAttribute('aria-describedby');

    await user.click(trigger);
    const tip = screen.getByRole('tooltip');
    expect(tip.id).not.toBe('');
    expect(trigger).toHaveAttribute('aria-describedby', tip.id);

    await user.keyboard('{Escape}');
    expect(trigger).not.toHaveAttribute('aria-describedby');
  });

  it('tidak menyumbang perhentian Tab dari gelembung', async () => {
    const user = userEvent.setup();
    renderTip();

    await user.tab();
    const tip = screen.getByRole('tooltip');

    expect(screen.getByRole('button', { name: LABEL })).toHaveFocus();
    expect(tip.querySelectorAll('a[href], button, input, select, textarea, iframe, [tabindex]')).toHaveLength(0);

    // Perhentian Tab berikutnya meninggalkan pemicu (blur menutup tip), bukan
    // masuk ke gelembung.
    await user.tab();
    expect(document.activeElement).toBe(document.body);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('menutup saat pointer di luar pemicu ditekan', async () => {
    const user = userEvent.setup();
    render(<>
      <InfoTip label={LABEL} content={CONTENT} />
      <button type="button">Tombol lain</button>
    </>);
    const trigger = screen.getByRole('button', { name: LABEL });

    await user.click(trigger);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tombol lain' }));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('hanya satu gelembung terbuka: fokus keyboard lalu hover pemicu lain', async () => {
    const user = userEvent.setup();
    render(<>
      <InfoTip label="Pemicu pertama" content="Isi pertama" />
      <InfoTip label="Pemicu kedua" content="Isi kedua" />
    </>);

    // Jalur fokus keyboard: tip pertama terbuka tanpa pointer pernah menyentuhnya.
    await user.tab();
    expect(screen.getByRole('tooltip')).toHaveTextContent('Isi pertama');

    // Hover pemicu kedua harus MENGAMBIL ALIH, bukan menumpuk. Tanpa
    // kepemilikan tunggal, tip pertama tetap terbuka (fokus masih di sana) dan
    // dua gelembung tampil bersamaan.
    await user.hover(screen.getByRole('button', { name: 'Pemicu kedua' }));

    // Hover punya tunda 100 ms: tunggu sampai kepemilikan berpindah.
    await waitFor(() => expect(screen.getByRole('tooltip')).toHaveTextContent('Isi kedua'));
    expect(screen.getAllByRole('tooltip')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Pemicu pertama' })).not.toHaveAttribute('aria-describedby');
  });

  it('menerima konten ReactNode, bukan hanya teks', async () => {
    const user = userEvent.setup();
    render(
      <InfoTip
        label={LABEL}
        content={(
          <ul className="space-y-1">
            <li>Menunggu: belum ditinjau.</li>
            <li>Disetujui: tampil di halaman event publik.</li>
          </ul>
        )}
      />,
    );

    await user.click(screen.getByRole('button', { name: LABEL }));

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('Menunggu: belum ditinjau.');
  });
});
