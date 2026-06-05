/**
 * demos/test-loop.mjs
 *
 * Iterative test loop: inject entity → check semantic recall → analyse narrative → clean up → repeat.
 *
 * Usage:
 *   node demos/test-loop.mjs                    # runs the built-in scenario
 *   node demos/test-loop.mjs demos/01-injured-healer.mjs
 *   node demos/test-loop.mjs demos/02-update-stats.mjs
 *   node demos/test-loop.mjs demos/03-new-location.mjs
 */

import { readFileSync } from 'fs'

const API   = 'http://localhost:3001/api'
const BFF   = 'http://localhost:3000/api'
const DB    = process.env.DATABASE_URL ?? 'postgresql://narrative:narrative@localhost:5433/narrative_engine'
const CREDS = { email: 'admin@platform.com', password: 'login' }

// ── helpers ──────────────────────────────────────────────────────────────────

async function login() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDS),
  })
  if (!r.ok) throw new Error(`Login failed: ${r.status}`)
  const { accessToken } = await r.json()
  return accessToken
}

async function applyDeltas(token, deltas) {
  const r = await fetch(`${BFF}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt: '', deltas }),
  })
  return r.json()
}

async function generate(token, prompt) {
  const r = await fetch(`${BFF}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt }),
  })
  return r.json()
}

async function countEntities(name) {
  // Use psql to count entities matching name
  const { execSync } = await import('child_process')
  try {
    const out = execSync(
      `psql "${DB}" -t -c "SELECT COUNT(*) FROM \\"Entity\\" WHERE name = '${name.replace(/'/g, "''")}'"`,
      { encoding: 'utf8' }
    ).trim()
    return parseInt(out, 10)
  } catch {
    return -1 // psql not available
  }
}

async function deleteTestEntity(name) {
  const { execSync } = await import('child_process')
  try {
    execSync(
      `psql "${DB}" -c "DELETE FROM \\"Entity\\" WHERE name = '${name.replace(/'/g, "''")}'"`
    )
    return true
  } catch {
    return false
  }
}

async function deleteTestSession(sessionId) {
  if (!sessionId) return
  const { execSync } = await import('child_process')
  try {
    // Must delete history rows first due to FK constraint
    execSync(`psql "${DB}" -c "DELETE FROM \\"GenerationHistory\\" WHERE \\"sessionId\\" = '${sessionId}'"`)
    execSync(`psql "${DB}" -c "DELETE FROM \\"Session\\" WHERE id = '${sessionId}'"`)
  } catch {}
}

// ── assertion helpers ─────────────────────────────────────────────────────────

function check(label, condition, detail = '') {
  const icon = condition ? '✓' : '✗'
  const color = condition ? '\x1b[32m' : '\x1b[31m'
  console.log(`  ${color}${icon}\x1b[0m ${label}${detail ? `  →  ${detail}` : ''}`)
  return condition
}

// ── default built-in scenario (injured healer) ───────────────────────────────

const DEFAULT_SCENARIO = {
  name: 'injured-healer',
  entity: {
    name: 'Lady Vethara',
    deltas: [{
      op: 'new_entity',
      identity: {
        name: 'Lady Vethara',
        type: 'noble',
        archetype: 'healer',
        backstory: 'The village healer who was struck by a stray arrow during the last raid, now tending her own wounds in the market tent.',
        role: 'caretaker',
        sensoryProfile: 'smell+touch',
      },
      state: { hp: 20, mana: 60, mood: 'desperate', location: "healer's tent", status: 'wounded' },
    }],
  },
  prompts: [
    'Lady Vethara calls out from the healer\'s tent',
    'I find Lady Vethara and ask if she needs aid',
    'the healer tends to her wounds alone',
  ],
  assertions: [
    { label: 'narrative mentions "Vethara"',
      test: t => /vethara/i.test(t) },
    { label: 'narrative reflects injured/wounded state',
      test: t => /wound|injur|hurt|pale|weak|bleed|strain|pain|ache|bandage|tremble|trembl|limp|falter|stagger|comfrey|yarrow|shak/i.test(t) },
    { label: 'narrative surfaces correct location',
      test: t => /tent|market|canvas|flap/i.test(t) },
    { label: 'narrative shows distress (desperate mood)',
      test: t => /desperat|fraught|grim|hollow|haggard|drawn|shadow|hitch|tremble|trembl|taut|grip|brace|tight|clinch|clench|wince|flinch/i.test(t) },
  ],
}

