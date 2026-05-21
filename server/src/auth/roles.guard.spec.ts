import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from './roles.guard'

describe('RolesGuard — allows', () => {
  it('returns true when user role matches required role', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']) }
    const guard = new RolesGuard(reflector as unknown as Reflector)
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: { role: 'ADMIN' } }),
      }),
    } as unknown as ExecutionContext
    expect(guard.canActivate(context)).toBe(true)
  })

  it('returns true when no roles are required (unprotected route)', () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(null) }
    const guard = new RolesGuard(reflector as unknown as Reflector)
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user: { role: 'USER' } }),
      }),
    } as unknown as ExecutionContext
    expect(guard.canActivate(context)).toBe(true)
  })
})
