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
failure() {
  result=$?
  docker logs --tail 60 "$app" >&2 2>/dev/null || true
  docker logs --tail 60 "$database" >&2 2>/dev/null || true
  return "$result"
}
trap failure ERR
trap cleanup EXIT
trap 'exit 130' INT TERM
docker network create "$network" >/dev/null
docker run -d --name "$database" --network "$network" --network-alias postgres \
  --tmpfs /var/lib/postgresql/data -e POSTGRES_PASSWORD="$password" -e POSTGRES_DB=portal_test \
  postgres:17-alpine >/dev/null
for attempt in $(seq 1 60); do
  if docker exec "$database" pg_isready -h 127.0.0.1 -U postgres -d portal_test >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec "$database" pg_isready -h 127.0.0.1 -U postgres -d portal_test >/dev/null
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
curl --fail --silent "http://127.0.0.1:$port/api/auth/sign-in/email" \
  -H 'Origin: https://portal.example.test' -H 'Content-Type: application/json' \
  --data '{"email":"owner@portal.com","password":"password123"}' \
  | jq -e '.user.email == "owner@portal.com"' >/dev/null
curl --fail --silent "http://127.0.0.1:$port/api/admin/login" \
  -H 'Origin: https://portal.example.test' -H 'Content-Type: application/json' \
  --data '{"email":"admin@portal.com","password":"password123"}' \
  | jq -e '.administrator.email == "admin@portal.com"' >/dev/null
[[ $(docker exec "$database" psql -U postgres -d portal_test -Atc 'SELECT count(*) FROM "user"') == 6 ]]
[[ $(docker exec "$database" psql -U postgres -d portal_test -Atc 'SELECT count(*) FROM administrator') == 1 ]]
docker exec "$database" psql -U postgres -d portal_test -c "UPDATE organization SET name='Preserved after restart' WHERE id = (SELECT id FROM organization ORDER BY id LIMIT 1)" >/dev/null
docker restart "$app" >/dev/null
port=$(docker port "$app" 3000/tcp | head -1 | cut -d: -f2)
ready
[[ $(docker exec "$database" psql -U postgres -d portal_test -Atc 'SELECT count(*) FROM "user"') == 6 ]]
[[ $(docker exec "$database" psql -U postgres -d portal_test -Atc "SELECT count(*) FROM organization WHERE name='Preserved after restart'") == 1 ]]
echo 'Container verified: PostgreSQL migrations, seeded logins, readiness and non-destructive restart.'
