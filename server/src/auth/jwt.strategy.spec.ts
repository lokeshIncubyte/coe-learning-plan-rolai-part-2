jest.mock('@nestjs/passport', () => ({
  PassportStrategy: (_base: any) => class MockPassportBase { constructor() {} },
}))

import { JwtStrategy } from './jwt.strategy'

describe('JwtStrategy.validate', () => {
  it('maps JWT payload to { id, email, role }', async () => {
    const strategy = new JwtStrategy()
    const result = await strategy.validate({ sub: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
    expect(result).toEqual({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
  })
})
