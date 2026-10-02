#!/bin/bash
# Deploys one image tag of EtnoJourney on the VPS. Invoked by GitHub Actions
# through a forced SSH command (see deploy/README.md):
#   ssh <deploy key> "deploy <git sha>"   with a GHCR read token on stdin.
# Fetches the compose file of that commit, pulls the image, restarts the app,
# waits for /api/health and rolls back to the previous tag if it stays unhealthy.
set -euo pipefail

cd /opt/etnojourney
REPO=omanjaya/etnojourney.com
LOG=/opt/etnojourney/deploy.log

main() {
  echo "=== $(date -Is) ${SSH_ORIGINAL_COMMAND:-manual}"
  read -r verb tag _ <<<"${SSH_ORIGINAL_COMMAND:-}" || true
  [ "${verb:-}" = "deploy" ] || { echo "unsupported command"; return 2; }
  # Tags are full git SHAs produced by the workflow.
  [[ "${tag:-}" =~ ^[0-9a-f]{40}$ ]] || { echo "bad tag"; return 2; }

  # The GHCR token arrives on stdin, never in arguments, process lists or logs.
  local token
  token="$(cat)"
  if [ -n "$token" ]; then
    printf '%s' "$token" | docker login ghcr.io -u omanjaya --password-stdin >/dev/null
  fi

  # The stack definition travels with the commit being deployed.
  curl -fsSL "https://raw.githubusercontent.com/$REPO/$tag/deploy/docker-compose.prod.yml" \
    -o docker-compose.prod.yml.new
  mv docker-compose.prod.yml.new docker-compose.prod.yml

  local previous
  previous="$(cat current-tag 2>/dev/null || echo latest)"
  export APP_TAG="$tag"
  docker compose -f docker-compose.prod.yml pull app
  docker compose -f docker-compose.prod.yml up -d --remove-orphans
  docker logout ghcr.io >/dev/null 2>&1 || true

  for _ in $(seq 1 30); do
    if curl -fsS -o /dev/null http://127.0.0.1:3040/api/health; then
      echo "$tag" > current-tag
      docker image prune -f --filter "label=org.opencontainers.image.source=https://github.com/$REPO" >/dev/null || true
      echo "deployed $tag"
      return 0
    fi
    sleep 4
  done

  echo "unhealthy, rolling back to $previous"
  docker compose -f docker-compose.prod.yml logs --tail 80 app || true
  export APP_TAG="$previous"
  docker compose -f docker-compose.prod.yml up -d
  return 1
}

main 2>&1 | tee -a "$LOG"
