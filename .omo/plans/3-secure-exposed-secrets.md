# Work Plan: Secure Exposed Secrets

## TL;DR
Audit git history for exposed .env file and document secret rotation procedures if found. Verify .env is properly gitignored.

## Context
The audit flagged potential secret exposure risk. This work plan checks if .env was ever committed to git history and provides manual rotation steps for any exposed credentials. This is a security-critical task requiring manual user intervention for actual secret rotation.

## Work Objectives
1. Check git history for .env file commits
2. Document rotation procedures for exposed secrets (if found)
3. Verify .env in .gitignore

## Verification Strategy
- Git history thoroughly searched
- If .env found: rotation steps documented, user notified
- If .env not found: confirm clean history
- .gitignore properly configured

## Execution Strategy
Sequential execution. Task 2 conditional on Task 1 findings.

## TODOs

### Task 1: Check Git History for .env
**What to do:**
- Run `git log --all --full-history -- .env` to search all branches
- Run `git log --all --full-history -- "*.env"` to catch variants
- Check for .env in any commit, even if later deleted
- Document findings in .sisyphus/security-audit.txt
- If found: note commit hashes, dates, and branches

**Must NOT do:**
- Do not skip checking all branches
- Do not assume .env was never committed
- Do not proceed without thorough search

**Agent Profile:** quick

**Parallelization:** Sequential (Task 1 of 3)

**References:**
- .env.example
- .gitignore
- https://git-scm.com/docs/git-log

**Acceptance Criteria:**
- Git history fully searched
- Results documented
- Commit hashes recorded if .env found
- Clear status: FOUND or NOT FOUND

**QA Scenarios:**
```bash
# Search git history
git log --all --full-history -- .env
git log --all --full-history -- "*.env"

# Check if .env ever existed in any commit
git rev-list --all -- .env | wc -l
# If output > 0, .env was committed

# Save findings
git log --all --full-history --oneline -- .env > .sisyphus/security-audit.txt
```

**Evidence Paths:**
- .sisyphus/security-audit.txt

---

### Task 2: Document Secret Rotation Procedures (Conditional)
**What to do:**
**IF .env found in git history:**
- Create .sisyphus/SECRET-ROTATION-REQUIRED.md
- Document which secrets need rotation:
  - Supabase service role key (SUPABASE_SERVICE_ROLE_KEY)
  - Cloudflare R2 credentials (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY)
  - Admin password (ADMIN_PASSWORD)
- Provide step-by-step rotation instructions:
  1. Supabase: Generate new service role key in dashboard
  2. R2: Create new API token in Cloudflare dashboard
  3. Admin: Generate new secure password
- Add warning: "CRITICAL: Repository history contains exposed secrets. Rotation required immediately."
- Include links to provider dashboards

**IF .env NOT found:**
- Create .sisyphus/security-audit.txt with "PASS: No .env found in git history"
- Skip rotation documentation

**Must NOT do:**
- Do not attempt automatic rotation (requires manual user action)
- Do not expose current secret values in documentation
- Do not skip any secrets if .env was found
- Do not provide actual new secret values

**Security Warnings:**
- Exposed secrets in git history remain accessible even after deletion
- Rotation is mandatory, not optional
- User must rotate secrets manually through provider dashboards
- Do not commit new secrets to git

**Agent Profile:** quick

**Parallelization:** Sequential (Task 2 of 3)

**References:**
- .env.example (for secret names)
- .sisyphus/security-audit.txt (from Task 1)
- https://supabase.com/dashboard
- https://dash.cloudflare.com

**Acceptance Criteria:**
- If .env found: Rotation document created with all secrets listed
- If .env not found: Clean audit result documented
- Clear instructions provided
- User notified of required actions

**QA Scenarios:**
```bash
# If .env was found, verify rotation doc exists
test -f .sisyphus/SECRET-ROTATION-REQUIRED.md && echo "Rotation doc created"

# Verify all secrets documented
grep -E "(SUPABASE_SERVICE_ROLE_KEY|R2_ACCESS_KEY_ID|R2_SECRET_ACCESS_KEY|ADMIN_PASSWORD)" .sisyphus/SECRET-ROTATION-REQUIRED.md

# If .env not found, verify clean status
grep "PASS" .sisyphus/security-audit.txt
```

**Evidence Paths:**
- .sisyphus/SECRET-ROTATION-REQUIRED.md (if secrets found)
- .sisyphus/security-audit.txt (if clean)

---

### Task 3: Verify .env in .gitignore
**What to do:**
- Open .gitignore file
- Verify .env is listed (exact match)
- Check for .env* pattern (catches .env.local, .env.production, etc.)
- If missing: add .env and .env* to .gitignore
- Verify .env.example is NOT in .gitignore (should be committed)
- Test gitignore with `git check-ignore .env`

**Must NOT do:**
- Do not add .env.example to .gitignore
- Do not skip verification test
- Do not assume .gitignore is correct

**Agent Profile:** quick

**Parallelization:** Sequential (Task 3 of 3)

**References:**
- .gitignore
- .env.example
- https://git-scm.com/docs/gitignore

**Acceptance Criteria:**
- .env in .gitignore
- .env* pattern in .gitignore (optional but recommended)
- .env.example NOT in .gitignore
- git check-ignore confirms .env ignored

**QA Scenarios:**
```bash
# Verify .env ignored
git check-ignore .env
echo $? # Should be 0 (file is ignored)

# Verify .env.example NOT ignored
git check-ignore .env.example
echo $? # Should be 1 (file is NOT ignored)

# Check .gitignore content
grep "^\.env$" .gitignore
grep "^\.env\*" .gitignore
```

**Evidence Paths:**
- .gitignore

---

## Success Criteria
- [ ] Git history thoroughly searched for .env
- [ ] If .env found: Rotation procedures documented
- [ ] If .env not found: Clean status confirmed
- [ ] .env properly listed in .gitignore
- [ ] .env.example remains committable
- [ ] User notified of any required actions

**Final Commit Message:**
```
NO COMMIT FOR THIS TASK

This is a security audit task. If secrets were found in git history, 
user must manually rotate them before any commits are made.

If .gitignore was updated, commit separately:
chore: ensure .env properly ignored in .gitignore
```

**Post-Task User Actions Required (if secrets found):**
1. Read .sisyphus/SECRET-ROTATION-REQUIRED.md
2. Rotate all listed secrets through provider dashboards
3. Update local .env with new secrets
4. Consider repository as compromised - secrets in history are permanent
5. Monitor for unauthorized access using old credentials
