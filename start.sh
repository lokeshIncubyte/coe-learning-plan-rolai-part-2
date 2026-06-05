#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER="$ROOT/server"
CLIENT="$ROOT/client"
HELPER="$ROOT/helper-apis"

DB_CONTAINER="narrative-engine-db"
DB_IMAGE="pgvector/pgvector:pg16"
DB_PORT=5433
DB_USER="narrative"
DB_PASS="narrative"
DB_NAME="narrative_engine"
DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:$DB_PORT/$DB_NAME"

log() { echo "[start] $*"; }

# ── 1. Docker DB ──────────────────────────────────────────────────────────────
if docker inspect "$DB_CONTAINER" &>/dev/null; then
  STATUS=$(docker inspect -f '{{.State.Status}}' "$DB_CONTAINER")
  if [ "$STATUS" != "running" ]; then
    log "Container $DB_CONTAINER exists but is $STATUS — starting it"
    docker start "$DB_CONTAINER"
  else
    log "Container $DB_CONTAINER already running"
  fi
else
  log "Creating container $DB_CONTAINER"
  docker run -d \
    --name "$DB_CONTAINER" \
    -e POSTGRES_USER="$DB_USER" \
    -e POSTGRES_PASSWORD="$DB_PASS" \
    -e POSTGRES_DB="$DB_NAME" \
    -p "$DB_PORT:5432" \
    "$DB_IMAGE"
fi

# ── 2. Wait for Postgres ──────────────────────────────────────────────────────
log "Waiting for Postgres to accept connections..."
until docker exec "$DB_CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" -q; do
  sleep 1
done
log "Postgres ready"

# ── 3. Enable pgvector extension ──────────────────────────────────────────────
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  -c "CREATE EXTENSION IF NOT EXISTS vector;" &>/dev/null
log "pgvector extension ensured"

# ── 4. Migrate ────────────────────────────────────────────────────────────────
log "Running Prisma migrations..."
cd "$SERVER"
DATABASE_URL="$DATABASE_URL" npx prisma migrate deploy
log "Migrations done"

# ── 5. Seed (skip if admin user already exists) ───────────────────────────────
SEEDED=$(docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT COUNT(*) FROM \"User\" WHERE email='admin@platform.com';" 2>/dev/null || echo "0")
if [ "${SEEDED//[[:space:]]/}" = "0" ]; then
  log "Seeding database..."
  DATABASE_URL="$DATABASE_URL" npx ts-node -r tsconfig-paths/register prisma/seed.ts
  log "Seed done"
else
  log "Database already seeded — skipping"
fi

# ── 6. Install dependencies (skip if node_modules already present) ────────────
install_if_needed() {
  local dir="$1"
  if [ ! -d "$dir/node_modules" ]; then
    log "Installing dependencies in $dir"
    npm install --prefix "$dir"
  else
    log "node_modules present in $(basename "$dir") — skipping install"
  fi
}

install_if_needed "$HELPER"
install_if_needed "$SERVER"
install_if_needed "$CLIENT"

# ── 7. Start all three services ───────────────────────────────────────────────
LOG_DIR="$ROOT/.logs"
mkdir -p "$LOG_DIR"

log "Starting helper-apis on :4000"
cd "$HELPER"
npm run dev > "$LOG_DIR/helper-apis.log" 2>&1 &
HELPER_PID=$!

log "Starting server (NestJS) on :3001"
cd "$SERVER"
npm run start:dev > "$LOG_DIR/server.log" 2>&1 &
SERVER_PID=$!

log "Starting client (Next.js) on :3000"
cd "$CLIENT"
npm run dev > "$LOG_DIR/client.log" 2>&1 &
CLIENT_PID=$!

log ""
log "All services started"
log "  helper-apis PID $HELPER_PID  →  $LOG_DIR/helper-apis.log"
log "  server      PID $SERVER_PID  →  $LOG_DIR/server.log"
log "  client      PID $CLIENT_PID  →  $LOG_DIR/client.log"
log ""
log "Tailing logs (Ctrl-C stops tailing but keeps services running)"

# Trap Ctrl-C so it only stops the tail, not the background services
trap 'echo; log "Detached from logs. Services still running."; exit 0' INT

tail -f "$LOG_DIR/helper-apis.log" "$LOG_DIR/server.log" "$LOG_DIR/client.log"
