import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(): Promise<string> {
    const session = await this.prisma.session.create({ data: {} })
    return session.id
  }
}
