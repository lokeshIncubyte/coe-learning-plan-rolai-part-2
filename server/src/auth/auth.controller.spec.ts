import { Test, TestingModule } from '@nestjs/testing'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

describe('AuthController POST /auth/login — 200', () => {
  it('returns { accessToken } when credentials are valid', async () => {
    const validateUser = jest.fn().mockResolvedValue({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
    const login = jest.fn().mockReturnValue({ accessToken: 'token.jwt.string' })

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { validateUser, login } }],
    }).compile()

    const controller = module.get(AuthController)
    const result = await controller.login({ email: 'admin@platform.com', password: 'login' })

    expect(validateUser).toHaveBeenCalledWith('admin@platform.com', 'login')
    expect(login).toHaveBeenCalledWith({ id: 'u1', email: 'admin@platform.com', role: 'ADMIN' })
    expect(result).toEqual({ accessToken: 'token.jwt.string' })
  })
})
