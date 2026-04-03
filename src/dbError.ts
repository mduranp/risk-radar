/** Turn Supabase / PostgREST errors into a single readable string for the UI. */
export function formatDbError(err: unknown): string {
  if (!err || typeof err !== 'object') {
    return err === undefined || err === null ? 'Unknown error' : String(err)
  }

  const e = err as {
    name?: string
    message?: string
    details?: string
    hint?: string
    code?: string
  }

  if (e.name === 'PostgrestError' || typeof e.message === 'string') {
    const parts: string[] = []
    if (e.message) parts.push(e.message)
    if (e.details) parts.push(`Details: ${e.details}`)
    if (e.hint) parts.push(`Hint: ${e.hint}`)
    if (e.code && e.name === 'PostgrestError') parts.push(`Code: ${e.code}`)
    return parts.length ? parts.join(' · ') : 'Database request failed'
  }

  return String(err)
}
