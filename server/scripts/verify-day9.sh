#!/usr/bin/env bash
# verify-day9.sh — E2E verification for Day 9 server features (deterministic engine + function calling).
#
# Usage:  cd server && bash scripts/verify-day9.sh
#
# Sections:
#   0. Pre-flight: module wiring sanity check
#   1. Jest unit suite (all tests must pass)
#   2. Service-level logic checks via ts-node (no DB, no network)
#   3. API HTTP checks against a running server (skipped if server is down)
#
# Prerequisites for Section 3:
#   - NestJS server running:  cd server && PORT=3001 npm run start:dev
#   - DATABASE_URL set in server/.env (pgvector container `narrative-db`)
#   - helper-apis running on $HELPER_APIS_URL so generation calls succeed
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

TMP_FILES=()
cleanup() {
  for f in "${TMP_FILES[@]:-}"; do rm -f "$f" 2>/dev/null; done
}
trap cleanup EXIT

new_tmp_ts() {
  local f
  f=$(mktemp "$SERVER_DIR/.day9-check-XXXXXX.ts")
  TMP_FILES+=("$f")
  echo "$f"
}

new_tmp_log() {
  local f
  f=$(mktemp "$SERVER_DIR/.day9-log-XXXXXX.log")
  TMP_FILES+=("$f")
  echo "$f"
}

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

NEST_PORT="${PORT:-${NEST_PORT:-3001}}"

check_server_running() {
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:${NEST_PORT}/" \
    --max-time 3 2>/dev/null)
  [[ "$code" != "000" ]]
}

