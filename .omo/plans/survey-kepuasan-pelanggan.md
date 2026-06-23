# Work Plan: Survey Kepuasan Pelanggan (Customer Satisfaction Survey)

## Overview
Fitur survey kepuasan pelanggan untuk Metropolitan Mall Bekasi dengan 2 tipe survey:
1. **Survey Penyelenggara** — feedback EO/penyelenggara terhadap pengelola mall
2. **Survey Publik** — feedback peserta/pengunjung terhadap pengelola mall + penyelenggara event

**Estimated Total Time**: 8-12 hours (4 phases)

---

## Requirements Summary

| Aspek | Detail |
|-------|--------|
| **Timing** | Otomatis setelah event selesai + manual oleh admin |
| **Akses** | Link/QR code unik per event + dari public dashboard (modal popup) |
| **Identitas** | Nama & kontak opsional |
| **Penyelenggara** | Self-claim (isi nama/organisasi) |
| **Rating format** | Skala 1-10 per aspek |
| **Template** | Fixed (sama untuk semua event) |
| **Duplikasi** | Soft limit 1x per device (blokir + pesan) |
| **Hasil publik** | Ringkasan rating tampil setelah min 1 response |
| **Hasil admin** | Full analytics + chart + export Excel/CSV |
| **QR Code** | Download dari admin dashboard + tampil di halaman event |
| **Volume** | 50-500 responses per event |

### Aspek Penilaian Mall (kedua survey):
1. Kebersihan & Fasilitas
2. Pelayanan Staff
3. Koordinasi & Komunikasi
4. Keamanan

### Aspek Penilaian Penyelenggara Event (survey publik saja):
1. Kualitas Acara
2. Organisasi & Kelancaran
3. Pelayanan Panitia
4. Kesesuaian Promosi
5. Rekomendasi / NPS

---

## Technical Constraints

- **Vercel Hobby plan**: 12 function limit, currently 10 used → **hanya 2 slot tersisa**
- **Strategy**: Gunakan 1 unified API endpoint `/api/survey.js` dengan `?action=` routing (sama seperti pattern `/api/auth.js`)
- **Database**: Supabase PostgreSQL + RLS
- **Frontend**: React 19 + TypeScript + Tailwind CSS v4
- **Migrations**: Via Supabase Management API atau manual SQL Editor

---

## Phase 1: Database Schema & Migration (1-2 hours)

### Task 1.1: Create Survey Tables

```sql
-- Tabel utama survey responses
CREATE TABLE survey_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL,                    -- referensi ke event
  survey_type TEXT NOT NULL CHECK (survey_type IN ('organizer', 'public')),
  
  -- Identitas responden (opsional)
  respondent_name TEXT,
  respondent_email TEXT,
  respondent_phone TEXT,
  respondent_organization TEXT,              -- untuk organizer survey
  
  -- Rating Mall (skala 1-10, kedua tipe survey)
  mall_cleanliness INTEGER CHECK (mall_cleanliness BETWEEN 1 AND 10),
  mall_staff_service INTEGER CHECK (mall_staff_service BETWEEN 1 AND 10),
  mall_coordination INTEGER CHECK (mall_coordination BETWEEN 1 AND 10),
  mall_security INTEGER CHECK (mall_security BETWEEN 1 AND 10),
  
  -- Rating Penyelenggara (skala 1-10, hanya survey publik)
  eo_event_quality INTEGER CHECK (eo_event_quality BETWEEN 1 AND 10),
  eo_organization INTEGER CHECK (eo_organization BETWEEN 1 AND 10),
  eo_committee_service INTEGER CHECK (eo_committee_service BETWEEN 1 AND 10),
  eo_promotion_accuracy INTEGER CHECK (eo_promotion_accuracy BETWEEN 1 AND 10),
  eo_recommendation INTEGER CHECK (eo_recommendation BETWEEN 1 AND 10),  -- NPS
  
  -- Komentar
  mall_comment TEXT,
  eo_comment TEXT,
  general_comment TEXT,
  
  -- Device fingerprint (soft limit duplikasi)
  device_fingerprint TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Index untuk query performa
CREATE INDEX idx_survey_event_id ON survey_responses(event_id);
CREATE INDEX idx_survey_type ON survey_responses(survey_type);
CREATE INDEX idx_survey_fingerprint ON survey_responses(device_fingerprint, event_id);
CREATE INDEX idx_survey_created_at ON survey_responses(created_at DESC);

-- Tabel konfigurasi survey per event (admin control)
CREATE TABLE survey_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,           -- admin bisa on/off
  auto_activate_after_event BOOLEAN DEFAULT true,
  activated_at TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_survey_config_event ON survey_config(event_id);
CREATE INDEX idx_survey_config_active ON survey_config(is_active);
```

