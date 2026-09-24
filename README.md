# Crown & Blade Barber Shop

A full-stack barber-shop website with service browsing, appointment booking,
promotion validation, calendar export, and private contact enquiries. The app
uses React and Vite for the web interface, Express for the API, Neon Postgres
for persistence, and Vercel for hosting.

## Project structure

```text
api/                         Vercel Function entrypoints
artifacts/crown-blade/       React/Vite web application
artifacts/api-server/        Express API and production bundler
lib/api-spec/                OpenAPI source and client-generation config
lib/api-client-react/        Generated browser API client
lib/api-zod/                 Generated request/response validation
lib/db/                      Drizzle schema and Postgres connection
scripts/preinstall.mjs       Package-manager guard
vercel.json                  Vercel build and routing configuration
```

Generated API files live under `lib/api-client-react/src/generated` and
`lib/api-zod/src/generated`. Update them through the API specification workflow
instead of editing them by hand.

## Requirements

- Node.js 24
- Corepack with pnpm 10.17.1
- `DATABASE_URL` for the application
- `DATABASE_URL_UNPOOLED` for schema changes (recommended)

## Commands

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm run build
corepack pnpm run db:push
```

Run the web application locally with:

```powershell
corepack pnpm --filter @workspace/crown-blade dev
```

Run the API locally after setting `DATABASE_URL` and `PORT`:

```powershell
corepack pnpm --filter @workspace/api-server dev
```

## Deployment

The repository is configured as one Vercel project. See
[`DEPLOYMENT.md`](./DEPLOYMENT.md) for the required database variables and
post-deployment checks.
