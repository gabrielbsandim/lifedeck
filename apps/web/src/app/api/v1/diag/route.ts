export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('key') !== 'lifedeck-diag') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }
  const result: Record<string, string> = {}

  try {
    const argon2 = await import('@node-rs/argon2')
    await argon2.hash('diagnostic-probe')
    result.argon2 = 'ok'
  } catch (error) {
    result.argon2 = error instanceof Error ? error.message : String(error)
  }

  try {
    const { PrismaClient } = await import('@prisma/client')
    const client = new PrismaClient()
    await client.$queryRaw`SELECT 1`
    await client.$disconnect()
    result.prisma = 'ok'
  } catch (error) {
    result.prisma = error instanceof Error ? error.message : String(error)
  }

  return Response.json(result)
}
