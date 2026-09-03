# MandiSetu SIH prototype

## Run the shared system

From the repository root, after the existing dependency setup in README:

```powershell
npm run dev:local
```

Open http://127.0.0.1:8081. This starts FastAPI on port 8000, the frontend on
8081, and a 60-second reminder/missed-slot worker. Keep the terminal running.
The existing `npm run dev` frontend on port 8080 can use the same backend.

To populate the shared local database with repeatable, clearly labelled SIH
showcase records, stop the combined server once and run `npm run seed:sih`.
Restart with `npm run dev:local`. The seed preserves existing users and adds ten
showcase farmers, live queue stages, completed procurement, a missed slot,
future bookings, notifications, an SMS simulation and an overload alert.

For an SIH presentation, open `/government/login`, enter any display name in
**Quick SIH demo access**, and select **Open Government Demo**. The combined
launcher enables this password-free route only for the local demo process via
`MANDISETU_DEMO_ACCESS=1`; deployments and ordinary backend starts keep it
disabled. The resulting session still uses the government role and all backend
authorization checks.

For separate processes:

```powershell
# Backend directory
$env:MANDISETU_JOBS_ENABLED = '1'
.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Repository root, another terminal
npm run dev
```

SQLite starts automatically; no database server is needed. The single database
is `backend/data/kisansetu.sqlite3`, with additive migrations at backend startup.
Do not run the combined launcher alongside another backend on port 8000.

## Roles and URLs

The homepage links to the two protected portals. `/farmer/login` and
`/farmer/dashboard` are compatibility redirects to the existing farmer workspace.
`/government/login` and `/government/dashboard` redirect to `/admin/dashboard`.
Existing URLs remain supported. Backend roles remain `farmer`, `operator`,
`government`, and `super_admin` to preserve existing accounts and API clients.

Create staff privately from `backend`, using the existing password-prompting CLI:

```powershell
.venv\Scripts\python -m app.create_staff officer government
```

Public registration creates farmers only. It now accepts an optional mobile number.
Separate tabs keep farmer and staff sessions independent. Never use real account
passwords in a presentation or commit them to source control.

## Demonstration sequence

1. Register/sign in as a farmer, register a crop, select a mandi and book a future slot.
2. Open the government portal in a separate tab. Queue lists the same farmer and
   booking. A future booking is incoming demand, not a physically waiting farmer.
3. In government Queue, change the visit from Booked to Checked In. The farmer
   Track page shows the recorded timestamp; live active queue/load increases.
4. In Analytics, select a mandi and click Generate prediction. Results are stored
   with model version, inputs, historical sample count and generation time.
5. In Mandis, open the selected mandi and enable Staff overload override. The
   calculated percentage stays truthful; the operational status changes to
   Overloaded. Clear the override after the demonstration.
6. The farmer sees updated status through polling. Alternative Centres uses the
   selected crop and booked date, shared slot capacity and mandi configuration.
   Distances between mandis are straight-line estimates. Selection is not a forced
   rebooking; the farmer confirms a new slot before it changes the reservation.
7. Government Notifications shows SMS event records, including confirmation,
   queue updates, overload messages and recovery messages. Demo records explicitly
   say `simulated_not_delivered`; no real SMS is sent.
8. In farmer Quick Actions, open IVR demo. Choose Hindi/English and a menu action.
   Responses read the logged-in farmer's booking, queue and procurement records.
   The government Notifications page shows the resulting simulation activity.
9. Complete Quality Check → Procurement → Completed from the government queue,
   entering actual procured quantity. Check farmer Track and government Procurement.
10. For recovery, create another booking and mark it Missed in Queue. The farmer's
    Recover missed slot page offers future available slots; successful rebooking
    appears in government Notifications. Automatic expiry runs after slot end plus
    the configured grace period. Checked-in visits are not automatically expired.

Existing delay reporting/recovery is retained. The prototype does not populate a
fake operational dataset when APIs fail. Live mandi data and bookings refresh every
10 seconds; farmer queue and tracking refresh every 5 seconds. Reports and historical
charts require actual recorded visits and quantities.

## API additions and compatibility

- `GET /api/farmers/me/visits`: authenticated farmer's visit history and timestamps.
- `GET /api/centres`, `/{id}`: existing shape preserved, now backed by persisted
  catalogue and live queue/configuration. Adds operationalStatus, availableCapacity,
  availableSlots and waitAvailable. For closed centres, legacy numeric wait is zero
  and waitAvailable is false; the prediction API returns an unavailable wait.
- `GET /api/centres/{id}/alternatives?crop=...&day=YYYY-MM-DD`: shared crop-aware
  ranking by estimated wait plus travel minutes at an assumed 30 km/h; capacity
  breaks ties. Government alternatives reuse the same ranking and accept crop/day.
- `PATCH /api/admin/mandis/{id}`: existing configuration body additionally accepts
  `overloaded`; this is an explicit staff override, not a fabricated load value.
- `POST /api/admin/predictions/{id}?horizonMin=60`: government-only forecast;
  supported horizon is 15–360 minutes. Results persist in prediction_records.
- `GET /api/admin/communications`: latest 100 SMS and IVR records, government-only.
- `POST /api/communications/ivr/simulate`: farmer-only, body `{language, action}`;
  languages en/hi; actions slot, queue, waiting, alternative, procurement.
- `GET /api/missed-slots`: farmer's missed visit/recovery history.
- `GET /api/missed-slots/{visitId}/options`: future crop-compatible slot options.
- `POST /api/missed-slots/{visitId}/rebook`: body `{centreId,cropId,day,slotId}`;
  transactional capacity validation, ownership checks and retry-safe recovery.
