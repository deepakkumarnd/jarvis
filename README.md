# Jarvis

_Personal assistant for Deepak._

A private, single-user web app for everyday personal information: bookmarks, notes, todos, encrypted
documents and credentials, plus a live view of the machine it runs on.

The name shown in the app (header, browser tab, favicon letter and login page) and the tagline come
from the settings record and can be changed in Settings. **Jarvis** is the fallback, used before you
sign in, before the account is set up, and while settings load.

## Features

| Area | What you can do |
|---|---|
| [Sign-in](#sign-in-and-security) | Single-user username/password login; sessions last a month; everything else is behind it |
| [Dashboard](#dashboard-and-system-health) | Quick links to every app and live system health: CPU, memory, disk, network, process; devices on your network |
| [Bookmarks](#bookmarks) | Save named links; list, search, edit and delete |
| [Notes](#notes) | Markdown notes with a formatting toolbar, live preview and rich rendering |
| [Todos](#todos) | Tasks with due dates, filters, inline editing and undo |
| [Documents](#documents) | Encrypted file store: drag-and-drop uploads, previews and downloads |
| [Credentials](#credentials) | Encrypted passwords, API keys and secret notes with view/copy on demand |
| [Settings](#settings) | Brand name and tagline, account details and log out |

### Sign-in and security

- One account, created from the terminal (see [Create your account](#create-your-account)) so nobody
  can claim it through the website.
- Sessions last **one month** from sign-in, in an httpOnly, SameSite=Lax cookie (Secure over HTTPS).
  Only a SHA-256 digest of each session token is stored.
- Every page and API endpoint requires sign-in, except the bare `/up` health status.
- Sign-in is rate limited (10 attempts per 3 minutes per IP); requests that change data are rejected
  if they come from another site.
- Opening any page while signed out takes you to the login page and back afterwards. If a session
  expires mid-use, cached data is cleared and you're returned to the login page.
- Log out from Settings.

### Dashboard and system health

- Cards linking to each app; the Todos card shows how many are open.
- **System health**, refreshed every 5 seconds:
  - Headline tiles with meters for CPU usage, memory, disk and load average. Meters turn amber with a
    "High" label at 70% and red with "Critical" at 90%.
  - CPU model, physical/logical cores, clock speed, load averages and per-core usage.
  - Memory and swap: total, used, available, free, cached and buffers.
  - Storage: filesystem usage plus per-disk read/write throughput and totals.
  - Network: each interface's state, addresses, MAC, speed, live receive/send rates, totals and errors.
    Virtual interfaces (Docker bridges, veth) are hidden behind a toggle.
  - Host (OS, kernel, architecture, uptime) and the Rails process (memory, threads, uptime, database
    latency).
- **Network devices**, rescanned every minute or on demand with **Scan now**:
  - The header shows the Wi-Fi network (SSID) the server is connected to, read from NetworkManager,
    or the interface name on a wired network.
  - Every device on the server's Wi-Fi/Ethernet network, with hostname, IP address, MAC address and
    vendor. The router and this server are labelled, and so are private (randomised) MACs, which
    phones use.
  - Found without root: Jarvis sends one empty UDP packet to each address on the subnet, so the
    kernel ARPs for it, then reads the neighbour table. Docker bridges and VPNs are skipped, as are
    subnets larger than /22. Devices that are asleep may not show until they wake.
  - Hostnames come from the router's DNS, then multicast DNS (Apple devices, many Android and
    smart-home devices, Linux with Avahi). For vendor names, install the IEEE list:
    `sudo apt install ieee-data`.

### Bookmarks

- Save a link with a name; only http(s) URLs are accepted.
- Table view, newest first, 50 per page; links open in a new tab.
- Search by name as you type. The search and page are kept in the URL.
- Add and edit in a dialog; delete with confirmation.

### Notes

- Notes have a title and a **Markdown** body.
- List view shows a card grid with a large rendered preview of each note, 50 per page, most recently
  edited first.
- Editor with **Write / Preview** tabs and a toolbar for headings, bold, italic, strikethrough, code,
  links, quotes, and bulleted, numbered and task lists.
- Keyboard shortcuts: Ctrl/⌘ + B, I, E or K to format; Ctrl/⌘ + S to save.
- Renders GitHub-flavoured Markdown: tables, task lists, strikethrough and autolinks. Raw HTML isn't
  rendered and unsafe links are stripped.

### Todos

- Add a todo with an optional due date; tick it off with the checkbox or by clicking its text.
- **All / Active / Completed** tabs with live counts.
- Ordered with open todos first, soonest due date first, then undated.
- Due date badges: _Today_, _Tomorrow_, and _Overdue_ in red for open todos past their date.
- Edit inline (Enter saves, Esc cancels). Deleting shows an **Undo** button for 6 seconds.
- **Clear completed** removes every finished todo after confirmation; 50 per page.

### Documents

- A document has a name and one or more related files. Upload by **drag and drop** or by browsing,
  with a progress bar.
- Up to **100 MB per file** and 20 files per upload.
- The list shows each document's files, total size and file types; search matches document names and
  file names; 50 per page.
- The detail page lists every file with its type and size, a **Download** link and, for PDFs, images and
  text files, a **Preview** button. You can also add more files, delete files, rename the document, or
  delete it.
- Previews open in a dialog: images inline, PDFs in the browser's viewer, and text showing the first
  200 KB. HTML and SVG files are shown safely, so scripts inside them never run.
- **Encrypted at rest:** see [Data and encryption](#data-and-encryption).

### Credentials

- **Groups** (for example, one bank or service) hold named credentials of three types:
  - **Username & password**
  - **API key & secret**
  - **Secret text** (recovery codes, PINs, notes; multi-line)
- Every field is encrypted at rest. Usernames and API keys are shown on the group page; passwords,
  secret keys and secret text stay masked.
- **View** loads a secret only when you click it, and hides it again after 30 seconds or when you
  switch tabs. **Copy** copies it without revealing it on screen.
- Editing leaves a secret unchanged if its field is left blank.
- Search groups by group or credential name (never by secret value); 50 per page.

### Settings

- **Branding:** change the brand name and tagline shown in the header, browser tab, favicon and login
  page, with a live preview. Defaults: "Jarvis" / "Personal assistant for Deepak".
- **Account:** who's signed in, since when and when the session expires, plus **Log out**.

### Across the app

- Clean interface built with [shadcn/ui](https://ui.shadcn.com) and [Lucide](https://lucide.dev) icons;
  works at phone widths.
- Search terms, filters and page numbers live in the URL, so reloads and back/forward keep your place.
- Confirmation dialogs before anything is permanently deleted, and short notices after saves.

## Tech stack

| Directory | Stack | Dev port |
|---|---|---|
| `backend/` | Rails 8 (API-only), Ruby 4.0.6, SQLite, Active Storage, RSpec | 8001 |
| `frontend/` | React 19 + Vite + TypeScript, Bun, Tailwind CSS v4, shadcn/ui, TanStack Query, React Router | 8000 |

## Getting started

### Prerequisites

- Ruby (version in `.ruby-version` / `backend/.ruby-version`)
- [Bun](https://bun.sh) (version pinned in `frontend/package.json` → `packageManager`)

### Setup

```sh
bin/setup
```

Installs gems and packages and prepares the database.

### Create your account

From the `backend/` folder:

```sh
bin/rails auth:create_user        # prompts for username and password (min 10 characters)
bin/rails auth:reset_password     # sets a new password and signs out every session
bin/rails auth:sign_out_everywhere
```

### Run

```sh
bin/dev
```

Starts both apps via `Procfile.dev` (installs `foreman` on first run). Open http://localhost:8000 and
sign in.

## Deploy on your home network (nginx + HTTPS)

Production runs on this machine as a systemd service (Puma on `127.0.0.1:8080`) behind nginx, which
serves the built frontend and terminates HTTPS. The certificate comes from a local certificate
authority made with [mkcert](https://github.com/FiloSottile/mkcert), and nginx only answers devices on
private (home) networks.

**First time**, from the repo root as your normal user (it asks for your sudo password):

```sh
deploy/setup.sh
```

It installs mkcert, creates and trusts the local CA, issues a certificate for
`<hostname>.local`, the LAN IP and `localhost`, offers to copy your development data into production,
builds and publishes the frontend to `/var/www/jarvis`, installs the `jarvis` systemd service and the
nginx site, and checks `https://…/up`. Override the names with
`SERVER_NAMES="jarvis.local 192.168.1.48 localhost" deploy/setup.sh`.

**Updates** after pulling or committing changes (no sudo):

```sh
bin/deploy
```

**Other devices** must trust the local CA once: install `$(mkcert -CAROOT)/rootCA.pem` as a trusted
root/CA certificate (the setup script prints per-platform steps). Never share `rootCA-key.pem`.
Devices reach the app at `https://<hostname>.local` via mDNS (Avahi), or by IP.

| What | Where |
|---|---|
| Service | `sudo systemctl status jarvis`, logs: `journalctl -u jarvis -f` |
| nginx site | `/etc/nginx/sites-available/jarvis`, snippets in `/etc/nginx/snippets/jarvis-*.conf` |
| Certificate | `/etc/nginx/ssl/jarvis.{crt,key}` (re-run `deploy/setup.sh` to renew; mkcert certificates last about 2 years) |
| Production data | `backend/storage/production*.sqlite3` and `backend/storage/production_files/` |

Production keeps its own database and document files, separate from development's, so you can keep
developing with `bin/dev` (ports 8000/8001) without touching production. Uploads stream through nginx
without being spooled to disk, and decrypted downloads are never written to nginx's temporary files.

## Data and encryption

- **Database and files** live in `backend/storage/` (SQLite plus Active Storage blobs; production uses
  `production*.sqlite3` and `production_files/`). This folder is git-ignored, so it holds the only copy
  of your data.
- **Documents:** each file is encrypted with its own random AES-256-GCM key before it's written to
  Active Storage; only ciphertext is stored. Per-file keys are encrypted in the database with Active
  Record Encryption. Files are decrypted only when downloaded or previewed, and their SHA-256 checksum
  is verified on every read. Encryption and decryption stream in 1 MB chunks, so large files never sit
  in memory, and decrypted temporary files are deleted as soon as the download is sent.
- **Credentials:** every field is encrypted with Active Record Encryption. Secrets are returned only by
  the dedicated secret endpoint (`Cache-Control: no-store`) and are filtered from the Rails logs.
- **Plaintext metadata:** document names, file names/types/sizes and credential names stay
  unencrypted so they're searchable.
- **Keys:** Active Record Encryption keys live in `backend/config/credentials.yml.enc`, which is
  unlocked by `backend/config/master.key`.

> **Back up `backend/config/master.key`** (it's git-ignored). Without it, the credentials file, and
> with it every stored document and credential, can't be decrypted.

### Moving to another computer

1. Stop the app (`sudo systemctl stop jarvis` and `bin/dev`); SQLite runs in WAL mode, so copy only
   while it's stopped.
2. Copy the code, `backend/storage/` and `backend/config/master.key` (keep the key private:
   `chmod 600`).
3. On the new machine, install Ruby, Bun and nginx, run `bin/setup`, then `deploy/setup.sh`.

## Health check

`GET /up` returns JSON: `200` when the app and database are healthy, `503` otherwise. Kamal and load
balancers only look at the status code, so it stays public.

Signed-out requests get only the status. Host metrics (CPU, memory, disk usage and I/O, network
interfaces and the Rails process) are included for a signed-in user. An external monitor can also get
them in production by sending `X-Health-Token` matching the `HEALTH_METRICS_TOKEN` environment
variable. Metrics are read from `/proc` and `/sys`, so they're Linux-only; elsewhere those sections
are `null`.

## API

All endpoints are under `/api`, return JSON and require a session cookie, except `POST /api/session`.
Lists are paginated with `?page=` (50 per page) and return `{ data, meta }`.

| Resource | Endpoints |
|---|---|
| Session | `GET`, `POST`, `DELETE /api/session` |
| Settings | `GET`, `PATCH /api/settings` |
| Bookmarks | `/api/bookmarks` CRUD; `GET /api/bookmarks/search?q=` |
| Notes | `/api/notes` CRUD (the list returns previews; `GET /api/notes/:id` returns the full body) |
| Todos | `/api/todos` CRUD with `?status=all\|active\|completed`; `DELETE /api/todos/completed` |
| Documents | `/api/documents` (multipart upload, `?q=` search), `POST`/`DELETE /api/documents/:id/files`, `GET …/files/:id/download[?disposition=inline]` |
| Credentials | `/api/credential_groups` (`?q=` search), `/api/credential_groups/:id/credentials`, `GET …/credentials/:id/secret` |
| Health | `GET /up` (outside `/api`) |

## Development

- Requests from the frontend to `/api/*` and `/up` are proxied by Vite to Rails, so use relative URLs
  (`fetch("/api/...")`) and put backend routes under `namespace :api` in `backend/config/routes.rb`.
- **Backend checks** (in `backend/`): `bundle exec rspec`, `bin/rubocop`, `bin/brakeman`, or all of them
  with `bin/ci`. Specs use FactoryBot and Faker, and request specs sign in automatically.
- **Frontend checks** (in `frontend/`): `bun run lint` and `bun run build` (type-checks and builds).
- **CI:** GitHub Actions runs the backend and frontend workflows when their folders change.

### Dependencies

- Backend: `bundle add <gem>` inside `backend/`; commit `Gemfile.lock`.
- Frontend: `bun add <pkg>` (or `bun add -d`) inside `frontend/`; commit `bun.lock`. Don't use npm/yarn here.
- UI components: add one with `bunx --bun shadcn@latest add <component>` inside `frontend/`
  (files land in `src/components/ui/`).
- CI installs with frozen lockfiles; Dependabot opens weekly update PRs for both.