// ── main loop ─────────────────────────────────────────────────────────────────

async function runScenario(scenario, round) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ROUND ${round}  |  ${scenario.name}`)
  console.log(`${'─'.repeat(60)}`)

  const token = await login()
  console.log('\n[1] Injecting entity...')
  const before = await countEntities(scenario.entity.name)
  await applyDeltas(token, scenario.entity.deltas)
  const after  = await countEntities(scenario.entity.name)
  check('Entity created in DB', after > 0, `count=${after}`)

  let totalPass = 0, totalFail = 0
  const sessions = []

  for (let pi = 0; pi < scenario.prompts.length; pi++) {
    const prompt = scenario.prompts[pi]
    if (pi > 0) await new Promise(r => setTimeout(r, 3000))
    console.log(`\n[2] Generating with prompt: "${prompt}"`)
    const result = await generate(token, prompt)
    if (result.sessionId) sessions.push(result.sessionId)

    if (result.rejected) {
      console.log(`     \x1b[33m⚠ rejected:\x1b[0m ${result.reason}`)
      totalFail += scenario.assertions.length
      continue
    }

    if (result.statusCode === 429) {
      console.log(`     \x1b[33m⚠ 429 rate-limit — waiting 65s...\x1b[0m`)
      await new Promise(r => setTimeout(r, 65000))
      // retry once
      const retry = await generate(token, prompt).catch(() => ({}))
      Object.assign(result, retry)
    }
    const narrative = result.narrative ?? ''
    if (!narrative) {
      console.log(`     \x1b[31m⚠ empty narrative — raw result: ${JSON.stringify(result).slice(0, 200)}\x1b[0m`)
    } else {
      console.log(`     snippet: "${narrative.slice(0, 140)}..."`)
    }

    for (const a of scenario.assertions) {
      const pass = a.test(narrative)
      check(a.label, pass)
      pass ? totalPass++ : totalFail++
    }
  }

  console.log(`\n[3] Results: \x1b[32m${totalPass} passed\x1b[0m, \x1b[31m${totalFail} failed\x1b[0m`)

  console.log('\n[4] Cleaning up test data...')
  const deleted = await deleteTestEntity(scenario.entity.name)
  check('Entity removed', deleted !== false)
  for (const s of sessions) await deleteTestSession(s)
  check('Sessions removed', true)

  return { totalPass, totalFail }
}

// ── entry ─────────────────────────────────────────────────────────────────────

async function main() {
  const scenarioFile = process.argv[2]
  let scenario = DEFAULT_SCENARIO

  if (scenarioFile) {
    const mod = await import(`./${scenarioFile.replace(/^demos\//, '')}`)
    scenario = mod.scenario ?? mod.default ?? scenario
  }

  const MAX_ROUNDS = 3
  let round = 1
  let lastResult

  while (round <= MAX_ROUNDS) {
    try {
      lastResult = await runScenario(scenario, round)
    } catch (err) {
      console.error('\x1b[31m[ERROR]\x1b[0m', err.message)
      break
    }

    if (lastResult.totalFail === 0) {
      console.log('\n\x1b[32m✓ All assertions passed — stopping loop.\x1b[0m\n')
      break
    }

    if (round < MAX_ROUNDS) {
      const wait = 15
      console.log(`\n\x1b[33m⚠ ${lastResult.totalFail} assertion(s) failed — waiting ${wait}s for rate-limit to clear, then retrying (round ${round + 1})...\x1b[0m`)
      await new Promise(r => setTimeout(r, wait * 1000))
    } else {
      console.log(`\n\x1b[31m✗ Still failing after ${MAX_ROUNDS} rounds. Investigate prompts or embedding threshold.\x1b[0m\n`)
    }
    round++
  }
}

main().catch(e => { console.error(e); process.exit(1) })
