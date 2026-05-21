import { Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<{ id: string; email: string; role: string } | null> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) return null
    const match = await bcrypt.compare(password, user.passwordHash)
    if (!match) return null
    return { id: user.id, email: user.email, role: user.role }
  }

  login(user: { id: string; email: string; role: string }): { accessToken: string } {
    const payload = { sub: user.id, email: user.email, role: user.role }
    return { accessToken: this.jwtService.sign(payload) }
  }
}
