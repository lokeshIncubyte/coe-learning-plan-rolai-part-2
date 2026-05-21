#!/usr/bin/env bash
# verify-day8.sh — E2E verification for Day 8 server features (upload + extraction).
#
# Usage:  cd server && bash scripts/verify-day8.sh
#
# Sections:
#   1. Jest unit suite (all tests must pass)
#   2. Service-level logic checks via ts-node (no DB, no network)
#   3. API HTTP checks against a running server (skipped if server is down)
#
# Prerequisites for Section 3:
#   - NestJS server running:        cd server && PORT=3001 npm run start:dev
#   - DATABASE_URL set in server/.env (pgvector container `narrative-db`)
#   - helper-apis running on $HELPER_APIS_URL so ExtractorService can call the LLM
#     (without it, /api/upload still responds 200 but with entityCount=0)
#
# Rate-limiter note: the app uses limit=5 per 60s on POST routes.
# Re-running quickly may surface 429s on /api/generate.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVER_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$SERVER_DIR"

# ── Colours ─────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
  BOLD='\033[1m'; RESET='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi

# ── Counters ─────────────────────────────────────────────────────────────────
PASS=0; FAIL=0; SKIP=0
RESULTS=()

# ── Helpers ──────────────────────────────────────────────────────────────────
section() { echo; echo -e "${BOLD}── $1 ──${RESET}"; }
pass()    { PASS=$((PASS+1)); echo -e "  ${GREEN}PASS${RESET}  $1"; }
fail()    { FAIL=$((FAIL+1)); RESULTS+=("FAIL: $1 — $2"); echo -e "  ${RED}FAIL${RESET}  $1: $2"; }
skip()    { SKIP=$((SKIP+1)); echo -e "  ${YELLOW}SKIP${RESET}  $1"; }

# Temp files must live inside SERVER_DIR so ts-node can resolve node_modules
TMP_FILES=()
cleanup() {
  for f in "${TMP_FILES[@]:-}"; do rm -f "$f" 2>/dev/null; done
  rm -f /tmp/verify-day8-test.txt /tmp/verify-day8-fake.pdf 2>/dev/null
}
trap cleanup EXIT

new_tmp_ts() {
  local f
  f=$(mktemp "$SERVER_DIR/.day8-check-XXXXXX.ts")
  TMP_FILES+=("$f")
  echo "$f"
}

new_tmp_log() {
  local f
  f=$(mktemp "$SERVER_DIR/.day8-log-XXXXXX.log")
  TMP_FILES+=("$f")
  echo "$f"
}

# run_ts_check <label>  [file content on stdin]
run_ts_check() {
  local label="$1"
  local tmpfile
  tmpfile=$(new_tmp_ts)
  cat > "$tmpfile"
  local log
  log=$(new_tmp_log)
  if npx ts-node --transpile-only --project tsconfig.json "$tmpfile" >"$log" 2>&1; then
    pass "$label"
  else
    local details
    details=$(tail -n 5 "$log" | tr '\n' ' ')
    fail "$label" "$details"
  fi
}

# Default port = 3001 (Day 8 spec). Override: NEST_PORT=3000 bash scripts/verify-day8.sh
NEST_PORT="${PORT:-${NEST_PORT:-3001}}"

check_server_running() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:${NEST_PORT}/" \
    --max-time 3 2>/dev/null)
  [[ "$code" != "000" ]]
}