### Task 1.2: RLS Policies

```sql
-- Survey responses: anyone can INSERT (anonymous survey), only admin can SELECT all
ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;

-- Public: bisa submit survey (INSERT)
CREATE POLICY "Anyone can submit survey"
  ON survey_responses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public: bisa baca aggregate (untuk rating publik) — via RPC function
-- Admin: bisa baca semua detail
CREATE POLICY "Admin can read all survey responses"
  ON survey_responses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Survey config: only admin can manage
ALTER TABLE survey_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage survey config"
  ON survey_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );
```

### Task 1.3: RPC Functions (untuk public aggregate — bypass RLS)

```sql
-- Fungsi untuk mendapatkan ringkasan rating publik per event
CREATE OR REPLACE FUNCTION get_survey_summary(p_event_id TEXT)
RETURNS JSON AS $$
  SELECT json_build_object(
    'event_id', p_event_id,
    'total_responses', COUNT(*),
    'organizer_responses', COUNT(*) FILTER (WHERE survey_type = 'organizer'),
    'public_responses', COUNT(*) FILTER (WHERE survey_type = 'public'),
    'mall_avg', json_build_object(
      'cleanliness', ROUND(AVG(mall_cleanliness)::numeric, 1),
      'staff_service', ROUND(AVG(mall_staff_service)::numeric, 1),
      'coordination', ROUND(AVG(mall_coordination)::numeric, 1),
      'security', ROUND(AVG(mall_security)::numeric, 1),
      'overall', ROUND(AVG((mall_cleanliness + mall_staff_service + mall_coordination + mall_security)::numeric / 4), 1)
    ),
    'eo_avg', json_build_object(
      'event_quality', ROUND(AVG(eo_event_quality) FILTER (WHERE survey_type = 'public')::numeric, 1),
      'organization', ROUND(AVG(eo_organization) FILTER (WHERE survey_type = 'public')::numeric, 1),
      'committee_service', ROUND(AVG(eo_committee_service) FILTER (WHERE survey_type = 'public')::numeric, 1),
      'promotion_accuracy', ROUND(AVG(eo_promotion_accuracy) FILTER (WHERE survey_type = 'public')::numeric, 1),
      'recommendation', ROUND(AVG(eo_recommendation) FILTER (WHERE survey_type = 'public')::numeric, 1),
      'overall', ROUND(AVG((
        COALESCE(eo_event_quality,0) + COALESCE(eo_organization,0) + 
        COALESCE(eo_committee_service,0) + COALESCE(eo_promotion_accuracy,0) + 
        COALESCE(eo_recommendation,0)
      )::numeric / 5) FILTER (WHERE survey_type = 'public'), 1)
    )
  )
  FROM survey_responses
  WHERE event_id = p_event_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Fungsi untuk cek apakah device sudah submit survey
CREATE OR REPLACE FUNCTION check_survey_submitted(p_event_id TEXT, p_fingerprint TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM survey_responses
    WHERE event_id = p_event_id
    AND device_fingerprint = p_fingerprint
  );
$$ LANGUAGE sql SECURITY DEFINER;
```

**Deliverables**:
- `migrate/survey-schema.sql` — tables, indexes, RLS, RPC functions
- Idempotent (safe to run multiple times)

---

## Phase 2: API Endpoint & TypeScript Types (1-2 hours)

### Task 2.1: TypeScript Types (`src/types.ts`)

