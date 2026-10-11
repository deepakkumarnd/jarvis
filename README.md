# Jarvis

| Directory   | Stack                          | Dev port |
|-------------|--------------------------------|----------|
| `backend/`  | Rails (API-only), Ruby 4.0.6   | 8001     |
| `frontend/` | React + Vite + TypeScript, Bun | 8000     |

## Prerequisites

- Ruby (version in `backend/.ruby-version`)
- [Bun](https://bun.sh) (version pinned in `frontend/package.json` → `packageManager`)

## Setup

```sh
bin/setup
```

## Run

```sh
bin/dev
```

Starts both apps via `Procfile.dev` (installs `foreman` on first run). Open http://localhost:8000.

Requests from the frontend to `/api/*` are proxied by Vite to Rails, so use relative URLs
(`fetch("/api/...")`) and put backend routes under `namespace :api` in `backend/config/routes.rb`.

## Health check

`GET /up` returns JSON: `200` when the app and database are healthy, `503` otherwise (Kamal and load
balancers only look at the status code). In development it also includes host metrics — CPU, memory,
disk usage and I/O, network interfaces, and the Rails process — which the dashboard polls every 5s.

In production metrics are withheld unless the request sends `X-Health-Token` matching the
`HEALTH_METRICS_TOKEN` environment variable, so host details aren't public. Metrics are read from
`/proc` and `/sys`, so they're Linux-only; elsewhere those sections are `null`.

## Dependencies

- Backend: `bundle add <gem>` inside `backend/`; commit `Gemfile.lock`.
- Frontend: `bun add <pkg>` (or `bun add -d`) inside `frontend/`; commit `bun.lock`. Don't use npm/yarn here.
- UI components: [shadcn/ui](https://ui.shadcn.com) — add one with `bunx --bun shadcn@latest add <component>` inside `frontend/` (files land in `src/components/ui/`).
- CI installs with frozen lockfiles; Dependabot opens weekly update PRs for both.
