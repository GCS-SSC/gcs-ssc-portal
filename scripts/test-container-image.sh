#!/usr/bin/env bash
set -euo pipefail
image=${1:?Pass the image tag or digest to verify}
prefix="portal-image-test-$(openssl rand -hex 6)"
network="$prefix-network"
database="$prefix-db"
app="$prefix-app"
password=$(openssl rand -hex 24)
cleanup() {
  docker rm -f "$app" "$database" >/dev/null 2>&1 || true
  docker network rm "$network" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM
docker network create "$network" >/dev/null
docker run -d --name "$database" --network "$network" --network-alias postgres \
  --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD="$password" -e POSTGRES_DB=portal_test \
  postgres:17-alpine >/dev/null
for attempt in $(seq 1 60); do
  if docker exec "$database" pg_isready -U postgres -d portal_test >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$database" pg_isready -U postgres -d portal_test >/dev/null
docker run -d --name "$app" --network "$network" -p 127.0.0.1::3000 \
  -e DATABASE_URL="postgresql://postgres:$password@postgres:5432/portal_test" \
  -e APP_URL=https://portal.example.test \
  -e BETTER_AUTH_SECRET="container-test-only-secret-$password" "$image" >/dev/null
port=$(docker port "$app" 3000/tcp | head -1 | cut -d: -f2)
ready() {
  for attempt in $(seq 1 120); do
    if curl --fail --silent "http://127.0.0.1:$port/api/session" >/dev/null; then return; fi
    if [[ $(docker inspect -f '{{.State.Running}}' "$app") != true ]]; then break; fi
    sleep 1
  done
  docker logs "$app" >&2
  return 1
}
ready
for account in owner root; do
  curl --fail --silent "http://127.0.0.1:$port/api/auth/sign-in/email" \
    -H 'Origin: https://portal.example.test' -H 'Content-Type: application/json' \
    --data "{\"email\":\"$account@demo.example.test\",\"password\":\"Portal-demo-only-2026!\"}" \
    | jq -e --arg email "$account@demo.example.test" '.user.email == $email' >/dev/null
done
[[ $(docker exec "$database" psql -U postgres -d portal_test -Atc 'SELECT count(*) FROM "user"') == 6 ]]
docker exec "$database" psql -U postgres -d portal_test -c "UPDATE organization SET name='Preserved after restart'" >/dev/null
docker restart "$app" >/dev/null
port=$(docker port "$app" 3000/tcp | head -1 | cut -d: -f2)
ready
[[ $(docker exec "$database" psql -U postgres -d portal_test -Atc 'SELECT count(*) FROM "user"') == 6 ]]
[[ $(docker exec "$database" psql -U postgres -d portal_test -Atc 'SELECT name FROM organization') == 'Preserved after restart' ]]
echo 'Container verified: PostgreSQL migrations, seeded logins, readiness and non-destructive restart.'