```typescript
// Survey types
export type SurveyType = 'organizer' | 'public';

export interface SurveyResponse {
  id: string;
  event_id: string;
  survey_type: SurveyType;
  respondent_name?: string;
  respondent_email?: string;
  respondent_phone?: string;
  respondent_organization?: string;
  // Mall ratings (1-10)
  mall_cleanliness: number;
  mall_staff_service: number;
  mall_coordination: number;
  mall_security: number;
  mall_comment?: string;
  // EO ratings (1-10, public survey only)
  eo_event_quality?: number;
  eo_organization?: number;
  eo_committee_service?: number;
  eo_promotion_accuracy?: number;
  eo_recommendation?: number;
  eo_comment?: string;
  general_comment?: string;
  device_fingerprint?: string;
  created_at: string;
}

export interface SurveySummary {
  event_id: string;
  total_responses: number;
  organizer_responses: number;
  public_responses: number;
  mall_avg: {
    cleanliness: number;
    staff_service: number;
    coordination: number;
    security: number;
    overall: number;
  };
  eo_avg: {
    event_quality: number;
    organization: number;
    committee_service: number;
    promotion_accuracy: number;
    recommendation: number;
    overall: number;
  };
}

export interface SurveyConfig {
  id: string;
  event_id: string;
  is_active: boolean;
  auto_activate_after_event: boolean;
  activated_at?: string;
  deactivated_at?: string;
}
```

### Task 2.2: Unified API Endpoint (`api/survey.js`)

**1 serverless function** dengan routing via `?action=`:

| Action | Method | Auth | Description |
|--------|--------|------|-------------|
| `submit` | POST | Public | Submit survey response |
| `check` | GET | Public | Check if device already submitted |
| `summary` | GET | Public | Get aggregate ratings for event |
| `responses` | GET | Admin | Get all responses for event (paginated) |
| `config` | GET/POST/PUT | Admin | Manage survey config per event |
| `export` | GET | Admin | Export responses as CSV |
| `stats` | GET | Admin | Get overall survey analytics |

**Ini hanya menggunakan 1 slot dari 2 yang tersisa** → masih ada 1 slot cadangan.

### Task 2.3: Device Fingerprint Utility

Lightweight fingerprint menggunakan:
- Canvas fingerprint
- Screen resolution
- Timezone
- Language
- Platform

Disimpan di `localStorage` + dikirim ke server saat submit.

**Deliverables**:
- Updated `src/types.ts` with survey types
- `api/survey.js` — unified endpoint
- `src/utils/fingerprint.ts` — device fingerprint generator

---

## Phase 3: Frontend Components (4-6 hours)

### Task 3.1: Survey Form Page (`src/components/survey/SurveyPage.tsx`)

**Route**: `/survey/:eventId?type=organizer|public`

Komponen utama:
- **SurveyPage** — wrapper, load event info, check fingerprint
- **SurveyHeader** — info event (nama, tanggal, lokasi, EO)
- **SurveyTypeSelector** — pilih "Saya Penyelenggara" atau "Saya Peserta/Pengunjung"
- **RatingSlider** — komponen rating 1-10 per aspek (reusable)
- **SurveyMallSection** — 4 aspek penilaian mall
- **SurveyEOSection** — 5 aspek penilaian EO (hanya untuk publik)
- **SurveyIdentitySection** — nama, email, phone, organisasi (opsional)
- **SurveySuccess** — halaman terima kasih + ringkasan rating

**UX Flow**:
1. Buka link → load event info
2. Pilih tipe (penyelenggara / peserta)
3. Isi rating mall (wajib)
4. Isi rating EO (wajib untuk peserta, hidden untuk penyelenggara)
5. Komentar (opsional)
6. Identitas (opsional)
7. Submit → halaman terima kasih

**Duplikasi handling**:
- Saat load page, cek fingerprint via `check_survey_submitted` RPC
- Jika sudah pernah isi → tampilkan pesan "Anda sudah mengisi survey untuk event ini" + ringkasan rating

### Task 3.2: Survey Modal Popup (`src/components/survey/SurveyPopup.tsx`)

- Muncul otomatis di public dashboard saat event sudah selesai
- Dismissible (bisa ditutup)
- Simpan di localStorage event mana yang sudah di-dismiss
- Tampilkan hanya 1x per session per event
- CTA: "Isi Survey Sekarang" → buka SurveyPage

### Task 3.3: QR Code Generator (`src/components/survey/SurveyQRCode.tsx`)

- Generate QR code dari survey URL
- Admin bisa download sebagai PNG
- Tampil di halaman detail event publik (setelah event selesai)
- Library: `qrcode` (lightweight, ~15KB)

### Task 3.4: Public Rating Display (`src/components/survey/EventRatingSummary.tsx`)

- Tampil di halaman event publik (setelah ada min 1 response)
- Compact card: overall rating + jumlah responses
- Expandable: detail per aspek
- Warna: hijau (8-10), kuning (5-7), merah (1-4)

### Task 3.5: Admin Survey Dashboard (`src/components/survey/SurveyDashboard.tsx`)

