#!/usr/bin/env sh

set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
port=5187
route_name=ortodoksas-studio
service_name=ortodoksas-studio-preview.service
pnpm_bin=$(command -v pnpm)
local_url="http://127.0.0.1:${port}"

wait_for_origin() {
  attempts=0

  while [ "$attempts" -lt 30 ]; do
    if curl --fail --silent --show-error --max-time 2 "$local_url" >/dev/null 2>&1; then
      return 0
    fi

    attempts=$((attempts + 1))
    sleep 1
  done

  return 1
}

start_preview() {
  : "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required for the Studio remote bindings}"
  : "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required for the Studio remote bindings}"

  if systemctl --user is-active --quiet "$service_name"; then
    systemctl --user stop "$service_name"
  fi

  systemctl --user import-environment CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID

  systemd-run \
    --user \
    --unit="$service_name" \
    --collect \
    --property="WorkingDirectory=$project_dir" \
    --property="Restart=on-failure" \
    --property="RestartSec=2" \
    --property="PassEnvironment=CLOUDFLARE_API_TOKEN" \
    --property="PassEnvironment=CLOUDFLARE_ACCOUNT_ID" \
    --setenv="CLOUDFLARE_ENV=studio" \
    "$pnpm_bin" dev --host 127.0.0.1 --port "$port"

  if ! wait_for_origin; then
    systemctl --user status "$service_name" --no-pager || true
    exit 1
  fi

  tunnel up "$port" --name "$route_name"
  public_url=$(tunnel url "$route_name")
  curl --fail-with-body --show-error --location --max-time 20 "$public_url" >/dev/null

  printf 'preview=active\nautostart=disabled\nlocal=%s\npublic=%s\n' "$local_url" "$public_url"
}

show_status() {
  if systemctl --user is-active --quiet "$service_name"; then
    service_status=active
  else
    service_status=inactive
  fi

  public_url=$(tunnel url "$route_name" 2>/dev/null || true)
  local_status=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 10 "$local_url" || true)

  if [ -n "$public_url" ]; then
    public_status=$(curl --silent --location --output /dev/null --write-out '%{http_code}' --max-time 20 "$public_url" || true)
  else
    public_status=unavailable
  fi

  printf 'preview=%s\nautostart=disabled\nlocal=%s status=%s\npublic=%s status=%s\n' \
    "$service_status" "$local_url" "$local_status" "${public_url:-unavailable}" "$public_status"

  [ "$service_status" = active ] && [ "$local_status" = 200 ] && [ "$public_status" = 200 ]
}

stop_preview() {
  routes=$(tunnel ls)
  printf '%s\n' "$routes"

  if printf '%s\n' "$routes" | grep -q "$route_name"; then
    tunnel down "$route_name"
  fi

  if systemctl --user is-active --quiet "$service_name"; then
    systemctl --user stop "$service_name"
  fi

  printf 'preview=inactive\nroute=%s removed\n' "$route_name"
}

case "${1:-status}" in
  up)
    start_preview
    ;;
  status)
    show_status
    ;;
  down)
    stop_preview
    ;;
  *)
    printf 'usage: %s {up|status|down}\n' "$0" >&2
    exit 2
    ;;
esac
