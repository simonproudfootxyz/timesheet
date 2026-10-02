# Timesheet

A single-user time tracker for hourly freelance work. Track time with a count-up timer or a countdown, organize it by client, project, and ticket, and export a CSV for invoicing.

## Stack

- Next.js (App Router) and Tailwind
- Neon Postgres, accessed with Drizzle and `@neondatabase/serverless`
- One shared password. There is no user table.

Route protection lives in `proxy.ts`. Next.js 16 replaced the old `middleware.ts` file with this convention.

## Local setup

1. Create a Neon project and copy its pooled connection string.
2. Copy the environment file and fill it in:

```bash
cp .env.example .env.local
```

`APP_PASSWORD` is the password you type on the sign-in page. Generate `AUTH_SECRET` with:

```bash
openssl rand -base64 32
```

3. Apply the database migration. This reads `.env.local` and talks to Neon over HTTP, same as the app:

```bash
npm run db:migrate
```

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first sign-in stores your browser's timezone. Weeks start on Monday. You can change the timezone later on the Clients page.

## Deploy on Vercel

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add `DATABASE_URL`, `APP_PASSWORD`, and `AUTH_SECRET` in the project environment variables.
4. Deploy. The build does not migrate the database. Run `npm run db:migrate` locally against the Neon database before the first deploy, or from any machine that has `DATABASE_URL` set.

## How time is stored

- Timestamps are stored in UTC. Day, week, and month totals are calculated in the saved timezone.
- An entry belongs to the day it started.
- Duration is exact. Reports and the CSV show decimal hours to two places. The billable amount is those hours times the client's current hourly rate.
- Only one timer can run at a time. Stop it before starting another.
- A countdown that reaches zero is saved for the full allotted time. Stopping early saves the elapsed time.
- If a countdown finishes while this tab is open, the app plays a sound, shows a banner, and sends a browser notification when permission has been granted. If the tab was closed, the same banner and sound happen the next time you open the app.
- The CSV matches the current report filters: period, date, and client.

## Scripts

- `npm run dev` — local development
- `npm run build` — production build
- `npm run db:generate` — create a new migration after a schema change
- `npm run db:migrate` — apply migrations to `DATABASE_URL`