Komponen admin:
- **SurveyDashboard** — overview semua event yang punya survey
- **SurveyEventDetail** — detail responses per event
- **SurveyAnalytics** — chart/grafik (bar chart per aspek, trend over time, NPS gauge)
- **SurveyConfigPanel** — on/off survey per event, auto-activate toggle
- **SurveyExport** — tombol export CSV/Excel

**Charts** (menggunakan library ringan atau custom SVG):
- Bar chart: rata-rata per aspek
- Pie chart: distribusi rating (1-4, 5-7, 8-10)
- NPS gauge: promoter vs detractor
- Trend: rating over time (jika ada multiple events)

### Task 3.6: Admin Sidebar Integration

Tambahkan menu "Survey" di AdminSidebar.tsx:
- Group: "Engagement" (bersama Community Registrations)
- Icon: `ClipboardCheck` atau `MessageSquareHeart`
- Badge: jumlah survey responses baru

**Deliverables**:
- 8-10 new components in `src/components/survey/`
- Survey page accessible via URL routing
- Modal popup integration in public dashboard
- QR code generation + download
- Admin dashboard with analytics

---

## Phase 4: Integration & Polish (1-2 hours)

### Task 4.1: URL Routing

- `/survey/:eventId` → SurveyPage (public, standalone)
- `/survey/:eventId?type=organizer` → pre-select organizer type
- `/survey/:eventId?type=public` → pre-select public type

### Task 4.2: Event Detail Integration

- Tambahkan tombol "Isi Survey" di event detail modal (jika event sudah selesai)
- Tambahkan rating summary di event detail modal
- Tambahkan QR code di event detail (admin view)

### Task 4.3: Public Dashboard Integration

- Survey popup modal untuk event yang baru selesai
- Rating badge di event cards (jika ada responses)

### Task 4.4: Admin Dashboard Integration

- Survey section di admin sidebar
- Quick stats di admin overview (total responses, avg rating)
- Survey config accessible dari event management

### Task 4.5: Export Functionality

- CSV export: semua kolom, filtered by date range
- Client-side generation (tidak perlu serverless function tambahan)
- Filename: `survey-{eventName}-{date}.csv`

**Deliverables**:
- Full integration with existing app
- Export working
- All flows tested

---

## Execution Order

```
Phase 1: Database Schema & Migration
  ↓ (migration harus jalan dulu)
Phase 2: API Endpoint & Types
  ↓ (backend ready)
Phase 3: Frontend Components (bisa parallel sub-tasks)
  ├── 3.1 Survey Form Page
  ├── 3.2 Survey Popup
  ├── 3.3 QR Code Generator
  ├── 3.4 Public Rating Display
  ├── 3.5 Admin Survey Dashboard
  └── 3.6 Sidebar Integration
  ↓
Phase 4: Integration & Polish
```

## API Function Budget

| Current (10/12) | After Survey (11/12) |
|-----------------|---------------------|
| auth.js | auth.js |
| admin-login.js | admin-login.js |
| admin-logout.js | admin-logout.js |
| apps-script-admin.js | apps-script-admin.js |
| apps-script-public.js | apps-script-public.js |
| auth-seed.js | auth-seed.js |
| community-registration.js | community-registration.js |
| r2-delete.js | r2-delete.js |
| r2-upload.js | r2-upload.js |
| supabase-admin.js | supabase-admin.js |
| | **survey.js** ← NEW |
| **10 functions** | **11 functions** (1 slot cadangan) |

## Dependencies (npm packages baru)

| Package | Size | Purpose |
|---------|------|---------|
| `qrcode` | ~15KB | QR code generation |

Tidak perlu chart library berat — gunakan custom SVG bars atau CSS-based charts untuk analytics.

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Vercel function limit | 1 unified endpoint, client-side export |
| Spam submissions | Device fingerprint + rate limiting di API |
| Large export data | Client-side CSV generation, paginated fetch |
| Anonymous RLS | Supabase RPC functions (SECURITY DEFINER) bypass RLS |
| Migration failure | Idempotent SQL, clear ordering |

## Success Metrics

| Metric | Target |
|--------|--------|
| Survey form load time | < 2s |
| Submit response time | < 1s |
| Admin dashboard load | < 3s |
| Export 500 responses | < 5s (client-side) |
| QR code generation | < 500ms |
| Mobile responsive | 100% |
