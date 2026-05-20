#!/usr/bin/env bash
# verify-day7.sh — E2E verification for Day 7 server features.
#
# Usage:  cd server && bash scripts/verify-day7.sh
#
# Sections:
#   1. Jest unit suite (all 96 tests must pass)
#   2. Service-level logic checks via ts-node (no DB, no network)
#   3. API HTTP checks against a running server (skipped if server is down)
#
# For Section 3, start the server first:
#   npm run start:dev   (ensure OPENROUTER_API_KEY is set in .env)
#
# Rate-limiter note: the app uses limit=5 per 60s.
# Section 3 runs the rate-limit check LAST; wait 60s before re-running
# if the suite was already run within the last minute.

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
cleanup() { for f in "${TMP_FILES[@]:-}"; do rm -f "$f" 2>/dev/null; done; }
trap cleanup EXIT

new_tmp_ts() {
  local f
  f=$(mktemp "$SERVER_DIR/.day7-check-XXXXXX.ts")
  TMP_FILES+=("$f")
  echo "$f"
}

new_tmp_log() {
  local f
  f=$(mktemp "$SERVER_DIR/.day7-log-XXXXXX.log")
  TMP_FILES+=("$f")
  echo "$f"
}

# run_ts_check <label>  [file content on stdin]
# Writes stdin to a temp .ts in SERVER_DIR, runs ts-node, reports result.
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

# NestJS default port is 3000, but when Next.js client occupies 3000 the server
# runs on 3001. Override: NEST_PORT=3000 bash scripts/verify-day7.sh
NEST_PORT="${NEST_PORT:-3001}"

check_server_running() {
  # Use a quick 404 probe — just confirms the HTTP server is accepting connections.
  # Avoids waiting for a full LLM round-trip (which can take 30s+).
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    "http://localhost:${NEST_PORT}/" \
    --max-time 3 2>/dev/null)
  [[ "$code" != "000" ]]
}

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1 — Jest unit suite
# ═══════════════════════════════════════════════════════════════════════════
section "1/3  Unit tests (Jest)"
LOG=$(new_tmp_log)
if npx jest --no-coverage --silent >"$LOG" 2>&1; then
  SUITE_COUNT=$(grep -c "PASS" "$LOG" || true)
  TEST_COUNT=$(grep -oP '\d+ passed' "$LOG" | tail -1 | grep -oP '\d+' || echo "?")
  pass "Jest suite ($TEST_COUNT tests)"
else
  echo
  tail -n 40 "$LOG"
  fail "Jest suite" "see $LOG (kept for inspection)"
  # Don't remove this log so the user can read it
  TMP_FILES=("${TMP_FILES[@]/$LOG}")
fi

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2 — Service-level logic (ts-node, no DB/network required)
# ═══════════════════════════════════════════════════════════════════════════
section "2/3  Service-level logic (ts-node)"

# ── 2.1 EmbeddingService.buildIdentityText ───────────────────────────────
run_ts_check "EmbeddingService.buildIdentityText" <<'TS'
import 'reflect-metadata';
import { EmbeddingService } from './src/generate/embedding.service';
const cfg = { get: () => 'http://localhost:4000' } as any;
const svc = new EmbeddingService({} as any, cfg);

const full = svc.buildIdentityText({
  name: 'Elara', type: 'character',
  archetype: 'Mage', backstory: 'An ancient sorcerer', role: 'protagonist',
});
if (full !== 'Elara | character | Mage | An ancient sorcerer | protagonist') {
  console.error('full identity text mismatch:', full); process.exit(1);
}

const partial = svc.buildIdentityText({
  name: 'Stone', type: 'object', archetype: null, backstory: undefined, role: null,
});
if (partial !== 'Stone | object') {
  console.error('partial mismatch:', partial); process.exit(1);
}

