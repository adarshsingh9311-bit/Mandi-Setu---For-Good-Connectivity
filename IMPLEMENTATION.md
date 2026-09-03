# Government dashboard and signup verification

The existing Farmer Dashboard UI remains intact. The government interface uses
the same FastAPI backend and SQLite database, with additive schema migrations.
Existing farmer development changes present at the start were preserved.

## Run

From the project root, run `npm run dev:local`, then open http://127.0.0.1:8081.
This starts both servers; keep the terminal open. Backend health is
http://127.0.0.1:8000/health and API documentation is http://127.0.0.1:8000/docs.
The frontend API proxy and clearer connection errors address the local signup
failure when the frontend cannot reach its backend. This does not deploy a public API.

Government users sign in at `/admin/dashboard`. Staff provisioning, individual
startup commands, API methods/inputs/outputs and deployment requirements are in README.md.

## Changes

- Added dashboard, mandis/details/alternatives, queue, slots, farmers, procurement,
  analytics, notifications, CSV reports and configurable settings pages.
- Added `/api/admin/*` routes, with backend officer authorization and assigned-mandi
  restrictions for operators. Public signup still cannot create staff accounts.
- Extended shared booking, recovery and queue APIs to persist visit history and
  use managed slots. Original response contracts are retained.
- Added account role extensions, mandi configuration, managed slots, visit timing,
  measured procurement and operational event tables. Startup migration retains
  existing records and leaves unavailable historical measurements unknown.
- Used recorded quantities only for procurement totals. Overload rules default
  to 60%/80%; alternatives use compatible crops, free capacity and future slots.

## Verification

- 19 backend tests passed, including original farmer regressions and new admin tests.
- Covered authentication, session expiry/logout, ownership, role/mandi restrictions,
  persistent bookings, concurrent booking capacity, disabled slots, queue lifecycle,
  actual procurement quantities, analytics, CSV exports, thresholds and alternatives.
- Browser: farmer signup, logout and repeat login, Farmer Dashboard and mandi listing;
  government login and all ten admin pages; mobile navigation at 390 × 844.
- Transactional writes and farmer queue compatibility were exercised through API tests
  against temporary databases; browser checks did not create procurement data.
- `npm run typecheck`: passed. `npm run build`: passed (client and server output).
- `npm run lint`: repository-wide check found pre-existing formatting/line-ending
  errors. The Python virtualenv is now excluded from JS lint/format scans.
  Targeted lint on the new/edited government, auth, startup and proxy files passed
  with no errors; seven Fast Refresh export warnings remain.
- The in-app browser successfully created a local test farmer and redirected to
  `/farmer`, confirming that the signup fetch failure is resolved locally.

## Remaining limitations

Public backend deployment and production-origin CORS are not configured. Provision
real staff with the password-prompt CLI before using staff routes. Password reset,
MFA, staff assignment screens, road-route distances, external notifications and
government integrations remain future work. Existing farmer demo overlays/profile
editing/catalogue load labels retain their prototype behavior. Historical missing
times/quantities are explicitly unavailable. Legacy operator completions have no
measured quantity unless completed through the new admin queue flow.

## File inventory

The lists below include the earlier uncommitted backend/farmer integration work
preserved in this commit, as well as the government dashboard and signup fix.

### Created files

- IMPLEMENTATION.md
- backend/app/auth.py
- backend/app/create_operator.py
- backend/app/create_staff.py
- backend/app/export_farmer_data.py
- backend/app/database.py
- backend/app/notifications.py
- backend/app/operations.py
- backend/app/operations_schema.py
- backend/app/predictions.py
- backend/app/routers/admin.py
- backend/app/routers/auth.py
- backend/app/routers/bookings.py
- backend/app/routers/farmers.py
- backend/app/routers/notifications.py
- backend/app/routers/predictions.py
- backend/app/routers/queues.py
- backend/app/routers/recovery.py
- backend/app/scheduling.py
- backend/app/visit_events.py
- backend/tests/support.py
- backend/tests/test_admin.py
- backend/tests/test_auth.py
- backend/tests/test_bookings.py
- backend/tests/test_farmers.py
- backend/tests/test_predictions.py
- backend/tests/test_queues.py
- backend/tests/test_recovery.py
- scripts/dev-local.mjs
- src/components/admin/Insights.tsx
- src/components/admin/Management.tsx
- src/components/admin/Overview.tsx
- src/components/admin/shared.tsx
- src/lib/auth.tsx
- src/routes/admin.$section.tsx
- src/routes/admin.index.tsx
- src/routes/admin.tsx
- src/services/adminService.ts
- src/services/recoveryService.ts

### Modified files

- .gitignore
- .prettierignore
- README.md
- backend/app/main.py
- backend/app/models.py
- eslint.config.js
- package-lock.json
- package.json
- src/components/operations/OperationsShell.tsx
- src/components/shared/AIPredictionCard.tsx
- src/components/shared/DemoModePanel.tsx
- src/components/shared/RoleSwitcher.tsx
- src/lib/api.ts
- src/lib/demoStore.tsx
- src/routeTree.gen.ts
- src/routes/__root.tsx
- src/routes/farmer.alternatives.tsx
- src/routes/farmer.crop.tsx
- src/routes/farmer.index.tsx
- src/routes/farmer.notifications.tsx
- src/routes/farmer.procurement.tsx
- src/routes/farmer.profile.tsx
- src/routes/farmer.queue.tsx
- src/routes/farmer.report-delay.tsx
- src/routes/farmer.slot.tsx
- src/routes/farmer.track.tsx
- src/routes/index.tsx
- src/routes/operator.tsx
- src/services/farmerService.ts
- src/services/notificationService.ts
- src/services/predictionService.ts
- src/services/procurementService.ts
- src/services/queueService.ts
- vite.config.ts
