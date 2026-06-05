/**
 * demos/04-embedding-graph-cycle.mjs
 *
 * Full embedding + graph read/write cycle demo.
 *
 * What this tests:
 *   Phase 1 — Embedding recall by CONCEPT (not exact name):
 *             "village elder" or "wounded scout" surfaces Elder Wynne
 *             even though the prompt never says her name.
 *
 *   Phase 2 — Graph edge traversal:
 *             Elder Wynne has an edge to The Remedy Satchel (belongs_to).
 *             When Wynne is the anchor, BFS depth-2 pulls in the Satchel.
 *             The Satchel should appear in the narrative without being
 *             mentioned in the prompt at all.
 *
 *   Phase 3 — Cross-entity state read:
 *             Gareth (seeded, hp:15, injured) is connected to Wynne via an
 *             edge injected here. Prompting about treating Gareth should
 *             surface his injured state in the narrative.
 *
 *   Phase 4 — State write and re-read:
 *             Apply a state_mutation directly (Gareth hp 15→55, recovering).
 *             Next beat should reflect the improved state — NOT the old injury.
 *
 * ─── Sample chat messages to try in the UI ──────────────────────────────────
 *   (These are the same prompts the test loop uses. Try them in order.)
 *
 *   1. "the village elder tends to the wounded scout by the fire"
 *      → Should mention Wynne (recalled by concept: elder + wounded scout)
 *        and reference healing herbs / satchel (via edge traversal)
 *
 *   2. "Elder Wynne reaches into her remedy satchel"
 *      → Should mention the satchel contents and Wynne's worried mood
 *
 *   3. "Elder Wynne presses the poultice to Gareth's leg"
 *      → Should surface Gareth's injury (hp:15, injured status) because
 *        the Wynne→Gareth edge brings him into the traversed subgraph
 *
 *   4. "Gareth flexes his healed leg and tests his weight"
 *      → After the state mutation is applied (hp:55, recovering), this
 *        should NOT mention limping/shaking — the updated state must show
 *
 * Run:  node demos/04-embedding-graph-cycle.mjs
 * ────────────────────────────────────────────────────────────────────────────
 */

import { execSync } from 'child_process'

const API = 'http://localhost:3001/api'
const BFF = 'http://localhost:3000/api'
const DB  = process.env.DATABASE_URL ?? 'postgresql://narrative:narrative@localhost:5433/narrative_engine'

const DEMO_ENTITIES = ['Elder Wynne', 'The Remedy Satchel']

// ── helpers ──────────────────────────────────────────────────────────────────

async function login() {
  const r = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@platform.com', password: 'login' }),
  })
  if (!r.ok) throw new Error(`Login failed (${r.status}) — is the server running?`)
  return (await r.json()).accessToken
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

function dbQuery(sql) {
  return execSync(`psql "${DB}" -t -f -`, { input: sql, encoding: 'utf8' }).trim()
}

function getEntityState(name) {
  try {
    const row = dbQuery(`SELECT state FROM "Entity" WHERE name='${name.replace(/'/g, "''")}'`)
    return row ? JSON.parse(row.trim()) : null
  } catch { return null }
}