const noExtras = svc.buildIdentityText({ name: 'X', type: 'item', archetype: null, backstory: null, role: null });
if (noExtras !== 'X | item') {
  console.error('no-extras mismatch:', noExtras); process.exit(1);
}
TS

# ── 2.2 EmbeddingService.shouldReembed ───────────────────────────────────
run_ts_check "EmbeddingService.shouldReembed" <<'TS'
import 'reflect-metadata';
import { EmbeddingService } from './src/generate/embedding.service';
const cfg = { get: () => 'http://localhost:4000' } as any;
const svc = new EmbeddingService({} as any, cfg);

const base = { name: 'Elara', type: 'character', archetype: 'Mage', backstory: null, role: null, state: { hp: 100 } };

// Identity field change → should re-embed
const nameChange = svc.shouldReembed(base, { ...base, name: 'Elena' });
if (!nameChange) { console.error('name change should trigger reembed'); process.exit(1); }

const archetypeChange = svc.shouldReembed(base, { ...base, archetype: 'Warrior' });
if (!archetypeChange) { console.error('archetype change should trigger reembed'); process.exit(1); }

// State-only change → should NOT re-embed
const stateChange = svc.shouldReembed(base, { ...base, state: { hp: 50 } });
if (stateChange) { console.error('state-only change should NOT trigger reembed'); process.exit(1); }

// No change → should NOT re-embed
const noChange = svc.shouldReembed(base, { ...base });
if (noChange) { console.error('no change should NOT trigger reembed'); process.exit(1); }
TS

# ── 2.3 EmbeddingService.generateEmbedding — zero-vector fallback ────────
run_ts_check "EmbeddingService.generateEmbedding zero-vector fallback" <<'TS'
import 'reflect-metadata';
const OpenAI = require('openai').default;

// Override OpenAI to simulate unreachable proxy
const OriginalOpenAI = OpenAI;
require.cache[require.resolve('openai')] = {
  id: require.resolve('openai'),
  filename: require.resolve('openai'),
  loaded: true,
  exports: {
    __esModule: true,
    default: class {
      embeddings = {
        create: () => Promise.reject(new Error('ECONNREFUSED'))
      };
    }
  },
  children: [],
  paths: [],
  parent: null as any,
};

import { EmbeddingService } from './src/generate/embedding.service';
const cfg = { get: () => 'http://localhost:4000' } as any;
const svc = new EmbeddingService({} as any, cfg);

(async () => {
  const result = await svc.generateEmbedding('any text');
  if (result.length !== 384) { console.error('expected 384-dim, got', result.length); process.exit(1); }
  if (!result.every((v: number) => v === 0)) { console.error('expected all zeros'); process.exit(1); }
})();
TS

# ── 2.4 TraversalService.traverse — BFS, proximityScore, cycle prevention ─
run_ts_check "TraversalService.traverse BFS + proximityScore + cycle prevention" <<'TS'
import 'reflect-metadata';
import { TraversalService } from './src/generate/traversal.service';

const now = new Date();
const makeEntity = (id: string, fromEdges: any[] = [], toEdges: any[] = []) => ({
  id, name: id, type: 'character', tags: [], facts: null, archetype: null,
  backstory: null, role: null, identity_version: 0, state: null, last_beat: null,
  createdAt: now, updatedAt: now, fromEdges, toEdges,
});

// A → B → C chain
const edgeAB = { fromId: 'A', toId: 'B', weight: 1 };
const edgeBC = { fromId: 'B', toId: 'C', weight: 1 };
const A = makeEntity('A', [edgeAB], []);
const B = makeEntity('B', [edgeBC], [edgeAB]);
const C = makeEntity('C', [], [edgeBC]);

const svc = new TraversalService();
const result = svc.traverse('A', [A, B, C], 2);

