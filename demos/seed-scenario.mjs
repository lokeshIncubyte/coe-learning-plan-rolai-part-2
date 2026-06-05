/**
 * demos/seed-scenario.mjs
 *
 * Seed the graph with one of the demo scenarios for a live presentation.
 * Cleans up only the scenario entities between switches — seed world entities
 * (Cavern, Thornwall, Hearthstone, rules) are never touched.
 *
 * Usage:
 *   node demos/seed-scenario.mjs list                    # show available scenarios
 *   node demos/seed-scenario.mjs seed 01-injured-healer  # seed the scenario
 *   node demos/seed-scenario.mjs seed 02-stat-update
 *   node demos/seed-scenario.mjs seed 03-new-location
 *   node demos/seed-scenario.mjs clean                   # remove all demo entities
 */

import { execSync } from 'child_process'

const API   = 'http://localhost:3001/api'
const BFF   = 'http://localhost:3000/api'
const DB    = process.env.DATABASE_URL ?? 'postgresql://narrative:narrative@localhost:5433/narrative_engine'
const CREDS = { email: 'admin@platform.com', password: 'login' }

// ── seed world entity names (never deleted) ────────────────────────────────────
const SEED_WORLD = [
  'The Cavern of Echoes',
  'Thornwall Village',
  'The Hearthstone',
  'hp-bounds',
  'kindness-resolves',
  'Gareth the Scout',
]

// ── scenario definitions ───────────────────────────────────────────────────────

const SCENARIOS = {
  '01-injured-healer': {
    label: 'Injured Healer (Lady Vethara)',
    description: 'A healer at critically low hp, desperate mood, wounded status. Tests state reflection.',
    suggestedPrompts: [
      "Lady Vethara calls out from the healer's tent",
      "I find Lady Vethara and ask if she needs aid",
    ],
    deltas: [
      {
        op: 'new_entity',
        identity: {
          name: 'Lady Vethara',
          type: 'noble',
          archetype: 'healer',
          backstory: 'The village healer struck by a stray arrow during the last raid, now tending her own wounds in the market tent.',
          role: 'caretaker',
          sensoryProfile: 'smell+touch',
        },
        state: { hp: 20, mana: 60, mood: 'desperate', location: "healer's tent", status: 'wounded' },
      },
    ],
  },

  '02-stat-update': {
    label: 'Stat Update — Shaken Scout (Gareth)',
    description: 'A scout injected at full health then immediately mutated to low hp + shaken mood. Tests delta chaining.',
    suggestedPrompts: [
      'Gareth the Scout limps out from the tree line',
      'I hear Gareth calling for help on the trail',
    ],
    deltas: [
      {
        op: 'new_entity',
        identity: {
          name: 'Gareth the Scout',
          type: 'scout',
          archetype: 'ranger',
          backstory: 'A wiry young scout who knows every trail between Thornwall and the Cavern. Usually confident, light-footed, quick to laugh.',
          role: 'guide',
          sensoryProfile: 'sound+touch',
        },
        state: { hp: 95, mood: 'confident', location: 'forest trail', status: 'active' },
      },
      {
        op: 'state_mutation',
        entityName: 'Gareth the Scout',
        patch: { hp: 15, mood: 'shaken', status: 'injured' },
      },
    ],
  },

  '03-new-location': {
    label: 'New Location — The Amber Forge',
    description: 'An abandoned blacksmith workshop. Tests location-type entities and sensory grounding.',
    suggestedPrompts: [
      'I push open the door of the Amber Forge',
      'we shelter inside the old forge at the edge of the village',
    ],
    deltas: [
      {
        op: 'new_entity',
        identity: {
          name: 'The Amber Forge',
          type: 'location',
          archetype: 'workshop',
          backstory: "A blacksmith's forge on the eastern edge of Thornwall, shuttered three winters ago. The bellows are stiff, the anvil cold, but the smell of iron and old ash lingers.",
          role: 'landmark',
          sensoryProfile: 'smell+sound',
        },
        state: { explored: false, light: 'dim', mood: 'quiet', status: 'abandoned', temperature: 'cold' },
      },
    ],
  },
}

// ── helpers ────────────────────────────────────────────────────────────────────

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

function dbExec(sql) {
  try {
    execSync(`psql "${DB}" -c "${sql.replace(/"/g, '\\"')}"`, { stdio: 'pipe' })
    return true
  } catch (e) {
    console.error('  DB error:', e.stderr?.toString().trim())
    return false
  }
}

