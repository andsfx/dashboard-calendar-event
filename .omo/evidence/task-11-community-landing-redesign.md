# Task 11: Em-dash Audit — PASS

## Grep Results
- `grep -rP "[\x{2014}]" src/components/community/*.tsx` → 0 matches ✅
- `grep -rP "[\x{2014}]" src/components/CommunityLandingPage.tsx` → 0 matches ✅
- `grep -rP "[\x{2014}]" src/styles/*.css` → 0 matches ✅
- `grep -r "&mdash;" src/components/community/*.tsx` → 0 matches ✅

## Fixes Applied
1. `CommunityUpcomingEvents.tsx:48` — `—` → `-` in aria-label
2. `CommunityUpcomingEvents.tsx:51` — `—` → `.` in comment
3. `CommunityUpcomingEvents.tsx:226` — `—` → `.` in comment
4. `CommunityBenefits.tsx:27` — `—` → `-` in desc string

**Verdict: PASS**