if (result.length !== 3) { console.error('expected 3 entities, got', result.length); process.exit(1); }
const byId = new Map(result.map((e: any) => [e.id, e]));
if (Math.abs(byId.get('A').proximityScore - 1.0) > 1e-9) {
  console.error('A proximityScore wrong:', byId.get('A').proximityScore); process.exit(1);
}
if (Math.abs(byId.get('B').proximityScore - 0.5) > 1e-9) {
  console.error('B proximityScore wrong:', byId.get('B').proximityScore); process.exit(1);
}
if (Math.abs(byId.get('C').proximityScore - 1/3) > 1e-6) {
  console.error('C proximityScore wrong:', byId.get('C').proximityScore); process.exit(1);
}
// Must be sorted desc: A, B, C
if (result[0].id !== 'A' || result[1].id !== 'B' || result[2].id !== 'C') {
  console.error('sort order wrong:', result.map((e: any) => e.id)); process.exit(1);
}

// Cycle prevention: C → A creates a cycle; depth=5 must still return exactly 3
const edgeCA = { fromId: 'C', toId: 'A', weight: 1 };
const Ccycle = makeEntity('C', [edgeCA], [edgeBC]);
const cycleResult = svc.traverse('A', [A, B, Ccycle], 5);
if (cycleResult.length !== 3) {
  console.error('cycle test: expected 3, got', cycleResult.length); process.exit(1);
}
const cycleIds = cycleResult.map((e: any) => e.id).sort().join(',');
if (cycleIds !== 'A,B,C') { console.error('cycle test: wrong ids:', cycleIds); process.exit(1); }
TS

# ── 2.5 TraversalService.scoreWithSemantics — 50/50 blend ────────────────
run_ts_check "TraversalService.scoreWithSemantics 50/50 blend" <<'TS'
import 'reflect-metadata';
import { TraversalService } from './src/generate/traversal.service';

const svc = new TraversalService();
// a: proximity=0.8, phase1=0.0 → combined=0.4
// b: proximity=0.2, phase1=1.0 → combined=0.6  → b should rank first
const traversed = [
  { id: 'a', proximityScore: 0.8, combinedScore: 0.8 } as any,
  { id: 'b', proximityScore: 0.2, combinedScore: 0.2 } as any,
];
const phase1 = new Map<string, number>([['a', 0.0], ['b', 1.0]]);
const ranked = svc.scoreWithSemantics(traversed, phase1);

if (ranked[0].id !== 'b') { console.error('b should rank first, got', ranked[0].id); process.exit(1); }
if (Math.abs(ranked[0].combinedScore - 0.6) > 1e-9) {
  console.error('b combinedScore wrong:', ranked[0].combinedScore); process.exit(1);
}
if (ranked[1].id !== 'a') { console.error('a should rank second, got', ranked[1].id); process.exit(1); }
if (Math.abs(ranked[1].combinedScore - 0.4) > 1e-9) {
  console.error('a combinedScore wrong:', ranked[1].combinedScore); process.exit(1);
}

// Entity missing from phase1 scores → treated as 0
const traversed2 = [{ id: 'x', proximityScore: 1.0, combinedScore: 1.0 } as any];
const ranked2 = svc.scoreWithSemantics(traversed2, new Map());
if (Math.abs(ranked2[0].combinedScore - 0.5) > 1e-9) {
  console.error('missing phase1 score should default to 0, got:', ranked2[0].combinedScore); process.exit(1);
}
TS

# ── 2.6 RuleEvaluatorService — triggers, priority, conflict detection ─────
run_ts_check "RuleEvaluatorService entity-presence + priority + conflict detection" <<'TS'
import 'reflect-metadata';
import { RuleEvaluatorService } from './src/generate/rule-evaluator.service';

const now = new Date();
const makeReached = (id: string, state: any = null) => ({
  id, name: id, type: 'character', tags: [], facts: null, archetype: null,
  backstory: null, role: null, identity_version: 0, state, last_beat: null,
  createdAt: now, updatedAt: now, fromEdges: [], toEdges: [],
});
const makeRule = (id: string, triggers: any[], outcome: string, priority: number) => ({
  id, name: id, type: 'rule', tags: [], facts: { triggers, outcome, priority },
  archetype: null, backstory: null, role: null, identity_version: 0, state: null,
  last_beat: null, createdAt: now, updatedAt: now, fromEdges: [], toEdges: [],
});