function getDemoEntityNames() {
  try {
    const out = execSync(
      `psql "${DB}" -t -c "SELECT name FROM \\"Entity\\" WHERE name NOT IN (${SEED_WORLD.map(n => `'${n.replace(/'/g, "''")}'`).join(',')})"`,
      { encoding: 'utf8' }
    )
    return out.split('\n').map(l => l.trim()).filter(Boolean)
  } catch {
    return []
  }
}

async function cleanDemoEntities() {
  const names = getDemoEntityNames()
  if (!names.length) {
    console.log('  No demo entities to remove.')
    return
  }
  for (const name of names) {
    const safe = name.replace(/'/g, "''")
    execSync(`psql "${DB}" -c "DELETE FROM \\"Edge\\" WHERE \\"fromId\\" IN (SELECT id FROM \\"Entity\\" WHERE name='${safe}') OR \\"toId\\" IN (SELECT id FROM \\"Entity\\" WHERE name='${safe}')"`, { stdio: 'pipe' })
    execSync(`psql "${DB}" -c "DELETE FROM \\"Entity\\" WHERE name='${safe}'"`, { stdio: 'pipe' })
    console.log(`  removed: ${name}`)
  }
}

// ── commands ───────────────────────────────────────────────────────────────────

async function cmdList() {
  console.log('\nAvailable scenarios:\n')
  for (const [key, s] of Object.entries(SCENARIOS)) {
    console.log(`  \x1b[36m${key}\x1b[0m — ${s.label}`)
    console.log(`    ${s.description}`)
    console.log(`    Try: ${s.suggestedPrompts[0]}`)
    console.log()
  }
  const demo = getDemoEntityNames()
  if (demo.length) {
    console.log(`Currently seeded demo entities: \x1b[33m${demo.join(', ')}\x1b[0m`)
  } else {
    console.log('No demo entities currently seeded.')
  }
}

async function cmdSeed(key) {
  const scenario = SCENARIOS[key]
  if (!scenario) {
    console.error(`Unknown scenario "${key}". Run: node demos/seed-scenario.mjs list`)
    process.exit(1)
  }

  console.log(`\n\x1b[1mSeeding scenario: ${scenario.label}\x1b[0m\n`)

  console.log('[1] Cleaning existing demo entities...')
  await cleanDemoEntities()

  console.log('\n[2] Injecting scenario entities via admin API...')
  let token
  try {
    token = await login()
  } catch (e) {
    console.error('  Login failed — is the server running on port 3001?')
    process.exit(1)
  }

  const res = await fetch(`${BFF}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ prompt: '', deltas: scenario.deltas }),
  })

  const names = scenario.deltas.filter(d => d.op === 'new_entity').map(d => d.identity.name)
  for (const name of names) {
    const safe = name.replace(/'/g, "''")
    const out = execSync(`psql "${DB}" -t -c "SELECT COUNT(*) FROM \\"Entity\\" WHERE name='${safe}'"`, { encoding: 'utf8' }).trim()
    const exists = parseInt(out, 10) > 0
    console.log(`  ${exists ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${name}`)
  }

  console.log(`
\x1b[32m✓ Scenario ready.\x1b[0m

Suggested prompts to try in the chat:
${scenario.suggestedPrompts.map(p => `  → "${p}"`).join('\n')}

To switch to another scenario:
  node demos/seed-scenario.mjs seed 01-injured-healer
  node demos/seed-scenario.mjs seed 02-stat-update
  node demos/seed-scenario.mjs seed 03-new-location

To remove all demo entities:
  node demos/seed-scenario.mjs clean
`)
}

async function cmdClean() {
  console.log('\nRemoving all demo entities...')
  await cleanDemoEntities()
  console.log('\x1b[32m✓ Done.\x1b[0m Graph contains only seed world entities.')
}

// ── entry ──────────────────────────────────────────────────────────────────────

const [cmd, arg] = process.argv.slice(2)

if (!cmd || cmd === 'list') {
  await cmdList()
} else if (cmd === 'seed') {
  if (!arg) { console.error('Usage: node demos/seed-scenario.mjs seed <scenario-key>'); process.exit(1) }
  await cmdSeed(arg)
} else if (cmd === 'clean') {
  await cmdClean()
} else {
  console.error(`Unknown command "${cmd}". Use: list | seed <key> | clean`)
  process.exit(1)
}
