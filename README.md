# Lovable UI

generate the frontend part

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8a5b7547-67cb-4a3a-a89e-d4264059f5bf).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Backend (step 7 — authentication and permissions)

Centres retain a mock fallback. Farmer profile and crop registration use the API; failed saves show an error and keep the form open.

```sh
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Optional frontend env: `VITE_API_URL=http://127.0.0.1:8000`

Endpoints: `GET /api/farmers/me`, `GET /api/farmers/me/crops`, and `POST /api/farmers/me/crops`.
API documentation is available at `http://127.0.0.1:8000/docs`.

Farmer and crop data persist in `backend/data/kisansetu.sqlite3` (ignored by Git).
Override the path with `KISANSETU_DB_PATH`. The database seeds one demo farmer and two crops on first startup.
New crop registrations validate positive quantities, dates, units, languages, and whether the centre accepts the crop.
The seed Mustard crop uses Mandi A because Mandi B does not accept Mustard.

Farmers sign in to access their own data. Operators sign in to manage only their assigned centre. Profile editing remains a demo feature.

Run backend tests from `backend`: `.venv\Scripts\python -m unittest discover -s tests -v`.
Queue endpoints:

- `GET /api/queues/me`: latest farmer token, or null before joining.
- `POST /api/queues/{centre_id}/join`: join a centre; repeated joins return the existing active token.
- `GET /api/queues/{centre_id}`: active tokens, waiting count and counter capacity.
- `POST /api/queues/{centre_id}/call-next`: call the earliest waiting token when a counter is free.
- `POST /api/queues/{centre_id}/tokens/{token_id}/advance`: pass `expectedStage` (`grading` or `weighing`) to advance one stage. Stale requests return 409.

Queue tokens persist in the same SQLite database. Queues start empty; no artificial waiting farmers are seeded.
Only one active token is allowed per farmer across centres. Quality check and weighing occupy a counter until completion.
Wait estimates use unfinished farmers ahead and configured counter capacity. Centre catalogue load figures remain prototype data.
Queue pages poll every five seconds; refreshing never advances tokens. Demo reset does not modify persisted tokens.

Try it: start the backend and frontend, open `/farmer/queue`, and join the selected centre.
Sign in as the operator assigned to that centre in a separate browser session; open `/operator`, call the next farmer, then start weighing and complete procurement.
The farmer screen reflects each change on its next refresh. Reloading or restarting the API preserves the token.

Booking endpoints:

- `GET /api/bookings/me`: the farmer's saved booking, or null.
- `GET /api/bookings/slots/{centre_id}?day=YYYY-MM-DD`: slot availability.
- `POST /api/bookings/me`: confirm or replace a booking with `centreId`, `cropId`, `day`, and `slotId` (`s1`, `s2`, `s3`).
- `DELETE /api/bookings/me`: cancel the booking and release its capacity.

Booking uses three fixed one-hour windows starting at 10, 11, and 12 India time, from today through 30 days ahead.
Each window has one place per configured active counter; this is a prototype scheduling rule, not an ML prediction.
Started slots cannot be booked. Availability excludes the current farmer's reservation so they can retain their own place.
One booking is stored per farmer. Rebooking replaces it atomically; failures preserve the previous reservation.
Crop ownership and centre eligibility are validated, and crop scheduling status updates with the booking.
Duplicate confirmations return the existing reservation. Bookings persist after reload and API restart.

Use Select Centre → Book procurement slot to pick an eligible crop, date and time. The saved booking is shown on Home and Track.
Queue check-in remains a separate action and is not yet gated by a booking. Journey progress remains a demonstration.
Wait estimates:

- `GET /api/predictions/centres/{centre_id}` estimates the wait for a new arrival using the persisted queue.
- Queue token responses include `prediction` with the wait for that specific token, calculation inputs, method and limitations.
- Home and centre selection poll centre estimates; Live Queue polls the token's estimate every five seconds.

The rule is `floor((waitingAhead + serving) / activeCounters) × configuredProcessingMinutes`.
Waiting farmers who fit at free counters have zero estimated service-cycle delay; the operator must still call them.
Serving farmers conservatively occupy a counter for one full configured cycle. Called/completed tokens have zero wait to be called.
Zero counters return null (displayed as unavailable). Estimates use consistent database snapshots and never mutate the queue.
This is a transparent rule, not a trained ML model: there is no measured confidence score or learned processing-time predictor.
Centre catalogue load figures, map wait labels, and alternative ranking remain prototype data; they are not inputs to this estimate.

Notifications and delay recovery:

