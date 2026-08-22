# اژدر | Agile Project Management

Agile project management platform for product teams — boards, backlogs, sprints, epics, calendar, and reports. Built in Persian (RTL).

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org) 16 (App Router, Server Actions)
- **Database:** PostgreSQL + [Prisma](https://www.prisma.io) 7
- **Auth:** [Auth.js](https://authjs.dev) v5 (credentials + JWT sessions)
- **UI:** Tailwind CSS 4, Radix UI, Lucide icons
- **Tests:** Vitest

## Prerequisites

- [Bun](https://bun.sh) 1.3+ (or Node.js 20+)
- Docker or a local PostgreSQL — for development the repo ships an embedded Postgres via `scripts/postgres.ts` (no install needed beyond Bun/Node)

## Getting Started

```bash
# 1. Install dependencies
bun install   # or: npm install

# 2. Configure environment
cp .env.example .env
# then set DATABASE_URL and AUTH_SECRET (generate with: bunx auth secret)

# 3. Start the database (embedded postgres on :5433)
bun run db:up

# 4. Apply migrations and seed demo data
bun run db:migrate
bun run db:seed

# 5. Run the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with a seeded user from `prisma/seed.ts`.

## Scripts

| Script              | Description                                  |
| ------------------- | -------------------------------------------- |
| `dev`               | Start the development server                 |
| `build`             | Create a production build                    |
| `start`             | Serve the production build                   |
| `lint`              | Run ESLint                                   |
| `typecheck`         | Run TypeScript type checking                 |
| `test`              | Run Vitest test suite                        |
| `db:up` / `db:down` | Start/stop the embedded development Postgres |
| `db:migrate`        | Apply pending migrations (`migrate deploy`)  |
| `db:seed`           | Seed the database with demo data             |

## Environment Variables

| Variable          | Required | Description                                                     |
| ----------------- | -------- | --------------------------------------------------------------- |
| `DATABASE_URL`    | Yes      | PostgreSQL connection string                                    |
| `AUTH_SECRET`     | Yes      | Auth.js secret — generate with `bunx auth secret`               |
| `AUTH_TRUST_HOST` | No       | Set to `true` when the app is not served behind HTTPS           |

Never commit `.env`. See `.env.example` for a template.

## Production Deployment

1. Provision a PostgreSQL instance and set `DATABASE_URL`.
2. Set `AUTH_SECRET` to a strong random value.
3. Install dependencies, apply migrations, and build:

   ```bash
   bun install --frozen-lockfile
   bun run db:migrate
   bun run build
   ```

4. Start the server:

   ```bash
   bun run start
   ```

> **Note:** `scripts/postgres.ts` is for local development only — use a managed/self-hosted PostgreSQL in production.

## Project Structure

```
src/
├── app/            # App Router pages & API routes
│   ├── (auth)/     # Login / register
│   └── (app)/      # Dashboard, projects, board, backlog, ...
├── components/     # UI components organized by feature
├── actions/        # Server actions
└── lib/            # Auth, session, prisma client, helpers
prisma/             # Schema, migrations, seed
scripts/            # Dev tooling (embedded postgres)
```