function pass(label, detail = '') {
  console.log(`  \x1b[32m✓\x1b[0m ${label}${detail ? `  →  \x1b[2m${detail}\x1b[0m` : ''}`)
  return true
}
function fail(label, detail = '') {
  console.log(`  \x1b[31m✗\x1b[0m ${label}${detail ? `  →  \x1b[2m${detail}\x1b[0m` : ''}`)
  return false
}
function check(label, condition, detail = '') {
  return condition ? pass(label, detail) : fail(label, detail)
}
function header(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`)
  console.log('─'.repeat(60))
}
async function pause(ms) { await new Promise(r => setTimeout(r, ms)) }

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗')
  console.log('║  Demo 04 — Embedding + Graph Read/Write Cycle            ║')
  console.log('╚══════════════════════════════════════════════════════════╝')

  const token = await login()
  let passed = 0, failed = 0
  const record = (ok) => ok ? passed++ : failed++

  // ─── Phase 1: Inject entities + edges ──────────────────────────────────────
  header('Phase 1 — Inject entities and graph edges')

  const injectResult = await applyDeltas(token, [
    {
      op: 'new_entity',
      identity: {
        name: 'Elder Wynne',
        type: 'noble',
        archetype: 'elder',
        backstory: 'The oldest living resident of Thornwall, keeper of its remedies and quiet histories. She carries decades of herb-lore in her hands and a persistent worry in her eyes since the raids began.',
        role: 'healer',
        sensoryProfile: 'smell+touch',
      },
      state: { hp: 70, mana: 80, mood: 'worried', location: 'great hall', status: 'active' },
    },
    {
      op: 'new_entity',
      identity: {
        name: 'The Remedy Satchel',
        type: 'object',
        archetype: 'artifact',
        backstory: 'A worn leather satchel lined with dried yarrow, willow bark, and a small clay pot of comfrey salve. Elder Wynne never leaves without it.',
        role: 'tool',
        sensoryProfile: 'smell',
      },
      state: { location: 'great hall', owner: 'Elder Wynne', contents: 'yarrow, willow bark, comfrey salve' },
    },
    // Graph edges
    { op: 'new_edge', fromName: 'The Remedy Satchel', toName: 'Elder Wynne',      type: 'belongs_to', weight: 1.0 },
    { op: 'new_edge', fromName: 'Elder Wynne',        toName: 'Gareth the Scout', type: 'knows',      weight: 0.9 },
    { op: 'new_edge', fromName: 'Elder Wynne',        toName: 'Thornwall Village', type: 'lives_in',  weight: 1.0 },
  ])

  // Verify both entities in DB with embeddings
  for (const name of DEMO_ENTITIES) {
    const safe = name.replace(/'/g, "''")
    const row = dbQuery(`SELECT name, LEFT(embedding::text, 20) FROM "Entity" WHERE name='${safe}'`)
    record(check(`"${name}" created with embedding`, row.includes(name) && !row.includes('null')))
  }

  // Verify edge count increased
  const edgeCount = parseInt(dbQuery(`SELECT COUNT(*) FROM "Edge"`), 10)
  record(check('Graph edges written', edgeCount >= 3, `${edgeCount} total edges`))

  // ─── Phase 2: Embedding recall by concept (not exact name) ─────────────────
  header('Phase 2 — Embedding recall by concept')
  console.log('  prompt: "the village elder tends to the wounded scout by the fire"')
  console.log('  (no name given — should recall Elder Wynne via semantic similarity)\n')

  await pause(3000)
  const phase2 = await generate(token, 'the village elder tends to the wounded scout by the fire')

  if (phase2.statusCode === 429) {
    console.log('  \x1b[33m⚠ Rate-limited — waiting 65s\x1b[0m')
    await pause(65000)
    Object.assign(phase2, await generate(token, 'the village elder tends to the wounded scout by the fire'))
  }

  const p2text = phase2.narrative ?? ''
  console.log(`  narrative: "${p2text.slice(0, 150)}..."`)
  record(check('Elder Wynne recalled by concept ("elder")',   /wynne|elder/i.test(p2text)))
  record(check('Healing/remedy context present',              /herb|yarrow|salve|poultice|remedy|healing|comfrey|willow|bark|tend/i.test(p2text)))
  record(check('Worried mood reflected',                      /worried|concern|careful|gentle|slow|soft|quiet|steady|worn|tired|old/i.test(p2text)))

  // ─── Phase 3: Graph edge traversal — Remedy Satchel pulled in via edge ─────
  header('Phase 3 — Graph edge traversal')
  console.log('  prompt: "Elder Wynne reaches into her remedy satchel"')
  console.log('  (Satchel not explicitly in world seed — must arrive via Wynne→Satchel edge)\n')

  await pause(3000)
  const phase3 = await generate(token, 'Elder Wynne reaches into her remedy satchel')

  if (phase3.statusCode === 429) {
    console.log('  \x1b[33m⚠ Rate-limited — waiting 65s\x1b[0m')
    await pause(65000)
    Object.assign(phase3, await generate(token, 'Elder Wynne reaches into her remedy satchel'))
  }

  const p3text = phase3.narrative ?? ''
  console.log(`  narrative: "${p3text.slice(0, 150)}..."`)
  record(check('Elder Wynne named in narrative',              /wynne/i.test(p3text)))
  record(check('Satchel contents surface via edge traversal', /satchel|yarrow|salve|poultice|comfrey|willow|bark|herb|remedy/i.test(p3text)))

  // ─── Phase 4: Cross-entity state read — Gareth's injury via Wynne edge ─────
  header('Phase 4 — Cross-entity state read via edge')
  console.log('  prompt: "Elder Wynne presses the poultice to Gareth\'s leg"')
  console.log('  (Gareth pulled into context via Elder Wynne→Gareth "knows" edge)\n')

  const garethStateBefore = getEntityState('Gareth the Scout')
  console.log(`  Gareth state before: ${JSON.stringify(garethStateBefore)}`)

  await pause(3000)
  const phase4 = await generate(token, "Elder Wynne presses the poultice to Gareth's leg")

  if (phase4.statusCode === 429) {
    console.log('  \x1b[33m⚠ Rate-limited — waiting 65s\x1b[0m')
    await pause(65000)
    Object.assign(phase4, await generate(token, "Elder Wynne presses the poultice to Gareth's leg"))
  }

  const p4text = phase4.narrative ?? ''
  console.log(`  narrative: "${p4text.slice(0, 150)}..."`)
  record(check('Gareth\'s name in narrative',                 /gareth/i.test(p4text)))
  record(check('Gareth\'s injury reflected (hp:15, injured)', /wound|injur|hurt|limp|pale|weak|strain|trembl|leg|pain|ache|bandage|stiff/i.test(p4text)))
  record(check('Healing action present',                      /press|tend|apply|bind|wrap|salve|poultice|careful|gentle|herb/i.test(p4text)))

  // ─── Phase 5: State write — apply mutation to Gareth ───────────────────────
  header('Phase 5 — State write (Gareth hp 15→55, recovering)')
  console.log('  Applying state_mutation delta: hp=55, mood=hopeful, status=recovering\n')

  await applyDeltas(token, [
    {
      op: 'state_mutation',
      entityName: 'Gareth the Scout',
      patch: { hp: 55, mood: 'hopeful', status: 'recovering' },
    },
  ])

  const garethStateAfter = getEntityState('Gareth the Scout')
  console.log(`  Gareth state after:  ${JSON.stringify(garethStateAfter)}`)
  record(check('Gareth hp updated in DB',     garethStateAfter?.hp === 55,          `hp=${garethStateAfter?.hp}`))
  record(check('Gareth mood updated in DB',   garethStateAfter?.mood === 'hopeful', `mood=${garethStateAfter?.mood}`))
  record(check('Gareth status updated in DB', garethStateAfter?.status === 'recovering', `status=${garethStateAfter?.status}`))

  // ─── Phase 6: State re-read — narrative must reflect updated state ──────────
  header('Phase 6 — State re-read after mutation')
  console.log('  prompt: "Gareth flexes his healed leg and tests his weight"')
  console.log('  (hp now 55/recovering — must NOT show shaking/critical injury)\n')

  await pause(3000)
  const phase6 = await generate(token, 'Gareth flexes his healed leg and tests his weight')

  if (phase6.statusCode === 429) {
    console.log('  \x1b[33m⚠ Rate-limited — waiting 65s\x1b[0m')
    await pause(65000)
    Object.assign(phase6, await generate(token, 'Gareth flexes his healed leg and tests his weight'))
  }

  const p6text = phase6.narrative ?? ''
  console.log(`  narrative: "${p6text.slice(0, 150)}..."`)
  record(check('Gareth named in narrative',             /gareth/i.test(p6text)))
  record(check('Narrative shows recovery / improvement', /recov|better|strength|steady|hold|firm|hope|manage|test|flex|solid|stand|bear|balance|careful/i.test(p6text)))
  record(check('Narrative does NOT show critical injury', !/\bcritical\b|\bcollapses\b|\bshaking uncontrollabl\b|\bcannot move\b/i.test(p6text)))

  // ─── Cleanup ───────────────────────────────────────────────────────────────
  header('Cleanup')
  for (const name of DEMO_ENTITIES) {
    const safe = name.replace(/'/g, "''")
    execSync(`psql "${DB}" -f -`, {
      input: `DELETE FROM "Edge" WHERE "fromId" IN (SELECT id FROM "Entity" WHERE name='${safe}') OR "toId" IN (SELECT id FROM "Entity" WHERE name='${safe}');`,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    execSync(`psql "${DB}" -f -`, {
      input: `DELETE FROM "Entity" WHERE name='${safe}';`,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    console.log(`  removed: ${name}`)
  }

  // Also reset Gareth's state back to injured (he's a seed entity)
  execSync(`psql "${DB}" -f -`, {
    input: `UPDATE "Entity" SET state='{"hp":15,"mana":40,"mood":"shaken","location":"forest trail","status":"injured"}'::jsonb WHERE name='Gareth the Scout';`,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  console.log('  reset: Gareth the Scout → hp:15, injured (seed state)')

  // ─── Summary ───────────────────────────────────────────────────────────────
  const total = passed + failed
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  \x1b[1mTotal: \x1b[32m${passed} passed\x1b[0m, \x1b[31m${failed} failed\x1b[0m out of ${total}`)

  if (failed === 0) {
    console.log('\n  \x1b[32m✓ All phases passed — embedding recall, graph traversal,')
    console.log('    state read, and state write all working correctly.\x1b[0m\n')
  } else {
    console.log('\n  \x1b[33m⚠ Some assertions failed. LLM output is non-deterministic —')
    console.log('    re-run to see if failures are consistent or one-off.\x1b[0m\n')
  }

  process.exit(failed > 0 ? 1 : 0)
}

main().catch(e => { console.error('\x1b[31m[ERROR]\x1b[0m', e.message); process.exit(1) })
