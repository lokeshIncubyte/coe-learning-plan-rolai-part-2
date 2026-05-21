import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Role } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
const prisma = new PrismaClient({ adapter } as any)

async function main() {
  const passwordHash = await bcrypt.hash('login', 10)

  await prisma.user.upsert({
    where: { email: 'admin@platform.com' },
    update: { passwordHash, role: Role.ADMIN },
    create: { email: 'admin@platform.com', passwordHash, role: Role.ADMIN },
  })

  await prisma.user.upsert({
    where: { email: 'user@platform.com' },
    update: { passwordHash, role: Role.USER },
    create: { email: 'user@platform.com', passwordHash, role: Role.USER },
  })

  console.log('Seeded admin@platform.com and user@platform.com')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1) })
