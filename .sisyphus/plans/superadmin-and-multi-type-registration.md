# Work Plan: Superadmin System & Multi-Type Registration

## TL;DR
Add superadmin role with user management capabilities and expand registration form to support multiple organization types (community, school, company, EO, campus, etc.)

## Context
Currently the system has:
- Basic admin authentication (password-based)
- Community-only registration form
- No user management system
- No role-based access control

Need to add:
- Superadmin role with full user management
- Multi-type registration (community, school, company, EO, campus, etc.)
- User roles and permissions
- Admin dashboard for user management

## Work Objectives
1. Design database schema for users, roles, and permissions
2. Implement Supabase authentication with role-based access
3. Create superadmin dashboard for user management
4. Expand registration form to support multiple organization types
5. Add organization type selection and conditional fields

## Verification Strategy
- Superadmin can create/edit/delete users
- Different user roles have appropriate permissions
- Registration form adapts based on organization type
- All data properly stored in Supabase
- Tests cover new functionality

## Execution Strategy
Phase 1: Database & Auth (2-3 days)
Phase 2: Superadmin Dashboard (2-3 days)
Phase 3: Multi-Type Registration (1-2 days)
Phase 4: Testing & Polish (1 day)

---

## PHASE 1: Database Schema & Authentication

### Task 1.1: Design Database Schema
**What to do:**
- Create `users` table with fields:
  - id (uuid, primary key)
  - email (unique)
  - full_name
  - role (enum: superadmin, admin, user)
  - organization_id (foreign key)
  - created_at, updated_at
  
- Create `organizations` table:
  - id (uuid, primary key)
  - name
  - type (enum: community, school, company, eo, campus, government, ngo, other)
  - contact_person
  - email
  - phone
  - address
  - description
  - status (enum: pending, approved, rejected)
  - created_at, updated_at

- Create `roles` and `permissions` tables for RBAC

**Must NOT do:**
- Do not hardcode permissions
- Do not skip RLS policies
- Do not expose sensitive data

**References:**
- Supabase Auth documentation
- RLS best practices

**Acceptance Criteria:**
- All tables created with proper constraints
- RLS policies configured
- Foreign keys properly set
- Indexes on frequently queried columns

---

### Task 1.2: Implement Supabase Authentication
**What to do:**
- Replace current password-based auth with Supabase Auth
- Set up email/password authentication
- Configure user metadata for roles
- Create auth helper functions
- Add protected routes based on roles

**Must NOT do:**
- Do not store passwords in plain text
- Do not skip email verification
- Do not expose auth tokens

**Acceptance Criteria:**
- Users can sign up with email/password
- Email verification works
- Role-based access control functional
- Auth state persists across sessions

---

## PHASE 2: Superadmin Dashboard

### Task 2.1: Create Superadmin Layout
**What to do:**
- Create `src/components/superadmin/` directory
- Build SuperadminLayout component with:
  - Sidebar navigation (Users, Organizations, Settings)
  - Header with user info and logout
  - Protected route wrapper
  
**Must NOT do:**
- Do not allow non-superadmin access
- Do not skip loading states

**Acceptance Criteria:**
- Layout renders only for superadmin role
- Navigation works smoothly
- Responsive design

---

### Task 2.2: User Management Interface
**What to do:**
- Create UserManagementTable component:
  - List all users with pagination
  - Search and filter by role/status
  - Actions: Edit, Delete, Change Role
  
- Create UserEditModal:
  - Edit user details
  - Change role
  - Assign to organization
  - Activate/deactivate user

**Must NOT do:**
- Do not allow superadmin to delete themselves
- Do not skip confirmation dialogs for destructive actions

**Acceptance Criteria:**
- All CRUD operations work
- Real-time updates via Supabase subscriptions
- Proper error handling
- Confirmation dialogs for delete

---

### Task 2.3: Organization Management Interface
**What to do:**
- Create OrganizationManagementTable:
  - List all organizations
  - Filter by type and status
  - Approve/reject pending registrations
  - View organization details
  
- Create OrganizationDetailModal:
  - View full organization info
  - See associated users
  - Change status
  - Add notes

**Must NOT do:**
- Do not auto-approve without review
- Do not skip audit trail

**Acceptance Criteria:**
- Superadmin can review registrations
- Status changes logged
- Email notifications on approval/rejection

---

## PHASE 3: Multi-Type Registration Form