- `GET /api/admin/missed-slots`: government recovery monitoring.
- `POST /api/admin/missed-slots/sweep`: run the idempotent reminder/expiry job now.
- Existing registration accepts optional `mobile`; all existing fields remain valid.

Existing queue, booking, farmer and government API namespaces remain in place.
No duplicate `/api/queue` or public government-data API was introduced.

## Database changes

Added tables in the SAME SQLite database: mandis, mandi_overrides,
prediction_records, communication_events, ivr_sessions, redirect_requests,
missed_recoveries and delivery_keys. Existing visits remain the procurement and
missed-slot source; bookings, queue_tokens, notifications and operational settings
are reused. Catalogue seed values supply identity/location/crop metadata only;
operational counts are computed from actual records. Old data is not dropped.

## Configuration and deployment

- `DATABASE_URL`: required in production; Render injects the single PostgreSQL
  connection string from the `mandisetu-db` resource.
- `KISANSETU_DB_PATH`: local test/development compatibility only. Production
  selects PostgreSQL whenever `DATABASE_URL` is present.
- `VITE_API_URL`: optional frontend build-time HTTPS API origin. Unset uses
  same-origin `/api`; production no longer falls back to localhost.
  The Vercel production build uses `https://mandisetu-api.onrender.com` from
  `.env.production`; this is a public service origin, not a secret.
- `MANDISETU_CORS_ORIGINS`: comma-separated authorized production frontend origins.
- `MANDISETU_JOBS_ENABLED=1`: enable scheduled reminders and missed-slot expiry.
  The combined local launcher enables it automatically.
- `MANDISETU_MISSED_GRACE_MINUTES`: default 30, applied after the slot ends.
- `MANDISETU_SMS_MODE`: defaults to demo. Other values record `not_configured`;
  there is no implemented real SMS adapter or delivery claim.

For hosting, deploy the Vite/Nitro frontend to its configured supported runtime.
The root `render.yaml` provisions a free FastAPI web service and one free Render
PostgreSQL database. It connects them through `DATABASE_URL`, initializes the schema,
and adds the SIH showcase data on first deploy. Set authorized CORS origins and
configure either a same-origin `/api` reverse proxy or `VITE_API_URL` before building
the frontend. Use HTTPS. SQLite remains available only for local compatibility tests.

## Verification and limitations

Backend regression suite: 23 tests pass, covering farmer registration/authentication,
ownership, staff scopes, booking concurrency, queue stages, measured procurement,
prediction access, SMS/IVR simulation, override visibility and missed recovery.
Run from backend: `.venv\Scripts\python -m unittest discover -s tests -v`.
Run frontend checks from root: `npm run typecheck`, `npm run build`, `npm run lint`.
Scoped changed-file lint passes; repository-wide lint retains the pre-existing
formatting/line-ending backlog. Do not mass-reformat the farmer UI as part of this feature.

Browser verification includes account creation, crop registration, slot confirmation,
the same booking in government Queue, government check-in reflected in farmer Track,
government prediction generation and Hindi IVR activity visible to government.

Prediction is an explainable baseline, not trained ML. Future load uses incoming
bookings within the horizon, active counters, measured service durations when
available, and a disclosed configured fallback. It assumes continuous service and
does not predict unbooked arrivals. Actual waiting-time prediction remains a
service-cycle estimate. No road-routing, weather, external government feed, real
SMS delivery, phone calls, inbound caller verification or trained AI is claimed.
Real SMS/telephony adapters and their environment-based credentials are future work.

## Files changed in this implementation

Modified:

- `backend/app/main.py`
- `backend/app/models.py`
- `backend/app/notifications.py`
- `backend/app/operations.py`
- `backend/app/operations_schema.py`
- `backend/app/predictions.py`
- `backend/app/routers/admin.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/bookings.py`
- `backend/app/routers/centres.py`
- `backend/app/routers/farmers.py`
- `backend/app/routers/queues.py`
- `backend/app/store.py`
- `backend/tests/test_admin.py`
- `backend/tests/test_farmers.py`
- `scripts/dev-local.mjs`
- `src/components/admin/Insights.tsx`
- `src/components/admin/Overview.tsx`
- `src/components/shared/DemoBadge.tsx`
- `src/components/shared/LoadBar.tsx`
- `src/components/shared/MandiMap.tsx`
- `src/components/shared/StatusBadge.tsx`
- `src/data/mockData.ts`
- `src/lib/api.ts`
- `src/lib/auth.tsx`
- `src/lib/demoStore.tsx`
- `src/routeTree.gen.ts`
- `src/routes/admin.$section.tsx`
- `src/routes/farmer.alternatives.tsx`
- `src/routes/farmer.index.tsx`
- `src/routes/farmer.procurement.tsx`
- `src/routes/farmer.track.tsx`
- `src/routes/farmer.tsx`
- `src/services/adminService.ts`
- `src/services/farmerService.ts`
- `src/services/mandiService.ts`

Created:

- `SIH_PROTOTYPE.md`
- `backend/.dockerignore`
- `backend/Dockerfile`
- `backend/app/communications.py`
- `backend/app/ivr.py`
- `backend/app/mandi_state.py`
- `backend/app/missed_slots.py`
- `backend/app/routers/communications.py`
- `backend/app/routers/missed_slots.py`
- `src/components/admin/Predictions.tsx`
- `src/routes/farmer.dashboard.tsx`
- `src/routes/farmer.ivr.tsx`
- `src/routes/farmer.login.tsx`
- `src/routes/farmer.missed-slots.tsx`
- `src/routes/government.dashboard.tsx`
- `src/routes/government.login.tsx`
- `src/services/communicationService.ts`
- `src/services/missedSlotService.ts`
