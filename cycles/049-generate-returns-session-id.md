---
id: cycle-049
slug: generate-returns-session-id
status: done
source: "Generate endpoint does not return sessionId — add sessionId to the generate() response"
covers: atomic
---

## Dependencies

**(none — pure logic cycle)** sessionId is already computed on line 98 of generate.controller.ts; this cycle adds it to the return value only.

## Behavior

`GenerateController.generate()` currently returns `{ narrative, choices }`. After this cycle it returns `{ narrative, choices, sessionId }` where `sessionId` is the value from `sessionService.createSession()` called at the top of the method. Callers (e.g. client pages) can then pass the sessionId to `GET /session/:id/export`.

## RED
- **Test file**: `server/src/generate/generate.controller.spec.ts`
- **Assertion**:
  ```ts
  it('generate returns sessionId from sessionService', async () => {
    const generateMock = service.generate as jest.Mock
    generateMock.mockResolvedValueOnce('Once upon a time...')
    const result = await controller.generate({ prompt: 'Write beat 1' })
    expect(result).toMatchObject({ sessionId: 'sess-test' })
  })
  ```
- **Why it fails**: `generate()` returns `{ narrative, choices }` — no `sessionId` field.

## GREEN
- **Smallest change**: In `generate.controller.ts` line 125, change `return { narrative, choices }` to `return { narrative, choices, sessionId }`. The existing `toEqual({ narrative: '...', choices: [...] })` test at line 47 of the spec will now fail (extra `sessionId` key); change it to `toMatchObject({ narrative: 'Once upon a time...', choices: ['Investigate', 'Flee', 'Negotiate'] })`.
- **Files touched**: `server/src/generate/generate.controller.ts`, `server/src/generate/generate.controller.spec.ts`

## REFACTOR
none
