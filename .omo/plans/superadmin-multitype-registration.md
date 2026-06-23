# 🎯 FEATURE PLAN: Superadmin & Multi-Type Registration System

**Created**: 2026-04-26
**Project**: Metropolitan Mall Bekasi Event Dashboard
**Scope**: User management system + Multi-organization registration

---

## 📋 OVERVIEW

### Feature 1: Superadmin System
**Purpose**: Centralized user management dengan role-based access control

**Key Features**:
- User management (CRUD users)
- Role & permission system
- Activity logs & audit trail
- Dashboard analytics

### Feature 2: Multi-Type Registration
**Purpose**: Support berbagai tipe organisasi untuk event registration

**Organization Types**:
- Komunitas (existing)
- Sekolah
- Perusahaan
- Event Organizer (EO)
- Kampus/Universitas
- Lembaga/Yayasan

---

## 🗄️ DATABASE SCHEMA

### New Tables Required

#### 1. `users` table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY DEFAULT ('usr_' || replace(gen_random_uuid()::text, '-', '')),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('superadmin', 'admin', 'manager', 'user')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Superadmin can see all users
CREATE POLICY "superadmin_all_users" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'superadmin'
    )
  );

-- Users can see their own data
CREATE POLICY "users_own_data" ON users
  FOR SELECT TO authenticated
  USING (id = auth.uid());