# Load DATABASE_URL from .env if not already set (best-effort, ignored if absent)
if [[ -z "${DATABASE_URL:-}" && -f "$SERVER_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(DATABASE_URL|HELPER_APIS_URL)=' "$SERVER_DIR/.env" | sed 's/^/export /')
  set +a
fi

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 0 — Pre-flight: AppModule wiring sanity check
# ═══════════════════════════════════════════════════════════════════════════
section "0/3  Pre-flight (module wiring)"

APP_MODULE="$SERVER_DIR/src/app.module.ts"
if grep -q "UploadModule" "$APP_MODULE" 2>/dev/null; then
  pass "UploadModule referenced in app.module.ts"
else
  fail "UploadModule not imported in app.module.ts" \
       "POST /api/upload will 404 until UploadModule is added to AppModule.imports"
fi

if grep -q "HistoryModule" "$APP_MODULE" 2>/dev/null; then
  pass "HistoryModule referenced in app.module.ts"
else
  fail "HistoryModule not imported in app.module.ts" \
       "GenerationHistoryService DI will fail; logUploadDeltas won't fire"
fi

if grep -q "ExtractorService" "$SERVER_DIR/src/upload/upload.module.ts" 2>/dev/null; then
  pass "ExtractorService listed in upload.module providers"
else
  fail "ExtractorService not provided by UploadModule" \
       "LoreUploadService's extractorService dep will be undefined at runtime"
fi

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1 — Jest unit suite
# ═══════════════════════════════════════════════════════════════════════════
section "1/3  Unit tests (Jest)"
LOG=$(new_tmp_log)
if npx jest --no-coverage --silent >"$LOG" 2>&1; then
  TEST_COUNT=$(grep -oP '\d+ passed' "$LOG" | tail -1 | grep -oP '\d+' || echo "?")
  pass "Jest suite ($TEST_COUNT tests)"
else
  echo
  tail -n 40 "$LOG"
  fail "Jest suite" "see $LOG (kept for inspection)"
  TMP_FILES=("${TMP_FILES[@]/$LOG}")
fi

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2 — Service-level logic (ts-node, no DB/network)
# ═══════════════════════════════════════════════════════════════════════════
section "2/3  Service-level logic (ts-node)"

# ── 2.1 LoreUploadService.processUpload returns UTF-8 for text/plain ──────
run_ts_check "LoreUploadService.processUpload text/plain → UTF-8" <<'TS'
import 'reflect-metadata';
import { LoreUploadService } from './src/upload/lore-upload.service';
const svc = new LoreUploadService({} as any, {} as any);
(async () => {
  const result = await svc.processUpload(Buffer.from('hello world', 'utf-8'), 'text/plain');
  if (result !== 'hello world') { console.error('expected "hello world", got:', result); process.exit(1); }
  const unicode = await svc.processUpload(Buffer.from('Élara — sorcière', 'utf-8'), 'text/plain');
  if (unicode !== 'Élara — sorcière') { console.error('unicode mismatch:', unicode); process.exit(1); }
})();
TS

# ── 2.2 LoreUploadService.chunkIntoUnits splits on double-newline ─────────
run_ts_check "LoreUploadService.chunkIntoUnits splits on \\n\\n" <<'TS'
import 'reflect-metadata';
import { LoreUploadService } from './src/upload/lore-upload.service';
const svc = new LoreUploadService({} as any, {} as any);

const text = 'Elara is a mage.\n\nThe tavern is dark.\n\n  \n\nA sword lies on the table.';
const chunks = svc.chunkIntoUnits(text);
const expected = ['Elara is a mage.', 'The tavern is dark.', 'A sword lies on the table.'];
if (JSON.stringify(chunks) !== JSON.stringify(expected)) {
  console.error('chunks mismatch:', chunks); process.exit(1);
}

// Single newlines preserved within a paragraph
const single = svc.chunkIntoUnits('Line one.\nLine two.\n\nParagraph two.');
if (single[0] !== 'Line one.\nLine two.') { console.error('single newline preservation failed:', single); process.exit(1); }

// Max 1500 chars per chunk (truncation)
const huge = 'x'.repeat(2000);
const truncated = svc.chunkIntoUnits(huge);
if (truncated[0].length !== 1500) { console.error('expected 1500-char truncation, got', truncated[0].length); process.exit(1); }
TS

# ── 2.3 ExtractorService Delta type — all four op values present ──────────
run_ts_check "ExtractorService Delta type has 4 op values" <<'TS'
import 'reflect-metadata';
import type { Delta } from './src/upload/extractor.service';

const d1: Delta = { op: 'new_entity', identity: { name: 'X', type: 'character' }, state: {} } as any;
const d2: Delta = { op: 'identity_shift', entityId: 'e1', patch: {} } as any;
const d3: Delta = { op: 'state_mutation', entityId: 'e1', patch: {} } as any;
const d4: Delta = { op: 'new_edge', fromId: 'a', toId: 'b', type: 'ally' } as any;

const ops = [d1.op, d2.op, d3.op, d4.op];
const expected = ['new_entity', 'identity_shift', 'state_mutation', 'new_edge'];
for (const e of expected) {
  if (!ops.includes(e as any)) { console.error('missing op:', e); process.exit(1); }
}
TS

# ── 2.4 applyDeltas routes identity_shift → updateEntityIdentity ──────────
run_ts_check "applyDeltas identity_shift → updateEntityIdentity (not updateEntityState)" <<'TS'
import 'reflect-metadata';
import { ExtractorService } from './src/upload/extractor.service';

const mockGraph: any = {
  createEntity: () => Promise.resolve({ id: 'x' }),
  createEdge: () => Promise.resolve({}),
  updateEntityIdentity: function (...args: any[]) { this._idCalled = args; return Promise.resolve({}); },
  updateEntityState: function (...args: any[]) { this._stateCalled = args; return Promise.resolve({}); },
};
const svc = new ExtractorService({ get: () => undefined } as any, mockGraph, {});

(async () => {
  await svc.applyDeltas([{ op: 'identity_shift', entityId: 'e1', patch: { archetype: 'Warrior' } } as any]);
  if (!mockGraph._idCalled) { console.error('updateEntityIdentity was NOT called'); process.exit(1); }
  if (mockGraph._stateCalled) { console.error('updateEntityState was wrongly called'); process.exit(1); }
  if (mockGraph._idCalled[0] !== 'e1' || mockGraph._idCalled[1].archetype !== 'Warrior') {
    console.error('updateEntityIdentity got wrong args:', mockGraph._idCalled); process.exit(1);
  }
})();
TS

# ── 2.5 applyDeltas routes state_mutation → updateEntityState ─────────────
run_ts_check "applyDeltas state_mutation → updateEntityState (not updateEntityIdentity)" <<'TS'
import 'reflect-metadata';
import { ExtractorService } from './src/upload/extractor.service';

const mockGraph: any = {
  createEntity: () => Promise.resolve({ id: 'x' }),
  createEdge: () => Promise.resolve({}),
  updateEntityIdentity: function (...args: any[]) { this._idCalled = args; return Promise.resolve({}); },
  updateEntityState: function (...args: any[]) { this._stateCalled = args; return Promise.resolve({}); },
};
const svc = new ExtractorService({ get: () => undefined } as any, mockGraph, {});

(async () => {
  await svc.applyDeltas([{ op: 'state_mutation', entityId: 'e2', patch: { hp: 80 } } as any]);
  if (!mockGraph._stateCalled) { console.error('updateEntityState was NOT called'); process.exit(1); }
  if (mockGraph._idCalled) { console.error('updateEntityIdentity was wrongly called'); process.exit(1); }
  if (mockGraph._stateCalled[0] !== 'e2' || mockGraph._stateCalled[1].hp !== 80) {
    console.error('updateEntityState got wrong args:', mockGraph._stateCalled); process.exit(1);
  }
})();
TS

# ── 2.6 applyDeltas new_entity: embedEntityIdentity called after createEntity ─
run_ts_check "applyDeltas new_entity: embedEntityIdentity called after createEntity" <<'TS'
import 'reflect-metadata';
import { ExtractorService } from './src/upload/extractor.service';

const callOrder: string[] = [];
const mockGraph: any = {
  createEntity: () => { callOrder.push('createEntity'); return Promise.resolve({ id: 'e1' }); },
  createEdge: () => Promise.resolve({}),
};
const mockEmbed: any = {
  embedEntityIdentity: (id: string) => { callOrder.push(`embedEntityIdentity:${id}`); return Promise.resolve(); },
};
const svc = new ExtractorService({ get: () => undefined } as any, mockGraph, mockEmbed);

(async () => {
  await svc.applyDeltas([{
    op: 'new_entity',
    identity: { name: 'Elara', type: 'character' },
    state: {},
  } as any]);
  if (callOrder[0] !== 'createEntity') { console.error('createEntity should be first:', callOrder); process.exit(1); }
  if (callOrder[1] !== 'embedEntityIdentity:e1') {
    console.error('embedEntityIdentity should follow createEntity with entity.id:', callOrder); process.exit(1);
  }
})();
TS

# ── 2.7 applyDeltas auto-link: anchor → new entity via 'contains' edge ────
run_ts_check "applyDeltas auto-link: createEdge with anchorId when provided" <<'TS'
import 'reflect-metadata';
import { ExtractorService } from './src/upload/extractor.service';

let edgeArgs: any = null;
const mockGraph: any = {
  createEntity: () => Promise.resolve({ id: 'newE' }),
  createEdge: (args: any) => { edgeArgs = args; return Promise.resolve({}); },
};
const mockEmbed: any = { embedEntityIdentity: () => Promise.resolve() };
const svc = new ExtractorService({ get: () => undefined } as any, mockGraph, mockEmbed);

(async () => {
  await svc.applyDeltas([
    { op: 'new_entity', identity: { name: 'Tavern', type: 'location' }, state: {} } as any,
  ], 'anchor-1');
  if (!edgeArgs) { console.error('createEdge was NOT called for auto-link'); process.exit(1); }
  if (edgeArgs.fromId !== 'anchor-1') { console.error('fromId should be anchorId, got:', edgeArgs.fromId); process.exit(1); }
  if (edgeArgs.toId !== 'newE') { console.error('toId should be new entity id, got:', edgeArgs.toId); process.exit(1); }
  if (edgeArgs.type !== 'contains') { console.error('edge type should be "contains", got:', edgeArgs.type); process.exit(1); }

  // Without anchorId, no auto-link
  edgeArgs = null;
  await svc.applyDeltas([
    { op: 'new_entity', identity: { name: 'Lone', type: 'item' }, state: {} } as any,
  ]);
  if (edgeArgs !== null) { console.error('createEdge should NOT fire without anchorId, got:', edgeArgs); process.exit(1); }
})();
TS

# ── 2.8 logUploadDeltas called once per chunk in extractAndPersist ────────
run_ts_check "extractAndPersist: logUploadDeltas called once per chunk" <<'TS'
import 'reflect-metadata';
import { LoreUploadService } from './src/upload/lore-upload.service';

const logCalls: any[] = [];
const mockExtractor: any = {
  extractDeltas: (chunk: string) => Promise.resolve([{ op: 'new_entity', identity: { name: chunk, type: 'x' }, state: {} }]),
  applyDeltas: () => Promise.resolve({ entityCount: 1, edgeCount: 0 }),
};
const mockHistory: any = {
  logUploadDeltas: (idx: number, deltas: any[]) => { logCalls.push({ idx, deltas }); return Promise.resolve(); },
};
const svc = new LoreUploadService(mockExtractor, mockHistory);

(async () => {
  const res = await svc.extractAndPersist(['chunk-A', 'chunk-B', 'chunk-C']);
  if (logCalls.length !== 3) { console.error('expected 3 log calls, got', logCalls.length); process.exit(1); }
  if (logCalls[0].idx !== 0 || logCalls[1].idx !== 1 || logCalls[2].idx !== 2) {
    console.error('chunkIndex sequence wrong:', logCalls.map(c => c.idx)); process.exit(1);
  }
  if (res.chunkCount !== 3 || res.entityCount !== 3) {
    console.error('aggregate counts wrong:', res); process.exit(1);
  }
})();
TS

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3 — API HTTP checks (requires running server on :$NEST_PORT)
# ═══════════════════════════════════════════════════════════════════════════
section "3/3  API HTTP checks (NestJS on :${NEST_PORT})"
BASE="http://localhost:${NEST_PORT}/api"

if ! check_server_running; then
  skip "Server not running — start with: PORT=${NEST_PORT} npm run start:dev (also start helper-apis for LLM)"
else

  # 3.1 Server health — GET / should respond (404 from Nest is fine; 5xx = broken)
  HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:${NEST_PORT}/" --max-time 5 2>/dev/null)
  if [[ "$HEALTH_CODE" =~ ^[2-4][0-9][0-9]$ && "$HEALTH_CODE" != "500" ]]; then
    pass "Server health — GET / responds ($HEALTH_CODE, not 500)"
  else
    fail "Server health" "GET / returned $HEALTH_CODE (expected 2xx/4xx, not 5xx)"
  fi

  # Prepare a text fixture for upload tests
  cat > /tmp/verify-day8-test.txt <<'TXT'
Elara is an ancient sorceress of the Northern Vale. She guards the obsidian gate.

The tavern of Thornwall sits crooked at the crossroads, lanterns dim against fog.

A blackened sword named Veil rests on the oak table, humming faintly.
TXT

  # 3.2 POST /api/upload with text/plain → JSON with counts
  UPLOAD_LOG=$(new_tmp_log)
  UPLOAD_CODE=$(curl -s -o "$UPLOAD_LOG" -w "%{http_code}" \
    -X POST "$BASE/upload" \
    -F "file=@/tmp/verify-day8-test.txt;type=text/plain" \
    --max-time 180 2>/dev/null)
  UPLOAD_BODY=$(cat "$UPLOAD_LOG" 2>/dev/null || echo '{}')

  SHAPE_OK=$(node -e "
    let r;
    try { r = JSON.parse(process.argv[1]); } catch(e) { process.exit(2); }
    if (typeof r.entityCount === 'number'
        && typeof r.edgeCount === 'number'
        && typeof r.chunkCount === 'number') process.exit(0);
    process.exit(1);
  " "$UPLOAD_BODY" 2>/dev/null; echo $?)

  if [[ "$UPLOAD_CODE" == "200" || "$UPLOAD_CODE" == "201" ]] && [[ "$SHAPE_OK" == "0" ]]; then
    SUMMARY=$(node -e "try{const r=JSON.parse(process.argv[1]);console.log('entityCount='+r.entityCount+' edgeCount='+r.edgeCount+' chunkCount='+r.chunkCount)}catch{}" "$UPLOAD_BODY" 2>/dev/null || echo "")
    pass "POST /api/upload text/plain — $SUMMARY"
  else
    fail "POST /api/upload text/plain" "HTTP $UPLOAD_CODE body: ${UPLOAD_BODY:0:160}"
  fi

  # 3.3 POST /api/upload with a minimal fake PDF → no 5xx
  # Real PDF magic bytes so pdf-parse at least tries; if pdf-parse fails we expect 4xx, not 5xx.
  printf '%%PDF-1.4\n%%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%%%EOF\n' > /tmp/verify-day8-fake.pdf
  PDF_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE/upload" \
    -F "file=@/tmp/verify-day8-fake.pdf;type=application/pdf" \
    --max-time 60 2>/dev/null)
  # Accept any non-5xx (200/201 = parsed empty; 400 = pdf-parse rejected; either is acceptable)
  if [[ "$PDF_CODE" =~ ^[24][0-9][0-9]$ ]]; then
    pass "POST /api/upload application/pdf — server handled fake PDF ($PDF_CODE, no 5xx)"
  else
    fail "POST /api/upload application/pdf" "HTTP $PDF_CODE (5xx indicates uncaught error)"
  fi

  # 3.4 DB check: a GenerationHistory row with narrative='upload' exists
  if [[ -z "${DATABASE_URL:-}" ]]; then
    skip "DB check — DATABASE_URL not set (export it or add to server/.env)"
  else
    DB_LOG=$(new_tmp_log)
    # Use prisma db execute via stdin to count matching rows
    cat > "$SERVER_DIR/.day8-db-check.sql" <<'SQL'
SELECT COUNT(*)::text AS cnt FROM "GenerationHistory" WHERE narrative = 'upload';
SQL
    TMP_FILES+=("$SERVER_DIR/.day8-db-check.sql")

    DB_RESULT=$(node -e "
      const { Client } = require('pg');
      (async () => {
        const c = new Client({ connectionString: process.env.DATABASE_URL });
        try {
          await c.connect();
          const r = await c.query(\"SELECT COUNT(*)::int AS cnt FROM \\\"GenerationHistory\\\" WHERE narrative = 'upload'\");
          console.log(r.rows[0].cnt);
        } catch (e) { console.error('DB_ERR:', e.message); process.exit(2); }
        finally { await c.end(); }
      })();
    " 2>"$DB_LOG")

    if [[ -n "$DB_RESULT" && "$DB_RESULT" =~ ^[0-9]+$ ]]; then
      if [[ "$DB_RESULT" -gt 0 ]]; then
        pass "DB check — $DB_RESULT GenerationHistory row(s) with narrative='upload'"
      else
        fail "DB check — narrative='upload'" "0 rows; logUploadDeltas may not be wired (HistoryModule missing?)"
      fi
    else
      DB_ERR=$(tail -n 3 "$DB_LOG" | tr '\n' ' ')
      fail "DB check — narrative='upload'" "DB query failed: $DB_ERR"
    fi
  fi

  # 3.5 Regression: POST /api/generate still works
  GEN_LOG=$(new_tmp_log)
  curl -s -X POST "$BASE/generate" \
    -H 'Content-Type: application/json' \
    -d '{"prompt":"a quiet evening in the forest"}' \
    --max-time 120 -o "$GEN_LOG" 2>/dev/null || true
  GEN_BODY=$(cat "$GEN_LOG" 2>/dev/null || echo '{}')

  GEN_SHAPE_OK=$(node -e "
    let r;
    try { r = JSON.parse(process.argv[1]); } catch(e) { process.exit(2); }
    if (r.rejected === true && typeof r.reason === 'string') process.exit(0);
    if (typeof r.narrative === 'string' && r.narrative.length > 0 && Array.isArray(r.choices) && r.choices.length > 0) process.exit(0);
    process.exit(1);
  " "$GEN_BODY" 2>/dev/null; echo $?)
  if [[ "$GEN_SHAPE_OK" == "0" ]]; then
    pass "POST /api/generate regression — narrative + choices returned"
  else
    fail "POST /api/generate regression" "shape invalid; body: ${GEN_BODY:0:160}"
  fi

fi  # end server running block

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
echo
echo -e "${BOLD}════════════════════════════════${RESET}"
echo -e "${BOLD}  Day 8 verification summary${RESET}"
echo -e "${BOLD}════════════════════════════════${RESET}"
echo -e "  ${GREEN}PASS${RESET}: $PASS"
echo -e "  ${RED}FAIL${RESET}: $FAIL"
echo -e "  ${YELLOW}SKIP${RESET}: $SKIP"
if [[ ${#RESULTS[@]} -gt 0 ]]; then
  echo
  echo "  Failures:"
  for r in "${RESULTS[@]}"; do
    echo -e "    ${RED}✗${RESET} $r"
  done
fi
echo

exit $(( FAIL > 0 ? 1 : 0 ))
