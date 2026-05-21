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
