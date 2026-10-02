# Issue Tracker

A full-stack issue tracking app: users register, create and update issues,
comment, filter, and view a dashboard.

**Live app:** <https://issue-tracker-assessment.onrender.com>
> Hosted on free tiers: the first request after a period of inactivity can
> take 30-60 seconds while the server wakes up.

**Demo logins:** <admin and standard user email/passwords, or "sent with my submission">.
You can also register a new account (new accounts are standard users).

## Tech stack
Next.js (App Router), React 19, TanStack Query, Tailwind CSS, Recharts,
Next.js API routes, Prisma 6, MySQL, Docker. Deployed on Render (app) and
TiDB Cloud (MySQL-compatible database).

## Features
- Registration and login, with **admin** and **user** roles
- Create issues, edit them, change status, add comments
- Filter by status, priority, and assignee
- Dashboard: total issues, issues by status and by priority (charts), and
  the issues assigned to you

## Run locally with Docker
1. Create `.env` in the project root:
```
   JWT_SECRET=<random string, at least 32 characters>
```
2. `docker compose up --build` (starts MySQL and the app, and applies migrations)
3. Open http://localhost:3000
4. To create the two starter accounts:
```
   docker compose exec -e SEED_ADMIN_PASSWORD=<pw> -e SEED_USER_PASSWORD=<pw> app npm run db:seed
```
   (or just register through the UI)

## Run locally without Docker for the app
1. `docker compose up -d db`
2. Create `.env`:
```
   DATABASE_URL="mysql://appuser:apppassword@localhost:3306/issue_tracker"
   JWT_SECRET="<random string, at least 32 characters>"
```
3. `npm install`, `npx prisma migrate deploy`, `npm run dev`

## Environment variables
| Name | Purpose |
|---|---|
| `DATABASE_URL` | MySQL connection string |
| `JWT_SECRET` | Signs session tokens (32+ characters, never commit it) |
| `NODE_ENV` | `production` on the server (makes the cookie `secure`) |
| `SEED_ADMIN_PASSWORD`, `SEED_USER_PASSWORD` | Used only by `npm run db:seed` |

## Architecture
One Next.js codebase: React pages in `src/app`, REST-style API route handlers
in `src/app/api`, shared logic in `src/lib` (auth, validation, API helper),
and Prisma for data access (`prisma/schema.prisma`: User, Issue, Comment).
The browser talks to the API through TanStack Query hooks in `src/hooks`.

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/register`, `/login`, `/logout` | Authentication |
| `GET /api/auth/me` | Current user |
| `GET, POST /api/issues` | List (filters) and create |
| `GET, PATCH /api/issues/[id]` | Read and update |
| `POST /api/issues/[id]/comments` | Add a comment |
| `GET /api/users` | Users for the assignee dropdown |
| `GET /api/dashboard` | Dashboard statistics |

## Design decisions
- **Permissions are enforced on the server.** Any logged-in user can create
  issues and comment; only an admin, the creator, or the assignee can edit.
  The UI hides controls, but the API is the real gate (verified: an unrelated
  user gets 403).
- **Sessions:** a signed JWT (HS256, `jose`) in an httpOnly, SameSite cookie,
  `secure` in production. Passwords are hashed with bcrypt (cost 12). Login
  compares against a dummy hash when the email is unknown so timing doesn't
  reveal which emails exist.
- **Roles can't be self-assigned:** registration ignores any role in the request.
- **Validation:** every input is validated with zod, with clear 400/401/403/404/422 responses.
- **Prisma 6:** chosen over 7 because 7 needs a driver adapter for MySQL.
- **Dashboard counts are computed in the database** (`groupBy`/`count`) instead of in the browser.
- **Cache:** after each mutation the relevant TanStack Query caches are invalidated so lists stay current.
- **Docker:** one image; migrations run on container start (`prisma migrate deploy`).
- **Hosting:** free tiers (Render + TiDB Cloud), hence the cold start.

## Known limitations / what I'd improve
No rate limiting on login, no pagination, no issue deletion, roles are stored
in the token (a demoted user keeps access until it expires), and no automated tests.