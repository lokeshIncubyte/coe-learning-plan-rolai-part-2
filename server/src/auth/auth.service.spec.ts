import * as bcrypt from 'bcrypt'
import { AuthService } from './auth.service'

jest.mock('bcrypt')

describe('AuthService.validateUser — happy path', () => {
  it('returns { id, email, role } when user exists and password matches', async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-1',
          email: 'admin@platform.com',
          passwordHash: '$2b$10$hashedpassword',
          role: 'ADMIN',
        }),
      },
    }
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    const service = new AuthService(mockPrisma as any, null as any)
    const result = await service.validateUser('admin@platform.com', 'login')
    expect(result).toEqual({ id: 'user-1', email: 'admin@platform.com', role: 'ADMIN' })
  })
})

describe('AuthService.login', () => {
  it('returns { accessToken } from JwtService.sign', () => {
    const mockJwt = { sign: jest.fn().mockReturnValue('token.jwt.string') }
    const service = new AuthService(null as any, mockJwt as any)
    const result = service.login({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
    expect(result).toEqual({ accessToken: 'token.jwt.string' })
    expect(mockJwt.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
  })
})

describe('AuthService.login — error path', () => {
  it('propagates error when JwtService.sign throws', () => {
    const mockJwt = {
      sign: jest.fn().mockImplementation(() => { throw new Error('secretOrPrivateKey must have a value') }),
    }
    const service = new AuthService(null as any, mockJwt as any)
    expect(() => service.login({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' }))
      .toThrow('secretOrPrivateKey must have a value')
  })
})

describe('AuthService.validateUser — null paths', () => {
  it('returns null when user is not found', async () => {
    const mockPrisma = { user: { findUnique: jest.fn().mockResolvedValue(null) } }
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    const service = new AuthService(mockPrisma as any, null as any)
    const result = await service.validateUser('unknown@platform.com', 'login')
    expect(result).toBeNull()
  })

  it('returns null when password does not match', async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'u1', email: 'user@platform.com', passwordHash: '$2b$10$hash', role: 'USER',
        }),
      },
    }
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    const service = new AuthService(mockPrisma as any, null as any)
    const result = await service.validateUser('user@platform.com', 'wrongpassword')
    expect(result).toBeNull()
  })
})
