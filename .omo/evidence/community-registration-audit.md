# Community Registration Form - Audit Report

**Tanggal Audit**: 28 April 2026  
**Halaman**: `/` (Community Landing Page)  
**Komponen**: `CommunityRegistrationForm.tsx`

---

## Executive Summary

Community Registration Form telah diimplementasikan dengan multi-type organization support (8 tipe). Audit menemukan **beberapa gap kritis** dalam validasi data, keamanan, dan data integrity yang perlu segera diperbaiki.

**Status**: ⚠️ **NEEDS IMPROVEMENT**

---

## 1. VALIDASI DATA

### 1.1 Client-Side Validation

#### ✅ Yang Sudah Ada:
- Organization type selection (required)
- Organization name (required, trim check)
- PIC name (required, trim check)
- Phone number (required, trim check)
- Type-specific required fields (via `required` attribute)

#### ❌ CRITICAL ISSUES:

**A. Email Validation - TIDAK ADA**
```typescript
// File: CommunityRegistrationForm.tsx:200-201
<input id="reg-email" value={form.email} onChange={e => setField('email', e.target.value)} 
  placeholder="Email (opsional)" type="email" autoComplete="email" className={inputClass} />
```

**Problem**: 
- Hanya menggunakan HTML5 `type="email"` yang sangat lemah
- Tidak ada regex validation
- Tidak ada format check (bisa input: `a@b`, `test@`, `@domain.com`)

**Impact**: Invalid email masuk ke database → gagal komunikasi dengan user

**Recommendation**:
```typescript
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (form.email && !EMAIL_REGEX.test(form.email)) {
  setError('Format email tidak valid.');
  return;
}
```

---

**B. Phone Number Validation - TIDAK ADA**
```typescript
// File: CommunityRegistrationForm.tsx:196-197
<input id="reg-phone" value={form.phone} onChange={e => setField('phone', e.target.value)} 
  placeholder="Nomor WhatsApp" type="tel" autoComplete="tel" required className={inputClass} />
```

**Problem**:
- Tidak ada format validation
- Bisa input: `abc`, `123`, `+62-abc-def`
- Tidak ada minimum length check
- Tidak ada Indonesian phone format check

**Impact**: Invalid phone numbers → gagal kontak via WhatsApp

**Recommendation**:
```typescript
const PHONE_REGEX = /^(\+62|62|0)[0-9]{9,13}$/;

if (!PHONE_REGEX.test(form.phone.replace(/[\s-]/g, ''))) {
  setError('Nomor telepon tidak valid. Format: 08xx atau +628xx');
  return;
}
```

---

**C. Instagram Validation - TIDAK ADA**
```typescript
// File: CommunityRegistrationForm.tsx:204-205
<input id="reg-instagram" value={form.instagram} onChange={e => setField('instagram', e.target.value)} 
  placeholder="@username atau URL" className={inputClass} />
```

**Problem**:
- Tidak ada format validation
- Bisa input: `random text`, `http://malicious.com`
- Tidak ada sanitization

**Impact**: Invalid/malicious links masuk ke database

**Recommendation**:
```typescript
const INSTAGRAM_REGEX = /^(@[\w.]+|https?:\/\/(www\.)?instagram\.com\/[\w.]+\/?)$/;

if (form.instagram && !INSTAGRAM_REGEX.test(form.instagram)) {
  setError('Format Instagram tidak valid. Gunakan @username atau link Instagram.');
  return;
}
```

---

**D. Type-Specific Data Validation - LEMAH**

**Problem**: `TypeSpecificFields.tsx` hanya menggunakan HTML5 `required` attribute tanpa custom validation.

**Examples**:
- `memberCount`: Bisa input `-1`, `999999999`
- `studentCount`: Tidak ada max limit
- `portfolio`: Tidak ada length limit
- `socialLinks`: Tidak ada URL validation

**Impact**: Garbage data masuk ke database

**Recommendation**: Add validation per field type:
```typescript
// Number fields
if (memberCount < 0 || memberCount > 100000) {
  setError('Jumlah anggota tidak valid (0-100,000)');
}

// URL fields
if (socialLinks && !isValidURL(socialLinks)) {
  setError('Link media sosial tidak valid');
}
```