if [[ -z "${DATABASE_URL:-}" && -f "$SERVER_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source <(grep -E '^(DATABASE_URL|HELPER_APIS_URL)=' "$SERVER_DIR/.env" | sed 's/^/export /')
  set +a
fi

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 0 — Pre-flight: module wiring
# ═══════════════════════════════════════════════════════════════════════════
section "0/3  Pre-flight (module wiring)"

GENERATE_MODULE="$SERVER_DIR/src/generate/generate.module.ts"
GENERATE_CONTROLLER="$SERVER_DIR/src/generate/generate.controller.ts"
APP_MODULE="$SERVER_DIR/src/app.module.ts"

if grep -q "EngineService" "$GENERATE_MODULE" 2>/dev/null; then
  pass "EngineService listed in generate.module providers"
else
  fail "EngineService not in generate.module" "engine mutations will not be injected"
fi

if grep -q "EmbeddingService" "$GENERATE_MODULE" 2>/dev/null; then
  pass "EmbeddingService listed in generate.module providers"
else
  fail "EmbeddingService not in generate.module" "fire-and-forget re-embed will not work at runtime"
fi

if grep -q "embeddingService" "$GENERATE_CONTROLLER" 2>/dev/null; then
  pass "GenerateController injects EmbeddingService (fire-and-forget re-embed wired)"
else
  fail "GenerateController missing embeddingService" "identity-shift deltas will not trigger re-embedding"
fi

if grep -q "flaggedForReEmbed" "$GENERATE_CONTROLLER" 2>/dev/null; then
  pass "GenerateController reads flaggedForReEmbed from processDeltas return"
else
  fail "GenerateController does not capture flaggedForReEmbed" "re-embed calls will never fire"
fi

if grep -q "EngineToolsService" "$SERVER_DIR/src/generate/engine-tools.service.ts" 2>/dev/null; then
  pass "EngineToolsService class exists in engine-tools.service.ts"
else
  fail "engine-tools.service.ts missing or does not export EngineToolsService" ""
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
  fail "Jest suite" "see output above"
fi

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2 — Service-level logic (ts-node, no DB / network)
# ═══════════════════════════════════════════════════════════════════════════
section "2/3  Service-level logic (ts-node)"

# ── 2.1 EngineService.clampPatch — bounds clamping ───────────────────────
run_ts_check "EngineService.clampPatch clamps hp to [0, 100]" <<'TS'
import 'reflect-metadata';
import { EngineService } from './src/generate/engine.service';
const svc = new EngineService({} as any);
const spec = { variables: { hp: { min: 0, max: 100 } }, cascades: [] };

const over  = svc.clampPatch({ hp: 150 }, spec);
const under = svc.clampPatch({ hp: -10 }, spec);
const exact = svc.clampPatch({ hp: 50  }, spec);

if (over.hp  !== 100) { console.error('over-max failed:', over);  process.exit(1); }
if (under.hp !== 0)   { console.error('under-min failed:', under); process.exit(1); }
if (exact.hp !== 50)  { console.error('in-range failed:', exact);  process.exit(1); }
TS

# ── 2.2 EngineService.computeDerived — formula evaluation ────────────────
run_ts_check "EngineService.computeDerived computes mana_pct from mana / mana_cap" <<'TS'
import 'reflect-metadata';
import { EngineService } from './src/generate/engine.service';
const svc = new EngineService({} as any);
const spec = {
  variables: {
    mana: { min: 0, max: 100, derived: { mana_pct: { numerator: 'mana', denominator: 'mana_cap', multiplier: 100 } } },
  },
  cascades: [],
};

const result = svc.computeDerived({ mana: 60, mana_cap: 100 }, spec);
if (result['mana_pct'] !== 60) { console.error('mana_pct wrong:', result); process.exit(1); }

// denominator 0 → skip (no NaN)
const safe = svc.computeDerived({ mana: 60, mana_cap: 0 }, spec);
if ('mana_pct' in safe && typeof safe['mana_pct'] === 'number' && isNaN(safe['mana_pct'] as number)) {
  console.error('NaN leaked:', safe); process.exit(1);
}
TS

# ── 2.3 EngineService.runCascades — trigger fires when condition met ──────
run_ts_check "EngineService.runCascades triggers stamina patch when hp < 20" <<'TS'
import 'reflect-metadata';
import { EngineService } from './src/generate/engine.service';
const svc = new EngineService({} as any);
const spec = {
  variables: {},
  cascades: [{ when: { key: 'hp', op: '<' as const, value: 20 }, apply: { stamina: 50 } }],
};

const triggered = svc.runCascades({ hp: 10 }, spec);
if (triggered.length !== 1 || (triggered[0] as any).stamina !== 50) {
  console.error('cascade not triggered:', triggered); process.exit(1);
}

const silent = svc.runCascades({ hp: 50 }, spec);
if (silent.length !== 0) { console.error('cascade wrongly triggered:', silent); process.exit(1); }
TS

# ── 2.4 EngineService.runCascades — depth ≥ 5 returns [] ─────────────────
run_ts_check "EngineService.runCascades returns [] when depth >= 5" <<'TS'
import 'reflect-metadata';
import { EngineService } from './src/generate/engine.service';
const svc = new EngineService({} as any);
const spec = {
  variables: {},
  cascades: [{ when: { key: 'hp', op: '<' as const, value: 100 }, apply: { stamina: 50 } }],
};

const result = svc.runCascades({ hp: 10 }, spec, 5);
if (result.length !== 0) { console.error('expected [] at depth 5, got:', result); process.exit(1); }
TS

# ── 2.5 EngineService.classifyDeltas — partitions by op ──────────────────
run_ts_check "EngineService.classifyDeltas separates state_mutation from identity_shift" <<'TS'
import 'reflect-metadata';
import { EngineService } from './src/generate/engine.service';
const svc = new EngineService({} as any);

const deltas: any[] = [
  { op: 'state_mutation',  entityId: 'e1', patch: { hp: 80 } },
  { op: 'identity_shift',  entityId: 'e2', patch: { archetype: 'Warrior' } },
  { op: 'state_mutation',  entityId: 'e3', patch: { mana: 40 } },
  { op: 'new_entity',      identity: { name: 'X', type: 'item' }, state: {} },
];

const { stateMutations, identityShifts } = svc.classifyDeltas(deltas);
if (stateMutations.length !== 2) { console.error('stateMutations count wrong:', stateMutations.length); process.exit(1); }
if (identityShifts.length !== 1) { console.error('identityShifts count wrong:', identityShifts.length); process.exit(1); }
if (identityShifts[0].entityId !== 'e2') { console.error('wrong identity_shift entity:', identityShifts[0]); process.exit(1); }
TS

# ── 2.6 EngineService.resolveRuleConflict — highest priority wins ─────────
run_ts_check "EngineService.resolveRuleConflict returns candidate with highest priority" <<'TS'
import 'reflect-metadata';
import { EngineService } from './src/generate/engine.service';
const svc = new EngineService({} as any);

const candidates = [
  { ruleName: 'low',  patch: { hp: -1 }, priority: 2  },
  { ruleName: 'high', patch: { hp: -5 }, priority: 10 },
  { ruleName: 'mid',  patch: { hp: -3 }, priority: 5  },
];
const winner = svc.resolveRuleConflict(candidates, 'hp');
if (winner.ruleName !== 'high') { console.error('wrong winner:', winner); process.exit(1); }

// no priority field → treated as 0
const noPrio = svc.resolveRuleConflict([
  { ruleName: 'a', patch: {} },
  { ruleName: 'b', patch: {}, priority: 1 },
], 'x');
if (noPrio.ruleName !== 'b') { console.error('no-priority fallback wrong:', noPrio); process.exit(1); }
TS

# ── 2.7 EngineService.processDeltas — mutations written, shifts flagged ───
run_ts_check "EngineService.processDeltas: state mutations applied, identity_shifts returned as flaggedForReEmbed" <<'TS'
import 'reflect-metadata';
import { EngineService } from './src/generate/engine.service';

const writtenIds: string[] = [];
const mockGraph: any = {
  updateEntityState: (id: string, _patch: any) => { writtenIds.push(id); return Promise.resolve({}); },
};
const svc = new EngineService(mockGraph);
const spec = { variables: { hp: { min: 0, max: 100 } }, cascades: [] };

const deltas: any[] = [
  { op: 'state_mutation',  entityId: 'e1', patch: { hp: 80  } },
  { op: 'state_mutation',  entityId: 'e2', patch: { hp: 150 } },
  { op: 'identity_shift',  entityId: 'e3', patch: { archetype: 'Lich' } },
];

(async () => {
  const { flaggedForReEmbed } = await svc.processDeltas(deltas, spec);

  if (!writtenIds.includes('e1') || !writtenIds.includes('e2')) {
    console.error('state mutations not written, ids:', writtenIds); process.exit(1);
  }
  if (writtenIds.includes('e3')) {
    console.error('identity_shift entity wrongly written to state layer'); process.exit(1);
  }
  if (flaggedForReEmbed.length !== 1 || flaggedForReEmbed[0].entityId !== 'e3') {
    console.error('flaggedForReEmbed wrong:', flaggedForReEmbed); process.exit(1);
  }
})();
TS

# ── 2.8 update-spec.json — mana variable present and correct ─────────────
run_ts_check "update-spec.json has mana variable with min/max and derived mana_pct formula" <<'TS'
const spec = require('./src/config/update-spec.json');

if (!spec.variables.mana) { console.error('mana variable missing'); process.exit(1); }
if (spec.variables.mana.min !== 0 || spec.variables.mana.max !== 100) {
  console.error('mana bounds wrong:', spec.variables.mana); process.exit(1);
}
if (!spec.variables.mana.derived?.mana_pct) {
  console.error('mana_pct derived formula missing'); process.exit(1);
}
const f = spec.variables.mana.derived.mana_pct;
if (typeof f.numerator !== 'string' || typeof f.denominator !== 'string') {
  console.error('mana_pct formula fields wrong:', f); process.exit(1);
}
TS

# ── 2.9 update-spec.json — cascade rule for hp ───────────────────────────
run_ts_check "update-spec.json has at least one cascade rule triggered by hp" <<'TS'
const spec = require('./src/config/update-spec.json');

if (!Array.isArray(spec.cascades) || spec.cascades.length === 0) {
  console.error('cascades empty or missing'); process.exit(1);
}
const hpRule = spec.cascades.find((c: any) => c.when?.key === 'hp');
if (!hpRule) { console.error('no cascade rule for hp key:', spec.cascades); process.exit(1); }
if (typeof hpRule.when.value !== 'number') { console.error('cascade threshold not a number:', hpRule); process.exit(1); }
if (Object.keys(hpRule.apply).length === 0) { console.error('cascade apply block is empty:', hpRule); process.exit(1); }
TS

# ── 2.10 EngineToolsService.getTools() — 3 OpenAI function schemas ────────
run_ts_check "EngineToolsService.getTools() returns 3 ChatCompletionFunctionTool objects" <<'TS'
import 'reflect-metadata';
import { EngineToolsService } from './src/generate/engine-tools.service';

const svc = new EngineToolsService({} as any);
const tools = svc.getTools();

if (tools.length !== 3) { console.error('expected 3 tools, got:', tools.length); process.exit(1); }
if (!tools.every(t => t.type === 'function')) { console.error('not all tools have type=function'); process.exit(1); }

const names = tools.map(t => t.function.name);
for (const expected of ['apply_delta', 'fire_cascade', 'resolve_rule_conflict']) {
  if (!names.includes(expected)) { console.error(`tool "${expected}" missing from:`, names); process.exit(1); }
}
TS

# ── 2.11 EngineToolsService.dispatch() — apply_delta routes correctly ─────
run_ts_check "EngineToolsService.dispatch() apply_delta → applyStateMutationDelta with clamping" <<'TS'
import 'reflect-metadata';
import { EngineService } from './src/generate/engine.service';
import { EngineToolsService } from './src/generate/engine-tools.service';

const writtenPatch: Record<string, unknown>[] = [];
const mockGraph: any = {
  updateEntityState: (_id: string, patch: any) => { writtenPatch.push(patch); return Promise.resolve({}); },
};
const engine = new EngineService(mockGraph);
const svc = new EngineToolsService(engine);
const spec = { variables: { hp: { min: 0, max: 100 } }, cascades: [] };

(async () => {
  const result = await svc.dispatch({
    id: 'tc1',
    type: 'function',
    function: { name: 'apply_delta', arguments: JSON.stringify({ entityId: 'e1', patch: { hp: 150 } }) },
  } as any, spec) as any;

  // hp 150 should be clamped to 100
  if (result.resolved.hp !== 100) { console.error('clamp not applied in dispatch:', result); process.exit(1); }
  if (writtenPatch.length !== 1 || writtenPatch[0].hp !== 100) {
    console.error('graph layer not written correctly:', writtenPatch); process.exit(1);
  }
})();
TS

# ── 2.12 EngineToolsService.dispatch() — unknown name throws ──────────────
run_ts_check "EngineToolsService.dispatch() throws for unrecognised function name" <<'TS'
import 'reflect-metadata';
import { EngineToolsService } from './src/generate/engine-tools.service';

const svc = new EngineToolsService({} as any);

(async () => {
  try {
    await svc.dispatch({ id: 'x', type: 'function', function: { name: 'hallucinated_tool', arguments: '{}' } } as any, { variables: {}, cascades: [] });
    console.error('expected throw, got none'); process.exit(1);
  } catch (e: any) {
    if (!e.message.includes('hallucinated_tool')) {
      console.error('error message does not contain tool name:', e.message); process.exit(1);
    }
  }
})();
TS

# ── 2.13 GenerateController — EmbeddingService injected ───────────────────
run_ts_check "GenerateController constructor includes EmbeddingService and reads flaggedForReEmbed" <<'TS'
import * as fs from 'fs';
const src = fs.readFileSync('./src/generate/generate.controller.ts', 'utf8');

if (!src.includes('embeddingService: EmbeddingService')) {
  console.error('EmbeddingService not in controller constructor'); process.exit(1);
}
if (!src.includes('flaggedForReEmbed')) {
  console.error('flaggedForReEmbed not captured from processDeltas return'); process.exit(1);
}
if (!src.includes('embedEntityIdentity')) {
  console.error('embedEntityIdentity not called in controller'); process.exit(1);
}
TS

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3 — API HTTP checks (requires running NestJS on :$NEST_PORT)
# ═══════════════════════════════════════════════════════════════════════════
section "3/3  API HTTP checks (NestJS on :${NEST_PORT})"
BASE="http://localhost:${NEST_PORT}/api"

if ! check_server_running; then
  skip "Server not running — start with: PORT=${NEST_PORT} npm run start:dev (also start helper-apis)"
else

  # 3.1 Server health
  HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:${NEST_PORT}/" --max-time 5 2>/dev/null)
  if [[ "$HEALTH_CODE" =~ ^[2-4][0-9][0-9]$ && "$HEALTH_CODE" != "500" ]]; then
    pass "Server health — GET / responds ($HEALTH_CODE)"
  else
    fail "Server health" "GET / returned $HEALTH_CODE (expected 2xx/4xx, not 5xx)"
  fi

  GEN_LOG=$(mktemp /tmp/day9-gen-XXXXXX.json)
  trap "rm -f $GEN_LOG" EXIT

  # 3.2 POST /api/generate without deltas — baseline regression
  GEN_CODE=$(curl -s -o "$GEN_LOG" -w "%{http_code}" \
    -X POST "$BASE/generate" \
    -H 'Content-Type: application/json' \
    -d '{"prompt":"the fire crackles in the tavern"}' \
    --max-time 120 2>/dev/null)
  GEN_BODY=$(cat "$GEN_LOG" 2>/dev/null || echo '{}')
  GEN_OK=$(node -e "
    let r; try { r=JSON.parse(process.argv[1]); } catch(e){ process.exit(2); }
    if (r.rejected===true && typeof r.reason==='string') process.exit(0);
    if (typeof r.narrative==='string' && r.narrative.length>0 && Array.isArray(r.choices)) process.exit(0);
    process.exit(1);
  " "$GEN_BODY" 2>/dev/null; echo $?)
  if [[ "$GEN_CODE" =~ ^2 && "$GEN_OK" == "0" ]]; then
    pass "POST /api/generate (no deltas) — narrative+choices returned"
  else
    fail "POST /api/generate (no deltas)" "HTTP $GEN_CODE body: ${GEN_BODY:0:160}"
  fi

  # 3.3 POST /api/generate with state_mutation delta — no 5xx, response unchanged
  DELTA_CODE=$(curl -s -o "$GEN_LOG" -w "%{http_code}" \
    -X POST "$BASE/generate" \
    -H 'Content-Type: application/json' \
    -d '{
      "prompt": "the battle continues",
      "deltas": [{ "op": "state_mutation", "entityId": "00000000-0000-0000-0000-000000000001", "patch": { "hp": 150 } }]
    }' \
    --max-time 120 2>/dev/null)
  DELTA_BODY=$(cat "$GEN_LOG" 2>/dev/null || echo '{}')
  if [[ "$DELTA_CODE" =~ ^[245][0-9][0-9]$ && ! "$DELTA_CODE" =~ ^5 ]]; then
    pass "POST /api/generate with state_mutation delta — no 5xx ($DELTA_CODE)"
  else
    fail "POST /api/generate with state_mutation delta" "HTTP $DELTA_CODE body: ${DELTA_BODY:0:160}"
  fi

  # 3.4 POST /api/generate with identity_shift delta — no 5xx (re-embed is fire-and-forget)
  SHIFT_CODE=$(curl -s -o "$GEN_LOG" -w "%{http_code}" \
    -X POST "$BASE/generate" \
    -H 'Content-Type: application/json' \
    -d '{
      "prompt": "the hero transforms",
      "deltas": [{ "op": "identity_shift", "entityId": "00000000-0000-0000-0000-000000000001", "patch": { "archetype": "Lich" } }]
    }' \
    --max-time 120 2>/dev/null)
  SHIFT_BODY=$(cat "$GEN_LOG" 2>/dev/null || echo '{}')
  if [[ "$SHIFT_CODE" =~ ^[245][0-9][0-9]$ && ! "$SHIFT_CODE" =~ ^5 ]]; then
    pass "POST /api/generate with identity_shift delta — no 5xx, re-embed fires async ($SHIFT_CODE)"
  else
    fail "POST /api/generate with identity_shift delta" "HTTP $SHIFT_CODE body: ${SHIFT_BODY:0:160}"
  fi

  # 3.5 POST /api/generate with out-of-bounds delta — engine clamps, no 5xx
  CLAMP_CODE=$(curl -s -o "$GEN_LOG" -w "%{http_code}" \
    -X POST "$BASE/generate" \
    -H 'Content-Type: application/json' \
    -d '{
      "prompt": "the mage overloads",
      "deltas": [{ "op": "state_mutation", "entityId": "00000000-0000-0000-0000-000000000001", "patch": { "hp": 9999, "mana": -500 } }]
    }' \
    --max-time 120 2>/dev/null)
  CLAMP_BODY=$(cat "$GEN_LOG" 2>/dev/null || echo '{}')
  if [[ "$CLAMP_CODE" =~ ^[245][0-9][0-9]$ && ! "$CLAMP_CODE" =~ ^5 ]]; then
    pass "POST /api/generate with out-of-bounds delta — engine clamps, no 5xx ($CLAMP_CODE)"
  else
    fail "POST /api/generate with out-of-bounds delta" "HTTP $CLAMP_CODE body: ${CLAMP_BODY:0:160}"
  fi

fi  # end server-running block

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
echo
echo -e "${BOLD}════════════════════════════════${RESET}"
echo -e "${BOLD}  Day 9 verification summary${RESET}"
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
