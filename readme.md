<p align="center">
  <a href="https://www.typescriptlang.org"><img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" /></a>
  <a href="https://fastify.dev"><img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" /></a>
  <a href="https://www.prisma.io"><img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="https://www.postgresql.org"><img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
  <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" /></a>
  <a href="https://zod.dev"><img src="https://img.shields.io/badge/Zod-14220C?style=for-the-badge&logo=zod&logoColor=white" alt="Zod" /></a>
</p>

<h1 align="center">Pearl API</h1>

<p align="center">
  <strong>Production-style REST backend for the Pearl dental care experience.</strong><br />
  Sessions, bookings, optional marketing-lead ingestion — built for a modern Next.js client.
</p>

<p align="center">
  <a href="#installation">Installation</a> ·
  <a href="#environment-variables">Environment</a> ·
  <a href="#docker">Docker</a> ·
  <a href="#related">Frontend</a>
</p>

---

## Why this repository exists

**Pearl API** is the data and auth layer behind a patient-focused dental clinic site. Visitors to this repo will find a concise **Fastify** service with **PostgreSQL** via **Prisma**, cookie-based JWT sessions (access + refresh, httpOnly), and validation with **Zod**. It’s meant as a credible portfolio-grade backend: clear boundaries, migrations, Docker support, and no magic folder structure.

If you’re evaluating the codebase: start with **`src/server.ts`**, **`src/routes/v1.ts`**, and **`prisma/schema.prisma`**.

## Capabilities at a glance

| Area | What you get |
|------|----------------|
| **Auth** | Register, login, logout, refresh, `/v1/me` — passwords hashed with bcrypt |
| **Appointments** | Create requests and list the signed-in user’s history |
| **Marketing leads** | `POST /v1/lead-requests` with structured logging (Pino; file in production, console in development) |
| **Ops** | `/health` with DB probe, Docker Compose for Postgres + API, migrations on container start |

## Requirements

- **Node.js** 20+ (LTS recommended; **22** matches the production Docker image)
- **pnpm** (local dev) or **Docker** + Docker Compose
- A running **PostgreSQL** instance (Compose can provide one)

---

## Installation

### 1. Clone and enter the project

```bash
git clone https://github.com/sergeykovalev3/Pearl-back.git
cd Pearl-back
```

### 2. Environment file

**`.env.example` is intentionally not tracked** (see `.gitignore`). Create **`.env`** in the repo root with at least:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/pearl
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=your-secret-at-least-16-chars
LEAD_REQUEST_LOG_PATH=logs/lead-requests.ndjson
LOG_LEVEL=info
```

- **`DATABASE_URL`** — Prisma connection string (see [Prisma docs](https://www.prisma.io/docs/orm/reference/connection-urls)).
- **`CORS_ORIGIN`** — Browser origin(s) allowed to call the API with cookies (full URL with **scheme**, e.g. `https://app.example.com`). Use a **comma-separated** list for multiple origins. A hostname **without** `https://` is normalized automatically (same rule as a URL base). Do not use `*` with cookie credentials.
- **`JWT_SECRET`** — Minimum **16 characters**; keep it secret in production.

In a **monorepo** with `ENVIRONMENT.md` at the parent folder, you can cross-check variable semantics there.

### 3. Install dependencies and database

```bash
pnpm install
pnpm exec prisma migrate deploy
```

(`postinstall` runs `prisma generate` so the client is always present after install.)

### 4. Run the API (development)

```bash
pnpm dev
```

- **API:** `http://localhost:4000` (or your `PORT`)
- **Health:** `GET http://localhost:4000/health`

---

## Docker

### Postgres only (API on the host)

```bash
docker compose up postgres -d
# set DATABASE_URL in .env to point at localhost:5432, then:
pnpm exec prisma migrate deploy
pnpm dev
```

### Full stack (Postgres + API) — one command

From the **`Pearl-back`** repository root:

