# Namnik

_Personal assistant for Deepak._

Codename **jarvis** (repository and directory names); everything user-facing is branded Namnik.

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

## Account (sign-in)

Everything except the bare `/up` health status requires signing in. It's a single-user system;
create the account once from the `backend/` folder:

```sh
bin/rails auth:create_user        # prompts for username and password (min 10 characters)
bin/rails auth:reset_password     # new password; signs out every session
bin/rails auth:sign_out_everywhere
```

Sessions last a month (fixed from sign-in) and live in an httpOnly, SameSite=Lax cookie (Secure over
HTTPS); only a SHA-256 digest of the session token is stored. Sign-in is rate limited (10 attempts per
3 minutes per IP), and state-changing requests from other origins are rejected. Log out from Settings.

## Run

```sh
bin/dev
```

Starts both apps via `Procfile.dev` (installs `foreman` on first run). Open http://localhost:8000.

Requests from the frontend to `/api/*` are proxied by Vite to Rails, so use relative URLs
(`fetch("/api/...")`) and put backend routes under `namespace :api` in `backend/config/routes.rb`.

## Health check

`GET /up` returns JSON: `200` when the app and database are healthy, `503` otherwise (Kamal and load
balancers only look at the status code). It also includes host metrics — CPU, memory,
disk usage and I/O, network interfaces, and the Rails process — for a signed-in user; the dashboard polls it every 5s.

Signed-out requests get only the status. An external monitor can still get metrics in production by
sending `X-Health-Token` matching the `HEALTH_METRICS_TOKEN` environment variable. Metrics are read from
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

## Credentials (secure store)

Credential groups hold named credentials of three kinds, modelled with Rails `delegated_type`
(a polymorphic `secretable` association): `UsernamePassword`, `ApiKeyPair` and `SecretText`.
Every field is encrypted at rest with Active Record Encryption. List and detail responses include only
identifiers (username, API key); passwords, secret keys and secret text are returned solely by
`GET /api/credential_groups/:id/credentials/:id/secret` (`Cache-Control: no-store`) when you choose to
view or copy them. The UI hides a revealed secret after 30s or when the tab is hidden, and these
fields are filtered from the Rails logs.

## Dependencies

- Backend: `bundle add <gem>` inside `backend/`; commit `Gemfile.lock`.
- Frontend: `bun add <pkg>` (or `bun add -d`) inside `frontend/`; commit `bun.lock`. Don't use npm/yarn here.
- UI components: [shadcn/ui](https://ui.shadcn.com) — add one with `bunx --bun shadcn@latest add <component>` inside `frontend/` (files land in `src/components/ui/`).
- CI installs with frozen lockfiles; Dependabot opens weekly update PRs for both.
