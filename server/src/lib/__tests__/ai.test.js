import { afterEach, describe, expect, it, vi } from 'vitest';

const INSIGHT = { severity: 'peringatan', title: 'Bentrok area', body: 'Dua event di Atrium.', metric: '2' };

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('buildNarrativeMessages', () => {
  it('memetakan fakta insight ke pesan system+user tanpa field asing', async () => {
    const { buildNarrativeMessages } = await import('../ai.js');
    const messages = buildNarrativeMessages([{ ...INSIGHT, rahasia: 'jangan ikut' }]);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');

    const payload = JSON.parse(messages[1].content);
    expect(payload.insight).toEqual([{ tingkat: 'peringatan', judul: 'Bentrok area', isi: 'Dua event di Atrium.', angka: '2' }]);
    expect(messages[1].content).not.toContain('jangan ikut');
  });

  it('membatasi jumlah insight ke 30 dan memotong isi panjang', async () => {
    const { buildNarrativeMessages } = await import('../ai.js');
    const many = Array.from({ length: 40 }, (_, i) => ({ severity: 'info', title: `I${i}`, body: 'x'.repeat(900) }));
    const payload = JSON.parse(buildNarrativeMessages(many)[1].content);
    expect(payload.insight).toHaveLength(30);
    expect(payload.insight[0].isi).toHaveLength(600);
  });
});

describe('generateInsightNarrative', () => {
  it('menolak dengan reason nonaktif bila env AI tidak diisi', async () => {
    vi.resetModules();
    const { generateInsightNarrative } = await import('../ai.js');
    const result = await generateInsightNarrative([INSIGHT]);
    expect(result).toEqual({ ok: false, reason: 'nonaktif' });
  });

  it('tetap nonaktif bila model tidak diisi (tanpa default diam-diam)', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://api.test/v1');
    vi.stubEnv('AI_API_KEY', 'rahasia');
    vi.resetModules();
    const { isAiEnabled } = await import('../ai.js');
    expect(isAiEnabled()).toBe(false);
  });

  it('menolak bila daftar insight kosong', async () => {
    const { generateInsightNarrative } = await import('../ai.js');
    expect(await generateInsightNarrative([])).toEqual({ ok: false, reason: 'kosong' });
  });

  it('mengembalikan ringkasan saat endpoint membalas 2xx, lalu memakai cache', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://api.test/v1');
    vi.stubEnv('AI_API_KEY', 'rahasia');
    vi.stubEnv('AI_MODEL', 'model-uji');
    vi.resetModules();
    const { generateInsightNarrative, isAiEnabled } = await import('../ai.js');
    expect(isAiEnabled()).toBe(true);

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ choices: [{ message: { content: '  Ringkas.  ' } }] }),
    });

    const first = await generateInsightNarrative([INSIGHT], { fetchImpl });
    expect(first).toEqual({ ok: true, summary: 'Ringkas.' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    // Regresi nyata: anggaran token terlalu kecil → content kosong dari model
    // reasoning. Jaga agar tidak diturunkan lagi.
    const requestBody = JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body));
    expect(requestBody.max_tokens).toBeGreaterThanOrEqual(1024);

    const second = await generateInsightNarrative([INSIGHT], { fetchImpl });
    expect(second).toEqual({ ok: true, summary: 'Ringkas.' });
    expect(fetchImpl).toHaveBeenCalledTimes(1); // cache — tidak memanggil ulang
  });

  it('gagal senyap (reason gagal) saat endpoint error, tanpa melempar', async () => {
    vi.stubEnv('AI_BASE_URL', 'https://api.test/v1');
    vi.stubEnv('AI_API_KEY', 'rahasia');
    vi.stubEnv('AI_MODEL', 'model-uji');
    vi.resetModules();
    const { generateInsightNarrative } = await import('../ai.js');

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: () => Promise.resolve('rate limited'),
    });

    const result = await generateInsightNarrative([{ ...INSIGHT, title: 'Beda agar tak kena cache' }], { fetchImpl });
    expect(result).toEqual({ ok: false, reason: 'gagal' });
  });
});