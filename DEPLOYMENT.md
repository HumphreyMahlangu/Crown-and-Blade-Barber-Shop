# Vercel deployment

This repository deploys as one Vercel project:

- the React/Vite application is served from Vercel's CDN;
- `api/[...path].ts` exposes the Express API as a Vercel Function;
- a PostgreSQL database stores services, barbers, bookings, and enquiries.

## Required Vercel configuration

1. Import `HumphreyMahlangu/Crown-and-Blade-Barber-Shop` in Vercel and leave the
   project root at the repository root.
2. Add a PostgreSQL integration such as Neon to the project.
3. Confirm that the integration created a `DATABASE_URL` environment variable
   for Production and Preview.
4. Apply the schema once with `pnpm run db:push`. Use
   `DATABASE_URL_UNPOOLED` for migrations; the configuration falls back to
   `DATABASE_URL` only when a direct connection is unavailable.
5. Deploy. Vercel reads the build and routing settings from `vercel.json`.

After deployment, verify `/api/healthz`, load each client-side route directly,
and complete a test booking and private enquiry.
