
## Scope

Ten linked changes across DB, edge functions, auth gating, admin panel and a new internal panel. Logo upload pending — ID card will render a placeholder slot wired to `id_card_assets.logo_url`; once you upload, I swap it in.

## 1. Enterprise allocations — RLS + audit + CSV
- Tighten RLS on `enterprise_credit_tiers` and `enterprise_credit_allocations` so admins only `SELECT` columns: `enterprise_name, credit_pool, amount, mode, allocated_at, notes` (employee/member columns stay hidden — already enforced by removing `enterprise_members` from any admin select path).
- New trigger `log_enterprise_tier_change` writes to `admin_audit_trail` on tier insert/update with `reviewed_by = auth.uid()`, timestamp, before/after pool.
- Existing `log_enterprise_allocation` already covers allocations — extend to capture `reviewed_by` explicitly.
- Add `AdminExportButton` in the Set Credits → Enterprise card with columns: enterprise_name, mode, amount, allocated_by (resolved name), allocated_at, notes.

## 2. SBPS section generator UX
- `AlertDialog` confirmation before insert: "Generate sections A → K (11 sections) for Class 10? Existing: A, B."
- Show duplicates list explicitly; insert only the missing letters; toast summary "Created 9, skipped 2 duplicates".

## 3. Mandatory birthday gate
- New `<BirthdayGate>` wrapper used in `Index`, `Admin`, `StackChat`, `CodeIDE`, `Profile`, `Marketing`, `Projects`.
- Blocks render with a forced modal until `profiles.birthday` is set.
- Exempts super-admins (`kchetasswaroop@gmail.com`, `vickyvpurohit@gmail.com`) — they see a dismissible banner instead.
- Update `is_profile_complete()` SQL function to also require birthday.

## 4. Real-time credit payment requests
- New table `credit_payment_submissions`: amount, transaction_id, payment_method, screenshot_url, plan_type, status (pending/approved/rejected), reviewed_by, reviewed_at, notes.
- User form on `/payment` posts here; after submit, user sees "Pending admin verification".
- Admin Requests tab subscribes via `supabase.channel('payment-submissions').on('postgres_changes', ...)` for real-time push.
- Admin actions: Approve (calls existing credit-set flow with the txn id) / Reject with note. Both write to `admin_audit_trail`.

## 5. Employee ID Card system
- New table `employee_id_cards`: employee_user_id (unique), employee_id (permanent, from `employee_ids`), photo_url, qr_token (unique uuid), emergency_contact_name, emergency_contact_phone, emergency_contact_relation, blood_group, issued_at, revoked_at.
- New table `id_card_assets`: singleton row holding `logo_url` (placeholder until you upload).
- Storage bucket `id-cards` (private; policies: employee/admin read own, admin write).
- New `IdCardGenerator` admin tab: pick employee → upload photo → enter emergency contact → generates two-sided card (front: logo / "StackMind Technologies Limited" / photo / name / employee ID / QR; back: emergency contact, blood group, terms). Renders to a printable PDF via `jspdf` + `qrcode`.
- "CEO Card" variant for `kchetasswaroop@gmail.com` — gold accent, "Chief Executive Officer" line, gate flag set so the website forces a CEO-card swipe even before employee gating.
- Card shown in `/profile` for employees; download PNG/PDF.

## 6. Office Swipe (daily QR scan gate)
- New table `office_swipes`: user_id, swipe_date, swipe_in_at, swipe_out_at, method (camera/upload), location_hint, device_info.
- After login, if role ∈ {admin, employee} and no `office_swipes` row for `CURRENT_DATE`, redirect to `/swipe-in`.
- `/swipe-in` page: camera scan (`html5-qrcode`) OR image upload of the ID-card QR. Validates token against `employee_id_cards.qr_token = self`. On success, insert swipe row, then proceed.
- CEO must swipe his CEO-card token to enter the website (same flow).
- "Working from home" is NOT exposed (you chose mandatory daily).

## 7. Admin tab: Office Visits
- `OfficeVisitsPanel` lists swipes with filters (employee, date range, method), KPIs (today's count, late arrivals after 10:00), CSV export.
- Realtime subscription on `office_swipes`.

## 8. Admin tab: Policies
- New table `company_policies`: title, body (markdown), version, effective_from, requires_acknowledgement, created_by.
- New table `policy_acknowledgements`: policy_id, user_id, acknowledged_at.
- `PoliciesPanel` admin: CRUD policies; `PoliciesViewer` for users on `/policies`. Unacknowledged "requires_ack" policies show a modal at next login.

## 9. Internal Panel (`/internal`) — Goodday.work migration
Single shell with sidebar tabs, employee/admin only:
- **Attendance** — pulls `office_swipes`, monthly heatmap.
- **Leave Requests** — `leave_requests` (type, from, to, reason, status); employees create, admins approve. Email via `email_notifications`.
- **Holiday Calendar** — `company_events` (date, title, type: holiday/event); month view, admin CRUD.
- **Org Directory** — read-only list of employees (name, designation, employee_id, manager); pulls from `profiles` + `user_roles` + `employee_id_cards`.

## 10. Profile updates
- Show `employee_id`, ID-card preview, and "Download ID Card" for employees.
- Show today's swipe status badge.

## Technical notes

**New deps**: `jspdf`, `qrcode`, `html5-qrcode`.

**Edge function** `verify-swipe-token`: validates QR token server-side (prevents tampering), returns ok + employee info, called by `/swipe-in`.

**Trigger** `auto_create_id_card_on_employee_role`: when `user_roles` gets an `employee` row, auto-create an `employee_id_cards` stub with a fresh qr_token.

**Routing additions** (`App.tsx`): `/swipe-in`, `/internal`, `/policies`.

**Realtime publications**: add `credit_payment_submissions`, `office_swipes`, `leave_requests` to `supabase_realtime`.

**RLS summary**:
- `office_swipes`: user reads own, admins read all, only system inserts via verified function.
- `employee_id_cards`: employee reads own, admins manage.
- `leave_requests`: employee CRUD own pending, admins manage all.
- `company_policies`: all authenticated read published; admins manage.
- `credit_payment_submissions`: user reads own + creates; admins read/update all.

## What I will NOT touch

- Existing model pricing, IDE, Marketing Studio, generate-code function — untouched.
- Enterprise tab is already removed; no further changes there.
- Logo asset itself — leaving a labeled placeholder slot. Send the file in your next message and I'll wire it.

## Suggested execution order

1. DB migration (all new tables, RLS, triggers, realtime).
2. Birthday gate + `is_profile_complete` update.
3. Credit payment submissions UI + realtime in admin.
4. ID card system + Office Swipe gate.
5. Office Visits + Policies admin tabs.
6. Internal Panel shell with the 4 modules.
7. Enterprise CSV export + audit polish.
8. SBPS confirmation modal.
