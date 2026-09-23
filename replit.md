# CROWN & BLADE

CROWN & BLADE is a Cape Town barber shop website with a database-backed booking flow and calendar exports.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/crown-blade/` — customer-facing React site and brand styling.
- `artifacts/api-server/src/routes/barbershop.ts` — catalogue, availability, booking, promotion, and contact endpoints.
- `lib/api-spec/openapi.yaml` — source of truth for API contracts.
- `lib/db/src/schema/barbershop.ts` — PostgreSQL schema for services, barbers, bookings, and private contact messages.

## Architecture decisions

- Appointment dates and times are stored as local calendar values for Africa/Johannesburg, avoiding accidental date shifts in exports.
- Booking writes take a PostgreSQL advisory transaction lock per barber/day before overlap checks, preventing double-booking races.
- Calendar actions are client-side exports: Google Calendar uses an encoded event link and Apple Calendar uses an escaped `.ics` download.
- Customer records are write-only from the public API; availability returns times without exposing booking details.

## Product

Customers can explore services and barbers, submit a private enquiry, book without an account, apply the FIRSTCUT10 first-visit offer, and add a saved appointment to Google Calendar or Apple Calendar.

## User preferences

The requested brand direction is warm, editorial, premium but welcoming, with clear mobile usability and no fabricated social proof.

## Gotchas

- Run API codegen after changing `lib/api-spec/openapi.yaml`.
- The web build expects workflow-provided `PORT` and `BASE_PATH`; typecheck is the portable local check.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