```bash
./scripts/docker-up.sh
```

If `.env` is missing, the script creates it (from **`.env.example`** if you keep one locally, otherwise from a small embedded default), then runs **`docker compose up -d --build --wait`**. Migrations run inside the API container before the server starts. Lead logs are available under **`./logs/`** on the host (bind mount).

Equivalent without the shell script:

```bash
docker compose up -d --build --wait
```

(ensure `.env` exists next to `docker-compose.yml` for `JWT_SECRET`, `CORS_ORIGIN`, etc.)

---

## API overview

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/` | Service stub |
| `GET` | `/health` | Liveness + DB check |
| `POST` | `/v1/auth/register` | Sets httpOnly access + refresh cookies |
| `POST` | `/v1/auth/login` | Same cookie contract |
| `POST` | `/v1/auth/refresh` | New access cookie from refresh cookie |
| `POST` | `/v1/auth/logout` | Clears cookies |
| `GET` | `/v1/me` | Current user (cookie or `Authorization: Bearer`) |
| `POST` | `/v1/appointments` | Appointment request (optional guest / user linkage per your schema) |
| `GET` | `/v1/me/appointments` | Authenticated user’s appointments |
| `POST` | `/v1/lead-requests` | Public marketing lead payload (`patient-welcome` \| `care-contact`) |

In **production** (`NODE_ENV=production`), cookies use **`Secure`**, **`SameSite=None`**, and **`Partitioned`** (CHIPS) so auth works when the Next.js app and this API are on **different hostnames** (e.g. two Railway services) and Chrome does not treat them as legacy third-party cookies. In **development**, cookies use **`SameSite=Lax`** without partitioning for simpler local HTTP.

---

## Environment variables

Formal contract is **`src/env.ts`** (Zod). Summary:

| Variable | Required | Default |
|----------|----------|---------|
| `DATABASE_URL` | yes | — |
| `JWT_SECRET` | yes (≥16 chars) | — |
| `NODE_ENV` | no | `development` |
| `PORT` | no | `4000` |
| `CORS_ORIGIN` | no | `http://localhost:3000` |
| `LEAD_REQUEST_LOG_PATH` | no | `logs/lead-requests.ndjson` |
| `LOG_LEVEL` | no | `info` |

Docker Compose also injects `JWT_SECRET`, `CORS_ORIGIN`, `LEAD_REQUEST_LOG_PATH`, and `LOG_LEVEL` from a **`.env`** file next to `docker-compose.yml`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Dev server with `tsx watch` |
| `pnpm run build` | Compile TypeScript to `dist/` |
| `pnpm start` | Run `node dist/server.js` |
| `pnpm run db:migrate` | `prisma migrate dev` |
| `pnpm run db:deploy` | `prisma migrate deploy` |
| `pnpm run db:studio` | Prisma Studio |
| `pnpm docker:up` | `docker compose up -d --build --wait` |

---

## Related

<p align="center">
  <a href="https://github.com/sergeykovalev3/Pearl-front">
    <img src="https://img.shields.io/badge/Next.js%20Frontend-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Pearl Front on GitHub" />
  </a>
</p>

The companion site is **[Pearl-front](https://github.com/sergeykovalev3/Pearl-front)**. The Next.js app should set **`NEXT_PUBLIC_API_URL`** to this API’s public base URL and call auth routes with **`fetch(..., { credentials: "include" })`** so httpOnly cookies flow correctly.

---

## Production checklist

- Rotate **`JWT_SECRET`** and store it in a secret manager.
- Set **`CORS_ORIGIN`** to real HTTPS front-end origin(s).
- Terminate TLS everywhere so **`Secure`** cookies work.
- Replace default **Postgres** credentials in Compose (or use managed DB + secrets).
- Consider rate limiting on **`/v1/auth/*`** and **`/v1/lead-requests`**.

---

<p align="center">
  Built with care for clarity and deployability — PRs and issues welcome.
</p>
