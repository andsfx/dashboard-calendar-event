import { describe, expect, it } from 'vitest';

import { buildOriginMatcher } from '../corsOrigin.js';

// Whitelist produksi 2026-10-16 (lihat deploy/vps/README-DEPLOY.md §3).
const PROD = [
  'https://www.metmalcommunityspace.web.id',
  'https://metmalcommunityspace.web.id',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://localhost:5198',
  'https://metmal-community-*-andy-safiis-projects.vercel.app',
].join(',');

describe('buildOriginMatcher — origin produksi', () => {
  const allowed = buildOriginMatcher(PROD);

  it('meloloskan request tanpa Origin (same-origin, curl, healthcheck docker)', () => {
    // Compose healthcheck menembak /api/v1/events tanpa Origin — regresi di sini
    // membuat container api sehat-terlihat-sakit.
    expect(allowed(undefined)).toBe(true);
    expect(allowed('')).toBe(true);
  });

  it('mencocokkan entri daftar secara persis', () => {
    expect(allowed('https://www.metmalcommunityspace.web.id')).toBe(true);
    expect(allowed('https://metmalcommunityspace.web.id')).toBe(true);
    expect(allowed('http://localhost:5173')).toBe(true);
    expect(allowed('http://127.0.0.1:5173')).toBe(true);
    // `localhost` dan `127.0.0.1` adalah origin BERBEDA bagi browser.
    expect(allowed('http://localhost:5173.evil.com')).toBe(false);
    expect(allowed('http://localhost:51730')).toBe(false);
  });

  it('mencocokkan pola glob beranchor untuk hostname deployment Vercel', () => {
    expect(allowed('https://metmal-community-h2ba13egn-andy-safiis-projects.vercel.app')).toBe(true);
    expect(allowed('https://metmal-community-main-andy-safiis-projects.vercel.app')).toBe(true);
  });

  it('menolak host yang hanya mirip dengan pola', () => {
    // Tanpa slug tim: project `vercel.app` milik akun lain.
    expect(allowed('https://metmal-community-evil.vercel.app')).toBe(false);
    // Slug tim dipakai sebagai awalan domain asing / tanpa prefix project.
    expect(allowed('https://metmal-community-x-andy-safiis-projects.vercel.app.evil.com')).toBe(false);
    expect(allowed('https://evil-andy-safiis-projects.vercel.app')).toBe(false);
    expect(allowed('https://xmetmal-community-x-andy-safiis-projects.vercel.app')).toBe(false);
    expect(allowed('https://evil.example.com')).toBe(false);
  });

  it('menerima lebih dari satu pola dan entri eksak bercampur', () => {
    const mixed = buildOriginMatcher('https://a.example.com,https://*-slug.vercel.app,http://localhost:3000');
    expect(mixed('https://a.example.com')).toBe(true);
    expect(mixed('https://pr-7-slug.vercel.app')).toBe(true);
    expect(mixed('http://localhost:3000')).toBe(true);
    expect(mixed('https://b.example.com')).toBe(false);
  });
});

describe('buildOriginMatcher — tanpa konfigurasi', () => {
  it('default-deny untuk request lintas-origin ber-browser', () => {
    const empty = buildOriginMatcher('');
    const blank = buildOriginMatcher('   ,  ,');

    expect(empty('https://www.metmalcommunityspace.web.id')).toBe(false);
    expect(blank('https://www.metmalcommunityspace.web.id')).toBe(false);
    // Tanpa Origin tetap lolos supaya nginx/curl/healthcheck tidak ikut kena.
    expect(empty(undefined)).toBe(true);
  });
});
