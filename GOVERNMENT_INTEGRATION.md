# Integration of the supplied government dashboard

The supplied `government dashboard.zip` contained a Next.js frontend with scenario
data from `lib/mock-data.ts`. It did not contain a backend or database connection.
Its command-centre layout is now adapted into the existing TanStack application at
`/admin/dashboard`, alongside the existing `/farmer/*` routes.

## Shared system

Both interfaces use the same FastAPI process, SQLite database, session authentication,
and API client. No second Next.js app, mock database, or duplicate auth system was added.
The source ZIP is unchanged. No farmer screen or farmer provider was modified by this merge.

The layout's navy palette is scoped to `.government-workspace`, including its centre
dialog, so it does not change Farmer Dashboard styling. The original section-card
component was reused, and the panel layout was adapted to the existing components.
The earlier admin home implementation was replaced rather than left as a duplicate route.

## Connected panels

| Panel                                                  | Shared source                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| Network KPIs, centre map, ranking and wait estimates   | `GET /api/admin/dashboard?day=...`                                  |
| Queue stage distribution                               | `GET /api/admin/queue?day=...`                                      |
| Recorded waiting trends                                | `GET /api/admin/analytics?start=...&end=...`                        |
| Centre details, configuration and alternative capacity | Existing mandi and alternative APIs                                 |
| Queue / slot actions                                   | Existing `/admin/queue` and `/admin/slots` mutation interfaces      |
| Disruptions and recovery                               | Shared farmer `delay_reports`, surfaced through admin notifications |
| Recent operations                                      | Persisted `operational_events`                                      |

Centre filters affect the centre-related panels; the interface explicitly labels
network and historical metrics separately. Refresh refetches the shared APIs, and
normal polling runs every ten seconds. Map positions derive from catalogue latitude
and longitude and are labelled schematic rather than a road/boundary map.

`GET /api/admin/notifications` now includes these additive recovery fields:
`farmerName`, `centreId`, `originalSlot`, `newSlot`, `destinationCentreId`,
`rescheduled`, and `createdAt`. Phone numbers, password hashes and sessions are not
exposed. Existing fields remain compatible. No schema migration was necessary.

Farmer recovery decisions remain farmer-confirmed and persist through the existing
booking API. Government users see the resulting booking rather than a local
"redirection applied" state. Queue and slot management continue to enforce assigned
mandi/operator permissions and transactional booking capacity.

## Prototype features replaced

Mock scenario switches, fixed timestamps, invented delta statistics, AI confidence
scores, synthetic forecasts and local-only success buttons are not used in the
connected interface. Waiting estimates are explicitly rule-based; historical charts
need actual measurements. Disruptions show farmer-submitted delays, not a connected
weather or traffic service. Recovery counts are explicitly the latest 100 reports.

## Files

Created: `src/components/government/CommandCentre.tsx`, `centre-panels.tsx`,
`charts.tsx`, `operations-panels.tsx`, `section-card.tsx`, and `government.css`.
Modified: `src/routes/admin.tsx`, `src/routes/admin.$section.tsx`,
`src/components/admin/Overview.tsx`, `src/services/adminService.ts`,
`backend/app/routers/admin.py`, and `backend/tests/test_admin.py`.

## Verification and running

All 20 backend tests pass, including a new farmer delay → recovery → government
visibility test. Type checking, production build and targeted integration lint pass.
Earlier repository-wide formatting errors remain documented in IMPLEMENTATION.md.
Browser checks passed for officer login, live centre filtering, native date changes,
shared centre details and mobile layout. At the mobile breakpoint, page width equals
viewport width; wide tables scroll inside their panels. Temporary test accounts
are removed after verification.

Run `npm run dev:local` and open http://127.0.0.1:8081. Government staff sign in at
http://127.0.0.1:8081/admin/dashboard. Provision staff privately using the CLI in
README.md; public signup only creates farmer accounts. Public backend deployment,
production CORS, external disruption feeds and trained predictions remain separate work.
