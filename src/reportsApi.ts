import { formatDbError } from './dbError'
import { getSupabase } from './supabaseClient'
import type { RobberyReport } from './types'

type DbReportRow = {
  id: string
  lat: number
  lng: number
  title: string
  description: string
  occurred_at: string
  created_at: string
}

function rowToReport(row: DbReportRow): RobberyReport {
  return {
    id: row.id,
    lat: row.lat,
    lng: row.lng,
    title: row.title ?? '',
    description: row.description,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }
}

export async function fetchReports(): Promise<RobberyReport[]> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')

  const { data, error } = await supabase
    .from('reports')
    .select('id, lat, lng, title, description, occurred_at, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(formatDbError(error))
  if (!data) return []
  return (data as DbReportRow[]).map(rowToReport)
}

export async function insertReport(report: RobberyReport): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase is not configured')

  const { error } = await supabase.from('reports').insert({
    id: report.id,
    lat: report.lat,
    lng: report.lng,
    title: report.title,
    description: report.description,
    occurred_at: report.occurredAt,
    created_at: report.createdAt,
  })

  if (error) throw new Error(formatDbError(error))
}

/** Subscribe to new rows so other browsers see updates without refreshing. */
export function subscribeToNewReports(onInsert: (report: RobberyReport) => void): () => void {
  const supabase = getSupabase()
  if (!supabase) return () => {}

  const channel = supabase
    .channel('reports-inserts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'reports' },
      (payload) => {
        const row = payload.new as DbReportRow | null
        if (row?.id) onInsert(rowToReport(row))
      },
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
