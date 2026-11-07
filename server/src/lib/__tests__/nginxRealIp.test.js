/**
 * Kontrak nginx.conf — real_ip_header WAJIB membaca X-Real-IP (kiriman
 * Caddy yang sudah dimurnikan dari Cloudflare), BUKAN X-Forwarded-For.
 *
 * Regresi 2026-11-07: `real_ip_header X-Forwarded-For` dengan daftar trusted
 * [loopback, 172.19.0.1] membuat $remote_addr = IP edge Cloudflare yang
 * berotasi (~178 unik), sehingga rate-limit per-IP di backend (rateLimit.js)
 * terpecah jadi banyak bucket — satu penyerang lolos throttle brute-force,
 * DAN pengunjung sah dari edge yang sama berbagi satu bucket (429 acak).
 *
 * Test ini gagal lebih dulu bila seseorang mengembalikan header ke XFF.
 *
 * @vitest-environment node
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONF = resolve(__dirname, '../../../../deploy/vps/nginx.conf');
const conf = readFileSync(CONF, 'utf8');

describe('nginx.conf — real_ip_header harus membaca X-Real-IP dari Caddy', () => {
  it('memakai real_ip_header X-Real-IP, bukan X-Forwarded-For', () => {
    expect(conf).toMatch(/^\s*real_ip_header\s+X-Real-IP\s*;/m);
    expect(conf).not.toMatch(/^\s*real_ip_header\s+X-Forwarded-For\s*;/m);
  });

  it('tetap membatasi trust ke loopback + gateway compose saja', () => {
    // Caddy adalah satu-satunya hop yang meneruskan header X-Real-IP yang
    // sudah murni; memperluas trust (mis. 172.16/12) akan membuka spoof.
    expect(conf).toMatch(/set_real_ip_from\s+127\.0\.0\.1\/32/);
    expect(conf).toMatch(/set_real_ip_from\s+172\.19\.0\.1\/32/);
    expect(conf).not.toMatch(/set_real_ip_from\s+172\.16\/12/);
  });
});