---

### 1.2 Server-Side Validation

#### ❌ CRITICAL: TIDAK ADA SERVER-SIDE VALIDATION

**File**: `src/utils/supabaseApi.ts:672-700`

```typescript
export async function submitCommunityRegistration(data: {
  communityName: string;
  communityType: string;
  pic: string;
  phone: string;
  email?: string;
  instagram?: string;
  description?: string;
  preferredDate?: string;
  organizationType?: string;
  organizationName?: string;
  typeSpecificData?: Record<string, string | number>;
}): Promise<{ id: string }> {
  const { data: result, error } = await supabase.from('community_registrations').insert({
    community_name: data.communityName,
    community_type: data.communityType,
    pic: data.pic,
    phone: data.phone,
    email: data.email || '',
    instagram: data.instagram || '',
    description: data.description || '',
    preferred_date: data.preferredDate || '',
    organization_type: data.organizationType || 'community',
    organization_name: data.organizationName || data.communityName,
    type_specific_data: data.typeSpecificData || {},
  }).select('id').single();
  if (error) throw new SupabaseApiError(`Registration failed: ${error.message}`);
  return { id: result?.id || '' };
}
```

**Problem**:
- **ZERO validation** sebelum insert
- Langsung insert ke database tanpa sanitization
- Tidak ada type checking
- Tidak ada length limits
- Tidak ada format validation

**Impact**: 
- SQL injection risk (mitigated by Supabase, but still bad practice)
- XSS risk via stored data
- Database pollution dengan invalid data

**Recommendation**: Add API endpoint dengan validation:
```typescript
// api/community-registration.js
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { organizationType, organizationName, pic, phone, email, instagram } = req.body;
  
  // Validation
  if (!organizationType || !['community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other'].includes(organizationType)) {
    return res.status(400).json({ error: 'Invalid organization type' });
  }
  
  if (!organizationName || organizationName.trim().length < 3 || organizationName.trim().length > 200) {
    return res.status(400).json({ error: 'Organization name must be 3-200 characters' });
  }
  
  if (!pic || pic.trim().length < 3 || pic.trim().length > 100) {
    return res.status(400).json({ error: 'PIC name must be 3-100 characters' });
  }
  
  const phoneRegex = /^(\+62|62|0)[0-9]{9,13}$/;
  if (!phone || !phoneRegex.test(phone.replace(/[\s-]/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone number format' });
  }
  
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
  }
  
  if (instagram) {
    const igRegex = /^(@[\w.]+|https?:\/\/(www\.)?instagram\.com\/[\w.]+\/?)$/;
    if (!igRegex.test(instagram)) {
      return res.status(400).json({ error: 'Invalid Instagram format' });
    }
  }
  
  // Sanitize
  const sanitized = {
    organization_type: organizationType,
    organization_name: organizationName.trim(),
    community_name: organizationName.trim(), // backward compat
    community_type: req.body.communityType || organizationType,
    pic: pic.trim(),
    phone: phone.replace(/[\s-]/g, ''),
    email: email?.trim() || '',
    instagram: instagram?.trim() || '',
    description: req.body.description?.trim().slice(0, 2000) || '',
    preferred_date: req.body.preferredDate || '',
    type_specific_data: req.body.typeSpecificData || {},
  };
  
  // Insert via service_role
  const { data, error } = await supabaseAdmin
    .from('community_registrations')
    .insert(sanitized)
    .select('id')
    .single();
  
  if (error) {
    console.error('Registration insert error:', error);
    return res.status(500).json({ error: 'Failed to submit registration' });
  }
  
  return res.status(200).json({ success: true, id: data.id });
}
```

---

## 2. DATABASE SCHEMA

### 2.1 Current Schema

**File**: `migrate/community-registrations.sql`

