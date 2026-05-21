---
id: cycle-028
slug: config-service-get-spec
status: pending
source: "§7 Config Editor UI — ConfigService.getSpec reads update-spec.json from disk"
covers: happy-path
group: config-editor
---

## Dependencies

### Package
`fs` built-in (Node.js `fs/promises.readFile`)
Runtime keys: readFile, writeFile, access, ...
```
import { readFile } from 'fs/promises'
readFile(path, 'utf-8'): Promise<string>
```

## Behavior
`ConfigService.getSpec()` reads the `update-spec.json` file from `src/config/update-spec.json` (path relative to project root) and returns its parsed content as a plain object. New service at `src/config/config.service.ts`.

## RED
- **Test file**: `src/config/config.service.spec.ts`
- **Assertion**:
  ```ts
  import { ConfigService } from './config.service'
  import { readFile } from 'fs/promises'

  jest.mock('fs/promises')

  describe('ConfigService', () => {
    it('getSpec reads update-spec.json and returns parsed object', async () => {
      const specContent = JSON.stringify({ variables: { hp: { min: 0, max: 100 } } })
      ;(readFile as jest.Mock).mockResolvedValue(specContent)
      const service = new ConfigService()
      const result = await service.getSpec()
      expect(readFile).toHaveBeenCalledWith(expect.stringContaining('update-spec.json'), 'utf-8')
      expect(result).toEqual({ variables: { hp: { min: 0, max: 100 } } })
    })
  })
  ```
- **Why it fails**: `ConfigService` at `src/config/config.service.ts` does not exist.

## GREEN
- **Smallest change**: Create `src/config/config.service.ts` with `@Injectable() ConfigService` (no constructor injection). `async getSpec()` calls `readFile(path.join(__dirname, '../config/update-spec.json'), 'utf-8')` and returns `JSON.parse(content)`.
- **Files touched**: `src/config/config.service.ts`

## REFACTOR
none
