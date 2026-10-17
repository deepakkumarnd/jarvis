#!/usr/bin/env bash
# One-time setup: Jarvis on this machine behind nginx with HTTPS for your home network.
# Run as your normal user from the repo; it asks for your sudo password when needed.
#
#   deploy/setup.sh
#
# Override defaults with environment variables, e.g.
#   SERVER_NAMES="jarvis.local 192.168.1.48 localhost" APP_PORT=8080 deploy/setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_USER="$(id -un)"
RUN_GROUP="$(id -gn)"
LAN_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | grep -oP 'src \K\S+' || true)"
SERVER_NAMES="${SERVER_NAMES:-$(hostname -s).local ${LAN_IP} localhost 127.0.0.1}"
APP_PORT="${APP_PORT:-8080}"
WEB_ROOT="${WEB_ROOT:-/var/www/jarvis}"
SSL_DIR=/etc/nginx/ssl
RUBY_VERSION="$(cat "$ROOT/backend/.ruby-version" | sed 's/^ruby-//')"
RUBY_WRAPPERS="${RUBY_WRAPPERS:-$HOME/.rvm/wrappers/ruby-$RUBY_VERSION}"

step() { printf '\n== %s\n' "$*"; }
render() { # render TEMPLATE > OUTPUT, replacing @@VARS@@
  sed -e "s|@@SERVER_NAMES@@|$SERVER_NAMES|g" -e "s|@@APP_PORT@@|$APP_PORT|g" -e "s|@@WEB_ROOT@@|$WEB_ROOT|g" \
      -e "s|@@SSL_CERT@@|$SSL_DIR/jarvis.crt|g" -e "s|@@SSL_KEY@@|$SSL_DIR/jarvis.key|g" \
      -e "s|@@HTTP_PORT@@|80|g" -e "s|@@HTTPS_PORT@@|443|g" -e "s|@@HTTPS_PORT_SUFFIX@@||g" \
      -e "s|@@ACCESS_INCLUDE@@|/etc/nginx/snippets/jarvis-access.conf|g" \
      -e "s|@@PROXY_INCLUDE@@|/etc/nginx/snippets/jarvis-proxy.conf|g" \
      -e "s|@@USER@@|$RUN_USER|g" -e "s|@@GROUP@@|$RUN_GROUP|g" -e "s|@@APP_DIR@@|$ROOT|g" \
      -e "s|@@RUBY_WRAPPERS@@|$RUBY_WRAPPERS|g" "$1"
}

echo "Jarvis will be served at: $(for n in $SERVER_NAMES; do printf 'https://%s ' "$n"; done)"
[[ -x "$RUBY_WRAPPERS/bundle" ]] || { echo "Ruby wrappers not found at $RUBY_WRAPPERS (set RUBY_WRAPPERS)." >&2; exit 1; }
[[ -f "$ROOT/backend/config/master.key" ]] || { echo "backend/config/master.key is missing." >&2; exit 1; }
command -v nginx >/dev/null || [[ -x /usr/sbin/nginx ]] || { echo "nginx is not installed (sudo apt install nginx)." >&2; exit 1; }

step "Installing mkcert (local certificate authority)"
command -v mkcert >/dev/null || sudo apt-get install -y mkcert libnss3-tools
mkcert -install   # creates your local CA and trusts it on this machine (system + browsers)

step "Issuing the TLS certificate for: $SERVER_NAMES"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# shellcheck disable=SC2086
mkcert -cert-file "$TMP/jarvis.crt" -key-file "$TMP/jarvis.key" $SERVER_NAMES
sudo install -d -m 755 "$SSL_DIR"
sudo install -m 644 "$TMP/jarvis.crt" "$SSL_DIR/jarvis.crt"
sudo install -m 600 "$TMP/jarvis.key" "$SSL_DIR/jarvis.key"

step "Preparing web root $WEB_ROOT"
sudo install -d -o "$RUN_USER" -g www-data -m 2755 "$WEB_ROOT"

if [[ ! -f "$ROOT/backend/storage/production.sqlite3" && -f "$ROOT/backend/storage/development.sqlite3" ]]; then
  read -r -p $'\nCopy your current (development) data into production? [Y/n] ' answer
  [[ "${answer:-Y}" =~ ^[Yy] ]] && "$ROOT/deploy/import-development-data.sh"
fi

step "Building and publishing"
"$ROOT/bin/deploy" --no-restart

step "Installing the systemd service"
render "$ROOT/deploy/jarvis.service.template" > "$TMP/jarvis.service"
sudo install -m 644 "$TMP/jarvis.service" /etc/systemd/system/jarvis.service
sudo systemctl daemon-reload
sudo systemctl enable --now jarvis
sudo systemctl restart jarvis

step "Configuring nginx"
sudo install -d /etc/nginx/snippets
sudo install -m 644 "$ROOT/deploy/nginx-jarvis-proxy.conf" /etc/nginx/snippets/jarvis-proxy.conf
sudo install -m 644 "$ROOT/deploy/nginx-jarvis-access.conf" /etc/nginx/snippets/jarvis-access.conf
render "$ROOT/deploy/nginx-jarvis.conf.template" > "$TMP/jarvis.conf"
sudo install -m 644 "$TMP/jarvis.conf" /etc/nginx/sites-available/jarvis
sudo ln -sf /etc/nginx/sites-available/jarvis /etc/nginx/sites-enabled/jarvis
# Disable the stock welcome page (only if it's still the packaged default symlink)
if [[ -L /etc/nginx/sites-enabled/default ]]; then sudo rm /etc/nginx/sites-enabled/default; fi
sudo nginx -t
sudo systemctl reload nginx

step "Checking"
sleep 3
for name in $SERVER_NAMES; do
  code="$(curl -s -o /dev/null -w '%{http_code}' --resolve "$name:443:127.0.0.1" "https://$name/up" || true)"
  echo "  https://$name/up -> $code"
done

cat <<MSG

Done. Open https://$(echo "$SERVER_NAMES" | awk '{print $1}') and sign in.

Other devices (phones, laptops) need to trust your local certificate authority once:
  CA certificate: $(mkcert -CAROOT)/rootCA.pem
  - Android: Settings → Security → Encryption & credentials → Install a certificate → CA certificate
  - iPhone/iPad: AirDrop/email the file, install the profile, then Settings → General → About →
    Certificate Trust Settings → enable full trust
  - macOS: open it in Keychain Access → set "Always Trust"; Windows: install into
    "Trusted Root Certification Authorities"
  Keep rootCA-key.pem in that folder private — anyone with it can impersonate any site to your devices.

Later updates: bin/deploy     Logs: journalctl -u jarvis -f
MSG