- `GET /api/notifications`, `POST /api/notifications/{id}/read`, and `POST /api/notifications/read-all` provide a persistent in-app inbox.
- Booking confirmation/cancellation, queue advancement, delay reporting, and recovery confirmation create notifications inside the same transaction as the event.
- `POST /api/recovery` saves a report with a UUID `requestId`, `reason` (`weather`, `vehicle`, `road`, `centre`, `other`), and timezone-aware `arrival`. Arrival must be in the future and within 30 days.
- `GET /api/recovery` lists saved reports; `GET /api/recovery/{id}/options` returns keep-current plus the earliest available slot at each eligible centre after the reported arrival.
- `POST /api/recovery/{id}/apply` accepts `optionId`. It rechecks the original booking and available options and atomically saves the booking, report resolution, and notifications.

Report retries with the same request ID are deduplicated; resolved recovery retries with the same option return the saved outcome.
Stale/full options and changed bookings return 409 without changing the reservation. Keeping a slot does not extend its arrival window.
Alternative-centre travel times are not included; review the centre before applying an option. Recovery options do not hold capacity until applied.
The delay page reloads saved reports. Notifications poll every ten seconds and preserve read state after restart.
Demo scenario notifications are separately labelled and remain local; resetting the demo does not clear the persistent inbox.
No SMS, email, push delivery, or external weather feed is implemented.

## Accounts and sessions

The app opens at sign-in. Create a farmer account with a unique username and a 12–128 character password.
Registration creates an empty farmer workspace; the historical seeded demo profile is not assigned to new accounts.
No default login credentials are created. Existing demo records remain in SQLite.

Create an operator from the backend directory using the existing virtual environment:

```powershell
.venv\Scripts\python -m app.create_operator operator-meerut mandi-a
```

The command prompts for the password without echoing it. Operator roles and centre assignments cannot be selected during public signup.
Operators can read and advance queues only at their assigned centre. Farmer routes reject operator credentials.
Farmers can access only their own profile, crops, bookings, tokens, reports, and notifications.
Centre catalogue and centre-level aggregate wait estimates remain public.

