# Day 5 — Entity Graph Store with PostgreSQL + Prisma

## New Technologies & Patterns

### 1. Prisma ORM v7 — What It Adds

Prisma sits between the application and PostgreSQL. The schema is the source of truth:
it generates TypeScript types, the DB migration SQL, and the query client.

```
  prisma/schema.prisma        Prisma generates:
  ┌────────────────────┐      ┌────────────────────────────────────────┐
  │ model Entity {      │      │  TypeScript types (Entity, Edge, ...)  │
  │   id    String @id  │ ───► │  Migration SQL files                   │
  │   type  String      │      │  PrismaClient with typed query methods │
  │   facts Json        │      └────────────────────────────────────────┘
  │   ...               │
  │ }                   │      App code uses:
  └────────────────────┘      prisma.entity.findMany({ where: { type:'rule' } })
                               ← fully typed, no raw SQL needed
```

Prisma v7 uses the **PrismaPg adapter** (instead of the legacy binary engine),
which connects directly via a PostgreSQL connection string — no native binaries.

---

### 2. Graph-Like Data Model in a Relational DB

This project stores a narrative world as a graph — entities are nodes, edges are
relationships between them. PostgreSQL implements this without a real graph DB:

```
  Entity table                    Edge table
  ┌───────────────────────────┐   ┌─────────────────────────────────────┐
  │ id    │ type      │ name  │   │ id │ fromId │ toId │ type  │ weight │
  ├───────┼───────────┼───────┤   ├────┼────────┼──────┼───────┼────────┤
  │ e-001 │ character │ Arthur│   │ x1 │ e-001  │ e-010│ AT    │  1.0   │
  │ e-002 │ character │ Merlin│   │ x2 │ e-001  │ e-002│ KNOWS │  0.8   │
  │ e-010 │ location  │ Castle│   │ x3 │ e-020  │ e-010│ IN    │  1.0   │
  │ e-020 │ object    │ Sword │   │ x4 │ e-030  │ e-001│ GOVNS │  1.0   │
  │ e-030 │ rule      │ Honor │   └─────────────────────────────────────┘
  └───────────────────────────┘

  Visualised as a graph:
    Arthur ──AT──► Castle
      │              ▲
    KNOWS           IN
      │              │
    Merlin         Sword
      ▲
    GOVNS
      │
    Honor (rule)
```

**JSON columns** (`facts`, `state`) store unstructured per-entity data without
requiring separate tables for each entity type:

```
  Entity: Arthur
  {
    facts: { title: "King", weapon: "Excalibur" },  ← static world facts
    state: { health: 100, location: "throne_room" } ← mutable game state
  }
```

---

### 3. GraphService — Seven Operations

```
  GraphService
  ├── createEntity(data)               → prisma.entity.create()
  ├── getEntityById(id)                → prisma.entity.findUniqueOrThrow()
  ├── getEntitiesByType(type)          → prisma.entity.findMany({ where: { type } })
  ├── getEntitiesByTag(tag)            → prisma.entity.findMany({ where: { tags: { has: tag } } })
  ├── createEdge(data)                 → prisma.edge.create()
  ├── updateEntityState(id, patch)     → prisma.$transaction([findById, merge, update])
  └── updateEdgeWeight(id, weight)     → prisma.edge.update()
```

The `updateEntityState` uses a **transaction** to safely merge a partial patch
into the existing JSON state without overwriting other fields:

```
  updateEntityState('e-001', { health: 80 })

  Inside $transaction:
    1. READ  current state → { health: 100, location: "throne_room" }
    2. MERGE { ...current, ...patch } → { health: 80, location: "throne_room" }
    3. WRITE merged state back

  All three steps are atomic — no partial writes if the server crashes mid-update.
```

---

### 4. How Entity Data Feeds the Agent Pipeline

```
  PostgreSQL
      │
      ▼  GraphService.getEntitiesByType('rule')
  [{ name:'no_magic',  description:'magic is forbidden' },
   { name:'honor',     description:'nobles must keep oaths' }, ...]
      │
      ▼  GenerateController.buildContexts()
  ruleContext = "RULES:\n- no_magic: magic is forbidden\n- honor: ..."
      │
      └──────────────────────────────► ActionValidatorAgent
                                        (Mastra, Day 4)

  PostgreSQL
      │
      ▼  GraphService.getEntitiesByType('character' | 'location' | 'object')
  [{ name:'Arthur', type:'character' }, { name:'Castle', type:'location' }, ...]
      │
      ▼  buildContexts()
  worldContext = "WORLD:\n- Arthur (character)\n- Castle (location)\n..."
      │
      └──────────────────────────────► ChoiceGeneratorAgent
                                        (Mastra, Day 4)
```

---

### 5. PrismaService Lifecycle in NestJS

```
  NestJS Application Lifecycle
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  onModuleInit()                                          │
  │  └── prisma.$connect()  → opens PostgreSQL connection    │
  │                                                          │
  │  [application running — all queries go through here]     │
  │                                                          │
  │  onModuleDestroy()                                       │
  │  └── prisma.$disconnect() → closes connection cleanly   │
  │                                                          │
  └──────────────────────────────────────────────────────────┘

  PrismaModule is exported globally → imported once,
  available everywhere in the application.
```

---

### 6. Seed Script — Initial World State

```
  prisma/seed.ts runs on: npx prisma migrate dev

  Creates:
  ┌────────────────────────────────────────────────────────┐
  │  10 entities:                                          │
  │    3 characters  (Arthur, Merlin, Morgana)             │
  │    3 locations   (Castle, Forest, Tower)               │
  │    1 object      (Excalibur)                           │
  │    3 rules       (no_magic, honor, loyalty)            │
  │                                                        │
  │  7 edges:                                              │
  │    Arthur ──AT──► Castle                               │
  │    Arthur ──KNOWS──► Merlin                            │
  │    Merlin ──AT──► Tower                                │
  │    Excalibur ──IN──► Castle                            │
  │    no_magic ──GOVERNS──► Arthur                        │
  │    no_magic ──GOVERNS──► Merlin                        │
  │    honor ──GOVERNS──► Arthur                           │
  └────────────────────────────────────────────────────────┘
```

---

## Key Files

| File | What it does |
|---|---|
| `server/prisma/schema.prisma` | Defines Entity, Edge, GenerationHistory, Session models |
| `server/src/prisma/prisma.service.ts` | PrismaClient wrapper with NestJS lifecycle hooks |
| `server/src/graph/graph.service.ts` | Seven CRUD methods for Entity/Edge graph |
| `server/prisma/seed.ts` | Populates initial world (10 entities, 7 edges) |
| `server/src/generate/generate.controller.ts` | `buildContexts()` — converts graph data to agent context strings |