### Task 3.1: Add Organization Type Selection
**What to do:**
- Update CommunityRegistrationForm to MultiTypeRegistrationForm
- Add organization type selector at the top:
  - Community
  - School / University
  - Company / Corporate
  - Event Organizer (EO)
  - Campus Organization
  - Government Agency
  - NGO / Non-Profit
  - Other

**Must NOT do:**
- Do not break existing community registrations
- Do not skip validation

**Acceptance Criteria:**
- Type selector renders correctly
- Form adapts based on selection
- All types can be submitted

---

### Task 3.2: Conditional Form Fields
**What to do:**
- Create type-specific field sets:

**Community:**
- Community name
- Community type (music, dance, sports, etc.)
- Number of members
- Social media links

**School/University:**
- Institution name
- Education level (SD, SMP, SMA, University)
- Student count
- Teacher/advisor name

**Company/Corporate:**
- Company name
- Industry
- Employee count
- CSR program details

**Event Organizer:**
- EO name
- Portfolio/past events
- Team size
- Specialization

**Campus Organization:**
- Organization name
- University/campus
- Student count
- Faculty advisor

**Government Agency:**
- Agency name
- Department
- Program details

**NGO/Non-Profit:**
- Organization name
- Focus area
- Registration number
- Program details

**Common fields (all types):**
- Contact person
- Email
- Phone
- Event proposal
- Preferred dates

**Must NOT do:**
- Do not show irrelevant fields
- Do not skip required field validation

**Acceptance Criteria:**
- Fields show/hide based on type
- Validation works for all types
- Form submission includes type

---

### Task 3.3: Update Backend API
**What to do:**
- Update `submitCommunityRegistration` to `submitOrganizationRegistration`
- Handle different organization types
- Store type-specific data in JSONB field
- Send appropriate email notifications

**Must NOT do:**
- Do not lose existing data
- Do not skip data validation

**Acceptance Criteria:**
- All types can register successfully
- Data stored correctly
- Emails sent with correct templates

---

## PHASE 4: Testing & Polish

### Task 4.1: Add Tests
**What to do:**
- Test superadmin authentication
- Test user CRUD operations
- Test organization approval flow
- Test multi-type registration form
- Test role-based access control

**Acceptance Criteria:**
- All critical paths tested
- Edge cases covered
- Tests passing

---

### Task 4.2: Update Documentation
**What to do:**
- Document superadmin setup
- Document user roles and permissions
- Update README with new features
- Create admin user guide

**Acceptance Criteria:**
- Clear setup instructions
- Role descriptions documented
- User guide complete

---

## Database Migration Script

```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'user')),
  organization_id UUID REFERENCES organizations(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('community', 'school', 'company', 'eo', 'campus', 'government', 'ngo', 'other')),
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  description TEXT,
  type_specific_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_organization ON users(organization_id);
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_status ON organizations(status);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Superadmin can see all users
CREATE POLICY "superadmin_all_users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'superadmin'
    )
  );

-- Users can see their own data
CREATE POLICY "users_own_data" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Superadmin can see all organizations
CREATE POLICY "superadmin_all_orgs" ON organizations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'superadmin'
    )
  );

-- Public can create organizations (registration)
CREATE POLICY "public_create_org" ON organizations
  FOR INSERT TO anon
  WITH CHECK (true);
```

---

## Success Criteria

- [ ] Superadmin can log in with Supabase Auth
- [ ] Superadmin can create/edit/delete users
- [ ] Superadmin can approve/reject organization registrations
- [ ] Registration form supports 8+ organization types
- [ ] Form fields adapt based on organization type
- [ ] All data properly stored in Supabase
- [ ] RLS policies protect sensitive data
- [ ] Email notifications work for all types
- [ ] Tests cover new functionality
- [ ] Documentation updated

---

## Estimated Timeline

- Phase 1 (Database & Auth): 2-3 days
- Phase 2 (Superadmin Dashboard): 2-3 days
- Phase 3 (Multi-Type Registration): 1-2 days
- Phase 4 (Testing & Polish): 1 day

**Total: 6-9 days**

---

## Notes

- This is a major feature addition requiring database changes
- Requires Supabase project access for migrations
- Should be developed in a feature branch
- Needs thorough testing before production deployment
- Consider adding audit logging for superadmin actions
- May want to add 2FA for superadmin accounts
