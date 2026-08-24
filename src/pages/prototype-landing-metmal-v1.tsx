import { useState, useEffect } from 'react';
import './prototype-landing-metmal-v1.css';

// PROTOTYPE state — surface it on page so user sees what's loaded
const STATES = {
  audience: 'EO eksternal',
  tone: 'Editorial premium',
  macrostructure: 'Long Document',
  theme: 'Atelier',
};

const BENEFITS = [
  {
    icon: '◇',
    title: 'Foot traffic 4.2M / tahun',
    body: 'Tenant Metmal rata-rata 350K kunjungan per bulan — lewat event, brand Anda expose ke audience urban Bekasi yang high-intent.',
  },
  {
    icon: '◯',
    title: 'Slot bulanan terstruktur',
    body: 'Atrium,广场, dan area event Metmal punya kalender publik. Pilih slot yang sesuai campaign window Anda.',
  },
  {
    icon: '△',
    title: 'Marketing bundle',
    body: 'Proposal termasuk social posting + signage area + email blast ke database 120K member Metmal.',
  },
  {
    icon: '◻',
    title: 'Review 5 hari kerja',
    body: 'Staff Metmal review proposal dalam 5 hari kerja. Status berubah: pending → contacted → agreed → declined.',
  },
];

const UPCOMING = [
  { date: '12 Mar', title: 'Pameran UMKM Bekasi', type: 'event' },
  { date: '18 Mar', title: 'Cosplay Competition Spring', type: 'event' },
  { date: '25 Mar', title: 'Job Fair Metmal × Disnaker', type: 'event' },
  { date: '02 Apr', title: 'Food Bazaar Ramadan', type: 'event' },
  { date: '15 Apr', title: 'Stand-up Comedy Night', type: 'event' },
];

