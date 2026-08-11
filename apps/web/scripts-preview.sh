#!/usr/bin/env bash
set -euo pipefail

project_dir="/home/simon/github/ortodoksas-lt/apps/web"
unit="ortodoksas-lt-web-preview.service"
route="ortodoksas-preview"
port="4174"
local_url="http://127.0.0.1:${port}"
public_url="https://${route}.grassinside.com"

wait_for_origin() {
  for _ in $(seq 1 30); do
    if curl --fail --silent --show-error --max-time 2 "${local_url}/" >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}

case "${1:-}" in
  up)
    systemctl --user stop "${unit}" >/dev/null 2>&1 || true
    systemd-run --user \
      --unit="${unit%.service}" \
      --property=Restart=on-failure \
      --property=RestartSec=2 \
      --working-directory="${project_dir}" \
      pnpm exec wrangler dev --config wrangler.jsonc --ip 127.0.0.1 --port "${port}" >/dev/null
    wait_for_origin
    tunnel up "${port}" --name "${route}"
    curl --fail-with-body --show-error --location --max-time 20 "${public_url}/" >/dev/null
    bash "$0" status
    ;;
  status)
    systemctl --user is-active "${unit}"
    systemctl --user is-enabled "${unit}" 2>/dev/null || true
    curl --fail --silent --show-error --max-time 10 "${local_url}/" >/dev/null
    curl --fail --silent --show-error --location --max-time 20 "${public_url}/" >/dev/null
    printf 'local=%s\npublic=%s\n' "${local_url}" "${public_url}"
    ;;
  down)
    if tunnel ls | rg -q "${route}"; then
      tunnel down "${route}"
    fi
    systemctl --user stop "${unit}" >/dev/null 2>&1 || true
    ;;
  *)
    printf 'usage: %s {up|status|down}\n' "$0" >&2
    exit 2
    ;;
esac
