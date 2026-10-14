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

## Documents (encrypted file store)

Each uploaded file (max 100 MB, up to 20 per upload) is encrypted with its own random AES-256-GCM key
before it's written to Active Storage (`backend/storage/`); only ciphertext is stored. Per-file keys are
encrypted in the database with Active Record Encryption, whose keys live in `config/credentials.yml.enc`.
Document names and file names/types/sizes stay in plaintext so they're searchable. Files are decrypted
only when downloaded or previewed through the API, and their SHA-256 checksum is verified on every read.
Encryption and decryption stream in 1 MB chunks through tempfiles, so large files don't sit in memory;
decrypted tempfiles are deleted as soon as the download has been sent.

**Back up `backend/config/master.key`** (it's git-ignored). Without it the credentials — and therefore
every stored document — can't be decrypted. Tests use fixed test-only keys (`config/environments/test.rb`).

## Dependencies

- Backend: `bundle add <gem>` inside `backend/`; commit `Gemfile.lock`.
- Frontend: `bun add <pkg>` (or `bun add -d`) inside `frontend/`; commit `bun.lock`. Don't use npm/yarn here.
- UI components: [shadcn/ui](https://ui.shadcn.com) — add one with `bunx --bun shadcn@latest add <component>` inside `frontend/` (files land in `src/components/ui/`).
- CI installs with frozen lockfiles; Dependabot opens weekly update PRs for both.