Auth endpoints: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout`.
Login/registration return an opaque bearer token; send it as `Authorization: Bearer <token>` for protected API calls.
Passwords use salted scrypt hashes. Only hashes of session tokens are stored in SQLite.
Sessions expire after eight hours and logout revokes the current session. Five failed logins lock that username for 15 minutes.
The frontend stores its token in tab-scoped sessionStorage and clears account caches on logout or session expiry.
Use HTTPS for deployment; password reset, MFA, and staff-management screens are not implemented.
Backend tests provision isolated authenticated fixtures; there is no runtime demo-auth bypass.

## Frontend verification

Run `npm run typecheck` and `npm run build` before shipping changes.
Workspace links follow the signed-in account's role. Government officers use `/admin/dashboard`;
operators use `/admin/queue` (the existing `/operator` remains available).

## Run the complete local website

The public homepage is the shared SIH presentation hub. It offers Farmer Dashboard
and Government Dashboard buttons and a five-step presentation walkthrough. Each
dashboard opens in its own tab so farmer and officer sessions remain separate while
using the same website, backend and database. Protected pages still require the correct
account role. A Presentation home link returns from either login/dashboard.

Before presenting, create a farmer account and provision a staff account using the
instructions below. Keep both servers running. No demonstration accounts, bookings or
statistics are created automatically by the presentation homepage.

After installing the frontend dependencies and the backend virtual environment described above:

```powershell
npm run dev:local
```

Open http://127.0.0.1:8081. Keep that terminal running. This starts FastAPI on port 8000,
waits for its health check, and starts Vite on port 8081. Both ports must be free.
The development frontend proxies `/api` to the backend, avoiding a separate-origin signup request.
If a server is stopped, account creation cannot work; the UI now explains backend connection failures.
`npm run dev` still starts just the frontend.

This is a local URL, not a public deployment. Production uses the PostgreSQL `DATABASE_URL`
injected by the Render Blueprint. For a separately deployed frontend set `VITE_API_URL`
at build time to the HTTPS backend origin and configure that frontend origin in backend CORS.
The current CORS configuration allows loopback development origins only. Never set a hosted frontend
to a localhost API: that points at each visitor's own computer.

## Government / mandi operations

To export farmer records to a new ZIP (run from `backend`):

```powershell
.venv\Scripts\python -m app.export_farmer_data ..\exports\farmer-data.zip
```

The export contains JSON profiles, crops, bookings, queue tokens, visits, notifications and delay
reports with a record-count manifest. It excludes passwords, sessions and staff accounts. It includes
stored farmer contact details, so keep it private. `exports/` is excluded from Git. This is a data
snapshot, not a database/login restore or a source-code bundle. Existing ZIP files are never overwritten.

The new protected interface reuses FastAPI, SQLite, sessions, TanStack Query, and existing UI components.
Pages: `/admin/dashboard`, `/admin/mandis`, `/admin/queue`, `/admin/farmers`, `/admin/slots`,
`/admin/procurement`, `/admin/analytics`, `/admin/notifications`, `/admin/reports`, `/admin/settings`.
The shared login redirects by role. No default staff password is created.

Provision staff from the `backend` directory (password is entered privately):

```powershell
.venv\Scripts\python -m app.create_staff officer government
.venv\Scripts\python -m app.create_staff operator-meerut operator --centre mandi-a
.venv\Scripts\python -m app.create_staff administrator super_admin
```

Public registration remains farmer-only. Operators can read their assigned mandi and manage its
queue and slots. Government and super-admin roles can use all admin APIs. Farmer data APIs retain
their ownership checks. Backend authorization enforces these restrictions independently of navigation.

Migrations run automatically at backend startup. Additive tables `account_roles`, `mandi_config`,
`operational_settings`, `managed_slots`, `visits`, `operational_events`, and `schema_migrations`
retain the original farmer, crop, booking, queue, and session tables. Staff role extensions use
`account_roles` so the old accounts table does not need to be rebuilt. Existing visits are backfilled
once from bookings/tokens without inventing historical timestamps or measured quantities.

Slots default to the existing s1/s2/s3 windows. Staff can add custom windows and edit capacity or
disable a window. Existing bookings are retained when disabled. Reducing capacity below reservations,
changing booked times, overlapping windows, and concurrent overbooking are rejected by the backend.
Custom slots appear through the existing farmer slot API and recovery options.

Queue updates record arrival, service, and completion times and notify the farmer. The detailed
admin statuses map to the existing farmer token stages. Completing procurement through the admin
queue requires an actual quantity in quintals. Completion through the legacy operator endpoint still
works; its missing measured quantity is disclosed and excluded from totals. Planned tonnes are
converted to quintals in visit snapshots and never counted as actual procurement.

Admin statistics come from shared records, not random/demo counts. Missing measurements show
`Not recorded`. Workload = active queue / configured queue capacity. Defaults: below 60% Normal,
60–80% Busy, above 80% Overloaded; no counters or explicit closure means Closed. Thresholds are
configurable on Settings. Alternatives require compatible crops, available queue capacity and future
slots; distance is straight-line between catalogue coordinates. This is rule-based, not AI.

Admin API summary (all paths prefixed `/api/admin`, bearer authentication required):

| Method       | Path                         | Parameters / body                                                    | Response                                                |
| ------------ | ---------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| GET          | `/dashboard`                 | optional `day`                                                       | metrics, mandi overview, current overload alerts        |
| GET          | `/mandis`, `/mandis/{id}`    | optional `day`                                                       | scoped mandi list / detail                              |
| GET          | `/mandis/{id}/alternatives`  | optional `day`                                                       | distance, wait, slots, capacity, shared crops           |
| PATCH        | `/mandis/{id}`               | `capacity`, `processingMin`, `activeCounters`, `closed`              | `{ok:true}`                                             |
| GET          | `/queue`                     | optional `centreId`, `day`, `status`                                 | visit records and waiting positions                     |
| PATCH        | `/queue/{visitId}`           | `expectedStatus`, `status`, `actualQuantityQuintals` on completion   | `{ok:true}`                                             |
| GET          | `/slots`                     | `centreId`, `day`                                                    | windows, capacity, booked farmers, remaining places     |
| POST / PATCH | `/slots`                     | `centreId`, `day`, `slotId`, `starts`, `ends`, `capacity`, `enabled` | `{ok:true}`                                             |
| GET          | `/farmers`                   | optional `search`, `centreId`, `crop`, `status`, `day`               | limited farmer directory; no phone or credentials       |
| GET          | `/procurement`, `/analytics` | optional `start`, `end` (up to 366 days)                             | recorded quantities, wait/processing metrics and trends |
| GET          | `/notifications`             | none                                                                 | activity, overload alerts and delay summaries           |
| GET          | `/reports`                   | optional `start`, `end`                                              | visits and summary                                      |
| GET          | `/reports/export`            | optional `start`, `end`                                              | `{filename,csv}` with formula-safe CSV cells            |
| GET / PATCH  | `/settings`                  | PATCH: `busyPercent`, `overloadedPercent`                            | current saved thresholds                                |

Dates use India time; recorded timestamps are timezone-aware. Changes are transactional and admin
views refresh every ten seconds. GET `/health` on port 8000 is a directly testable unauthenticated endpoint;
the complete request and response schemas are available at http://127.0.0.1:8000/docs.

Remaining scope: public backend deployment, production CORS, managed database/backups, password reset/MFA,
staff assignment UI, road-route travel times and external government integrations. Existing farmer demo
overlays, profile editing and catalogue load labels retain their prototype behavior. The admin dashboard
does not reuse those demo metrics. Historical missing measurements cannot be recovered retroactively.

## Complete SIH workflow

See [SIH_PROTOTYPE.md](SIH_PROTOTYPE.md) for the current shared-data integration, prediction baseline, SMS/IVR simulation, missed-slot recovery, API changes, environment variables, verification and presentation instructions.
