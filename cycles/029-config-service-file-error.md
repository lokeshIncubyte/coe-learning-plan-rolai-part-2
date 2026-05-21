---
id: cycle-029
slug: config-service-file-error
status: pending
source: "§7 Config Editor UI — ConfigService.getSpec error path (file not found)"
covers: error-path
group: config-editor
---

## Dependencies

### Package
`fs/promises` — `readFile` throws `NodeJS.ErrnoException` with `code: 'ENOENT'` when file not found.
```
import { readFile } from 'fs/promises'
// throws: { code: 'ENOENT', message: 'ENOENT: no such file or directory' }
```

## Behavior
When `readFile` throws (file not found), `ConfigService.getSpec()` propagates the error.

## RED
- **Test file**: `src/config/config.service.spec.ts`
- **Assertion**:
  ```ts
  import { ConfigService } from './config.service'
  import { readFile } from 'fs/promises'

  jest.mock('fs/promises')

  describe('ConfigService — error path', () => {
    it('propagates ENOENT when update-spec.json is missing', async () => {
      const enoent = Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      ;(readFile as jest.Mock).mockRejectedValue(enoent)
      const service = new ConfigService()
      await expect(service.getSpec()).rejects.toMatchObject({ code: 'ENOENT' })
    })
  })
  ```
- **Why it fails**: `ConfigService` does not exist yet (cycle-028 must be done first).

## GREEN
- **Smallest change**: No production change — natural propagation from cycle-028 implementation.
- **Files touched**: `src/config/config.service.spec.ts` (test only)

## REFACTOR
none
