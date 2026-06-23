export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('key') !== 'lifedeck-diag') {
    return Response.json({ error: 'forbidden' }, { status: 403 })
  }
  const targets = [
    '@node-rs/argon2',
    '@prisma/client',
    '@lifedeck/infrastructure',
  ]
  const result: Record<string, string> = {}
  for (const target of targets) {
    try {
      await import(target)
      result[target] = 'ok'
    } catch (error) {
      result[target] =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error)
    }
  }
  return Response.json(result)
}
