/**
 * Klien narasi AI untuk panel Insight Cerdas (OpenAI-compatible chat completions).
 *
 * Kenapa opsional: seluruh insight tetap dihitung DETERMINISTIK di klien
 * (`src/utils/eventInsights.ts`) — daftar insight adalah sumber kebenaran.
 * Lapisan ini hanya menambah **satu paragraf ringkasan** dari fakta yang sudah
 * dihitung itu, jadi:
 *  - tidak ada data mentah (nama orang, telepon, email) yang dikirim keluar —
 *    hanya judul/isi/metrik insight yang memang sudah tampil di dashboard;
 *  - bila `AI_BASE_URL`/`AI_API_KEY` kosong atau panggilan gagal, panel tetap
 *    utuh (klien menyembunyikan blok ringkasan, bukan menampilkan error).
 *
 * Env (di `deploy/vps/.env`, JANGAN commit):
 *   AI_BASE_URL   mis. https://api.bansosai.app/v1
 *   AI_API_KEY    kunci rahasia (server-only; tidak pernah dikirim ke browser)
 *   AI_MODEL      id model yang tersedia di gateway Anda (WAJIB — tidak ada
 *                 default, karena default yang salah lebih buruk daripada mati)
 *   AI_TIMEOUT_MS default 30000 (model reasoning di gateway bisa 10–15 s)
 *   AI_CACHE_TTL_MS default 600000 (10 menit)
 */
import { createHash } from 'node:crypto';

const AI_BASE_URL = (process.env.AI_BASE_URL || '').replace(/\/+$/, '');
const AI_API_KEY = process.env.AI_API_KEY || '';
const AI_MODEL = process.env.AI_MODEL || '';
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS || 30_000);
const AI_CACHE_TTL_MS = Number(process.env.AI_CACHE_TTL_MS || 10 * 60 * 1000);

/**
 * Anggaran keluaran. Terukur di produksi: banyak model di gateway ini adalah
 * **reasoning** dan menghabiskan token untuk berpikir — dengan 320 token
 * `choices[0].message.content` kembali **kosong** meski `finish_reason: stop`,
 * sehingga ringkasan hilang tanpa error. 1500 memberi ruang cukup (terukur
 * ~480 karakter keluaran).
 */
const MAX_OUTPUT_TOKENS = 1500;

/** Batas aman payload ke model — zod sudah membatasi bentuk, ini sabuk kedua. */
const MAX_INSIGHTS = 30;
const MAX_TITLE = 200;
const MAX_BODY = 600;

/** Cache sederhana per-proses: kunci = hash fakta, nilai = { text, expiresAt }. */
const cache = new Map();

/** Apakah narasi AI dikonfigurasi? (tanpa ini, panel tetap deterministik) */
export function isAiEnabled() {
  return Boolean(AI_BASE_URL && AI_API_KEY && AI_MODEL);
}

/**
 * Susun pesan ke model. Murni & tanpa env supaya bisa diuji langsung.
 * Prompt sengaja ketat: hanya dari fakta, tanpa angka karangan, tanpa nama orang.
 */
export function buildNarrativeMessages(insights) {
  const facts = insights.slice(0, MAX_INSIGHTS).map((insight) => ({
    tingkat: insight.severity,
    judul: String(insight.title || '').slice(0, MAX_TITLE),
    isi: String(insight.body || '').slice(0, MAX_BODY),
    ...(insight.metric ? { angka: String(insight.metric).slice(0, 40) } : {}),
  }));

  return [
    {
      role: 'system',
      content: [
        'Kamu analis operasional event di sebuah pusat perbelanjaan di Indonesia.',
        'Tulis ringkasan 2–4 kalimat dalam Bahasa Indonesia yang mengalir.',
        'Aturan keras: gunakan HANYA fakta pada daftar insight yang diberikan;',
        'jangan mengarang angka, tanggal, atau nama; jangan menyebut nama orang;',
        'jangan mengulang seluruh daftar. Akhiri dengan satu prioritas tindakan paling mendesak.',
      ].join(' '),
    },
    { role: 'user', content: JSON.stringify({ insight: facts }) },
  ];
}

/**
 * Panggil endpoint chat completions. `fetchImpl` dapat di-inject untuk tes.
 * Melempar Error bila bukan 2xx atau bentuk respons tak terduga.
 */
export async function requestNarrative(messages, { fetchImpl = fetch, timeoutMs = AI_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.3, max_tokens: MAX_OUTPUT_TOKENS }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`AI HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (typeof text !== 'string' || !text.trim()) throw new Error('AI: respons kosong');
    return text.trim();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Hasil siap-parse untuk klien: { ok: true, summary } atau { ok: false, reason }.
 * Tidak pernah melempar — kegagalan model bukan kegagalan dashboard.
 */
export async function generateInsightNarrative(insights, { fetchImpl = fetch } = {}) {
  if (!Array.isArray(insights) || insights.length === 0) return { ok: false, reason: 'kosong' };
  if (!isAiEnabled()) return { ok: false, reason: 'nonaktif' };

  const messages = buildNarrativeMessages(insights);
  const cacheKey = createHash('sha1').update(JSON.stringify(messages)).digest('hex');
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return { ok: true, summary: cached.text };

  try {
    const summary = await requestNarrative(messages, { fetchImpl });
    cache.set(cacheKey, { text: summary, expiresAt: Date.now() + AI_CACHE_TTL_MS });
    return { ok: true, summary };
  } catch (err) {
    console.error('[ai/insight-narrative]', err?.message || err);
    return { ok: false, reason: 'gagal' };
  }
}