# Jarvis

| Directory   | Stack                          | Dev port |
|-------------|--------------------------------|----------|
| `backend/`  | Rails (API-only), Ruby 4.0.6   | 3000     |
| `frontend/` | React + Vite + TypeScript, Bun | 5173     |

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

Starts both apps via `Procfile.dev` (installs `foreman` on first run). Open http://localhost:5173.

Requests from the frontend to `/api/*` are proxied by Vite to Rails, so use relative URLs
(`fetch("/api/...")`) and put backend routes under `namespace :api` in `backend/config/routes.rb`.

## Dependencies

- Backend: `bundle add <gem>` inside `backend/`; commit `Gemfile.lock`.
- Frontend: `bun add <pkg>` (or `bun add -d`) inside `frontend/`; commit `bun.lock`. Don't use npm/yarn here.
- CI installs with frozen lockfiles; Dependabot opens weekly update PRs for both.