```

#### 2. `permissions` table
```sql
CREATE TABLE permissions (
  id TEXT PRIMARY KEY DEFAULT ('prm_' || replace(gen_random_uuid()::text, '-', '')),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  resource TEXT NOT NULL, -- 'events', 'users', 'registrations', etc.
  action TEXT NOT NULL, -- 'create', 'read', 'update', 'delete'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
  ('events.create', 'Create events', 'events', 'create'),
  ('events.read', 'View events', 'events', 'read'),
  ('events.update', 'Edit events', 'events', 'update'),
  ('events.delete', 'Delete events', 'events', 'delete'),
  ('users.create', 'Create users', 'users', 'create'),
  ('users.read', 'View users', 'users', 'read'),
  ('users.update', 'Edit users', 'users', 'update'),
  ('users.delete', 'Delete users', 'users', 'delete'),
  ('registrations.approve', 'Approve registrations', 'registrations', 'approve'),
  ('registrations.reject', 'Reject registrations', 'registrations', 'reject');
```

#### 3. `role_permissions` table
```sql
CREATE TABLE role_permissions (
  id TEXT PRIMARY KEY DEFAULT ('rp_' || replace(gen_random_uuid()::text, '-', '')),
  role TEXT NOT NULL,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- Default role permissions
-- Superadmin: all permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'superadmin', id FROM permissions;

-- Admin: most permissions except user management
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions 
WHERE resource != 'users';

-- Manager: read + approve/reject registrations
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions 
WHERE action = 'read' OR name LIKE 'registrations.%';
```

#### 4. `activity_logs` table
```sql
CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY DEFAULT ('log_' || replace(gen_random_uuid()::text, '-', '')),
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'login', 'create_event', 'approve_registration', etc.
  resource_type TEXT, -- 'event', 'user', 'registration'
  resource_id TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
```

#### 5. Update `community_registrations` table
```sql
-- Add organization_type column
ALTER TABLE community_registrations 
ADD COLUMN organization_type TEXT DEFAULT 'community' 
CHECK (organization_type IN ('community', 'school', 'company', 'eo', 'university', 'foundation'));

-- Add type-specific fields
ALTER TABLE community_registrations
ADD COLUMN organization_size TEXT, -- 'small', 'medium', 'large'
ADD COLUMN industry TEXT, -- for companies
ADD COLUMN education_level TEXT, -- for schools/universities
ADD COLUMN license_number TEXT, -- for EO
ADD COLUMN tax_id TEXT; -- for companies/foundations

-- Create index
CREATE INDEX idx_community_registrations_org_type ON community_registrations(organization_type);
```

---

## 🎨 UI COMPONENTS

### Superadmin Dashboard

#### 1. `/admin/dashboard` - Main Dashboard
**Components**:
- `SuperadminLayout.tsx` - Layout with sidebar navigation
- `DashboardStats.tsx` - Key metrics (total users, active registrations, etc.)
- `RecentActivity.tsx` - Latest activity logs
- `QuickActions.tsx` - Common admin actions

**Stats to Show**:
- Total users (by role)
- Active registrations (by status)
- Events this month
- Recent activity (last 24h)

#### 2. `/admin/users` - User Management
**Components**:
- `UserList.tsx` - Table with search, filter, pagination
- `UserCreateModal.tsx` - Create new user
- `UserEditModal.tsx` - Edit user details
- `UserDetailModal.tsx` - View user details + activity
- `RoleSelector.tsx` - Dropdown for role selection
- `UserStatusBadge.tsx` - Status indicator

**Features**:
- Search by name/email
- Filter by role/status
- Bulk actions (activate, suspend, delete)
- Export to CSV

#### 3. `/admin/registrations` - Registration Management
**Components**:
- `RegistrationList.tsx` - Table with filters
- `RegistrationDetailModal.tsx` - View full registration
- `ApprovalActions.tsx` - Approve/reject buttons
- `OrganizationTypeBadge.tsx` - Type indicator

**Features**:
- Filter by organization type
- Filter by status (pending, approved, rejected)
- Bulk approve/reject
- Export to CSV

#### 4. `/admin/activity` - Activity Logs
**Components**:
- `ActivityLogList.tsx` - Timeline view
- `ActivityFilters.tsx` - Filter by user/action/date
- `ActivityDetailModal.tsx` - View log details

**Features**:
- Real-time updates
- Filter by user, action, resource
- Date range picker
- Export logs

#### 5. `/admin/permissions` - Role & Permissions
**Components**:
- `RoleList.tsx` - List of roles
- `PermissionMatrix.tsx` - Grid showing role permissions
- `RoleEditModal.tsx` - Edit role permissions

**Features**:
- Visual permission matrix
- Drag-and-drop permission assignment
- Role templates

---

### Multi-Type Registration Form

#### Updated Components

**1. `CommunityRegistrationForm.tsx` → `OrganizationRegistrationForm.tsx`**

**New Structure**:
```typescript
interface OrganizationRegistrationForm {
  // Step 1: Organization Type Selection
  organizationType: 'community' | 'school' | 'company' | 'eo' | 'university' | 'foundation';
  
  // Step 2: Basic Info (common for all)
  organizationName: string;
  email: string;
  phone: string;
  address: string;
  
  // Step 3: Type-Specific Info
  // For Community
  communityType?: string;
  memberCount?: number;
  
  // For School/University
  educationLevel?: 'sd' | 'smp' | 'sma' | 'university';
  studentCount?: number;
  principalName?: string;
  
  // For Company
  industry?: string;
  companySize?: 'small' | 'medium' | 'large';
  taxId?: string;
  
  // For EO
  licenseNumber?: string;
  portfolioUrl?: string;
  yearsExperience?: number;
  
  // For Foundation
  foundationFocus?: string;
  registrationNumber?: string;
  
  // Step 4: Event Details (common)
  eventTitle: string;
  eventDescription: string;
  preferredDate: string;
  expectedAttendees: number;
  
  // Step 5: Additional Requirements
  needsSponsorship: boolean;
  needsMarketingSupport: boolean;
  specialRequirements?: string;
}
```

**Components to Create**:
- `OrganizationTypeSelector.tsx` - Step 1: Choose type with icons
- `BasicInfoFields.tsx` - Step 2: Common fields
- `CommunitySpecificFields.tsx` - Step 3a: Community fields
- `SchoolSpecificFields.tsx` - Step 3b: School fields
- `CompanySpecificFields.tsx` - Step 3c: Company fields
- `EOSpecificFields.tsx` - Step 3d: EO fields
- `UniversitySpecificFields.tsx` - Step 3e: University fields
- `FoundationSpecificFields.tsx` - Step 3f: Foundation fields
- `EventDetailsFields.tsx` - Step 4: Event info
- `AdditionalRequirementsFields.tsx` - Step 5: Extra needs

**Form Flow**:
```
Step 1: Select Organization Type
  ↓
Step 2: Basic Organization Info
  ↓
Step 3: Type-Specific Info (conditional)
  ↓
Step 4: Event Details
  ↓
Step 5: Additional Requirements
  ↓
Review & Submit
```

---

## 🔐 AUTHENTICATION & AUTHORIZATION

### Auth Flow

#### 1. Supabase Auth Integration
```typescript
// lib/auth.ts
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Log activity
  await logActivity({
    userId: data.user.id,
    action: 'login',
    details: { method: 'password' }
  });
  
  return data;
}

export async function checkPermission(
  userId: string, 
  permission: string
): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();
  
  if (!data) return false;
  
  const { data: perms } = await supabase
    .from('role_permissions')
    .select('permissions(name)')
    .eq('role', data.role);
  
  return perms?.some(p => p.permissions.name === permission) ?? false;
}
```

#### 2. Protected Routes
```typescript
// components/ProtectedRoute.tsx
export function ProtectedRoute({ 
  children, 
  requiredRole 
}: { 
  children: ReactNode; 
  requiredRole?: string;
}) {
  const { user, role } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && role !== requiredRole && role !== 'superadmin') {
    return <Navigate to="/unauthorized" />;
  }
  
  return <>{children}</>;
}
```

#### 3. Permission Hook
```typescript
// hooks/usePermission.ts
export function usePermission(permission: string) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    checkPermission(user.id, permission).then(setHasPermission);
  }, [user, permission]);
  
  return hasPermission;
}

