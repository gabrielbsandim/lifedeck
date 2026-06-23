type LogLevel = 'error' | 'warn' | 'info'

type LogFields = Record<string, unknown>

export function log(level: LogLevel, message: string, fields: LogFields = {}) {
  const entry = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  })
  if (level === 'error') {
    console.error(entry)
  } else if (level === 'warn') {
    console.warn(entry)
  } else {
    console.info(entry)
  }
}