```sql
CREATE TABLE IF NOT EXISTS community_registrations (
  id TEXT PRIMARY KEY DEFAULT ('crg_' || replace(gen_random_uuid()::text, '-', '')),
  community_name TEXT NOT NULL,
  community_type TEXT NOT NULL,
  pic TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  description TEXT DEFAULT '',
  preferred_date TEXT DEFAULT '',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### ❌ CRITICAL ISSUES:

**A. Missing Columns for Multi-Type Support**

**Problem**: Schema tidak memiliki kolom `organization_type`, `organization_name`, `type_specific_data` yang digunakan di aplikasi!

**Evidence**:
- `CommunityRegistrationForm.tsx:96-98` mengirim `organizationType`, `organizationName`, `typeSpecificData`
- `supabaseApi.ts:694-696` mencoba insert ke kolom yang tidak ada
- **Database akan reject insert atau data hilang!**

**Impact**: 🔥 **CRITICAL BUG** - Multi-type registration tidak berfungsi!

**Recommendation**: Run migration IMMEDIATELY:
```sql
-- Add missing columns
ALTER TABLE community_registrations 
  ADD COLUMN IF NOT EXISTS organization_type TEXT DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS organization_name TEXT,
  ADD COLUMN IF NOT EXISTS type_specific_data JSONB DEFAULT '{}';

-- Backfill existing data
UPDATE community_registrations 
  SET organization_type = 'community',
      organization_name = community_name
  WHERE organization_type IS NULL OR organization_type = 'community';

-- Add constraint
ALTER TABLE community_registrations
  ADD CONSTRAINT chk_organization_type 
  CHECK (organization_type IN ('community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other'));

-- Add index
CREATE INDEX IF NOT EXISTS idx_registrations_org_type 
  ON community_registrations(organization_type);
```

---

**B. No Length Constraints**

**Problem**: Semua TEXT columns tidak ada length limit

**Impact**: 
- Bisa insert 1GB text ke `description`
- Database bloat
- Performance degradation

**Recommendation**:
```sql
ALTER TABLE community_registrations
  ALTER COLUMN community_name TYPE VARCHAR(200),
  ALTER COLUMN pic TYPE VARCHAR(100),
  ALTER COLUMN phone TYPE VARCHAR(20),
  ALTER COLUMN email TYPE VARCHAR(255),
  ALTER COLUMN instagram TYPE VARCHAR(255),
  ALTER COLUMN description TYPE VARCHAR(2000);
```

---

**C. No Data Validation Constraints**

**Problem**: Tidak ada CHECK constraints untuk format validation

**Recommendation**:
```sql
-- Phone format check
ALTER TABLE community_registrations
  ADD CONSTRAINT chk_phone_format 
  CHECK (phone ~ '^(\+62|62|0)[0-9]{9,13}$');

-- Email format check (basic)
ALTER TABLE community_registrations
  ADD CONSTRAINT chk_email_format 
  CHECK (email = '' OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Instagram format check
ALTER TABLE community_registrations
  ADD CONSTRAINT chk_instagram_format 
  CHECK (instagram = '' OR instagram ~ '^(@[\w.]+|https?://(www\.)?instagram\.com/[\w.]+/?)$');
```

---

### 2.2 Row Level Security (RLS)

#### ⚠️ SECURITY ISSUE: Overly Permissive

**Current Policy**:
```sql
CREATE POLICY "Public can read community_registrations" 
  ON community_registrations FOR SELECT USING (true);
```

**Problem**: 
- **ANYONE can read ALL registrations** including PII (phone, email)
- No authentication required
- Potential GDPR/privacy violation

**Impact**: 
- User privacy breach
- Competitor dapat scrape semua data registrasi
- Potential legal issue

**Recommendation**:
```sql
-- Remove public read access
DROP POLICY IF EXISTS "Public can read community_registrations" ON community_registrations;

-- Only allow authenticated admins to read
CREATE POLICY "Admins can read registrations" 
  ON community_registrations FOR SELECT 
  USING (
    auth.role() = 'authenticated' AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'superadmin')
    )
  );