export default function PrototypeLandingMetmalV1() {
  const [tab, setTab] = useState<'event' | 'sponsor' | 'community'>('event');
  const [heroVisible, setHeroVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setHeroVisible(true), 400);
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const renderContent = () => {
    switch (tab) {
      case 'event':
        return (
          <section className="tab-content">
            <div className="form-stack">
              <label className="form-field">
                <span>Nama Event</span>
                <input type="text" placeholder="cth: Pameran UMKM Bekasi" />
              </label>
              <label className="form-field">
                <span>Kategori</span>
                <select>
                  <option>— pilih kategori —</option>
                  <option>UMKM / Bazaar</option>
                  <option>Pertunjukan</option>
                  <option>Komunitas</option>
                  <option>Seni &amp; Budaya</option>
                </select>
              </label>
              <label className="form-field">
                <span>Estimasi tanggal</span>
                <input type="date" />
              </label>
              <label className="form-field">
                <span>Ringkasan proposal</span>
                <textarea rows={4} placeholder="2–3 kalimat tentang event Anda…" />
              </label>
              <button
                className="primary-cta"
                onClick={() => window.alert('Event proposal submitted (prototype)')}
              >
                Kirim Event Proposal
              </button>
            </div>
          </section>
        );
      case 'sponsor':
        return (
          <section className="tab-content">
            <div className="benefits">
              {BENEFITS.map((b) => (
                <article key={b.title} className="benefit-card">
                  <div className="benefit-icon" aria-hidden="true">
                    {b.icon}
                  </div>
                  <h3>{b.title}</h3>
                  <p>{b.body}</p>
                </article>
              ))}
            </div>
            <p className="lead-paragraph">
              Tertarik support event Metmal? Pilih event di kalender publik, kirim Minat Support, dan tim
              kami akan menghubungi Anda dalam 5 hari kerja.
            </p>
            <button
              className="primary-cta"
              onClick={() => window.alert('Sponsor support submitted (prototype)')}
            >
              Lihat Event Tersedia
            </button>
          </section>
        );
      case 'community':
        return (
          <section className="tab-content">
            <p className="lead-paragraph">
              Komunitas Bekasi yang event-nya Metmal bisa jadi bagian kalender publik. Pendaftaran
              satu kali untuk akses recurring slot + dashboard komunitas.
            </p>
            <div className="form-stack">
              <label className="form-field">
                <span>Nama komunitas</span>
                <input type="text" placeholder="cth: Bekasi Cosplay Family" />
              </label>
              <label className="form-field">
                <span>Jabatan</span>
                <select>
                  <option>— pilih jabatan —</option>
                  <option>Ketua</option>
                  <option>Wakil Ketua</option>
                  <option>Sekretaris</option>
                  <option>Koordinator Event</option>
                </select>
              </label>
              <label className="form-field">
                <span>WhatsApp</span>
                <input type="tel" placeholder="+62 …" />
              </label>
              <button
                className="primary-cta"
                onClick={() => window.alert('Community registration (prototype)')}
              >
                Daftar Komunitas
              </button>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="prototype-landing-metmal-v1">
      {/* State badge — surfaced for the user */}
      <aside className="state-badge" aria-label="Prototype state">
        <div>
          <strong>macrostructure</strong>
          <span>{STATES.macrostructure}</span>
        </div>
        <div>
          <strong>theme</strong>
          <span>{STATES.theme}</span>
        </div>
        <div>
          <strong>audience</strong>
          <span>{STATES.audience}</span>
        </div>
        <div>
          <strong>tone</strong>
          <span>{STATES.tone}</span>
        </div>
        <div>
          <strong>scroll</strong>
          <span>{scrollY}px</span>
        </div>
      </aside>

      <header className={`hero ${heroVisible ? 'visible' : ''}`}>
        <div className="hero-content">
          <p className="eyebrow">Metropolitan Mall Bekasi · Q1–Q2 2026</p>
          <h1>
            Ruang publik,<br />
            diuji event.
          </h1>
          <p className="lede">
            Tiga auditorium, satu广场, dan kalender event yang telah terisi 78% sepanjang 2026. Daftarkan
            event Anda — atau jadilah sponsor-nya.
          </p>
          <div className="hero-actions">
            <button
              className="cta-light"
              onClick={() => setTab('event')}
            >
              Daftarkan event Anda
            </button>
            <button
              className="cta-outline-light"
              onClick={() => setTab('sponsor')}
            >
              Lihat slot sponsor
            </button>
          </div>
        </div>
      </header>

      {/* Stat strip — surface real numbers (placeholder labelled) */}
      <section className="stat-strip" aria-label="Statistik publik">
        <div className="stat">
          <strong>4.2M</strong>
          <span>kunjungan / tahun (placeholder — confirm dengan Data Analytics Metmal)</span>
        </div>
        <div className="stat">
          <strong>120K</strong>
          <span>member database (placeholder)</span>
        </div>
        <div className="stat">
          <strong>78%</strong>
          <span>slot Q2 terisi (placeholder)</span>
        </div>
      </section>

      {/* Upcoming events */}
      <section className="upcoming">
        <div className="upcoming-head">
          <h2>Event di kalender publik</h2>
          <p>Snapshot 5 event berikutnya. Data binding real ada di event_public table.</p>
        </div>
        <ul className="upcoming-list">
          {UPCOMING.map((e) => (
            <li key={e.date + e.title}>
              <span className="upcoming-date">{e.date}</span>
              <span className="upcoming-title">{e.title}</span>
              <span className="upcoming-meta">{e.type}</span>
            </li>
          ))}
        </ul>
      </section>

      <nav className="tabs" aria-label="Audience switcher">
        <button
          className={tab === 'event' ? 'active' : ''}
          onClick={() => setTab('event')}
        >
          Event Proposal
        </button>
        <button
          className={tab === 'sponsor' ? 'active' : ''}
          onClick={() => setTab('sponsor')}
        >
          Sponsor
        </button>
        <button
          className={tab === 'community' ? 'active' : ''}
          onClick={() => setTab('community')}
        >
          Komunitas
        </button>
      </nav>

      <main className="main-content">{renderContent()}</main>

      <footer className="footer">
        <div className="footer-grid">
          <div>
            <h4>Metropolitan Mall Bekasi</h4>
            <p>Jl. Ahmad Yani No.1, Bekasi Selatan &middot; Open daily 10.00–22.00</p>
          </div>
          <div>
            <h4>Kontak event</h4>
            <p>event@metmal-bekasi.co.id &middot; +62 21 889 0001</p>
          </div>
          <div>
            <h4>Untuk sponsor</h4>
            <p>sponsor@metmal-bekasi.co.id &middot; WhatsApp +62 812 0000 1234</p>
          </div>
        </div>
        <p className="copyright">&copy; 2026 Metropolitan Mall Bekasi &middot; All rights reserved</p>
      </footer>
    </div>
  );
}
