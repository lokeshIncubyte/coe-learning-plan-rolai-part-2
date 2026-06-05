import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import OpenAI from 'openai'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
const prisma = new PrismaClient({ adapter } as any)

const helperApisUrl = process.env['HELPER_APIS_URL'] ?? 'http://localhost:4000'
const openai = new OpenAI({ apiKey: 'local', baseURL: `${helperApisUrl}/v1` })

async function embed(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({ model: 'Xenova/all-MiniLM-L6-v2', input: text })
  return res.data[0].embedding
}

function identityText(e: { name: string; type: string; archetype?: string; backstory?: string; role?: string }): string {
  return [e.name, e.type, e.archetype, e.backstory, e.role].filter(Boolean).join(' | ')
}

const ENTITIES = [
  {
    name: 'Mira',
    type: 'character',
    archetype: 'child',
    role: 'wanderer',
    backstory: 'A curious child who slipped away from the village to explore the old forest paths.',
    state: { hp: 100, stamina: 100, mood: 'wonder' },
  },
  {
    name: 'The Cavern of Echoes',
    type: 'location',
    archetype: 'cave',
    role: 'landmark',
    backstory: 'An ancient cavern whose crystal walls hum with faint warmth and carry whispers of old songs.',
    state: { explored: false, light: 'dim' },
  },
  {
    name: 'Thornwall Village',
    type: 'location',
    archetype: 'settlement',
    role: 'home',
    backstory: 'A small warm village nestled at the forest edge, known for its bread and kindness.',
    state: { population: 120, mood: 'peaceful' },
  },
  {
    name: 'Brother Aldric',
    type: 'character',
    archetype: 'peasant',
    role: 'baker',
    backstory: 'The village baker whose loaves smell of honey and whose door is always open.',
    state: { hp: 100, stamina: 80, mood: 'content' },
  },
  {
    name: 'The Hearthstone',
    type: 'object',
    archetype: 'artifact',
    role: 'relic',
    backstory: 'A warm smooth stone said to bring courage to whoever holds it in the dark.',
    state: { location: 'cavern', glowing: true },
  },
  {
    name: 'hp-bounds',
    type: 'rule',
    archetype: 'constraint',
    role: 'engine-rule',
    backstory: 'Character hp must stay between 0 and 100. Reaching 0 triggers a rest event, never death.',
    state: {},
  },
  {
    name: 'kindness-resolves',
    type: 'rule',
    archetype: 'principle',
    role: 'narrative-rule',
    backstory: 'Any conflict in this world can be resolved through kindness or cleverness. Violence is a last resort and always has a gentler outcome.',
    state: {},
  },
]

const EDGES = [
  { from: 'Mira', to: 'Thornwall Village', type: 'lives_in', weight: 1.0 },
  { from: 'Mira', to: 'The Cavern of Echoes', type: 'exploring', weight: 0.8 },
  { from: 'Brother Aldric', to: 'Thornwall Village', type: 'lives_in', weight: 1.0 },
  { from: 'The Hearthstone', to: 'The Cavern of Echoes', type: 'located_in', weight: 1.0 },
  { from: 'Mira', to: 'Brother Aldric', type: 'knows', weight: 0.9 },
]

async function main() {
  console.log('Seeding world entities...')

  const idMap: Record<string, string> = {}

  for (const e of ENTITIES) {
    const text = identityText(e)
    console.log(`  embedding: ${e.name}`)
    const embedding = await embed(text)
    const embeddingStr = `[${embedding.join(',')}]`

    const created = await prisma.entity.create({
      data: {
        name: e.name,
        type: e.type,
        archetype: e.archetype,
        role: e.role,
        backstory: e.backstory,
        state: e.state,
        tags: [e.type, e.archetype ?? ''].filter(Boolean),
      },
    })

    await prisma.$executeRawUnsafe(
      `UPDATE "Entity" SET embedding = '${embeddingStr}'::vector WHERE id = $1`,
      created.id,
    )

    idMap[e.name] = created.id
    console.log(`  created: ${e.name} (${e.type}) — ${created.id}`)
  }

  console.log('\nSeeding edges...')
  for (const edge of EDGES) {
    const fromId = idMap[edge.from]
    const toId = idMap[edge.to]
    if (!fromId || !toId) { console.warn(`  skipping edge ${edge.from} → ${edge.to}: id not found`); continue }
    await prisma.edge.create({ data: { fromId, toId, type: edge.type, weight: edge.weight, tags: [] } })
    console.log(`  edge: ${edge.from} → ${edge.to} (${edge.type})`)
  }

  console.log('\nWorld seed complete.')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