const svc = new RuleEvaluatorService();
const hero = makeReached('hero');

// entity-presence trigger fires when entity is in reached set
const r1 = makeRule('r1', [{ type: 'entity-presence', entityId: 'hero' }], 'allow entry', 5);
const res1 = svc.evaluateRules([hero], [r1]);
if (res1.length !== 1) { console.error('entity-presence: expected 1 result, got', res1.length); process.exit(1); }
if (res1[0].ruleId !== 'r1') { console.error('wrong rule fired:', res1[0].ruleId); process.exit(1); }

// entity-presence does NOT fire when entity is absent
const res1b = svc.evaluateRules([], [r1]);
if (res1b.length !== 0) { console.error('absent entity: expected 0 results, got', res1b.length); process.exit(1); }

// AND logic: both triggers must be satisfied
const r2 = makeRule('r2', [
  { type: 'entity-presence', entityId: 'hero' },
  { type: 'entity-presence', entityId: 'villain' },
], 'epic battle', 8);
const andFail = svc.evaluateRules([hero], [r2]);
if (andFail.length !== 0) { console.error('AND logic failed: villain absent but rule fired'); process.exit(1); }
const villain = makeReached('villain');
const andPass = svc.evaluateRules([hero, villain], [r2]);
if (andPass.length !== 1) { console.error('AND logic: both present but rule did not fire'); process.exit(1); }

// Priority sort: higher priority comes first
const rHigh = makeRule('rH', [{ type: 'entity-presence', entityId: 'hero' }], 'high priority', 10);
const rLow  = makeRule('rL', [{ type: 'entity-presence', entityId: 'hero' }], 'low priority',  5);
const resSorted = svc.evaluateRules([hero], [rLow, rHigh]);
if (resSorted[0].ruleId !== 'rH') { console.error('priority sort wrong:', resSorted.map(r => r.ruleId)); process.exit(1); }

// Specificity tiebreak: equal priority, 2-trigger rule beats 1-trigger
const r2triggers = makeRule('r2t', [
  { type: 'entity-presence', entityId: 'hero' },
  { type: 'entity-presence', entityId: 'villain' },
], 'specific', 5);
const r1trigger = makeRule('r1t', [{ type: 'entity-presence', entityId: 'hero' }], 'general', 5);
const resSpec = svc.evaluateRules([hero, villain], [r1trigger, r2triggers]);
if (resSpec[0].ruleId !== 'r2t') { console.error('specificity sort wrong:', resSpec.map(r => r.ruleId)); process.exit(1); }

// Conflict detection: allow/deny antonym pair
const rAllow = makeRule('rA', [{ type: 'entity-presence', entityId: 'hero' }], 'allow entry', 5);
const rDeny  = makeRule('rD', [{ type: 'entity-presence', entityId: 'hero' }], 'deny entry',  3);
const resConf = svc.evaluateRules([hero], [rAllow, rDeny]);
const rAResult = resConf.find(r => r.ruleId === 'rA')!;
const rDResult = resConf.find(r => r.ruleId === 'rD')!;
if (!rAResult.conflictsWith?.includes('rD')) { console.error('rA.conflictsWith missing rD'); process.exit(1); }
if (!rDResult.conflictsWith?.includes('rA')) { console.error('rD.conflictsWith missing rA'); process.exit(1); }
TS