-- Keep public insert (for registration form)
-- But add rate limiting via Supabase Edge Functions
```

---

## 3. ERROR HANDLING

### 3.1 Client-Side Error Handling

#### ⚠️ ISSUES:

**A. Generic Error Messages**

```typescript
// File: CommunityRegistrationForm.tsx:101-103
} catch {
  setError('Gagal mengirim pendaftaran. Coba lagi nanti.');
}
```

**Problem**:
- Tidak ada error detail untuk debugging
- User tidak tahu apa yang salah
- Tidak ada error logging

**Recommendation**:
```typescript
} catch (error) {
  console.error('Registration submission error:', error);
  
  if (error instanceof SupabaseApiError) {
    if (error.message.includes('duplicate')) {
      setError('Pendaftaran dengan data ini sudah ada. Hubungi admin jika ini error.');
    } else if (error.message.includes('constraint')) {
      setError('Data tidak valid. Periksa kembali format email/nomor telepon.');
    } else {
      setError(`Gagal mengirim: ${error.message}`);
    }
  } else {
    setError('Gagal mengirim pendaftaran. Coba lagi nanti.');
  }
  
  // Send to error tracking (Sentry, etc)
  trackError('registration_submission_failed', { error, formData: form });
}
```

---

**B. No Network Error Handling**

**Problem**: Tidak ada handling untuk:
- Network timeout
- Offline mode
- Slow connection

**Recommendation**: Add retry logic + offline detection

---

### 3.2 Server-Side Error Handling

#### ❌ CRITICAL: No Error Logging

**Problem**: Supabase errors tidak di-log, sulit debugging production issues

**Recommendation**: Add logging to API endpoint

---

## 4. DATA INTEGRITY

### 4.1 Duplicate Prevention

#### ❌ MISSING: No Duplicate Check

**Problem**: 
- Tidak ada unique constraint
- User bisa submit form berkali-kali
- Bisa spam database

**Impact**: Database pollution, admin overwhelmed

**Recommendation**:
```sql
-- Add unique constraint on phone (assuming 1 org = 1 phone)
CREATE UNIQUE INDEX idx_registrations_phone_unique 
  ON community_registrations(phone) 
  WHERE status != 'rejected';

-- Or add composite unique
CREATE UNIQUE INDEX idx_registrations_unique 
  ON community_registrations(organization_name, phone) 
  WHERE status != 'rejected';
```

**Client-side**: Add debounce + disable submit button after click

---

### 4.2 Data Sanitization

#### ❌ MISSING: No XSS Protection

**Problem**: User input langsung disimpan tanpa sanitization

**Impact**: Stored XSS vulnerability

**Recommendation**:
```typescript
import DOMPurify from 'dompurify';

// Sanitize before submit
const sanitized = {
  ...form,
  organizationName: DOMPurify.sanitize(form.organizationName),
  description: DOMPurify.sanitize(form.description),
  // ... other text fields
};
```

---

## 5. USER EXPERIENCE

### 5.1 Form Validation Feedback

#### ✅ Good:
- Error message displayed below form
- Submit button disabled when no org type selected
- Loading state during submission

#### ⚠️ Improvements Needed:

**A. Field-Level Validation**

**Current**: Validation hanya saat submit  
**Better**: Real-time validation per field

**Recommendation**:
```typescript
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

const validateField = (field: string, value: string) => {
  switch (field) {
    case 'email':
      if (value && !EMAIL_REGEX.test(value)) {
        setFieldErrors(prev => ({ ...prev, email: 'Format email tidak valid' }));
      } else {
        setFieldErrors(prev => ({ ...prev, email: '' }));
      }
      break;
    // ... other fields
  }
};

// In input onChange
onChange={e => {
  setField('email', e.target.value);
  validateField('email', e.target.value);
}}

// Show error below field
{fieldErrors.email && <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>}
```

---

**B. Success State Improvement**

**Current**: Generic success message  
**Better**: Show registration ID + next steps

**Recommendation**:
```typescript
<p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-400">
  Terima kasih udah daftar! <strong>ID Pendaftaran: {registrationId}</strong>
  <br />
  Tim kami akan review dan hubungi kamu dalam 3-5 hari kerja.
  <br />
  Sambil nunggu, follow <a href="...">@metmalbekasi</a> buat update terbaru!
  <br />
  <br />
  <strong>Simpan ID ini untuk tracking status pendaftaran.</strong>
