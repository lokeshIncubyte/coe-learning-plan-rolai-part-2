---
id: cycle-024
slug: jest-rtl-setup
status: pending
exec: use /exec-cycle to execute this cycle
source: "prerequisite — Jest + React Testing Library required before all client component cycles"
covers: atomic
---

## Behavior
Jest and React Testing Library are installed and configured in the Next.js client app. A `test` script is added to `package.json`. A `jest.config.ts` and `jest.setup.ts` are created. Running `npx jest` with no test files exits cleanly (0 test suites, 0 tests).

## RED
- **Test file**: `app/narrative/__tests__/placeholder.test.tsx`
- **Assertion**:
  ```ts
  test('placeholder', () => {
    expect(true).toBe(true)
  })
  ```
- **Why it fails**: No `jest` binary is installed and no `jest.config.ts` exists — `npx jest` exits with a non-zero code and prints a configuration error.

## GREEN
- **Smallest change**:
  1. Install deps: `npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event ts-jest @types/jest`
  2. Create `jest.config.ts`:
     ```ts
     import type { Config } from 'jest'
     const config: Config = {
       testEnvironment: 'jsdom',
       setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
       transform: { '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }] },
       moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
       testMatch: ['**/__tests__/**/*.test.tsx?'],
     }
     export default config
     ```
  3. Create `jest.setup.ts`:
     ```ts
     import '@testing-library/jest-dom'
     ```
  4. Add `"test": "jest"` to `scripts` in `package.json`.
  5. Create `app/narrative/__tests__/placeholder.test.tsx` with the placeholder assertion above.
- **Files touched**: `package.json`, `jest.config.ts`, `jest.setup.ts`, `app/narrative/__tests__/placeholder.test.tsx`

## REFACTOR
none