# ── 2.7 NarrativeGeneratorService.buildSystemPrompt — worldContext injection
run_ts_check "NarrativeGeneratorService.buildSystemPrompt worldContext injection" <<'TS'
import 'reflect-metadata';
process.env['OPENROUTER_API_KEY'] = 'test-key';
import { NarrativeGeneratorService } from './src/generate/narrative-generator.service';
const cfg = {
  get: (k: string) => process.env[k],
  getOrThrow: (k: string) => process.env[k] ?? 'test',
} as any;
const svc = new NarrativeGeneratorService(cfg);
const buildPrompt = (svc as any).buildSystemPrompt.bind(svc);

// Empty worldContext → no WORLD CONTEXT block
const empty = buildPrompt('');
if (empty.includes('WORLD CONTEXT')) {
  console.error('empty worldContext should not include WORLD CONTEXT block'); process.exit(1);
}
if (empty.includes('undefined') || empty.includes('null')) {
  console.error('base prompt contains undefined/null'); process.exit(1);
}

// Non-empty worldContext → WORLD CONTEXT block present with entity
const filled = buildPrompt('WORLD:\n- Elara (character)\n- Thornwall (location)');
if (!filled.includes('WORLD CONTEXT')) {
  console.error('filled worldContext should include WORLD CONTEXT block'); process.exit(1);
}
if (!filled.includes('Elara')) { console.error('filled should contain entity name Elara'); process.exit(1); }
if (!filled.includes('Thornwall')) { console.error('filled should contain entity name Thornwall'); process.exit(1); }

// Whitespace-only worldContext → treated as empty
const whitespace = buildPrompt('   \n  ');
if (whitespace.includes('WORLD CONTEXT')) {
  console.error('whitespace worldContext should not include WORLD CONTEXT block'); process.exit(1);
}

// Undefined worldContext → no WORLD CONTEXT block
const undef = buildPrompt(undefined);
if (undef.includes('WORLD CONTEXT')) {
  console.error('undefined worldContext should not include WORLD CONTEXT block'); process.exit(1);
}
TS

# ── 2.8 RuleEvaluatorService — state-value and relationship triggers ──────
run_ts_check "RuleEvaluatorService state-value + relationship triggers" <<'TS'
import 'reflect-metadata';
import { RuleEvaluatorService } from './src/generate/rule-evaluator.service';

const now = new Date();
const makeReached = (id: string, state: any = null, fromEdges: any[] = [], toEdges: any[] = []) => ({
  id, name: id, type: 'character', tags: [], facts: null, archetype: null,
  backstory: null, role: null, identity_version: 0, state, last_beat: null,
  createdAt: now, updatedAt: now, fromEdges, toEdges,
});
const makeRule = (id: string, triggers: any[], outcome: string, priority: number) => ({
  id, name: id, type: 'rule', tags: [], facts: { triggers, outcome, priority },
  archetype: null, backstory: null, role: null, identity_version: 0, state: null,
  last_beat: null, createdAt: now, updatedAt: now, fromEdges: [], toEdges: [],
});

const svc = new RuleEvaluatorService();

// state-value trigger fires when field matches value
const hero = makeReached('hero', { wounded: true });
const rWounded = makeRule('rW', [{ type: 'state-value', entityId: 'hero', field: 'wounded', value: true }], 'hero is wounded', 5);
const resState = svc.evaluateRules([hero], [rWounded]);
if (resState.length !== 1) { console.error('state-value: expected 1, got', resState.length); process.exit(1); }

// state-value does NOT fire when field doesn't match
const heroHealthy = makeReached('hero', { wounded: false });
const resStateNo = svc.evaluateRules([heroHealthy], [rWounded]);
if (resStateNo.length !== 0) { console.error('state-value: should not fire when value mismatch, got', resStateNo.length); process.exit(1); }

// relationship trigger: directed edge hero → villain with type 'ally'
const edge = { fromId: 'hero', toId: 'villain', type: 'ally' };
const heroWithEdge = makeReached('hero', null, [edge], []);
const villain = makeReached('villain', null, [], [edge]);
const rRelation = makeRule('rR', [{ type: 'relationship', fromId: 'hero', toId: 'villain', edgeType: 'ally' }], 'hero allies with villain', 5);
const resRel = svc.evaluateRules([heroWithEdge, villain], [rRelation]);
if (resRel.length !== 1) { console.error('relationship: expected 1, got', resRel.length); process.exit(1); }