</p>
```

---

## 6. PERFORMANCE

### 6.1 Bundle Size

#### ⚠️ Issue: Large Icon Library

**File**: `OrganizationTypeSelector.tsx:2`
```typescript
import { Users, GraduationCap, Building2, PartyPopper, School, Landmark, Heart, MoreHorizontal } from 'lucide-react';
```

**Impact**: Importing 8 icons from lucide-react

**Recommendation**: Already optimal (tree-shaking works)

---

### 6.2 Form State Management

#### ✅ Good: Efficient state updates with single state object

---

## 7. ACCESSIBILITY

### 7.1 Form Accessibility

#### ✅ Good:
- Proper `<label>` with `htmlFor`
- Required fields marked with `*`
- `type="email"` and `type="tel"` for mobile keyboards
- `autoComplete` attributes

#### ⚠️ Missing:

**A. ARIA Labels**

**Recommendation**:
```typescript
<input
  id="reg-phone"
  aria-label="Nomor WhatsApp"
  aria-required="true"
  aria-invalid={!!fieldErrors.phone}
  aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
  // ...
/>
{fieldErrors.phone && (
  <p id="phone-error" role="alert" className="text-xs text-rose-600 mt-1">
    {fieldErrors.phone}
  </p>
)}
```

---

**B. Focus Management**

**Recommendation**: Auto-focus first error field on validation failure

---

## 8. TESTING

### 8.1 Current Test Coverage

#### ❌ MISSING: No Tests Found

**Recommendation**: Add tests:

```typescript
// src/components/community/__tests__/CommunityRegistrationForm.test.tsx
describe('CommunityRegistrationForm', () => {
  it('should show error when submitting without org type', () => {
    // ...
  });
  
  it('should validate email format', () => {
    // ...
  });
  
  it('should validate phone format', () => {
    // ...
  });
  
  it('should submit successfully with valid data', () => {
    // ...
  });
  
  it('should show type-specific fields based on org type', () => {
    // ...
  });
});
```

---

## PRIORITY ACTION ITEMS

### 🔥 CRITICAL (Fix Immediately):

1. **Add missing database columns** (`organization_type`, `organization_name`, `type_specific_data`)
   - **Impact**: Multi-type registration currently BROKEN
   - **Effort**: 5 minutes (run SQL migration)

2. **Add server-side validation API endpoint**
   - **Impact**: Prevents invalid data in database
   - **Effort**: 2-3 hours

3. **Fix RLS policy** (remove public read access to PII)
   - **Impact**: Privacy/security vulnerability
   - **Effort**: 10 minutes

### ⚠️ HIGH (Fix This Week):

4. **Add client-side validation** (email, phone, instagram)
   - **Impact**: Better UX, less invalid submissions
   - **Effort**: 1-2 hours

5. **Add duplicate prevention** (unique constraint)
   - **Impact**: Prevents spam
   - **Effort**: 30 minutes

6. **Add error logging**
   - **Impact**: Better debugging
   - **Effort**: 1 hour

### 📋 MEDIUM (Fix This Month):

7. **Add field-level validation feedback**
   - **Impact**: Better UX
   - **Effort**: 2-3 hours

8. **Add database constraints** (length limits, format checks)
   - **Impact**: Data integrity
   - **Effort**: 1 hour

9. **Add XSS sanitization**
   - **Impact**: Security
   - **Effort**: 1 hour

10. **Add tests**
    - **Impact**: Prevent regressions
    - **Effort**: 4-6 hours

---

## CONCLUSION

Community Registration Form memiliki **foundation yang baik** dengan multi-type support, tapi ada **critical gaps** yang harus segera diperbaiki:

1. ❌ **Database schema tidak match dengan aplikasi** (missing columns)
2. ❌ **Zero server-side validation** (security risk)
3. ❌ **Weak client-side validation** (email, phone, instagram)
4. ❌ **Overly permissive RLS** (privacy issue)
5. ❌ **No duplicate prevention** (spam risk)

**Estimated Total Fix Time**: 8-12 hours untuk semua critical + high priority items.

**Next Steps**:
1. Run database migration untuk add missing columns
2. Create validation API endpoint
3. Fix RLS policy
4. Add client-side validation
5. Add tests

---

**Auditor**: Kiro AI  
**Date**: 2026-04-28