// Usage
function DeleteButton() {
  const canDelete = usePermission('events.delete');
  
  if (!canDelete) return null;
  
  return <button onClick={handleDelete}>Delete</button>;
}
```

---

## 🛠️ API ENDPOINTS

### Serverless Functions (Vercel)

#### 1. `/api/admin/users`
```typescript
// api/admin/users.ts
export default async function handler(req, res) {
  // Verify superadmin
  const user = await verifyAuth(req);
  if (user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  switch (req.method) {
    case 'GET':
      // List users with pagination
      const { page = 1, limit = 20, role, status } = req.query;
      // ... fetch users
      break;
      
    case 'POST':
      // Create user
      const { email, full_name, role } = req.body;
      // ... create user
      // ... log activity
      break;
      
    case 'PATCH':
      // Update user
      const { id, ...updates } = req.body;
      // ... update user
      // ... log activity
      break;
      
    case 'DELETE':
      // Delete user
      const { id } = req.body;
      // ... delete user
      // ... log activity
      break;
  }
}
```

#### 2. `/api/admin/registrations`
```typescript
// api/admin/registrations.ts
export default async function handler(req, res) {
  const user = await verifyAuth(req);
  const canManage = await checkPermission(user.id, 'registrations.approve');
  
  if (!canManage) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  switch (req.method) {
    case 'GET':
      // List registrations with filters
      const { organizationType, status } = req.query;
      // ... fetch registrations
      break;
      
    case 'PATCH':
      // Approve/reject registration
      const { id, status, notes } = req.body;
      // ... update registration
      // ... send notification email
      // ... log activity
      break;
  }
}
```

#### 3. `/api/admin/activity-logs`
```typescript
// api/admin/activity-logs.ts
export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (user.role !== 'superadmin' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  const { userId, action, startDate, endDate, page = 1 } = req.query;
  
  // Fetch logs with filters
  const logs = await fetchActivityLogs({
    userId,
    action,
    startDate,
    endDate,
    page,
    limit: 50
  });
  
  return res.json(logs);
}
```

#### 4. `/api/admin/permissions`
```typescript
// api/admin/permissions.ts
export default async function handler(req, res) {
  const user = await verifyAuth(req);
  if (user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  
  switch (req.method) {
    case 'GET':
      // Get all permissions and role assignments
      const permissions = await fetchPermissions();
      const rolePermissions = await fetchRolePermissions();
      return res.json({ permissions, rolePermissions });
      
    case 'POST':
      // Update role permissions
      const { role, permissionIds } = req.body;
      // ... update role_permissions
      // ... log activity
      break;
  }
}
```

---

## 📱 ROUTING STRUCTURE

```
/                           - Public landing page
/community                  - Community landing (existing)
/register                   - Multi-type registration form (NEW)
/login                      - Login page (NEW)
/unauthorized               - 403 page (NEW)

/admin                      - Superadmin layout (NEW)
  /admin/dashboard          - Main dashboard
  /admin/users              - User management
  /admin/registrations      - Registration management
  /admin/activity           - Activity logs
  /admin/permissions        - Role & permissions
  /admin/settings           - System settings

/dashboard                  - Regular admin dashboard (existing)
```

---

## 🎯 IMPLEMENTATION PHASES

### Phase 1: Database Setup (2-3 hours)
**Tasks**:
1. Create migration files for new tables
2. Set up RLS policies
3. Create default permissions and roles
4. Test database schema

**Deliverables**:
- `migrate/superadmin-schema.sql`
- `migrate/multi-type-registration.sql`
- `migrate/activity-logs.sql`

---

### Phase 2: Authentication System (3-4 hours)
**Tasks**:
1. Set up Supabase Auth
2. Create login/logout flow
3. Implement permission checking
4. Create protected route component
5. Add activity logging

**Deliverables**:
- `lib/auth.ts`
- `hooks/useAuth.ts`
- `hooks/usePermission.ts`
- `components/ProtectedRoute.tsx`
- `components/LoginPage.tsx`

---

### Phase 3: Superadmin Dashboard (4-5 hours)
**Tasks**:
1. Create superadmin layout
2. Build user management UI
3. Build registration management UI
4. Build activity logs UI
5. Build permissions UI

**Deliverables**:
- `components/admin/SuperadminLayout.tsx`
- `components/admin/UserManagement.tsx`
- `components/admin/RegistrationManagement.tsx`
- `components/admin/ActivityLogs.tsx`
- `components/admin/PermissionsManager.tsx`

---

### Phase 4: Multi-Type Registration (3-4 hours)
**Tasks**:
1. Update registration form structure
2. Create organization type selector
3. Create type-specific field components
4. Update form validation
5. Update submission logic

**Deliverables**:
- `components/registration/OrganizationTypeSelector.tsx`
- `components/registration/SchoolFields.tsx`
- `components/registration/CompanyFields.tsx`
- `components/registration/EOFields.tsx`
- `components/registration/UniversityFields.tsx`
- `components/registration/FoundationFields.tsx`

---

### Phase 5: API Endpoints (2-3 hours)
**Tasks**:
1. Create admin API endpoints
2. Add authentication middleware
3. Add permission checking
4. Add activity logging
5. Test all endpoints

**Deliverables**:
- `api/admin/users.ts`
- `api/admin/registrations.ts`
- `api/admin/activity-logs.ts`
- `api/admin/permissions.ts`

---

### Phase 6: Testing & Polish (2-3 hours)
**Tasks**:
1. Add tests for auth system
2. Add tests for permission checking
3. Add tests for admin components
4. Test all user flows
5. Fix bugs and polish UI

**Deliverables**:
- Test files for new components
- Bug fixes
- UI polish

---

## 📊 ESTIMATED TIMELINE

**Total Estimated Time**: 16-22 hours

**Breakdown**:
- Phase 1 (Database): 2-3 hours
- Phase 2 (Auth): 3-4 hours
- Phase 3 (Superadmin UI): 4-5 hours
- Phase 4 (Multi-Type Form): 3-4 hours
- Phase 5 (API): 2-3 hours
- Phase 6 (Testing): 2-3 hours

**Recommended Schedule**:
- Day 1: Phase 1 + Phase 2 (5-7 hours)
- Day 2: Phase 3 (4-5 hours)
- Day 3: Phase 4 + Phase 5 (5-7 hours)
- Day 4: Phase 6 (2-3 hours)

---

## 🔒 SECURITY CONSIDERATIONS

### 1. Authentication
- ✅ Use Supabase Auth (secure by default)
- ✅ Implement JWT token validation
- ✅ Add rate limiting on login endpoint
- ✅ Log all authentication attempts

### 2. Authorization
- ✅ Check permissions on every API call
- ✅ Use RLS policies for database security
- ✅ Never trust client-side permission checks
- ✅ Implement role hierarchy (superadmin > admin > manager > user)

### 3. Data Protection
- ✅ Encrypt sensitive data (tax IDs, license numbers)
- ✅ Sanitize all user inputs
- ✅ Use parameterized queries (Supabase handles this)
- ✅ Implement CSRF protection

### 4. Activity Logging
- ✅ Log all admin actions
- ✅ Log all permission changes
- ✅ Log all user modifications
- ✅ Store IP address and user agent

---

## 📝 NOTES & CONSIDERATIONS

### 1. Backward Compatibility
- Existing community registrations will have `organization_type = 'community'`
- Existing admin system will continue to work
- New superadmin role is additive, doesn't break existing functionality

### 2. Migration Strategy
- Run database migrations in staging first
- Create superadmin user manually via SQL
- Test all permissions before production deploy
- Have rollback plan ready

### 3. Email Notifications
- Send email when registration is approved/rejected
- Send email when user account is created
- Send email when user role is changed
- Use email templates for consistency

### 4. Future Enhancements
- Two-factor authentication (2FA)
- API key management for external integrations
- Advanced analytics dashboard
- Automated approval rules
- Bulk import users from CSV
- Custom permission creation

---

## ✅ SUCCESS CRITERIA

**Feature is complete when**:
1. ✅ Superadmin can create/edit/delete users
2. ✅ Superadmin can assign roles and permissions
3. ✅ All admin actions are logged
4. ✅ Registration form supports all 6 organization types
5. ✅ Type-specific fields show/hide correctly
6. ✅ Admins can approve/reject registrations
7. ✅ Email notifications work
8. ✅ All tests pass
9. ✅ Documentation is complete
10. ✅ Deployed to production

---

## 🚀 READY TO IMPLEMENT

This plan is ready for implementation. When you're ready to start:

1. Review this plan
2. Set up development environment
3. Start with Phase 1 (Database Setup)
4. Follow phases sequentially
5. Test thoroughly after each phase

**Estimated completion**: 3-4 days of focused work

---

**Plan created by**: Sisyphus AI
**Date**: 2026-04-26
**Status**: Ready for implementation