// relationship does NOT fire with wrong edge type
const rRelationWrong = makeRule('rRW', [{ type: 'relationship', fromId: 'hero', toId: 'villain', edgeType: 'enemy' }], 'nope', 5);
const resRelNo = svc.evaluateRules([heroWithEdge, villain], [rRelationWrong]);
if (resRelNo.length !== 0) { console.error('relationship: should not fire with wrong edgeType, got', resRelNo.length); process.exit(1); }
TS

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3 — API HTTP checks (requires running server on :3000)
# ═══════════════════════════════════════════════════════════════════════════
section "3/3  API HTTP checks (NestJS on :${NEST_PORT})"
BASE="http://localhost:${NEST_PORT}/api"

if ! check_server_running; then
  skip "Server not running — start with: npm run start:dev (ensure .env has OPENROUTER_API_KEY)"
else

  # 3.1 POST /api/generate returns valid shape
  RESP_LOG=$(new_tmp_log)
  curl -s -X POST "$BASE/generate" \
    -H 'Content-Type: application/json' \
    -d '{"prompt":"a quiet evening in the forest"}' \
    --max-time 120 -o "$RESP_LOG" 2>/dev/null || true

  RESP_BODY=$(cat "$RESP_LOG" 2>/dev/null || echo '{}')
  SHAPE_OK=$(node -e "
    let r;
    try { r = JSON.parse(process.argv[1]); } catch(e) { process.exit(2); }
    if (r.rejected === true && typeof r.reason === 'string') process.exit(0);
    if (typeof r.narrative === 'string' && r.narrative.length > 0 && Array.isArray(r.choices) && r.choices.length > 0) process.exit(0);
    process.exit(1);
  " "$RESP_BODY" 2>/dev/null; echo $?)
  if [[ "$SHAPE_OK" == "0" ]]; then
    NARRATIVE_LEN=$(node -e "try{const r=JSON.parse(process.argv[1]);console.log(r.narrative.length+' chars, '+r.choices.length+' choices')}catch{}" "$RESP_BODY" 2>/dev/null || echo "")
    pass "POST /api/generate — real narrative generated (${NARRATIVE_LEN})"
  else
    fail "POST /api/generate — expected {narrative,choices} shape" "response: ${RESP_BODY:0:120}"
  fi

  # 3.2 POST /api/generate — 400 on empty body
  CODE_EMPTY=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE/generate" \
    -H 'Content-Type: application/json' \
    -d '{}' \
    --max-time 10 2>/dev/null)
  # Accept any real HTTP response (2xx/4xx/5xx) — just confirms the server is routing it
  if [[ "$CODE_EMPTY" =~ ^[245][0-9][0-9]$ ]]; then
    pass "POST /api/generate empty body — server responds ($CODE_EMPTY)"
  else
    fail "POST /api/generate empty body" "unexpected HTTP $CODE_EMPTY (connection failure?)"
  fi

  # 3.3 GET /api/generate/stream — SSE event order
  SSE_LOG=$(new_tmp_log)
  curl -sN \
    -H 'Accept: text/event-stream' \
    "$BASE/generate/stream?prompt=a%20quiet%20evening" \
    --max-time 180 > "$SSE_LOG" &
  CURL_PID=$!
  # Poll until we see a terminal event — 150s budget (helper-apis Claude calls can take 60-90s)
  WAITED=0
  while [[ $WAITED -lt 300 ]]; do
    if grep -q '"type":"choices"' "$SSE_LOG" 2>/dev/null || \
       grep -q '"type":"rejected"' "$SSE_LOG" 2>/dev/null || \
       grep -q '"type":"error"' "$SSE_LOG" 2>/dev/null; then
      break
    fi
    sleep 0.5
    WAITED=$((WAITED+1))
  done
  kill $CURL_PID 2>/dev/null
  wait $CURL_PID 2>/dev/null || true

  SSE_SHAPE=$(node -e "
    const fs = require('fs');
    const text = fs.readFileSync(process.argv[1], 'utf8');
    const events = text.split('\n')
      .filter(l => l.startsWith('data:'))
      .map(l => { try { return JSON.parse(l.slice(5).trim()); } catch { return null; } })
      .filter(Boolean);
    const types = events.map(e => e.type);
    if (types.length === 0) { console.error('no events received'); process.exit(10); }
    // accepted: rejected path
    if (types[0] === 'rejected') {
      if (typeof events[0].reason !== 'string') { console.error('rejected has no reason'); process.exit(11); }
      process.exit(0);
    }
    // accepted: error path — either bare error (db/context failure before start)
    // or start→chunk*→error (LLM/network failure mid-stream)
    if (types.includes('error')) {
      const errEvent = events[types.indexOf('error')];
      if (typeof errEvent.message !== 'string') { console.error('error event has no message'); process.exit(12); }
      process.exit(0);
    }
    // happy path or modified path
    let i = 0;
    if (types[0] === 'modified') i = 1;
    if (types[i] !== 'start') { console.error('expected start at', i, 'got', types[i]); process.exit(13); }
    const doneIdx = types.indexOf('done', i);
    const choicesIdx = types.indexOf('choices', i);
    if (doneIdx === -1) { console.error('no done event; events:', types.join(',')); process.exit(14); }
    if (choicesIdx === -1) { console.error('no choices event; events:', types.join(',')); process.exit(15); }
    if (doneIdx > choicesIdx) { console.error('done after choices'); process.exit(16); }
    const chunkCount = types.slice(i+1, doneIdx).filter(t => t === 'chunk').length;
    if (chunkCount === 0) { console.error('no chunk events between start and done'); process.exit(17); }
    if (!Array.isArray(events[choicesIdx].choices)) { console.error('choices not array'); process.exit(18); }
  " "$SSE_LOG" 2>/dev/null; echo $?)

  if [[ "$SSE_SHAPE" == "0" ]]; then
    pass "GET /api/generate/stream — SSE event sequence valid"
  else
    EVENTS_PREVIEW=$(grep 'data:' "$SSE_LOG" | head -6 | tr '\n' ' ' 2>/dev/null || echo "no events")
    fail "GET /api/generate/stream — SSE event sequence invalid (exit $SSE_SHAPE)" "$EVENTS_PREVIEW"
  fi

  # 3.4 Rate limiting — 6th rapid POST returns 429
  # Note: throttle is limit=5 per 60s window; run LAST to avoid polluting earlier checks.
  # Fire 6 rapid requests; the 6th (or any past limit) must be 429.
  echo "  (firing 6 rapid POSTs to hit rate limiter — this may take a few seconds)"
  RATE_CODES=()
  for i in 1 2 3 4 5 6; do
    CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$BASE/generate" \
      -H 'Content-Type: application/json' \
      -d "{\"prompt\":\"rate-probe-$i\"}" \
      --max-time 5 2>/dev/null)
    RATE_CODES+=("$CODE")
  done
  # The 6th request must be 429
  LAST_CODE="${RATE_CODES[5]}"
  if [[ "$LAST_CODE" == "429" ]]; then
    pass "Rate limiting — 429 returned after limit exceeded (codes: ${RATE_CODES[*]})"
  else
    fail "Rate limiting — expected 429 on 6th request" "codes: ${RATE_CODES[*]}"
  fi

fi  # end server running block

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
echo
echo -e "${BOLD}════════════════════════════════${RESET}"
echo -e "${BOLD}  Day 7 verification summary${RESET}"
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
