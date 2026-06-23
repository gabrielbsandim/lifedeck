import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const USER_ID = '00000000-0000-4000-8000-0000000000aa'
const LIST_ID = '00000000-0000-4000-8000-0000000000bb'

const TASKS: Array<{ id: string; title: string; position: number }> = [
  {
    id: '00000000-0000-4000-8000-0000000000c1',
    title: 'Book the venue',
    position: 0,
  },
  {
    id: '00000000-0000-4000-8000-0000000000c2',
    title: 'Choose the cake',
    position: 1,
  },
  {
    id: '00000000-0000-4000-8000-0000000000c3',
    title: 'Send invitations',
    position: 2,
  },
]

async function main(): Promise<void> {
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: {},
    create: {
      id: USER_ID,
      displayName: 'Demo',
      email: 'demo@lifedeck.app',
      isGuest: false,
      locale: 'en',
    },
  })

  await prisma.list.upsert({
    where: { id: LIST_ID },
    update: {},
    create: {
      id: LIST_ID,
      ownerId: USER_ID,
      title: 'Wedding planning',
      type: 'standalone',
      visibility: 'private',
    },
  })

  for (const task of TASKS) {
    await prisma.task.upsert({
      where: { id: task.id },
      update: {},
      create: {
        id: task.id,
        listId: LIST_ID,
        title: task.title,
        position: task.position,
      },
    })
  }

  console.info(
    `Seeded user ${USER_ID} with list "${LIST_ID}" and ${TASKS.length} tasks.`,
  )
}

main()
  .catch(error => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
