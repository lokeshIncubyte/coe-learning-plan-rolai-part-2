# Day 5 Checklist — Entity Graph Store with PostgreSQL

**Project focus:** Progressive Gen (entity graph + state persistence) + AI Chat Assistant (conversation memory)

---

## 1. Prisma Schema

- [x] Create `Entity` model (id, type, name, tags, facts JSON, state JSON)
- [x] Create `Edge` model (from, to, type, weight, tags, state JSON)
- [x] Create `GenerationHistory` model (sessionId, narrative, anchor, deltas JSON)
- [x] Create `Session` model linking generations to a user session
- [x] Model facts and state as JSON columns

---

## 2. GraphService

- [x] `createEntity(data)` — persisted via `prisma.entity.create`
- [x] `getEntityById(id)` — throws `NotFoundException` if missing
- [x] `getEntitiesByType(type)` — filters by entity type
- [x] `getEntitiesByTag(tag)` — filters by tag array membership
- [x] `createEdge(data)` — persisted via `prisma.edge.create`
- [x] `updateEntityState(id, patch)` — read-merge-write inside `$transaction`
- [x] `updateEdgeWeight(id, weight)` — updates edge weight field

---

## 3. GenerationHistoryService

- [x] `saveGeneration(sessionId, narrative, anchor, deltas)` — creates history record
- [x] `getHistoryBySession(sessionId, page, limit)` — paginated `findMany` with `orderBy: createdAt desc`

---

## 4. PrismaService

- [x] `PrismaService` extends `PrismaClient` with `PrismaPg` adapter (Prisma v7)
- [x] Implements `OnModuleInit` (`$connect`) and `OnModuleDestroy` (`$disconnect`)
- [x] `PrismaModule` global export wired into `GenerateModule`

---

## 5. Entity-Aware Agent Context

- [x] `ActionValidatorService.validate(action, ruleContext?)` — prepends rule context to prompt
- [x] `ChoiceGeneratorService.generateChoices(narrative, worldContext?)` — prepends world context to prompt
- [x] `GenerateController.generate()` fetches rule entities, formats `RULES:` block, passes to validator
- [x] `GenerateController.generate()` fetches character/location/object entities, formats `WORLD:` block, passes to choice generator

---

## 6. Seed Script

- [x] Seed script at `prisma/seed.ts` with 10 entities (3 characters, 3 locations, 1 object, 3 rules)
- [x] 7 edges connecting entities
- [x] Configured in `prisma.config.ts` (`migrations.seed`)

---

## 7. Success Criteria

- [x] Entity and Edge models in Prisma schema
- [x] Facts and state modeled as JSON columns
- [x] One-to-many and many-to-many relationships via Edge model
- [x] GraphService supports full CRUD (7 methods)
- [x] Queries by type and tag work
- [x] Seed script creates initial world (entities + edges + rules)
- [x] Entity state and edge weight updates work correctly
- [x] GenerationHistory saves and paginates by session
- [x] Agents receive entity context (rules → validator, world → choice generator)
- [x] All 23 TDD cycles green (37 tests passing)
