# Issue Tracker - Assessment Brief
Stack: Next.js (App Router, TypeScript), React 19, TanStack Query,
Tailwind, Recharts, MySQL, Prisma, Docker.
Auth: email+password, bcrypt, httpOnly session cookie (JWT).
Roles: admin, user. Enforce roles server-side in every API route.

Data: User(id,name,email,passwordHash,role),
Issue(id,title,description,priority[LOW|MEDIUM|HIGH],
status[OPEN|IN_PROGRESS|RESOLVED|CLOSED],createdById,assignedToId,
createdAt,updatedAt), Comment(id,issueId,userId,body,createdAt).

Features: register/login; create/edit issues; change status; comments;
list with filters (status, priority, assignee); dashboard (total,
by status chart, by priority chart, assigned to me).

Rules: small commits, one feature per phase, validate all input
(zod), no secrets in repo, provide .env.example, explain decisions
in README (setup, architecture, design decisions).
Deploy: Dockerfile + docker-compose (app + MySQL).
