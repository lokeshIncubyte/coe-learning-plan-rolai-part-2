import { Role } from '@prisma/client'

describe('User model infra', () => {
  it('Role enum has ADMIN and USER values', () => {
    expect(Role.ADMIN).toBe('ADMIN')
    expect(Role.USER).toBe('USER')
  })
})
